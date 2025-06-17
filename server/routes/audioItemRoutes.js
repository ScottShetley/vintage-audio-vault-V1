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
  getAiValueInsight,
  getRelatedGearSuggestions,
  uploadToGcs,
  deleteFromGcs,
} = require ('../utils/geminiService');

const router = express.Router ();

// Multer configurations
const upload = multer ({
  storage: multer.memoryStorage (),
  limits: {fileSize: 5 * 1024 * 1024}, // 5MB
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
  limits: {fileSize: 5 * 1024 * 1024}, // 5MB per file
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
  limits: {fileSize: 10 * 1024 * 1024}, // 10MB for analysis images
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
    req.gcsUrls = gcsUrls; // Attach all GCS URLs to the request
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
    console.log ('--- REFACTORED /api/items/analyze-wild-find route hit! ---');
    if (!req.file) {
      return res
        .status (400)
        .json ({message: 'No image file uploaded.', status: 'error'});
    }

    try {
      // Step 1: Get Visual Analysis for ALL items in the image
      console.log ('Step 1: Performing visual analysis for all items...');
      const visualDataArray = await getVisualAnalysis (req.file);
      console.log (
        'Visual analysis complete, items found:',
        visualDataArray.length
      );
      // For debugging:
      // console.log('Raw visualDataArray:', JSON.stringify(visualDataArray, null, 2));


      if (!visualDataArray || visualDataArray.length === 0) {
        return res.status (400).json ({
          message: 'Could not identify any items from the image. Please try a clearer, more direct photo.',
          status: 'error',
        });
      }

      const allAnalyses = [];
      const unidentifiedMakes = ['unidentified', 'unknown', 'unidentified make'];
      const unidentifiedModels = ['unidentified', 'unknown', 'model not clearly identifiable'];

      // Loop through each identified item and perform the full analysis
      for (const item of visualDataArray) {
        const makeLower = item.make ? item.make.toLowerCase() : '';
        const modelLower = item.model ? item.model.toLowerCase() : '';

        const makeIsInvalid = !item.make || unidentifiedMakes.includes(makeLower);
        const modelIsInvalid = !item.model || unidentifiedModels.includes(modelLower);

        if (makeIsInvalid || modelIsInvalid) {
          console.log(
            `Skipping item due to invalid/generic make or model: Make='${item.make}', Model='${item.model}'`
          );
          continue; // Skip to the next item
        }

        console.log (`Analyzing item: ${item.make} ${item.model}`);
        const factualData = await getFactualFeatures (item.make, item.model);
        const valuationData = await getSynthesizedValuation (item, factualData);

        const fullItemAnalysis = {...item, ...factualData, ...valuationData};
        allAnalyses.push (fullItemAnalysis);
      }

      if (allAnalyses.length === 0) {
        // This means items might have been detected by visual analysis, but none were identifiable enough for full analysis
        if (visualDataArray.length > 0) {
             return res.status(400).json({
                message: `The AI detected ${visualDataArray.length} item(s) but could not specifically identify their make and model for a full analysis. Try a clearer image or different angle.`,
                status: 'error', // Or a more specific status like 'partial_identification_failed'
             });
        }
        // This means visual analysis itself found nothing
        return res.status (400).json ({
          message: 'Could not identify any items from the image, or those found were too obscure for full analysis.',
          status: 'error',
        });
      }

      res.status (200).json ({
        message: `Successfully analyzed ${allAnalyses.length} item(s).`,
        status: 'success',
        analyses: allAnalyses,
      });
    } catch (error) {
      console.error ('Error during multi-step Wild Find analysis:', error);
      res.status (500).json ({
        message: 'An error occurred during the AI analysis process.',
        status: 'error',
        errorDetails: error.message,
      });
    }
  }
); */

// --- CRUD Operations for Audio Items ---
router.post (
  '/',
  protect,
  upload.single ('photo'), // Expect a single file named 'photo'
  uploadSingleToGcs,
  async (req, res) => {
    try {
      const {
        make, // Changed from 'name' to 'make' for consistency
        model,
        itemType, // Changed from 'type' to 'itemType'
        condition,
        isFullyFunctional,
        issuesDescription, // New field
        specifications, // New field
        notes, // New field
        purchaseDate,
        purchasePrice,
        userEstimatedValue, // New field
        userEstimatedValueDate, // New field
        // Removed: serialNumber, brand, description, isForSale, salePrice
      } = req.body;

      // Basic validation for required fields
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
        issuesDescription: issuesDescription || '', // Default to empty string if not provided
        specifications: specifications || '',
        notes: notes || '',
        purchaseDate: purchaseDate || null, // Allow null if not provided
        purchasePrice: purchasePrice ? Number (purchasePrice) : null,
        userEstimatedValue: userEstimatedValue
          ? Number (userEstimatedValue)
          : null,
        userEstimatedValueDate: userEstimatedValueDate || null,
        photoUrls: req.file && req.file.gcsUrl ? [req.file.gcsUrl] : [],
        // Ensure other fields from the model are handled or have defaults
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
      createdAt: -1, // Sort by newest first
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
  uploadMultiple.array ('photos', 5), // Changed from 'newPhotos' to 'photos'
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

      // Handle boolean conversions explicitly
      if (updateFields.hasOwnProperty ('isFullyFunctional')) {
        updateFields.isFullyFunctional =
          String (updateFields.isFullyFunctional).toLowerCase () === 'true';
      }
      if (updateFields.hasOwnProperty ('isForSale')) {
        // Added for direct sale status update
        updateFields.isForSale =
          String (updateFields.isForSale).toLowerCase () === 'true';
      }

      // Handle numeric conversions
      if (updateFields.purchasePrice) {
        updateFields.purchasePrice = Number (updateFields.purchasePrice);
      }
      if (updateFields.userEstimatedValue) {
        updateFields.userEstimatedValue = Number (
          updateFields.userEstimatedValue
        );
      }
      if (updateFields.askingPrice) {
        // Added for direct sale status update
        updateFields.askingPrice = Number (updateFields.askingPrice);
      }

      // Handle photo updates
      let finalPhotoUrls = item.photoUrls || [];

      // If existingPhotoUrls is sent, it means the client is managing the full list.
      // It should be a JSON stringified array.
      if (updateFields.hasOwnProperty ('existingPhotoUrls')) {
        try {
          finalPhotoUrls = JSON.parse (updateFields.existingPhotoUrls);
          if (!Array.isArray (finalPhotoUrls)) {
            finalPhotoUrls = []; // Default to empty if parsing fails or not an array
          }
        } catch (e) {
          console.error ('Error parsing existingPhotoUrls:', e);
          finalPhotoUrls = item.photoUrls || []; // Revert to original if parsing fails
        }
        delete updateFields.existingPhotoUrls; // Don't save this helper field to DB
      }

      // Add newly uploaded photos (if any from 'photos' field)
      if (req.gcsUrls && req.gcsUrls.length > 0) {
        finalPhotoUrls.push (...req.gcsUrls);
      }

      updateFields.photoUrls = finalPhotoUrls;

      // Ensure optional fields that might be empty are handled (e.g., set to empty string or null)
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
            // For text fields, allow empty string. For dates/numbers, null might be better if schema allows.
            // Assuming schema allows null for dates and empty string for text.
            if (
              field.includes ('Date') ||
              field.includes ('Price') ||
              field.includes ('Value')
            ) {
              updateFields[field] = null;
            } else {
              updateFields[field] = updateFields[field] || ''; // Keep empty string for text
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

    // Delete images from GCS
    const gcs = req.app.locals.gcs;
    if (item.photoUrls && item.photoUrls.length > 0 && gcs && gcs.bucketName) {
      const deletePromises = item.photoUrls.map (url =>
        deleteFromGcs (url, gcs.bucketName, gcs.storage).catch (err => {
          // Log individual deletion errors but don't stop the process
          console.error (`Failed to delete GCS image ${url}:`, err);
        })
      );
      // Wait for all deletions, but don't let one failure stop item deletion from DB
      await Promise.all (deletePromises);
    }

    await AudioItem.findByIdAndDelete (req.params.id); // Corrected method name
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

// This route is now for getting AI evaluation AND suggestions and saving them
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

    // Save the AI data to the item
    item.aiValueInsight = valueInsight;
    item.aiSuggestions = suggestions;
    item.lastAiEvaluationDate = new Date (); // Record when this was done

    const updatedItem = await item.save ();
    console.log ('AI evaluation and suggestions saved and item updated.');
    res.json (updatedItem); // Return the fully updated item
  } catch (error) {
    console.error ('Error in AI evaluation and suggestion process:', error);
    if (error.message && error.message.includes ('429')) {
      // Basic check for rate limit error text
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

// --- NEW WILD FIND ROUTES ---

// Step 1: Initial Scan of the uploaded image
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
      const visualDataArray = await getVisualAnalysis (req.file); // from geminiService

      if (!visualDataArray || visualDataArray.length === 0) {
        return res.status (404).json ({
          // Changed to 404 as "not found" is more appropriate than bad request
          message: 'The AI could not identify any distinct items in the image. Please try a clearer photo or a different angle.',
          status: 'error', // Keep status for frontend to check
          scannedItems: [], // Ensure frontend always gets an array
        });
      }

      console.log (
        `Initial scan found ${visualDataArray.length} potential item(s).`
      );
      // We send back whatever the AI found, even if make/model are generic like "Unidentified Make"
      // The frontend will allow the user to edit these.
      res.status (200).json ({
        message: `Successfully scanned image. Found ${visualDataArray.length} potential item(s).`,
        status: 'success',
        scannedItems: visualDataArray, // Array of {make, model, conditionDescription}
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

// Step 2: Detailed Analysis of user-confirmed/edited items
router.post ('/wild-find-detailed-analysis', protect, async (req, res) => {
  console.log ('--- HIT /api/items/wild-find-detailed-analysis ---');
  const {items} = req.body; // Expects an array of items: [{clientId?, make, model, conditionDescription}, ...]

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
    // Define what makes an item "unidentified" based on your geminiService prompts
    const unidentifiedMakes = ['unidentified make', 'unknown']; // Case-insensitive checks later
    const unidentifiedModels = ['model not clearly identifiable', 'unknown']; // Case-insensitive checks later

    for (const item of items) {
      // Validate each item from the user
      // conditionDescription comes from the initial AI scan and is not editable by user, so it should be present.
      if (!item.make || !item.model || !item.conditionDescription) {
        console.log (
          'Skipping item with missing make, model, or original conditionDescription:',
          item
        );
        continue;
      }

      const makeLower = item.make.toLowerCase ();
      const modelLower = item.model.toLowerCase ();

      // Skip if make or model is still a placeholder (user didn't correct it sufficiently)
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
      // Pass the item itself as visualData, as it contains make, model, and the AI's original conditionDescription
      const valuationData = await getSynthesizedValuation (item, factualData);

      // Combine original item data (especially conditionDescription from initial scan, and user-edited make/model)
      // with new AI data for features and valuation.
      allAnalyses.push ({
        make: item.make,
        model: item.model,
        conditionDescription: item.conditionDescription, // This is crucial, from the initial scan
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

module.exports = router;
