// server/routes/audioItemRoutes.js
console.log('--- audioItemRoutes.js module is being loaded ---');

const express = require('express');
const multer = require('multer');
const { protect } = require('../middleware/authMiddleware');
const AudioItem = require('../models/AudioItem');
const WildFind = require('../models/wildFind');

const {
  getAiFullAnalysisForCollectionItem,
  getVisualAnalysis,
  getComprehensiveWildFindAnalysis,
  analyzeAdText,
  getAdPriceComparisonInsight,
  getAiValueInsight,
  getRelatedGearSuggestions,
  uploadToGcs,
  deleteFromGcs,
} = require('../utils/geminiService');


const router = express.Router();

const uploadMultiple = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
}).array('photos', 5);

// This is no longer used by the primary 'add' or 'edit' routes
const uploadSingle = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
}).single('photo');

const uploadForAnalysis = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
}).single('adImage');

const uploadWildFind = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
}).single('image');

// This middleware is now only used for single-file AI analysis routes
const uploadToGcsMiddleware = async (req, res, next) => {
  if (!req.file) {
    return next();
  }
  const gcs = req.app.locals.gcs;
  if (!gcs || !gcs.bucketName) {
    return next(new Error('GCS configuration error.'));
  }
  try {
    req.gcsUrl = await uploadToGcs(req.file, gcs.bucketName, gcs.storage);
    next();
  } catch (error) {
    next(error);
  }
};


// --- UNIFIED DISCOVER ROUTE ---
router.get('/discover', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const followingIds = new Set(req.user.following.map(id => id.toString()));

    const audioItemsPromise = AudioItem.find({ privacy: 'Public' })
      .populate('user', 'username _id')
      .lean();

    const wildFindsPromise = WildFind.find({})
      .populate('userId', 'username _id')
      .lean();

    const [audioItems, wildFinds] = await Promise.all([
      audioItemsPromise,
      wildFindsPromise,
    ]);

    const normalizedAudioItems = audioItems.map(item => ({
      id: item._id,
      title: `${item.make} ${item.model}`,
      imageUrl: item.photoUrls?.[0],
      isForSale: item.isForSale,
      isOpenToTrade: item.isOpenToTrade,
      detailPath: `/item/${item._id}`,
      createdAt: item.createdAt,
      username: item.user?.username,
      userId: item.user?._id,
      isFollowing: followingIds.has(item.user?._id.toString()),
    }));

    const normalizedWildFinds = wildFinds.map(find => {
      let title = 'Untitled Find';
      if (find.findType === 'Wild Find' && find.analysis?.identifiedItem) {
        title = find.analysis.identifiedItem;
      } else if (find.findType === 'Ad Analysis' && find.adAnalysis?.identifiedMake) {
        title = `${find.adAnalysis.identifiedMake} ${find.adAnalysis.identifiedModel || ''}`.trim();
      }
      
      return {
        id: find._id,
        title: title,
        imageUrl: find.imageUrl,
        tag: find.findType,
        detailPath: `/saved-finds/${find._id}`,
        createdAt: find.createdAt,
        username: find.userId?.username,
        userId: find.userId?._id,
        isFollowing: followingIds.has(find.userId?._id.toString()),
      };
    });

    const combinedResults = [...normalizedAudioItems, ...normalizedWildFinds];
    combinedResults.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const paginatedResults = combinedResults.slice(skip, skip + limit);
    
    res.json(paginatedResults);

  } catch (error) {
    console.error('Error fetching unified discover feed:', error);
    res
      .status(500)
      .json({ message: 'Server error while fetching discover feed.' });
  }
});

// GET /api/items
router.get('/', protect, async (req, res) => {
  try {
    const items = await AudioItem.find({ user: req.user.id })
      .populate('user', 'username email _id')
      .sort({ createdAt: -1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: 'Server error while fetching items.' });
  }
});

// GET /api/items/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const item = await AudioItem.findById(req.params.id).populate(
      'user',
      'username'
    );

    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    if (item.privacy === 'Public') {
      return res.json(item);
    }

    if (
      item.privacy === 'Private' &&
      item.user._id.toString() === req.user.id
    ) {
      return res.json(item);
    }

    return res
      .status(404)
      .json({
        message: 'Item not found or you do not have permission to view it.',
      });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Item not found' });
    }
    res
      .status(500)
      .json({ message: 'Server error while fetching item by ID.' });
  }
});

// POST /api/items --- UPDATED FOR MULTIPLE IMAGE UPLOAD
router.post(
  '/',
  protect,
  uploadMultiple, // <-- Changed from uploadSingle to uploadMultiple
  async (req, res) => {
    try {
      let uploadedImageUrls = [];
      const primaryImageForAnalysis = req.files && req.files.length > 0 ? req.files[0] : null;

      // Upload all images to GCS
      if (req.files && req.files.length > 0) {
        const gcs = req.app.locals.gcs;
        if (!gcs || !gcs.bucketName) {
          throw new Error('GCS configuration error on server.');
        }
        const uploadPromises = req.files.map(file =>
          uploadToGcs(file, gcs.bucketName, gcs.storage)
        );
        uploadedImageUrls = await Promise.all(uploadPromises);
      }

      const userInput = {
        make: req.body.make,
        model: req.body.model,
      };
      const identification = {
        wasCorrected: false,
        userInput: `${userInput.make} ${userInput.model}`,
        aiIdentifiedAs: '',
        confidence: '', // <-- Initialize confidence field
      };

      let finalMake = userInput.make;
      let finalModel = userInput.model;

      if (primaryImageForAnalysis) {
        const visualAnalysisArray = await getVisualAnalysis(primaryImageForAnalysis);
        if (visualAnalysisArray && visualAnalysisArray.length > 0) {
          const aiIdentified = visualAnalysisArray[0];
          
          // --- NEW: Save the confidence score from the AI analysis ---
          identification.confidence = aiIdentified.confidence || 'Medium';

          const aiIsConfident =
            aiIdentified.make !== 'Unidentified Make' &&
            aiIdentified.model !== 'Model Not Clearly Identifiable';

          const isDifferent =
            aiIdentified.make.toLowerCase().trim() !==
              userInput.make.toLowerCase().trim() ||
            aiIdentified.model.toLowerCase().trim() !==
              userInput.model.toLowerCase().trim();

          if (aiIsConfident && isDifferent) {
            identification.wasCorrected = true;
            identification.aiIdentifiedAs = `${aiIdentified.make} ${aiIdentified.model}`;
            finalMake = aiIdentified.make;
            finalModel = aiIdentified.model;
          }
        }
      }
      
      const isForSale = req.body.isForSale === 'true';
      const isOpenToTrade = req.body.isOpenToTrade === 'true';

      const newItemData = {
        user: req.user.id,
        ...req.body,
        isForSale,
        isOpenToTrade,
        isFullyFunctional: String(
          req.body.isFullyFunctional
        ).toLowerCase() === 'true',
        photoUrls: uploadedImageUrls, // <-- Use the array of uploaded URLs
        identification: identification,
      };
      
      if (isForSale && req.body.askingPrice) {
        const price = parseFloat(req.body.askingPrice);
        newItemData.askingPrice = Math.round((price + Number.EPSILON) * 100) / 100;
      } else {
        newItemData.askingPrice = undefined;
      }

      const aiAnalysis = await getAiFullAnalysisForCollectionItem({
        make: finalMake,
        model: finalModel,
        itemType: newItemData.itemType,
        condition: newItemData.condition,
        notes: newItemData.notes,
        photoUrl: uploadedImageUrls[0] || null, // <-- Use the first image for full analysis
      });

      newItemData.aiAnalysis = aiAnalysis;
      newItemData.aiAnalyzedOn = new Date();

      const audioItem = new AudioItem(newItemData);
      await audioItem.save();

      res.status(201).json(audioItem);
    } catch (error) {
      console.error('Error creating item with AI analysis:', error);
      res
        .status(500)
        .json({
          message: 'Server error while creating item.',
          details: error.message,
        });
    }
  }
);

// PUT /api/items/:id
router.put(
  '/:id',
  protect,
  uploadMultiple, 
  async (req, res) => {
    try {
      const item = await AudioItem.findById(req.params.id);
      if (!item || item.user.toString() !== req.user.id) {
        return res.status(404).json({ message: 'Item not found or you do not have permission.' });
      }

      if (req.body.existingPhotoUrls) {
        item.photoUrls = JSON.parse(req.body.existingPhotoUrls);
      } else {
        item.photoUrls = [];
      }
      
      if (req.files && req.files.length > 0) {
          const gcs = req.app.locals.gcs;
          if (!gcs || !gcs.bucketName) {
            throw new Error('GCS configuration error on server.');
          }
          const uploadPromises = req.files.map(file =>
            uploadToGcs(file, gcs.bucketName, gcs.storage)
          );
          const newImageUrls = await Promise.all(uploadPromises);
          item.photoUrls.push(...newImageUrls);
      }
      
      const safeHasProperty = (prop) => Object.prototype.hasOwnProperty.call(req.body, prop);
      if (safeHasProperty('make')) item.make = req.body.make;
      if (safeHasProperty('model')) item.model = req.body.model;
      if (safeHasProperty('itemType')) item.itemType = req.body.itemType;
      if (safeHasProperty('condition')) item.condition = req.body.condition;
      if (safeHasProperty('privacy')) item.privacy = req.body.privacy;
      if (safeHasProperty('notes')) item.notes = req.body.notes;
      if (safeHasProperty('issuesDescription')) item.issuesDescription = req.body.issuesDescription;
      if (safeHasProperty('isFullyFunctional')) {
        item.isFullyFunctional = String(req.body.isFullyFunctional).toLowerCase() === 'true';
      }
      if (safeHasProperty('isForSale')) {
        item.isForSale = String(req.body.isForSale).toLowerCase() === 'true';
      }
      if (safeHasProperty('isOpenToTrade')) {
        item.isOpenToTrade = String(req.body.isOpenToTrade).toLowerCase() === 'true';
      }
      if (item.isForSale && safeHasProperty('askingPrice')) {
        const price = parseFloat(req.body.askingPrice);
        item.askingPrice = Math.round((price + Number.EPSILON) * 100) / 100;
      } else if (!item.isForSale) {
        item.askingPrice = null;
      }

      const updatedItem = await item.save();
      res.json(updatedItem);

    } catch (error) {
      console.error('Error updating item:', error);
      res
        .status(500)
        .json({
          message: 'Server error while updating item.',
          details: error.message,
        });
    }
  }
);

// New route to handle accepting the AI's identification suggestion.
router.patch('/:id/accept-correction', protect, async (req, res) => {
  try {
    const item = await AudioItem.findById(req.params.id);

    if (!item || item.user.toString() !== req.user.id) {
      return res.status(404).json({ message: 'Item not found' });
    }

    if (!item.identification || !item.identification.wasCorrected) {
      return res.status(400).json({ message: 'No correction to accept.' });
    }

    const parts = item.identification.aiIdentifiedAs.split(' ');
    const newMake = parts[0];
    const newModel = parts.slice(1).join(' ');

    item.make = newMake;
    item.model = newModel;

    item.identification.wasCorrected = false;
    item.identification.userInput = '';
    item.identification.aiIdentifiedAs = '';

    const updatedItem = await item.save();
    res.json(updatedItem);
  } catch (error) {
    console.error('Error accepting AI correction:', error);
    res
      .status(500)
      .json({
        message: 'Server error while accepting correction.',
        details: error.message,
      });
  }
});

// DELETE /api/items/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const item = await AudioItem.findById(req.params.id);
    if (!item || item.user.toString() !== req.user.id) {
      return res.status(404).json({ message: 'Item not found' });
    }
    const gcs = req.app.locals.gcs;
    if (item.photoUrls && item.photoUrls.length > 0 && gcs && gcs.bucketName) {
      const deletionPromises = item.photoUrls.map(url =>
          deleteFromGcs(url, gcs.bucketName, gcs.storage)
      );
      await Promise.all(deletionPromises);
    }
    await AudioItem.findByIdAndDelete(req.params.id);
    res.json({ message: 'Item removed successfully' });
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).json({ message: 'Server error while deleting item.' });
  }
});

// --- AI Feature Routes ---
router.post(
  '/wild-find-initial-scan',
  protect,
  uploadWildFind,
  uploadToGcsMiddleware,
  async (req, res) => {
    if (!req.file) {
      return res
        .status(400)
        .json({ message: 'No image was uploaded for the Wild Find scan.' });
    }
    try {
      const visualAnalysisArray = await getVisualAnalysis(req.file);
      if (!visualAnalysisArray || visualAnalysisArray.length === 0) {
        return res
          .status(404)
          .json({ message: 'AI could not identify any item from the image.' });
      }
      res.status(200).json({
        status: 'success',
        imageUrl: req.gcsUrl,
        scannedItems: visualAnalysisArray,
      });
    } catch (error) {
      console.error('Error during wild find initial scan:', error);
      res
        .status(500)
        .json({
          message: 'An error occurred during the AI Wild Find scan.',
          details: error.message,
        });
    }
  }
);

router.post('/wild-find-detailed-analysis', protect, async (req, res) => {
  const { items } = req.body;
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res
      .status(400)
      .json({
        status: 'error',
        message: 'No items provided for detailed analysis.',
      });
  }
  try {
    const analysisPromises = items.map(item =>
      getComprehensiveWildFindAnalysis(
        item.make,
        item.model,
        item.conditionDescription
      )
    );
    const analyses = await Promise.all(analysisPromises);
    res.status(200).json({
      status: 'success',
      analyses: analyses,
    });
  } catch (error) {
    console.error('Error during wild find detailed analysis:', error);
    res
      .status(500)
      .json({
        status: 'error',
        message: 'An error occurred during the detailed AI analysis.',
        details: error.message,
      });
  }
});

router.post(
  '/analyze-ad-listing',
  protect,
  uploadForAnalysis,
  uploadToGcsMiddleware,
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: 'No ad image was uploaded.' });
    }
    const { adTitle, adDescription, askingPrice } = req.body;
    try {
      const textAnalysis = await analyzeAdText(adTitle, adDescription);
      const visualAnalysisArray = await getVisualAnalysis(req.file);

      if (!visualAnalysisArray || visualAnalysisArray.length === 0) {
        return res
          .status(404)
          .json({ message: 'AI could not identify the item from the image.' });
      }

      const visualAnalysis = visualAnalysisArray[0];

      const identifiedMake =
        visualAnalysis.make !== 'Unidentified Make'
          ? visualAnalysis.make
          : textAnalysis.extractedMake;
      const identifiedModel =
        visualAnalysis.model !== 'Model Not Clearly Identifiable'
          ? visualAnalysis.model
          : textAnalysis.extractedModel;

      const valueInsight = await getAiValueInsight(
        identifiedMake,
        identifiedModel,
        visualAnalysis.conditionDescription
      );

      const priceComparison = await getAdPriceComparisonInsight(
        valueInsight.estimatedValueUSD,
        askingPrice,
        identifiedMake,
        identifiedModel,
        visualAnalysis.conditionDescription,
        textAnalysis
      );
      
      const finalReport = {
        gcsUrl: req.gcsUrl,
        identifiedMake,
        identifiedModel,
        visualAnalysis,
        textAnalysis,
        valueInsight,
        priceComparison,
        askingPrice,
      };
      res.status(200).json(finalReport);
    } catch (error) {
      console.error('Error during AI ad analysis:', error); 
      res
        .status(500)
        .json({
          message: 'An error occurred during the AI ad analysis.',
          details: error.message,
        });
    }
  }
);


module.exports = router;