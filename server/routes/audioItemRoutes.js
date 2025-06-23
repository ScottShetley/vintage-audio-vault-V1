// server/routes/audioItemRoutes.js
console.log ('--- audioItemRoutes.js module is being loaded ---');

const express = require ('express');
const multer = require ('multer');
const {Readable} = require ('stream');
const {protect} = require ('../middleware/authMiddleware');
const AudioItem = require ('../models/AudioItem');
const {
  // Import the new comprehensive function
  getComprehensiveWildFindAnalysis,
  // Keep the functions that are still in use
  getVisualAnalysis,
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
        return res.status (400).json ({
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
      // ... (rest of the PUT logic is unchanged)

      const updatedItem = await AudioItem.findByIdAndUpdate (
        req.params.id,
        {$set: updateFields},
        {new: true, runValidators: true}
      );
      res.json (updatedItem);
    } catch (error) {
      console.error ('Error updating item:', error);
      // ... (error handling is unchanged)
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
    // ... (error handling is unchanged)
  }
});

router.patch ('/:id/ai-evaluation', protect, async (req, res) => {
  try {
    const item = await AudioItem.findById (req.params.id);
    if (!item) return res.status (404).json ({message: 'Item not found'});
    // ... (rest of the PATCH logic is unchanged)

    const updatedItem = await item.save ();
    res.json (updatedItem);
  } catch (error) {
    console.error ('Error in AI evaluation and suggestion process:', error);
    // ... (error handling is unchanged)
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
      const gcs = req.app.locals.gcs;
      if (!gcs || !gcs.bucketName || !gcs.storage) {
        console.error ('GCS is not configured on the server.');
        throw new Error ('GCS configuration is missing.');
      }
      console.log ('Uploading Wild Find image to GCS...');
      const imageUrl = await uploadToGcs (
        req.file,
        gcs.bucketName,
        gcs.storage
      );
      console.log (`Image uploaded successfully. URL: ${imageUrl}`);

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
        imageUrl: imageUrl,
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

// Step 2: Detailed Analysis - REWRITTEN TO USE THE NEW COMPREHENSIVE FUNCTION
router.post ('/wild-find-detailed-analysis', protect, async (req, res) => {
  console.log ('--- HIT /api/items/wild-find-detailed-analysis ---');
  const {items} = req.body;

  if (!items || !Array.isArray (items) || items.length === 0) {
    return res.status (400).json ({
      message: 'No items provided for detailed analysis.',
      status: 'error',
    });
  }

  console.log (`Received ${items.length} item(s) for detailed analysis.`);

  try {
    const analysisPromises = items.map (async item => {
      if (!item.make || !item.model || !item.conditionDescription) {
        console.log ('Skipping item with missing base data:', item);
        return null;
      }

      console.log (
        `Starting comprehensive analysis for: ${item.make} ${item.model}`
      );
      // A single call to our new, powerful function
      const analysisResult = await getComprehensiveWildFindAnalysis (
        item.make,
        item.model,
        item.conditionDescription
      );
      console.log (
        `Finished comprehensive analysis for: ${item.make} ${item.model}`
      );

      // The result from the new function is already in the final format we need.
      return analysisResult;
    });

    const allAnalysesResults = await Promise.all (analysisPromises);
    const allAnalyses = allAnalysesResults.filter (
      result => result !== null && !result.error
    );

    if (allAnalyses.length === 0) {
      console.log ('No items could be successfully analyzed.');
      return res.status (400).json ({
        message: 'Could not perform detailed analysis on any of the provided items. Please ensure make and model are specific.',
        status: 'error',
      });
    }

    console.log (
      `Successfully completed analysis for ${allAnalyses.length} item(s).`
    );

    res.status (200).json ({
      message: `Successfully performed detailed analysis on ${allAnalyses.length} item(s).`,
      status: 'success',
      analyses: allAnalyses,
    });
  } catch (error) {
    console.error ('CRITICAL ERROR during Wild Find detailed analysis:', error);
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
    // This entire route is unchanged and correct.
    // ...
  }
);

module.exports = router;
