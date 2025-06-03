// server/routes/audioItemRoutes.js
const express = require ('express');
const AudioItem = require ('../models/AudioItem'); // Adjust path as per your project structure
const {protect} = require ('../middleware/authMiddleware'); // Adjust path
const multer = require ('multer');
const {Storage} = require ('@google-cloud/storage'); // --- ADDED: GCS Import ---
const path = require ('path'); // --- ADDED: Path module for resolving key file path ---

const router = express.Router ();

// --- CONFIGURE MULTER ---
// Multer is configured to store files in memory as buffers.
// This is necessary before uploading to GCS.
const storage = multer.memoryStorage ();
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

// --- CONFIGURE GOOGLE CLOUD STORAGE ---
// Initialize GCS client with credentials from the key file.
// The keyFilename path is resolved relative to the current file's directory (__dirname).
// Ensure GCP_PROJECT_ID, GCS_BUCKET_NAME, and GCS_KEY_FILE_PATH are correctly set in your root .env
const gcs = new Storage ({
  projectId: process.env.GCP_PROJECT_ID,
  keyFilename: path.join (__dirname, '..', process.env.GCS_KEY_FILE_PATH), // Go up to server/ then into gcpjson/filename
});

const bucket = gcs.bucket (process.env.GCS_BUCKET_NAME); // Your GCS bucket name

// Helper function to upload a single file buffer to GCS
const uploadFileToGCS = file => {
  return new Promise ((resolve, reject) => {
    if (!file) {
      return resolve (null); // No file to upload
    }

    // Create a unique filename for the object in GCS
    const newFileName = `${Date.now ()}-${file.originalname.replace (/ /g, '_')}`; // Replace spaces for URLs
    const blob = bucket.file (newFileName); // Create a new blob (file) in the bucket

    // Create a writable stream to upload the file buffer
    const blobStream = blob.createWriteStream ({
      resumable: false, // Set to false for smaller files, true for larger ones
      metadata: {
        contentType: file.mimetype, // Set the content type for the uploaded file
      },
      public: true, // Make the uploaded object publicly readable
    });

    // Handle errors during the upload process
    blobStream.on ('error', err => {
      console.error ('GCS Upload Stream Error:', err);
      reject (err);
    });

    // Handle successful completion of the upload
    blobStream.on ('finish', () => {
      // Construct the public URL for the uploaded object
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
      resolve (publicUrl); // Resolve the promise with the public URL
    });

    // End the stream with the file's buffer, triggering the upload
    blobStream.end (file.buffer);
  });
};
// --- END GCS CONFIG ---

// Protect all routes in this file with JWT authentication
router.use (protect);

// --- POST /api/items (Create new item) ---
// 'upload.array('photos', 5)' middleware parses multipart/form-data.
// 'photos' is the field name from your frontend form, 5 is the max number of files.
router.post ('/', upload.array ('photos', 5), async (req, res) => {
  try {
    // Destructure text fields from req.body (parsed by multer)
    const {
      make,
      model,
      itemType,
      condition,
      isFullyFunctional, // Comes as a string 'true' or 'false' from FormData
      issuesDescription,
      specifications,
      notes,
      purchaseDate,
      purchasePrice,
      userEstimatedValue,
      userEstimatedValueDate,
    } = req.body;

    // Convert isFullyFunctional from string to boolean
    const parsedIsFullyFunctional = isFullyFunctional === 'true';

    // Basic validation for required fields
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

    // --- UPLOAD NEW PHOTOS TO GCS ---
    const photoUrls = [];
    // req.files contains the file buffers from multer
    if (req.files && req.files.length > 0) {
      // Map each file to an upload promise and wait for all to complete
      const uploadPromises = req.files.map (file => uploadFileToGCS (file));
      const uploadedUrls = await Promise.all (uploadPromises);
      // Filter out any nulls (failed uploads) and add successful URLs
      photoUrls.push (...uploadedUrls.filter (url => url !== null));
    }
    // --- END UPLOAD NEW PHOTOS TO GCS ---

    // Create a new AudioItem document in MongoDB
    const newItem = await AudioItem.create ({
      user: req.user._id, // Associate item with the logged-in user
      make,
      model,
      itemType,
      condition,
      isFullyFunctional: parsedIsFullyFunctional,
      issuesDescription: parsedIsFullyFunctional
        ? undefined
        : issuesDescription, // Only save if not fully functional
      specifications,
      notes,
      photoUrls: photoUrls, // Save the GCS public URLs
      purchaseDate,
      purchasePrice,
      userEstimatedValue,
      userEstimatedValueDate,
    });

    // Send success response with the new item
    res.status (201).json ({
      status: 'success',
      data: {
        item: newItem,
      },
    });
  } catch (error) {
    console.error ('CREATE ITEM ERROR:', error);
    // Handle specific error types
    if (error.name === 'ValidationError') {
      return res
        .status (400)
        .json ({status: 'fail', message: error.message, errors: error.errors});
    }
    if (error instanceof multer.MulterError) {
      return res
        .status (400)
        .json ({
          status: 'fail',
          message: `File upload error: ${error.message}`,
        });
    }
    if (error.message === 'Only image files are allowed!') {
      return res.status (400).json ({status: 'fail', message: error.message});
    }
    // Generic server error
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
    }); // Sort by newest first
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
// 'upload.array('photos', 5)' middleware parses multipart/form-data for new photos
router.put ('/:id', upload.array ('photos', 5), async (req, res) => {
  try {
    // Destructure text fields from req.body (parsed by multer)
    // existingPhotoUrls will come as a JSON string from the frontend
    const {
      user,
      isFullyFunctional,
      existingPhotoUrls,
      ...updateData
    } = req.body;

    // Convert isFullyFunctional from string to boolean if it exists in req.body
    if (typeof isFullyFunctional !== 'undefined') {
      updateData.isFullyFunctional = isFullyFunctional === 'true';
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

    // --- Handle existing photos (from frontend's existingPhotoUrls array) ---
    // Parse the JSON string of existing photo URLs back into an array.
    // This array represents the photos the user *kept* on the frontend.
    let currentPhotoUrls = JSON.parse (existingPhotoUrls || '[]');

    // --- Upload new photos to GCS for update ---
    // req.files contains the new file buffers from multer
    if (req.files && req.files.length > 0) {
      const uploadPromises = req.files.map (file => uploadFileToGCS (file));
      const uploadedUrls = await Promise.all (uploadPromises);
      currentPhotoUrls.push (...uploadedUrls.filter (url => url !== null)); // Add only successful new uploads
    }

    // Update the photoUrls field in the database with the combined list
    updateData.photoUrls = currentPhotoUrls;

    // Find and update the AudioItem document
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
    if (error instanceof multer.MulterError) {
      return res
        .status (400)
        .json ({
          status: 'fail',
          message: `File upload error: ${error.message}`,
        });
    }
    if (error.message === 'Only image files are allowed!') {
      return res.status (400).json ({status: 'fail', message: error.message});
    }
    res
      .status (500)
      .json ({status: 'error', message: 'Server error while updating item.'});
  }
});

// --- DELETE /api/items/:id (Delete item by ID) ---
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

    // --- OPTIONAL: Delete images from GCS when item is deleted ---
    // This is more advanced. For now, we'll just delete the DB record.
    // If item.photoUrls exists, you would loop through them and call gcs.bucket.file(filename).delete()
    // For now, we'll skip this to keep it simpler.

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
