// server/routes/audioItemRoutes.js
console.log ('--- audioItemRoutes.js module is being loaded ---');

const express = require ('express');
const multer = require ('multer');
const {protect} = require ('../middleware/authMiddleware');
const AudioItem = require ('../models/AudioItem');
const {
  getComprehensiveWildFindAnalysis,
  getVisualAnalysis,
  analyzeAdText,
  getAdPriceComparisonInsight,
  getAiValueInsight,
  getRelatedGearSuggestions,
  uploadToGcs,
  deleteFromGcs,
} = require ('../utils/geminiService');

const router = express.Router ();

// --- Multer Configurations ---
const uploadMultiple = multer ({
  storage: multer.memoryStorage (),
  limits: {fileSize: 5 * 1024 * 1024},
}).array ('photos', 5);

const uploadSingle = multer ({
  storage: multer.memoryStorage (),
  limits: {fileSize: 5 * 1024 * 1024},
}).single ('photo');

const uploadForAnalysis = multer ({
  storage: multer.memoryStorage (),
  limits: {fileSize: 10 * 1024 * 1024},
}).single ('adImage');

const uploadWildFind = multer ({
  storage: multer.memoryStorage (),
  limits: {fileSize: 10 * 1024 * 1024},
}).single ('image'); 

// --- GCS Middleware ---
const uploadToGcsMiddleware = async (req, res, next) => {
  if (!req.files && !req.file) {
    return next ();
  }

  const gcs = req.app.locals.gcs;
  if (!gcs || !gcs.bucketName) {
    return next (new Error ('GCS configuration error.'));
  }

  try {
    if (req.files && req.files.length > 0) {
      const uploadPromises = req.files.map (file =>
        uploadToGcs (file, gcs.bucketName, gcs.storage)
      );
      req.gcsUrls = await Promise.all (uploadPromises);
    } else if (req.file) {
      req.gcsUrl = await uploadToGcs (
        req.file,
        gcs.bucketName,
        gcs.storage
      );
    }
    next ();
  } catch (error) {
    next (error);
  }
};

// --- Main Audio Item CRUD Routes ---

// GET /api/items/discover - Get all public items from all users
// THIS ROUTE MUST BE DEFINED *BEFORE* THE '/:id' ROUTE
router.get('/discover', async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const items = await AudioItem.find({ privacy: 'Public' })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'username'); // Populate author's username for display

    res.json(items);
  } catch (error) {
    console.error('Error fetching public discover items:', error);
    res.status(500).json({ message: 'Server error while fetching discover items.' });
  }
});

// GET /api/items - Get all items for a user
router.get ('/', protect, async (req, res) => {
  try {
    const items = await AudioItem.find ({user: req.user.id})
      .populate('user', 'username email _id') // UPDATED
      .sort ({createdAt: -1});
    res.json (items);
  } catch (error) {
    res.status (500).json ({message: 'Server error while fetching items.'});
  }
});

// GET /api/items/:id - Get a single item by ID
router.get ('/:id', protect, async (req, res) => {
  try {
    const item = await AudioItem.findById (req.params.id);
    if (!item || item.user.toString () !== req.user.id) {
      return res.status (404).json ({message: 'Item not found'});
    }
    res.json (item);
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status (404).json ({message: 'Item not found'});
    }
    res.status (500).json ({message: 'Server error while fetching item by ID.'});
  }
});

// POST /api/items - Create a new item
router.post ('/', protect, uploadSingle, uploadToGcsMiddleware, async (req, res) => {
  try {
    const newItemData = {
      user: req.user.id,
      ...req.body,
      isFullyFunctional: String (req.body.isFullyFunctional).toLowerCase () === 'true',
      photoUrls: req.gcsUrl ? [req.gcsUrl] : [],
    };
    const audioItem = new AudioItem (newItemData);
    await audioItem.save ();
    res.status (201).json (audioItem);
  } catch (error) {
    res.status (500).json ({message: 'Server error while creating item.'});
  }
});

// PUT /api/items/:id - Update an existing item
router.put ('/:id', protect, uploadMultiple, uploadToGcsMiddleware, async (req, res) => {
    try {
        const item = await AudioItem.findById(req.params.id);
        if (!item || item.user.toString() !== req.user.id) {
            return res.status(404).json({ message: 'Item not found' });
        }

        const updateFields = { ...req.body };
        
        let existingImageUrls = [];
        if (req.body.existingImageUrls) {
            try {
                const parsed = JSON.parse(req.body.existingImageUrls);
                existingImageUrls = Array.isArray(parsed) ? parsed : [parsed];
            } catch {
                existingImageUrls = Array.isArray(req.body.existingImageUrls) ? req.body.existingImageUrls : [req.body.existingImageUrls];
            }
        }
        
        const newImageUrls = req.gcsUrls || [];
        updateFields.photoUrls = [...existingImageUrls, ...newImageUrls];
        delete updateFields.existingImageUrls;

        if (updateFields.hasOwnProperty('isFullyFunctional')) {
            updateFields.isFullyFunctional = String(updateFields.isFullyFunctional).toLowerCase() === 'true';
        }

        const updatedItem = await AudioItem.findByIdAndUpdate(
            req.params.id,
            { $set: updateFields },
            { new: true, runValidators: true }
        );
        res.json(updatedItem);
    } catch (error) {
        res.status (500).json ({message: 'Server error while updating item.'});
    }
});


// DELETE /api/items/:id - Delete an item
router.delete ('/:id', protect, async (req, res) => {
  try {
    const item = await AudioItem.findById (req.params.id);
    if (!item || item.user.toString () !== req.user.id) {
      return res.status (404).json ({message: 'Item not found'});
    }
    const gcs = req.app.locals.gcs;
    if (item.photoUrls && item.photoUrls.length > 0 && gcs && gcs.bucketName) {
      await Promise.all(
        item.photoUrls.map (url =>
          deleteFromGcs (url, gcs.bucketName, gcs.storage)
        )
      );
    }
    await AudioItem.findByIdAndDelete (req.params.id);
    res.json ({message: 'Item removed successfully'});
  } catch (error) {
    res.status (500).json ({message: 'Server error while deleting item.'});
  }
});

// --- AI Feature Routes ---

router.post('/wild-find-initial-scan', protect, uploadWildFind, uploadToGcsMiddleware, async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No image was uploaded for the Wild Find scan.' });
  }

  try {
    const visualAnalysisArray = await getVisualAnalysis(req.file);

    if (!visualAnalysisArray || visualAnalysisArray.length === 0) {
      return res.status(404).json({ message: 'AI could not identify any item from the image.' });
    }
    
    res.status(200).json({
        status: 'success',
        imageUrl: req.gcsUrl, 
        scannedItems: visualAnalysisArray, 
    });

  } catch (error) {
    console.error('Error during wild find initial scan:', error);
    res.status(500).json({ message: 'An error occurred during the AI Wild Find scan.', details: error.message });
  }
});

router.post('/wild-find-detailed-analysis', protect, async (req, res) => {
  const { items } = req.body; 

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ status: 'error', message: 'No items provided for detailed analysis.' });
  }

  try {
    const analysisPromises = items.map(item => 
      getComprehensiveWildFindAnalysis(item.make, item.model, item.conditionDescription)
    );
    
    const analyses = await Promise.all(analysisPromises);

    res.status(200).json({
      status: 'success',
      analyses: analyses, 
    });

  } catch (error) {
      console.error('Error during wild find detailed analysis:', error);
      res.status(500).json({ status: 'error', message: 'An error occurred during the detailed AI analysis.', details: error.message });
  }
});


router.post('/analyze-ad-listing', protect, uploadForAnalysis, uploadToGcsMiddleware, async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No ad image was uploaded.' });
  }
  const { adTitle, adDescription, askingPrice } = req.body;

  try {
    const textAnalysis = await analyzeAdText(adTitle, adDescription);
    const visualAnalysisArray = await getVisualAnalysis(req.file);

    if (!visualAnalysisArray || visualAnalysisArray.length === 0) {
        return res.status(404).json({ message: 'AI could not identify the item from the image.' });
    }
    const visualAnalysis = visualAnalysisArray[0];

    const identifiedMake = visualAnalysis.make !== "Unidentified Make" ? visualAnalysis.make : textAnalysis.extractedMake;
    const identifiedModel = visualAnalysis.model !== "Model Not Clearly Identifiable" ? visualAnalysis.model : textAnalysis.extractedModel;

    const valueInsight = await getAiValueInsight(identifiedMake, identifiedModel, visualAnalysis.conditionDescription);
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
    res.status(500).json({ message: 'An error occurred during the AI ad analysis.', details: error.message });
  }
});

router.patch ('/:id/ai-evaluation', protect, async (req, res) => {
  try {
    const item = await AudioItem.findById (req.params.id);
    if (!item || item.user.toString () !== req.user.id) {
      return res.status (404).json ({message: 'Item not found'});
    }

    const [valueInsight, gearSuggestions] = await Promise.all ([
      getAiValueInsight (item.make, item.model, item.condition, item.photoUrls),
      getRelatedGearSuggestions (item.make, item.model, item.itemType, item.photoUrls),
    ]);

    item.aiValueInsight = valueInsight;
    item.aiSuggestedGear = gearSuggestions;
    item.aiEvaluatedOn = new Date ();

    const updatedItem = await item.save ();
    res.json (updatedItem);
  } catch (error) {
    res.status (500).json ({message: 'Server error during AI evaluation.'});
  }
});

module.exports = router;