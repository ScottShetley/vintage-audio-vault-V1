// server/routes/audioItemRoutes.js
const express = require ('express');
const AudioItem = require ('../models/AudioItem'); // Adjust path as per your project structure
const {protect} = require ('../middleware/authMiddleware'); // Adjust path
const multer = require ('multer'); // --- ADDED: Multer import ---

const router = express.Router ();

// --- CONFIGURE MULTER (ADDED: Multer setup for file uploads) ---
// Set up multer for handling file uploads
// For now, we'll store files in memory. We'll integrate GCS later.
const storage = multer.memoryStorage (); // Store file in memory as a Buffer
const upload = multer ({
  storage: storage,
  limits: {fileSize: 5 * 1024 * 1024}, // Limit file size to 5MB (adjust as needed)
  fileFilter: (req, file, cb) => {
    // Only allow image files
    if (file.mimetype.startsWith ('image/')) {
      cb (null, true);
    } else {
      cb (new Error ('Only image files are allowed!'), false);
    }
  },
});
// --- END MULTER CONFIG ---

// Protect all routes in this file
router.use (protect);

// --- POST /api/items (Create new item) ---
// Add 'upload.array('photos', 5)' middleware to parse multipart/form-data
// 'photos' is the field name from your frontend form, 5 is the max number of files
router.post ('/', upload.array ('photos', 5), async (req, res) => {
  // --- MULTER APPLIED HERE ---
  try {
    // With multer, text fields are in req.body, files are in req.files (an array of file objects)
    const {
      make,
      model,
      itemType,
      condition,
      isFullyFunctional, // This comes as a string 'true' or 'false' from FormData
      issuesDescription,
      specifications,
      notes,
      photoUrls, // This will be undefined from FormData if not explicitly appended as a string
      purchaseDate,
      purchasePrice,
      userEstimatedValue,
      userEstimatedValueDate,
    } = req.body;

    // Convert isFullyFunctional from string to boolean
    const parsedIsFullyFunctional = isFullyFunctional === 'true';

    // Basic validation (Mongoose schema will also validate)
    if (
      !make ||
      !model ||
      !itemType ||
      !condition ||
      typeof parsedIsFullyFunctional === 'undefined'
    ) {
      return res.status (400).json ({
        status: 'fail',
        message: 'Please provide all required fields: make, model, itemType, condition, isFullyFunctional.',
      });
    }

    const newItem = await AudioItem.create ({
      user: req.user._id, // Associate item with the logged-in user
      make,
      model,
      itemType,
      condition,
      isFullyFunctional: parsedIsFullyFunctional, // Use the parsed boolean value
      issuesDescription: parsedIsFullyFunctional
        ? undefined
        : issuesDescription, // Only save if not fully functional
      specifications,
      notes,
      photoUrls: [], // Temporarily set to empty array. GCS upload logic will populate this later.
      purchaseDate,
      purchasePrice,
      userEstimatedValue,
      userEstimatedValueDate,
    });

    res.status (201).json ({
      status: 'success',
      data: {
        item: newItem,
      },
    });
  } catch (error) {
    console.error ('CREATE ITEM ERROR:', error);
    if (error.name === 'ValidationError') {
      return res
        .status (400)
        .json ({status: 'fail', message: error.message, errors: error.errors});
    }
    // Handle multer errors specifically (e.g., file size limit, invalid file type)
    if (error instanceof multer.MulterError) {
      return res
        .status (400)
        .json ({
          status: 'fail',
          message: `File upload error: ${error.message}`,
        });
    }
    if (error.message === 'Only image files are allowed!') {
      // Custom error from fileFilter
      return res.status (400).json ({status: 'fail', message: error.message});
    }
    res
      .status (500)
      .json ({status: 'error', message: 'Server error while creating item.'});
  }
});

// --- GET /api/items (Get all items for authenticated user) ---
router.get ('/', async (req, res) => {
  try {
    const items = await AudioItem.find ({user: req.user._id}).sort ({
      createdAt: -1,
    }); // Sort by newest
    res.status (200).json ({
      status: 'success',
      results: items.length,
      data: {
        items,
      },
    });
  } catch (error) {
    console.error ('GET ALL ITEMS ERROR:', error);
    res
      .status (500)
      .json ({status: 'error', message: 'Server error while fetching items.'});
  }
});

// --- GET /api/items/:id (Get single item by ID) ---
router.get ('/:id', async (req, res) => {
  try {
    const item = await AudioItem.findById (req.params.id);

    if (!item) {
      return res
        .status (404)
        .json ({status: 'fail', message: 'No item found with that ID.'});
    }

    // Ensure the logged-in user owns the item
    if (item.user.toString () !== req.user._id.toString ()) {
      return res
        .status (403)
        .json ({
          status: 'fail',
          message: 'You are not authorized to access this item.',
        });
    }

    res.status (200).json ({status: 'success', data: {item}});
  } catch (error) {
    console.error ('GET SINGLE ITEM ERROR:', error);
    if (error.kind === 'ObjectId') {
      // Mongoose specific error for invalid ID format
      return res
        .status (400)
        .json ({status: 'fail', message: 'Invalid item ID format.'});
    }
    res
      .status (500)
      .json ({status: 'error', message: 'Server error while fetching item.'});
  }
});

// --- PUT /api/items/:id (Update item by ID) ---
router.put ('/:id', upload.array ('photos', 5), async (req, res) => {
  // --- MULTER APPLIED HERE ---
  try {
    // With multer, text fields are in req.body, files are in req.files
    // We still destructure updateData from req.body
    const {user, photoUrls, isFullyFunctional, ...updateData} = req.body; // --- MODIFIED: Added isFullyFunctional to destructure ---

    // Convert isFullyFunctional from string to boolean if it exists in req.body
    if (typeof isFullyFunctional !== 'undefined') {
      updateData.isFullyFunctional = isFullyFunctional === 'true';
      // Handle issuesDescription conditionally based on the new isFullyFunctional value
      if (!updateData.isFullyFunctional) {
        updateData.issuesDescription = req.body.issuesDescription;
      } else {
        updateData.issuesDescription = undefined; // Clear if now fully functional
      }
    }

    let item = await AudioItem.findById (req.params.id);

    if (!item) {
      return res
        .status (404)
        .json ({
          status: 'fail',
          message: 'No item found with that ID to update.',
        });
    }

    if (item.user.toString () !== req.user._id.toString ()) {
      return res
        .status (403)
        .json ({
          status: 'fail',
          message: 'You are not authorized to update this item.',
        });
    }

    // Note: photoUrls from frontend's FormData are not processed into DB yet.
    // This part will be handled when GCS integration is done.
    // For now, if photoUrls were sent, they are ignored by this update.

    item = await AudioItem.findByIdAndUpdate (req.params.id, updateData, {
      new: true, // Return the modified document rather than the original
      runValidators: true, // Ensure schema validations are run on update
    });

    res.status (200).json ({status: 'success', data: {item}});
  } catch (error) {
    console.error ('UPDATE ITEM ERROR:', error);
    if (error.name === 'ValidationError') {
      return res
        .status (400)
        .json ({status: 'fail', message: error.message, errors: error.errors});
    }
    if (error.kind === 'ObjectId') {
      return res
        .status (400)
        .json ({status: 'fail', message: 'Invalid item ID format.'});
    }
    // Handle multer errors specifically (e.g., file size limit, invalid file type)
    if (error instanceof multer.MulterError) {
      return res
        .status (400)
        .json ({
          status: 'fail',
          message: `File upload error: ${error.message}`,
        });
    }
    if (error.message === 'Only image files are allowed!') {
      // Custom error from fileFilter
      return res.status (400).json ({status: 'fail', message: error.message});
    }
    res
      .status (500)
      .json ({status: 'error', message: 'Server error while updating item.'});
  }
});

router.delete ('/:id', async (req, res) => {
  try {
    const item = await AudioItem.findById (req.params.id);

    if (!item) {
      return res
        .status (404)
        .json ({
          status: 'fail',
          message: 'No item found with that ID to delete.',
        });
    }

    if (item.user.toString () !== req.user._id.toString ()) {
      return res
        .status (403)
        .json ({
          status: 'fail',
          message: 'You are not authorized to delete this item.',
        });
    }

    await AudioItem.findByIdAndDelete (req.params.id);

    res.status (204).json ({status: 'success', data: null}); // 204 No Content
  } catch (error) {
    console.error ('DELETE ITEM ERROR:', error);
    if (error.kind === 'ObjectId') {
      return res
        .status (400)
        .json ({status: 'fail', message: 'Invalid item ID format.'});
    }
    res
      .status (500)
      .json ({status: 'error', message: 'Server error while deleting item.'});
  }
});

module.exports = router;
