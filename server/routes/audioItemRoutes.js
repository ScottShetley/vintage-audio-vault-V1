// c:\Users\david\Desktop\projects\vintageaudiovault\server\routes\audioItemRoutes.js
console.log ('--- audioItemRoutes.js module is being loaded ---');

const express = require ('express');
const multer = require ('multer');
const {Readable} = require ('stream');
const {protect} = require ('../middleware/authMiddleware');
const AudioItem = require ('../models/AudioItem');
const {
  getVisualAnalysis,
  getFactualFeatures,
  getSynthesizedValuation,
  analyzeAdText,
  getAdPriceComparisonInsight,
  getAiValueInsight,
  getRelatedGearSuggestions,
  uploadToGcs,
  deleteFromGcs,
} = require ('../utils/geminiService');

const router = express.Router ();

// Multer configurations
const upload = multer ({
  storage: multer.memoryStorage (),
  limits: {fileSize: 5 * 1024 * 1024},
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith ('image/')) {
      cb (null, true);
    } else {
      cb (new Error ('Not an image! Please upload an image file.'), false);
    }
  },
});
const uploadMultiple = multer ({
  storage: multer.memoryStorage (),
  limits: {fileSize: 5 * 1024 * 1024},
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith ('image/')) {
      cb (null, true);
    } else {
      cb (new Error ('Not an image! Please upload an image file.'), false);
    }
  },
});
const uploadForAnalysis = multer ({
  storage: multer.memoryStorage (),
  limits: {fileSize: 10 * 1024 * 1024},
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith ('image/')) {
      cb (null, true);
    } else {
      cb (new Error ('Not an image! Please upload an image file.'), false);
    }
  },
});

// GCS Middleware
const uploadSingleToGcs = (req, res, next) => {
  if (!req.file) {
    return next ();
  }
  const gcs = req.app.locals.gcs;
  if (!gcs || !gcs.bucketName) {
    console.error (
      'GCS not initialized or bucketName missing in uploadSingleToGcs'
    );
    return next (new Error ('GCS configuration error.'));
  }
  uploadToGcs (req.file, gcs.bucketName, gcs.storage)
    .then (gcsUrl => {
      req.file.gcsUrl = gcsUrl;
      next ();
    })
    .catch (error => {
      console.error ('Error in uploadSingleToGcs middleware:', error);
      next (error);
    });
};
const uploadMultipleToGcs = async (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return next ();
  }
  const gcs = req.app.locals.gcs;
  if (!gcs || !gcs.bucketName) {
    console.error (
      'GCS not initialized or bucketName missing in uploadMultipleToGcs'
    );
    return next (new Error ('GCS configuration error.'));
  }
  try {
    const uploadPromises = req.files.map (file =>
      uploadToGcs (file, gcs.bucketName, gcs.storage)
    );
    const gcsUrls = await Promise.all (uploadPromises);
    req.gcsUrls = gcsUrls;
    next ();
  } catch (error) {
    console.error ('Error in uploadMultipleToGcs middleware:', error);
    next (error);
  }
};

// --- ROUTE DEFINITIONS ---

// POST /api/items/analyze-wild-find - OLD ROUTE - Superseded by initial-scan and detailed-analysis
/* router.post (
  '/analyze-wild-find',
  protect,
  uploadForAnalysis.single ('image'),
  async (req, res) => {
    // ... old code ...
  }
); */

// --- CRUD Operations for Audio Items ---
router.post (
  '/',
  protect,
  upload.single ('photo'),
  uploadSingleToGcs,
  async (req, res) => {
    try {
      const {
        make,
        model,
        itemType,
        condition,
        isFullyFunctional,
        issuesDescription,
        specifications,
        notes,
        purchaseDate,
        purchasePrice,
        userEstimatedValue,
        userEstimatedValueDate,
      } = req.body;

      if (!make || !model || !itemType || !condition) {
        return res
          .status (400)
          .json ({
            message: 'Make, Model, Item Type, and Condition are required.',
          });
      }

      const newItemData = {
        user: req.user.id,
        make,
        model,
        itemType,
        condition,
        isFullyFunctional: String (isFullyFunctional).toLowerCase () === 'true',
        issuesDescription: issuesDescription || '',
        specifications: specifications || '',
        notes: notes || '',
        purchaseDate: purchaseDate || null,
        purchasePrice: purchasePrice ? Number (purchasePrice) : null,
        userEstimatedValue: userEstimatedValue
          ? Number (userEstimatedValue)
          : null,
        userEstimatedValueDate: userEstimatedValueDate || null,
        photoUrls: req.file && req.file.gcsUrl ? [req.file.gcsUrl] : [],
      };
      const audioItem = new AudioItem (newItemData);
      await audioItem.save ();
      res.status (201).json (audioItem);
    } catch (error) {
      console.error ('Error creating audio item:', error);
      if (error.name === 'ValidationError') {
        return res
          .status (400)
          .json ({message: 'Validation Error', errors: error.errors});
      }
      res.status (500).json ({message: 'Server error while creating item.'});
    }
  }
);
router.get ('/', protect, async (req, res) => {
  try {
    const items = await AudioItem.find ({user: req.user.id}).sort ({
      createdAt: -1,
    });
    res.json (items);
  } catch (error) {
    console.error ('Error fetching items:', error);
    res.status (500).json ({message: 'Server error while fetching items.'});
  }
});
router.get ('/:id', protect, async (req, res) => {
  try {
    const item = await AudioItem.findById (req.params.id);
    if (!item) {
      return res.status (404).json ({message: 'Item not found'});
    }
    if (item.user.toString () !== req.user.id) {
      return res.status (401).json ({message: 'User not authorized'});
    }
    res.json (item);
  } catch (error) {
    console.error ('Error fetching item by ID:', error);
    if (error.kind === 'ObjectId') {
      return res
        .status (404)
        .json ({message: 'Item not found (invalid ID format)'});
    }
    res
      .status (500)
      .json ({message: 'Server error while fetching item by ID.'});
  }
});

router.put (
  '/:id',
  protect,
  uploadMultiple.array ('photos', 5),
  uploadMultipleToGcs,
  async (req, res) => {
    try {
      const item = await AudioItem.findById (req.params.id);
      if (!item) {
        return res.status (404).json ({message: 'Item not found'});
      }
      if (item.user.toString () !== req.user.id) {
        return res.status (401).json ({message: 'User not authorized'});
      }

      const updateFields = {...req.body};

      if (updateFields.hasOwnProperty ('isFullyFunctional')) {
        updateFields.isFullyFunctional =
          String (updateFields.isFullyFunctional).toLowerCase () === 'true';
      }
      if (updateFields.hasOwnProperty ('isForSale')) {
        updateFields.isForSale =
          String (updateFields.isForSale).toLowerCase () === 'true';
      }

      if (updateFields.purchasePrice) {
        updateFields.purchasePrice = Number (updateFields.purchasePrice);
      }
      if (updateFields.userEstimatedValue) {
        updateFields.userEstimatedValue = Number (
          updateFields.userEstimatedValue
        );
      }
      if (updateFields.askingPrice) {
        updateFields.askingPrice = Number (updateFields.askingPrice);
      }

      let finalPhotoUrls = item.photoUrls || [];

      if (updateFields.hasOwnProperty ('existingPhotoUrls')) {
        try {
          finalPhotoUrls = JSON.parse (updateFields.existingPhotoUrls);
          if (!Array.isArray (finalPhotoUrls)) {
            finalPhotoUrls = [];
          }
        } catch (e) {
          console.error ('Error parsing existingPhotoUrls:', e);
          finalPhotoUrls = item.photoUrls || [];
        }
        delete updateFields.existingPhotoUrls;
      }

      if (req.gcsUrls && req.gcsUrls.length > 0) {
        finalPhotoUrls.push (...req.gcsUrls);
      }

      updateFields.photoUrls = finalPhotoUrls;

      const optionalFields = [
        'issuesDescription',
        'specifications',
        'notes',
        'purchaseDate',
        'userEstimatedValueDate',
        'saleNotes',
      ];
      optionalFields.forEach (field => {
        if (updateFields.hasOwnProperty (field)) {
          if (
            updateFields[field] === '' ||
            updateFields[field] === null ||
            updateFields[field] === undefined
          ) {
            if (
              field.includes ('Date') ||
              field.includes ('Price') ||
              field.includes ('Value')
            ) {
              updateFields[field] = null;
            } else {
              updateFields[field] = updateFields[field] || '';
            }
          }
        }
      });

      const updatedItem = await AudioItem.findByIdAndUpdate (
        req.params.id,
        {$set: updateFields},
        {new: true, runValidators: true}
      );
      res.json (updatedItem);
    } catch (error) {
      console.error ('Error updating item:', error);
      if (error.name === 'ValidationError') {
        return res
          .status (400)
          .json ({message: 'Validation Error', errors: error.errors});
      }
      if (error.kind === 'ObjectId') {
        return res
          .status (404)
          .json ({message: 'Item not found (invalid ID format)'});
      }
      res.status (500).json ({message: 'Server error while updating item.'});
    }
  }
);

router.delete ('/:id', protect, async (req, res) => {
  try {
    const item = await AudioItem.findById (req.params.id);
    if (!item) {
      return res.status (404).json ({message: 'Item not found'});
    }
    if (item.user.toString () !== req.user.id) {
      return res.status (401).json ({message: 'User not authorized'});
    }

    const gcs = req.app.locals.gcs;
    if (item.photoUrls && item.photoUrls.length > 0 && gcs && gcs.bucketName) {
      const deletePromises = item.photoUrls.map (url =>
        deleteFromGcs (url, gcs.bucketName, gcs.storage).catch (err => {
          console.error (`Failed to delete GCS image ${url}:`, err);
        })
      );
      await Promise.all (deletePromises);
    }

    await AudioItem.findByIdAndDelete (req.params.id);
    res.json ({message: 'Item removed successfully'});
  } catch (error) {
    console.error ('Error deleting item:', error);
    if (error.kind === 'ObjectId') {
      return res
        .status (404)
        .json ({message: 'Item not found (invalid ID format)'});
    }
    res.status (500).json ({message: 'Server error while deleting item.'});
  }
});

router.patch ('/:id/ai-evaluation', protect, async (req, res) => {
  console.log (`--- HIT PATCH /api/items/${req.params.id}/ai-evaluation ---`);
  try {
    const item = await AudioItem.findById (req.params.id);
    if (!item) return res.status (404).json ({message: 'Item not found'});
    if (item.user.toString () !== req.user.id)
      return res.status (401).json ({message: 'Not authorized'});

    if (!item.make || !item.model || !item.condition || !item.itemType) {
      return res
        .status (400)
        .json ({
          message: 'Item make, model, condition, and type are required for full AI evaluation.',
        });
    }

    console.log (`Fetching AI Value Insight for ${item.make} ${item.model}`);
    const valueInsight = await getAiValueInsight (
      item.make,
      item.model,
      item.condition,
      item.photoUrls
    );

    console.log (`Fetching AI Suggestions for ${item.make} ${item.model}`);
    const suggestions = await getRelatedGearSuggestions (
      item.make,
      item.model,
      item.itemType,
      item.photoUrls
    );

    item.aiValueInsight = valueInsight;
    item.aiSuggestions = suggestions;
    item.lastAiEvaluationDate = new Date ();

    const updatedItem = await item.save ();
    console.log ('AI evaluation and suggestions saved and item updated.');
    res.json (updatedItem);
  } catch (error) {
    console.error ('Error in AI evaluation and suggestion process:', error);
    if (error.message && error.message.includes ('429')) {
      return res
        .status (429)
        .json ({
          message: 'AI service is currently busy or rate limited. Please try again in a few moments.',
          error: error.message,
        });
    }
    res
      .status (500)
      .json ({
        message: 'Error during AI evaluation and suggestion process.',
        error: error.message,
      });
  }
});

// --- WILD FIND ROUTES (TWO-STEP PROCESS) ---

// Step 1: Initial Scan of the uploaded image for Wild Find
router.post (
  '/wild-find-initial-scan',
  protect,
  uploadForAnalysis.single ('image'),
  async (req, res) => {
    console.log ('--- HIT /api/items/wild-find-initial-scan ---');
    if (!req.file) {
      return res
        .status (400)
        .json ({message: 'No image file uploaded.', status: 'error'});
    }

    try {
      console.log ('Performing initial visual analysis for Wild Find...');
      const visualDataArray = await getVisualAnalysis (req.file);

      if (!visualDataArray || visualDataArray.length === 0) {
        return res.status (404).json ({
          message: 'The AI could not identify any distinct items in the image. Please try a clearer photo or a different angle.',
          status: 'error',
          scannedItems: [],
        });
      }

      console.log (
        `Initial scan found ${visualDataArray.length} potential item(s).`
      );
      res.status (200).json ({
        message: `Successfully scanned image. Found ${visualDataArray.length} potential item(s).`,
        status: 'success',
        scannedItems: visualDataArray,
      });
    } catch (error) {
      console.error ('Error during Wild Find initial scan:', error);
      res.status (500).json ({
        message: 'An error occurred during the AI initial scan process.',
        status: 'error',
        errorDetails: error.message,
      });
    }
  }
);

// Step 2: Detailed Analysis of user-confirmed/edited items for Wild Find
router.post ('/wild-find-detailed-analysis', protect, async (req, res) => {
  console.log ('--- HIT /api/items/wild-find-detailed-analysis ---');
  const {items} = req.body;

  if (!items || !Array.isArray (items) || items.length === 0) {
    return res
      .status (400)
      .json ({
        message: 'No items provided for detailed analysis.',
        status: 'error',
      });
  }

  try {
    const allAnalyses = [];
    const unidentifiedMakes = ['unidentified make', 'unknown'];
    const unidentifiedModels = ['model not clearly identifiable', 'unknown'];

    for (const item of items) {
      if (!item.make || !item.model || !item.conditionDescription) {
        console.log (
          'Skipping item with missing make, model, or original conditionDescription:',
          item
        );
        continue;
      }

      const makeLower = item.make.toLowerCase ();
      const modelLower = item.model.toLowerCase ();

      if (
        unidentifiedMakes.includes (makeLower) ||
        unidentifiedModels.includes (modelLower)
      ) {
        console.log (
          `Skipping item due to generic make/model after user review: Make='${item.make}', Model='${item.model}'`
        );
        continue;
      }

      console.log (
        `Performing detailed analysis for: ${item.make} ${item.model}`
      );
      const factualData = await getFactualFeatures (item.make, item.model);
      const valuationData = await getSynthesizedValuation (item, factualData);

      allAnalyses.push ({
        make: item.make,
        model: item.model,
        conditionDescription: item.conditionDescription,
        ...factualData,
        ...valuationData,
      });
    }

    if (allAnalyses.length === 0) {
      return res.status (400).json ({
        message: 'Could not perform detailed analysis on any of the provided items. Please ensure make and model are specific and not generic placeholders.',
        status: 'error',
      });
    }

    res.status (200).json ({
      message: `Successfully performed detailed analysis on ${allAnalyses.length} item(s).`,
      status: 'success',
      analyses: allAnalyses,
    });
  } catch (error) {
    console.error ('Error during Wild Find detailed analysis:', error);
    res.status (500).json ({
      message: 'An error occurred during the AI detailed analysis process.',
      status: 'error',
      errorDetails: error.message,
    });
  }
});

// --- NEW AD ANALYZER ROUTE ---
router.post (
  '/analyze-ad-listing',
  protect,
  uploadForAnalysis.single ('adImage'),
  async (req, res) => {
    console.log ('--- HIT /api/items/analyze-ad-listing ---');
    const {adTitle, adDescription, adAskingPrice, adUrl} = req.body;
    const adImageFile = req.file;

    if (!adImageFile || !adTitle || !adDescription || !adAskingPrice) {
      return res.status (400).json ({
        message: 'Missing required fields: adImage, adTitle, adDescription, or adAskingPrice.',
        status: 'error',
      });
    }

    try {
      let identifiedMake = 'Unknown';
      let identifiedModel = 'Unknown';
      let visualConditionDescription = 'Could not be determined from image.';
      let factualData = {keyFeatures: [], specifications: [], message: ''}; // Ensure message property exists
      let valuation = {
        valueRange: 'N/A',
        reasoning: 'Valuation could not be performed.',
        disclaimer: '',
      };
      let priceComparison = {
        insight: 'Price comparison could not be performed.',
      };

      // 1. Analyze Image (Visual Analysis)
      console.log ('Step 1: Performing visual analysis on ad image...');
      const visualAnalysisResults = await getVisualAnalysis (adImageFile);
      if (visualAnalysisResults && visualAnalysisResults.length > 0) {
        const primaryVisualItem = visualAnalysisResults[0];
        identifiedMake = primaryVisualItem.make || identifiedMake;
        identifiedModel = primaryVisualItem.model || identifiedModel;
        visualConditionDescription =
          primaryVisualItem.conditionDescription || visualConditionDescription;
        console.log (
          `Visual Analysis: Make=${identifiedMake}, Model=${identifiedModel}`
        );
      } else {
        console.log (
          'Visual analysis did not identify any specific items from the image.'
        );
      }

      // 2. Analyze Ad Text (this now returns the object with originalDescriptionForContext)
      console.log ('Step 2: Analyzing ad text...');
      const sellerTextSummary = await analyzeAdText (adTitle, adDescription); // analyzeAdText is now the wrapper
      console.log ('Seller Text Summary:', sellerTextSummary);

      if (
        sellerTextSummary.extractedMake &&
        sellerTextSummary.extractedMake.toLowerCase () !== 'unspecified make' &&
        sellerTextSummary.extractedMake.toLowerCase () !==
          'error processing text'
      ) {
        identifiedMake = sellerTextSummary.extractedMake;
      }
      if (
        sellerTextSummary.extractedModel &&
        sellerTextSummary.extractedModel.toLowerCase () !==
          'unspecified model' &&
        sellerTextSummary.extractedModel.toLowerCase () !==
          'error processing text'
      ) {
        identifiedModel = sellerTextSummary.extractedModel;
      }
      console.log (
        `Consolidated Identification: Make=${identifiedMake}, Model=${identifiedModel}`
      );

      const makeIsInvalid =
        !identifiedMake ||
        [
          'unidentified make',
          'unknown',
          'unspecified make',
          'error processing text',
        ].includes (identifiedMake.toLowerCase ());
      const modelIsInvalid =
        !identifiedModel ||
        [
          'model not clearly identifiable',
          'unknown',
          'unspecified model',
          'error processing text',
        ].includes (identifiedModel.toLowerCase ());

      if (!makeIsInvalid && !modelIsInvalid) {
        console.log (
          `Step 3: Getting factual features for ${identifiedMake} ${identifiedModel}...`
        );
        factualData = await getFactualFeatures (
          identifiedMake,
          identifiedModel
        );
      } else {
        console.log (
          `Skipping factual features due to generic/error in make/model: Make='${identifiedMake}', Model='${identifiedModel}'`
        );
        factualData.message =
          'Factual features could not be retrieved due to non-specific or error in make/model identification.';
      }

      const visualDataForValuation = {
        make: identifiedMake,
        model: identifiedModel,
        conditionDescription: visualConditionDescription,
      };
      console.log (
        `Step 4: Getting synthesized valuation for ${identifiedMake} ${identifiedModel}...`
      );
      valuation = await getSynthesizedValuation (
        visualDataForValuation,
        factualData
      );

      console.log ('Step 5: Getting price comparison insight...');
      // Pass the full sellerTextSummary object which includes originalDescriptionForContext
      priceComparison = await getAdPriceComparisonInsight (
        valuation.valueRange,
        adAskingPrice,
        identifiedMake,
        identifiedModel,
        visualConditionDescription,
        sellerTextSummary // Pass the whole object
      );

      res.status (200).json ({
        message: 'Ad analysis complete.',
        status: 'success',
        analysis: {
          identifiedMake,
          identifiedModel,
          visualConditionDescription,
          sellerTextSummary,
          factualFeatures: factualData,
          valuation,
          priceComparison,
          originalAdInfo: {
            adUrl,
            adTitle,
            adAskingPrice,
          },
        },
      });
    } catch (error) {
      console.error ('Error during ad analysis:', error);
      res.status (500).json ({
        message: 'An error occurred during the ad analysis process.',
        status: 'error',
        errorDetails: error.message,
      });
    }
  }
);

module.exports = router;
