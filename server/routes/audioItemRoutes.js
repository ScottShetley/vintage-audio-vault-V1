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
const multerStorage = multer.memoryStorage (); // Use memoryStorage to process files before GCS
const upload = multer ({
  storage: multerStorage,
  limits: {fileSize: 10 * 1024 * 1024}, // 10MB file size limit per file
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith ('image/')) {
      cb (null, true);
    } else {
      cb (new Error ('Not an image! Please upload only images.'), false);
    }
  },
});

// Middleware for single 'photo' upload (used by POST /api/items)
const uploadSingleToGcs = (req, res, next) => {
  upload.single ('photo') (req, res, async err => {
    if (err) {
      if (err instanceof multer.MulterError) {
        return res
          .status (400)
          .json ({
            message: `File upload error: ${err.message}`,
            code: err.code,
          });
      }
      return res
        .status (400)
        .json ({message: 'Error processing file.', error: err.message});
    }
    if (!req.file) {
      // If no file named 'photo' was uploaded
      return next ();
    }

    const storage = req.app.locals.gcsStorage; // Get GCS storage client from app.locals
    const bucketName = process.env.GCS_BUCKET_NAME;
    if (!bucketName) {
      console.error ('GCS_BUCKET_NAME environment variable not set.');
      return next (new Error ('Server configuration error for file uploads.'));
    }
    const bucket = storage.bucket (bucketName);
    const blobName = `${Date.now ()}-${req.file.originalname.replace (/\s+/g, '_')}`;
    const blob = bucket.file (blobName);

    const blobStream = blob.createWriteStream ({
      resumable: false,
      contentType: req.file.mimetype,
    });

    blobStream.on ('error', gcsErr => {
      console.error ('GCS Upload Stream Error (single):', gcsErr);
      req.file.gcsError = gcsErr; // Attach error for potential further handling
      next (gcsErr);
    });

    blobStream.on ('finish', () => {
      req.file.gcsUrl = `https://storage.googleapis.com/${bucketName}/${blobName}`;
      next ();
    });

    blobStream.end (req.file.buffer);
  });
};

// Middleware for multiple 'photos' upload (used by PUT /api/items/:id)
const uploadMultipleToGcs = (req, res, next) => {
  upload.array ('photos', 5) (req, res, async err => {
    // Expect up to 5 files in 'photos' field
    if (err) {
      if (err instanceof multer.MulterError) {
        // This specific error means multer didn't find the 'photos' field, or another multer error occurred.
        // If it's 'LIMIT_UNEXPECTED_FILE', it means the field name was wrong.
        return res
          .status (400)
          .json ({
            message: `File upload error: ${err.message}`,
            code: err.code,
            field: err.field,
          });
      }
      return res
        .status (400)
        .json ({message: 'Error processing files.', error: err.message});
    }
    if (!req.files || req.files.length === 0) {
      // If no files named 'photos' were uploaded
      return next ();
    }

    const storage = req.app.locals.gcsStorage;
    const bucketName = process.env.GCS_BUCKET_NAME;
    if (!bucketName) {
      console.error ('GCS_BUCKET_NAME environment variable not set.');
      return next (new Error ('Server configuration error for file uploads.'));
    }
    const bucket = storage.bucket (bucketName);

    req.gcsUrls = []; // Initialize an array to store GCS URLs for new files

    try {
      await Promise.all (
        req.files.map (
          file =>
            new Promise ((resolve, reject) => {
              const blobName = `${Date.now ()}-${file.originalname.replace (/\s+/g, '_')}`;
              const blob = bucket.file (blobName);
              const blobStream = blob.createWriteStream ({
                resumable: false,
                contentType: file.mimetype,
              });

              blobStream.on ('error', gcsErr => {
                console.error (
                  `GCS Upload Stream Error (multiple) for ${file.originalname}:`,
                  gcsErr
                );
                reject (gcsErr);
              });
              blobStream.on ('finish', () => {
                req.gcsUrls.push (
                  `https://storage.googleapis.com/${bucketName}/${blobName}`
                );
                resolve ();
              });
              blobStream.end (file.buffer);
            })
        )
      );
      next ();
    } catch (uploadError) {
      console.error (
        'Error during GCS multiple upload processing:',
        uploadError
      );
      next (uploadError); // Pass error to Express error handler
    }
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
    console.error ('GET /api/items error:', error);
    res
      .status (500)
      .json ({message: 'Server error fetching items.', error: error.message});
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
    console.error (`GET /api/items/${req.params.id} error:`, error);
    res
      .status (500)
      .json ({message: 'Server error fetching item.', error: error.message});
  }
});

// POST /api/items - Create a new audio item (with image upload)
router.post ('/', protect, uploadSingleToGcs, async (req, res) => {
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
      userEstimatedValueDate, // Added userEstimatedValueDate
    } = req.body;

    if (
      !make ||
      !model ||
      !itemType ||
      !condition ||
      typeof req.body.isFullyFunctional === 'undefined'
    ) {
      return res.status (400).json ({
        message: 'Please provide all required fields: make, model, itemType, condition, and functional status.',
      });
    }

    let functionalStatus = String (isFullyFunctional).toLowerCase () === 'true';

    const newItemData = {
      user: req.user.id,
      make,
      model,
      itemType,
      condition,
      isFullyFunctional: functionalStatus,
      issuesDescription: functionalStatus ? undefined : issuesDescription,
      specifications,
      notes,
      purchaseDate: purchaseDate || undefined,
      purchasePrice: purchasePrice ? parseFloat (purchasePrice) : undefined,
      userEstimatedValue: userEstimatedValue
        ? parseFloat (userEstimatedValue)
        : undefined,
      userEstimatedValueDate: userEstimatedValueDate || undefined, // Use value from req.body
      photoUrls: req.file && req.file.gcsUrl ? [req.file.gcsUrl] : [],
    };

    Object.keys (newItemData).forEach (
      key => newItemData[key] === undefined && delete newItemData[key]
    );

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
        errors: error.errors,
      });
    }
    console.error ('CREATE ITEM ERROR:', error);
    res
      .status (500)
      .json ({message: 'Server error creating item.', error: error.message});
  }
});

// PUT /api/items/:id - Update an audio item
router.put ('/:id', protect, uploadMultipleToGcs, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid (req.params.id)) {
      return res.status (400).json ({message: 'Invalid item ID.'});
    }
    let item = await AudioItem.findById (req.params.id);
    if (!item) {
      return res.status (404).json ({message: 'Item not found.'});
    }
    if (item.user.toString () !== req.user.id) {
      return res
        .status (401)
        .json ({message: 'Not authorized to update this item.'});
    }

    const updateFields = {...req.body}; // Start with text fields from body

    // Handle photo URLs: merge existingPhotoUrls with new GCS URLs
    let combinedPhotoUrls = [];
    if (updateFields.existingPhotoUrls) {
      combinedPhotoUrls = Array.isArray (updateFields.existingPhotoUrls)
        ? updateFields.existingPhotoUrls
        : [updateFields.existingPhotoUrls]; // Ensure it's an array
    }

    if (req.gcsUrls && req.gcsUrls.length > 0) {
      // req.gcsUrls is populated by uploadMultipleToGcs
      combinedPhotoUrls.push (...req.gcsUrls);
    }
    updateFields.photoUrls = combinedPhotoUrls;
    delete updateFields.existingPhotoUrls; // Not part of the schema

    // Handle boolean conversion for isFullyFunctional and isForSale
    if (updateFields.hasOwnProperty ('isFullyFunctional')) {
      updateFields.isFullyFunctional =
        String (updateFields.isFullyFunctional).toLowerCase () === 'true';
    }
    if (updateFields.hasOwnProperty ('isForSale')) {
      updateFields.isForSale =
        String (updateFields.isForSale).toLowerCase () === 'true';
    }
    // Clear issuesDescription if item is marked as fully functional
    if (updateFields.isFullyFunctional === true) {
      updateFields.issuesDescription = ''; // Or undefined, depending on schema preference for empty
    }

    // Type conversion for numeric fields
    ['purchasePrice', 'userEstimatedValue', 'askingPrice'].forEach (field => {
      if (updateFields.hasOwnProperty (field)) {
        if (updateFields[field] === '' || updateFields[field] === null) {
          updateFields[field] = null; // Or undefined if schema default is desired
        } else {
          const num = parseFloat (updateFields[field]);
          updateFields[field] = isNaN (num) ? item[field] : num; // Revert to old value if NaN, or handle error
        }
      }
    });
    // Type conversion for date fields
    [
      'purchaseDate',
      'userEstimatedValueDate',
      'aiLastEvaluated',
    ].forEach (field => {
      if (updateFields.hasOwnProperty (field) && updateFields[field]) {
        const date = new Date (updateFields[field]);
        updateFields[field] = isNaN (date.getTime ()) ? item[field] : date; // Revert if invalid date
      } else if (updateFields.hasOwnProperty (field) && !updateFields[field]) {
        updateFields[field] = null; // Set to null if empty string or null sent
      }
    });

    const updatedItem = await AudioItem.findByIdAndUpdate (
      req.params.id,
      {$set: updateFields}, // Use $set to apply updates
      {new: true, runValidators: true, context: 'query'}
    );

    if (!updatedItem) {
      // Should not happen if item was found earlier, but good check
      return res
        .status (404)
        .json ({message: 'Item not found after update attempt.'});
    }

    res.status (200).json (updatedItem);
  } catch (error) {
    if (error.name === 'ValidationError') {
      console.error (
        'UPDATE ITEM VALIDATION ERROR:',
        JSON.stringify (error.errors, null, 2)
      );
      return res.status (400).json ({
        message: 'Validation Error: Could not update item. Please check your input.',
        errors: error.errors,
      });
    }
    console.error (
      'UPDATE ITEM ERROR:',
      error.name,
      error.message,
      error.stack
    );
    res
      .status (500)
      .json ({message: 'Server error updating item.', error: error.message});
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

    // Delete images from GCS
    if (item.photoUrls && item.photoUrls.length > 0) {
      const storage = req.app.locals.gcsStorage;
      const bucketName = process.env.GCS_BUCKET_NAME;
      if (bucketName) {
        for (const url of item.photoUrls) {
          try {
            const filename = url.split (`${bucketName}/`)[1];
            if (filename) {
              await storage.bucket (bucketName).file (filename).delete ();
              console.log (`Deleted GCS object: ${filename}`);
            }
          } catch (gcsError) {
            console.error (`Failed to delete GCS object ${url}:`, gcsError);
            // Decide if you want to proceed with DB deletion even if GCS deletion fails
          }
        }
      } else {
        console.warn ('GCS_BUCKET_NAME not set. Skipping GCS file deletion.');
      }
    }

    await AudioItem.findByIdAndDelete (req.params.id);
    res
      .status (200)
      .json ({message: 'Item deleted successfully.', id: req.params.id});
  } catch (error) {
    console.error ('DELETE /api/items/:id error:', error);
    res
      .status (500)
      .json ({message: 'Server error deleting item.', error: error.message});
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

    const itemDescription = `${item.make} ${item.model} (${item.itemType || 'N/A'}) - Condition: ${item.condition || 'N/A'}. Specifications: ${item.specifications || 'N/A'}. Notes: ${item.notes || 'N/A'}`;
    const photoUrlsForAI = item.photoUrls && item.photoUrls.length > 0
      ? item.photoUrls
      : undefined;

    const [valueInsight, suggestions] = await Promise.all ([
      getAiValueInsight (item.make, item.model, item.condition, photoUrlsForAI),
      getRelatedGearSuggestions (
        item.make,
        item.model,
        item.itemType,
        photoUrlsForAI
      ),
    ]);

    item.aiValueInsight = valueInsight;
    item.aiSuggestions = suggestions;
    item.aiLastEvaluated = new Date ();
    const updatedItem = await item.save ();
    res.status (200).json (updatedItem);
  } catch (error) {
    console.error ('AI EVALUATION ERROR:', error);
    // Check for specific Gemini API errors if possible, e.g., rate limits
    if (
      error.message &&
      (error.message.includes ('429') ||
        error.message.toLowerCase ().includes ('rate limit'))
    ) {
      return res
        .status (429)
        .json ({
          message: 'AI service is busy or rate limited. Please try again later.',
          error: error.message,
        });
    }
    res
      .status (500)
      .json ({
        message: 'Server error during AI evaluation.',
        error: error.message,
      });
  }
});

module.exports = router;
