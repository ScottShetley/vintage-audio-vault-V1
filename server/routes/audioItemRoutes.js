// server/routes/audioItemRoutes.js
const express = require ('express');
const AudioItem = require ('../models/AudioItem');
const {protect} = require ('../middleware/authMiddleware');
const multer = require ('multer');
const {Storage} = require ('@google-cloud/storage');
const path = require ('path');
const {
  getAiValueInsight,
  getRelatedGearSuggestions,
} = require ('../utils/geminiService');

const router = express.Router ();

// --- CONFIGURE MULTER ---
const storage = multer.memoryStorage ();
const upload = multer ({
  storage: storage,
  limits: {fileSize: 5 * 1024 * 1024}, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith ('image/')) {
      cb (null, true);
    } else {
      cb (new Error ('Only image files are allowed!'), false);
    }
  },
});
// --- END MULTER CONFIG ---

// --- CONFIGURE GOOGLE CLOUD STORAGE ---
const gcs = new Storage ({
  projectId: process.env.GCP_PROJECT_ID,
  keyFilename: path.join (__dirname, '..', process.env.GCS_KEY_FILE_PATH),
});

const bucket = gcs.bucket (process.env.GCS_BUCKET_NAME);

const uploadFileToGCS = file => {
  return new Promise ((resolve, reject) => {
    if (!file) {
      return resolve (null);
    }

    const newFileName = `${Date.now ()}-${file.originalname.replace (/ /g, '_')}`;
    const blob = bucket.file (newFileName);

    const blobStream = blob.createWriteStream ({
      resumable: false,
      metadata: {
        contentType: file.mimetype,
      },
      public: true,
    });

    blobStream.on ('error', err => {
      console.error ('GCS Upload Stream Error:', err);
      reject (err);
    });

    blobStream.on ('finish', () => {
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
      resolve (publicUrl);
    });

    blobStream.end (file.buffer);
  });
};
// --- END GCS CONFIG ---

// Protect all routes in this file with JWT authentication
router.use (protect);

// --- POST /api/items (Create new item) ---
router.post ('/', upload.array ('photos', 5), async (req, res) => {
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

    const parsedIsFullyFunctional = isFullyFunctional === 'true';

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

    const photoUrls = [];
    if (req.files && req.files.length > 0) {
      const uploadPromises = req.files.map (file => uploadFileToGCS (file));
      const uploadedUrls = await Promise.all (uploadPromises);
      photoUrls.push (...uploadedUrls.filter (url => url !== null));
    }

    const newItem = await AudioItem.create ({
      user: req.user._id,
      make,
      model,
      itemType,
      condition,
      isFullyFunctional: parsedIsFullyFunctional,
      issuesDescription: parsedIsFullyFunctional
        ? undefined
        : issuesDescription,
      specifications,
      notes,
      photoUrls: photoUrls,
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
      .json ({status: 'error', message: 'Server error while creating item.'});
  }
});

// --- GET /api/items (Get all items for authenticated user) ---
router.get ('/', async (req, res) => {
  try {
    const items = await AudioItem.find ({user: req.user._id}).sort ({
      createdAt: -1,
    });
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
  try {
    const {
      user,
      isFullyFunctional,
      existingPhotoUrls,
      ...updateData
    } = req.body;

    if (typeof isFullyFunctional !== 'undefined') {
      updateData.isFullyFunctional = isFullyFunctional === 'true';
      if (!updateData.isFullyFunctional) {
        updateData.issuesDescription = req.body.issuesDescription;
      } else {
        updateData.issuesDescription = undefined;
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

    let currentPhotoUrls = JSON.parse (existingPhotoUrls || '[]');

    if (req.files && req.files.length > 0) {
      const uploadPromises = req.files.map (file => uploadFileToGCS (file));
      const uploadedUrls = await Promise.all (uploadPromises);
      currentPhotoUrls.push (...uploadedUrls.filter (url => url !== null));
    }

    updateData.photoUrls = currentPhotoUrls;

    item = await AudioItem.findByIdAndUpdate (req.params.id, updateData, {
      new: true,
      runValidators: true,
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

// --- NEW AI ENDPOINTS (MODIFIED BLOCK TO PASS IMAGES) ---

// POST /api/items/:id/ai-value - Get AI Value Insight
router.post ('/:id/ai-value', async (req, res) => {
  try {
    const item = await AudioItem.findById (req.params.id);

    if (!item) {
      return res
        .status (404)
        .json ({status: 'fail', message: 'Item not found.'});
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

    // Pass item.photoUrls to getAiValueInsight
    const aiValueInsight = await getAiValueInsight (
      item.make,
      item.model,
      item.condition,
      item.photoUrls
    );

    res.status (200).json ({
      status: 'success',
      data: {
        aiValueInsight,
        disclaimer: 'This is an automated estimate for informational purposes only and not a formal appraisal. Market values fluctuate.',
      },
    });
  } catch (error) {
    console.error ('AI VALUE INSIGHT ERROR:', error);
    // Handle potential API errors from Gemini (e.g., rate limits, invalid API key)
    if (error.response && error.response.status === 429) {
      // Too Many Requests
      return res
        .status (429)
        .json ({
          status: 'fail',
          message: 'AI service is busy. Please try again in a moment.',
        });
    }
    res
      .status (500)
      .json ({
        status: 'error',
        message: 'Server error while getting AI value insight.',
      });
  }
});

// POST /api/items/:id/ai-suggest-gear - Get AI Related Gear Suggestions
router.post ('/:id/ai-suggest-gear', async (req, res) => {
  try {
    const item = await AudioItem.findById (req.params.id);

    if (!item) {
      return res
        .status (404)
        .json ({status: 'fail', message: 'Item not found.'});
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

    // Pass item.photoUrls to getRelatedGearSuggestions
    const aiSuggestions = await getRelatedGearSuggestions (
      item.make,
      item.model,
      item.itemType,
      item.photoUrls
    );

    res.status (200).json ({
      status: 'success',
      data: {
        aiSuggestions,
      },
    });
  } catch (error) {
    console.error ('AI SUGGESTIONS ERROR:', error);
    if (error.response && error.response.status === 429) {
      return res
        .status (429)
        .json ({
          status: 'fail',
          message: 'AI service is busy. Please try again in a moment.',
        });
    }
    res
      .status (500)
      .json ({
        status: 'error',
        message: 'Server error while getting AI suggestions.',
      });
  }
});

module.exports = router;
