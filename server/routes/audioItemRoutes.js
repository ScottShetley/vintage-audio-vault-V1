// server/routes/audioItemRoutes.js
const express = require ('express');
const mongoose = require ('mongoose');
const multer = require ('multer');
const {protect} = require ('../middleware/authMiddleware');
const AudioItem = require ('../models/AudioItem');
const {
  getAiValueInsight,
  getRelatedGearSuggestions,
} = require ('../utils/geminiService');

const router = express.Router ();

// --- Multer and GCS Configuration ---
const multerStorage = multer.memoryStorage ();
const upload = multer ({storage: multerStorage});

const uploadToGcs = (req, res, next) => {
  upload.single ('photo') (req, res, async err => {
    if (err) {
      return res
        .status (400)
        .json ({message: 'Error processing file.', error: err});
    }
    if (!req.file) {
      return next ();
    }

    const storage = req.app.locals.gcsStorage;
    const bucketName = process.env.GCS_BUCKET_NAME;
    const bucket = storage.bucket (bucketName);
    const blobName = `${Date.now ()}-${req.file.originalname}`;
    const blob = bucket.file (blobName);

    const blobStream = blob.createWriteStream ({
      resumable: false,
    });

    blobStream.on ('error', err => {
      console.error ('GCS Upload Stream Error:', err);
      req.file.gcsError = err;
      next (err);
    });

    blobStream.on ('finish', () => {
      const publicUrl = `https://storage.googleapis.com/${bucketName}/${blobName}`;
      req.file.gcsUrl = publicUrl;
      next ();
    });

    blobStream.end (req.file.buffer);
  });
};

// --- ROUTE DEFINITIONS ---

// GET /api/items - Get all audio items for the logged-in user
router.get ('/', protect, async (req, res) => {
  try {
    const items = await AudioItem.find ({user: req.user.id}).sort ({
      createdAt: -1,
    });
    res.status (200).json (items);
  } catch (error) {
    res.status (500).json ({message: 'Server error fetching items.', error});
  }
});

// GET /api/items/:id - Get a single audio item by its ID
router.get ('/:id', protect, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid (req.params.id)) {
      return res.status (400).json ({message: 'Invalid item ID.'});
    }

    const item = await AudioItem.findById (req.params.id);

    if (!item) {
      return res.status (404).json ({message: 'Item not found.'});
    }

    if (item.user.toString () !== req.user.id) {
      return res
        .status (401)
        .json ({message: 'Not authorized to view this item.'});
    }

    res.status (200).json (item);
  } catch (error) {
    res.status (500).json ({message: 'Server error fetching item.', error});
  }
});

// POST /api/items - Create a new audio item (with image upload)
router.post ('/', protect, uploadToGcs, async (req, res) => {
  try {
    console.log (
      'DEBUG: POST /api/items - req.body:',
      JSON.stringify (req.body, null, 2)
    );
    console.log (
      'DEBUG: POST /api/items - req.file:',
      req.file ? req.file.originalname : 'No file uploaded'
    );

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
    } = req.body;

    if (!make || !model || !itemType || !condition) {
      return res.status (400).json ({
        message: 'Please provide all required fields: make, model, itemType, and condition.',
      });
    }

    // Robust handling for isFullyFunctional from form data
    let functionalStatus;
    // Directly access the property from req.body
    const isFullyFunctionalFromRequest = req.body.isFullyFunctional;

    if (isFullyFunctionalFromRequest === undefined) {
      // If the client doesn't send the field at all, Mongoose validation for 'required' will catch it.
      // Assign the raw value; Mongoose will validate.
      functionalStatus = undefined;
    } else if (typeof isFullyFunctionalFromRequest === 'string') {
      functionalStatus =
        isFullyFunctionalFromRequest.toLowerCase () === 'true' ||
        isFullyFunctionalFromRequest === 'on';
    } else {
      // If it's not undefined and not a string, treat it as a boolean
      functionalStatus = Boolean (isFullyFunctionalFromRequest);
    }

    const newItemData = {
      user: req.user.id,
      make,
      model,
      itemType,
      condition,
      isFullyFunctional: functionalStatus, // Use the processed value
      issuesDescription,
      specifications,
      notes,
      purchaseDate,
      purchasePrice,
      userEstimatedValue,
      userEstimatedValueDate: userEstimatedValue ? new Date () : null,
      photoUrls: req.file ? [req.file.gcsUrl] : [],
    };

    const newItem = await AudioItem.create (newItemData);
    res.status (201).json (newItem);
  } catch (error) {
    if (error.name === 'ValidationError') {
      console.error (
        'CREATE ITEM VALIDATION ERROR:',
        JSON.stringify (error.errors, null, 2)
      );
      return res.status (400).json ({
        message: 'Validation Error: Could not create item. Please check your input.',
        errors: error.errors, // Send detailed Mongoose validation errors
      });
    }
    console.error ('CREATE ITEM ERROR:', error);
    res
      .status (500)
      .json ({message: 'Server error creating item.', error: error.message});
  }
});

// PUT /api/items/:id - Update an audio item
router.put ('/:id', protect, uploadToGcs, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid (req.params.id)) {
      return res.status (400).json ({message: 'Invalid item ID.'});
    }

    const item = await AudioItem.findById (req.params.id);

    if (!item) {
      return res.status (404).json ({message: 'Item not found.'});
    }

    if (item.user.toString () !== req.user.id) {
      return res
        .status (401)
        .json ({message: 'Not authorized to update this item.'});
    }

    const updateData = {...req.body};

    if (req.file && req.file.gcsUrl) {
      updateData.photoUrls = [req.file.gcsUrl];
    }

    const updatedItem = await AudioItem.findByIdAndUpdate (
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    );

    res.status (200).json (updatedItem);
  } catch (error) {
    console.error ('UPDATE ITEM ERROR:', error);
    res.status (500).json ({message: 'Server error updating item.', error});
  }
});

// DELETE /api/items/:id - Delete an audio item
router.delete ('/:id', protect, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid (req.params.id)) {
      return res.status (400).json ({message: 'Invalid item ID.'});
    }

    const item = await AudioItem.findById (req.params.id);

    if (!item) {
      return res.status (404).json ({message: 'Item not found.'});
    }

    if (item.user.toString () !== req.user.id) {
      return res
        .status (401)
        .json ({message: 'Not authorized to delete this item.'});
    }

    if (item.photoUrls && item.photoUrls.length > 0) {
      const storage = req.app.locals.gcsStorage;
      const bucketName = process.env.GCS_BUCKET_NAME;

      for (const url of item.photoUrls) {
        try {
          const filename = url.split (`${bucketName}/`)[1];
          if (filename) {
            await storage.bucket (bucketName).file (filename).delete ();
          }
        } catch (gcsError) {
          console.error (`Failed to delete GCS object ${url}:`, gcsError);
        }
      }
    }

    await AudioItem.findByIdAndDelete (req.params.id);

    res
      .status (200)
      .json ({message: 'Item deleted successfully.', id: req.params.id});
  } catch (error) {
    res.status (500).json ({message: 'Server error deleting item.', error});
  }
});

// PATCH /api/items/:id/ai-evaluation - Get AI evaluation for an item
router.patch ('/:id/ai-evaluation', protect, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid (req.params.id)) {
      return res.status (400).json ({message: 'Invalid item ID.'});
    }

    const item = await AudioItem.findById (req.params.id);

    if (!item) {
      return res.status (404).json ({message: 'Item not found.'});
    }

    if (item.user.toString () !== req.user.id) {
      return res.status (401).json ({message: 'Not authorized for this item.'});
    }

    const [valueInsight, suggestions] = await Promise.all ([
      getAiValueInsight (item.make, item.model, item.condition, item.photoUrls),
      getRelatedGearSuggestions (
        item.make,
        item.model,
        item.itemType,
        item.photoUrls
      ),
    ]);

    item.aiValueInsight = valueInsight;
    item.aiSuggestions = suggestions;
    item.aiLastEvaluated = new Date ();

    const updatedItem = await item.save ();

    res.status (200).json (updatedItem);
  } catch (error) {
    console.error ('AI EVALUATION ERROR:', error);
    res.status (500).json ({
      message: 'Server error during AI evaluation.',
      error: error.message,
    });
  }
});

module.exports = router;
