// c:\Users\david\Desktop\projects\vintageaudiovault\server\routes\audioItemRoutes.js
console.log ('--- audioItemRoutes.js module is being loaded ---');

const express = require ('express');
const multer = require ('multer');
const {Readable} = require ('stream');
const {protect} = require ('../middleware/authMiddleware');
const AudioItem = require ('../models/AudioItem');
const {
  uploadToGcs,
  deleteFromGcs,
  getGeminiValuation,
  getGeminiGearSuggestions,
  getGeminiImageDescription, // Make sure this is correctly imported
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
  limits: {fileSize: 5 * 1024 * 1024}, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith ('image/')) {
      cb (null, true);
    } else {
      cb (new Error ('Not an image! Please upload an image file.'), false);
    }
  },
});

// This Multer instance is intended for the analyze-wild-find route
const uploadForAnalysis = multer ({
  storage: multer.memoryStorage (),
  limits: {fileSize: 10 * 1024 * 1024}, // 10MB
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

// POST /api/items/analyze-wild-find - Integrate Gemini AI Image Description
router.post (
  '/analyze-wild-find',
  protect,
  uploadForAnalysis.single ('image'),
  async (req, res) => {
    console.log (
      '--- GEMINI ANALYSIS /api/items/analyze-wild-find route hit! ---'
    );
    console.log ('User from token:', req.user);

    const gemini = req.app.locals.gemini;
    if (!gemini) {
      console.error ('Gemini AI service not available in /analyze-wild-find');
      return res.status (500).json ({
        message: 'Error: Gemini AI service not available.',
        status: 'error',
      });
    }

    if (!req.file) {
      console.log ('No file received for Gemini analysis.');
      return res.status (400).json ({
        message: 'No image file uploaded for analysis.',
        status: 'error',
        userIdFromToken: req.user.id, // req.user is guaranteed by 'protect' middleware
      });
    }

    console.log ('File received for Gemini analysis:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
    });

    try {
      // Assuming getGeminiImageDescription takes the gemini client and the file object (with buffer)
      const description = await getGeminiImageDescription (gemini, req.file);

      console.log ('Gemini AI Description:', description);

      res.status (200).json ({
        message: 'Wild Find analysis successful.',
        status: 'success',
        userIdFromToken: req.user.id, // req.user.id is guaranteed by 'protect'
        fileDetails: {
          name: req.file.originalname,
          type: req.file.mimetype,
          size: req.file.size,
        },
        analysisResult: {
          description: description,
          // You can add more fields here as your AI service provides them
        },
      });
    } catch (error) {
      console.error ('Error during Gemini AI image description:', error);
      res.status (500).json ({
        message: 'Error performing AI analysis on the image.',
        status: 'error',
        errorDetails: error.message, // Provide the specific error message
        userIdFromToken: req.user.id, // req.user is guaranteed by 'protect' middleware
      });
    }
  }
);

// --- CRUD Operations for Audio Items ---

// POST /api/items - Create a new audio item
router.post (
  '/',
  protect,
  upload.single ('photo'),
  uploadSingleToGcs,
  async (req, res) => {
    try {
      const {
        name,
        type,
        brand,
        model,
        serialNumber,
        purchaseDate,
        purchasePrice,
        description,
        condition,
        isFullyFunctional,
        isForSale,
        salePrice,
        notes,
      } = req.body;
      const newItemData = {
        user: req.user.id,
        name,
        type,
        brand,
        model,
        serialNumber,
        purchaseDate,
        purchasePrice: purchasePrice ? Number (purchasePrice) : undefined,
        description,
        condition,
        isFullyFunctional: String (isFullyFunctional).toLowerCase () === 'true',
        isForSale: String (isForSale).toLowerCase () === 'true',
        salePrice: salePrice ? Number (salePrice) : undefined,
        notes,
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

// GET /api/items - Get all audio items for the logged-in user
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

// GET /api/items/:id - Get a single audio item by ID
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

// PUT /api/items/:id - Update an audio item by ID
router.put (
  '/:id',
  protect,
  uploadMultiple.array ('newPhotos', 5), // Allows uploading up to 5 new photos
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

      // Handle photo updates:
      // - req.gcsUrls contains URLs of newly uploaded photos.
      // - req.body.existingPhotoUrls (if sent by client) contains URLs client wants to keep.
      const newPhotosUploaded = req.gcsUrls && req.gcsUrls.length > 0;
      const clientManagesExistingPhotos = updateFields.hasOwnProperty (
        'existingPhotoUrls'
      );

      if (newPhotosUploaded || clientManagesExistingPhotos) {
        let basePhotoUrls = [];
        if (clientManagesExistingPhotos) {
          // Client is explicitly stating which existing photos to keep
          const clientExistingUrls = updateFields.existingPhotoUrls;
          basePhotoUrls = Array.isArray (clientExistingUrls)
            ? clientExistingUrls
            : clientExistingUrls // Handle single string or array
                ? [clientExistingUrls]
                : [];
        } else if (newPhotosUploaded) {
          // Client is only adding new photos, keep all existing ones
          basePhotoUrls = item.photoUrls || [];
        }

        let finalPhotoUrls = [...basePhotoUrls];
        if (newPhotosUploaded) {
          finalPhotoUrls.push (...req.gcsUrls);
        }
        updateFields.photoUrls = finalPhotoUrls;
      }

      // Remove existingPhotoUrls from updateFields as it's not a schema field
      if (clientManagesExistingPhotos) {
        delete updateFields.existingPhotoUrls;
      }

      // Convert boolean strings to actual booleans
      if (updateFields.hasOwnProperty ('isFullyFunctional')) {
        updateFields.isFullyFunctional =
          String (updateFields.isFullyFunctional).toLowerCase () === 'true';
      }
      if (updateFields.hasOwnProperty ('isForSale')) {
        updateFields.isForSale =
          String (updateFields.isForSale).toLowerCase () === 'true';
      }
      // Convert price strings to numbers
      if (updateFields.purchasePrice) {
        updateFields.purchasePrice = Number (updateFields.purchasePrice);
      }
      if (updateFields.salePrice) {
        updateFields.salePrice = Number (updateFields.salePrice);
      }

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

// DELETE /api/items/:id - Delete an audio item by ID
router.delete ('/:id', protect, async (req, res) => {
  try {
    const item = await AudioItem.findById (req.params.id);
    if (!item) {
      return res.status (404).json ({message: 'Item not found'});
    }
    if (item.user.toString () !== req.user.id) {
      return res.status (401).json ({message: 'User not authorized'});
    }

    // Delete associated images from GCS
    const gcs = req.app.locals.gcs;
    if (item.photoUrls && item.photoUrls.length > 0 && gcs && gcs.bucketName) {
      const deletePromises = item.photoUrls.map (url =>
        deleteFromGcs (url, gcs.bucketName, gcs.storage)
      );
      await Promise.all (deletePromises).catch (err => {
        // Log error but proceed with item deletion from DB
        console.error (
          'Error deleting some images from GCS, but proceeding with item deletion:',
          err
        );
      });
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

// --- AI Feature Routes ---

// POST /api/items/:id/ai-valuation - Get AI valuation for an item
router.post ('/:id/ai-valuation', protect, async (req, res) => {
  try {
    const item = await AudioItem.findById (req.params.id);
    if (!item) return res.status (404).json ({message: 'Item not found'});
    if (item.user.toString () !== req.user.id)
      return res.status (401).json ({message: 'Not authorized'});

    const gemini = req.app.locals.gemini;
    if (!gemini)
      return res
        .status (500)
        .json ({message: 'Gemini AI service not available.'});

    const valuation = await getGeminiValuation (gemini, item);
    res.json ({valuation});
  } catch (error) {
    console.error ('Error getting AI valuation:', error);
    res
      .status (500)
      .json ({message: 'Error getting AI valuation', error: error.message});
  }
});

// POST /api/items/:id/ai-suggestions - Get AI gear suggestions for an item
router.post ('/:id/ai-suggestions', protect, async (req, res) => {
  try {
    const item = await AudioItem.findById (req.params.id);
    if (!item) return res.status (404).json ({message: 'Item not found'});
    if (item.user.toString () !== req.user.id)
      return res.status (401).json ({message: 'Not authorized'});

    const gemini = req.app.locals.gemini;
    if (!gemini)
      return res
        .status (500)
        .json ({message: 'Gemini AI service not available.'});

    const suggestions = await getGeminiGearSuggestions (gemini, item);
    res.json ({suggestions});
  } catch (error) {
    console.error ('Error getting AI suggestions:', error);
    res
      .status (500)
      .json ({message: 'Error getting AI suggestions', error: error.message});
  }
});

module.exports = router;
