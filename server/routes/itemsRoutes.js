const express = require ('express');
const router = express.Router ();
const multer = require ('multer');
const {Storage} = require ('@google-cloud/storage');
const MulterGoogleCloudStorage = require ('multer-google-storage');
const AudioItem = require ('../models/AudioItem'); // Your Mongoose model
const authMiddleware = require ('../middleware/authMiddleware');
const {
  getGeminiEvaluation,
  getGeminiGearSuggestions,
} = require ('../utils/geminiService'); // Assuming geminiService.js exists

// Configure Google Cloud Storage
// Ensure your .env file has GCP_KEY_PATH, GCP_PROJECT_ID, and GCS_BUCKET_NAME set
const gcsStorage = new Storage ({
  keyFilename: process.env.GCP_KEY_PATH,
  projectId: process.env.GCP_PROJECT_ID,
});

// Configure Multer with Google Cloud Storage
const upload = multer ({
  storage: MulterGoogleCloudStorage.storageEngine ({
    bucket: process.env.GCS_BUCKET_NAME,
    projectId: process.env.GCP_PROJECT_ID,
    keyFilename: process.env.GCP_KEY_PATH,
    filename: (req, file, cb) => {
      const uniqueSuffix =
        Date.now () + '-' + Math.round (Math.random () * 1e9);
      cb (null, uniqueSuffix + '-' + file.originalname.replace (/\s+/g, '_')); // Replace spaces in filename
    },
  }),
  limits: {fileSize: 10 * 1024 * 1024}, // 10MB file size limit per file
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith ('image/')) {
      cb (null, true);
    } else {
      cb (new Error ('Not an image! Please upload only images.'), false);
    }
  },
});

// --- Item Route Handlers (Inline) ---

// GET all items for the logged-in user
router.get ('/', authMiddleware, async (req, res) => {
  try {
    const items = await AudioItem.find ({user: req.user.id}).sort ({
      createdAt: -1,
    });
    res.status (200).json (items);
  } catch (error) {
    console.error ('Error fetching items:', error);
    res
      .status (500)
      .json ({message: 'Error fetching items', error: error.message});
  }
});

// GET a single item by ID
router.get ('/:id', authMiddleware, async (req, res) => {
  try {
    const item = await AudioItem.findOne ({
      _id: req.params.id,
      user: req.user.id,
    });
    if (!item) {
      return res
        .status (404)
        .json ({message: 'Item not found or not authorized'});
    }
    res.status (200).json (item);
  } catch (error) {
    console.error ('Error fetching item by ID:', error);
    if (error.kind === 'ObjectId') {
      return res
        .status (404)
        .json ({message: 'Item not found (invalid ID format)'});
    }
    res
      .status (500)
      .json ({message: 'Error fetching item', error: error.message});
  }
});

// POST a new item
router.post ('/', authMiddleware, upload.single ('photo'), async (req, res) => {
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

    let photoUrl = null;
    if (req.file) {
      // multer-google-storage provides publicUrl or you might need to construct it
      photoUrl =
        req.file.publicUrl ||
        `https://storage.googleapis.com/${process.env.GCS_BUCKET_NAME}/${req.file.filename}`;
    }

    const newItemData = {
      user: req.user.id,
      make,
      model,
      itemType,
      condition,
      isFullyFunctional: isFullyFunctional === 'true' ||
        isFullyFunctional === true,
      issuesDescription: isFullyFunctional === 'true' ||
        isFullyFunctional === true
        ? undefined
        : issuesDescription,
      specifications,
      notes,
      photoUrls: photoUrl ? [photoUrl] : [],
      purchaseDate: purchaseDate || undefined,
      purchasePrice: purchasePrice ? parseFloat (purchasePrice) : undefined,
      userEstimatedValue: userEstimatedValue
        ? parseFloat (userEstimatedValue)
        : undefined,
      userEstimatedValueDate: userEstimatedValueDate || undefined,
    };

    // Remove undefined fields to allow Mongoose defaults to apply if any
    Object.keys (newItemData).forEach (
      key => newItemData[key] === undefined && delete newItemData[key]
    );

    const item = new AudioItem (newItemData);
    await item.save ();
    res.status (201).json (item);
  } catch (error) {
    console.error ('Error creating item:', error);
    if (error.name === 'ValidationError') {
      return res
        .status (400)
        .json ({message: 'Validation failed', errors: error.errors});
    }
    res
      .status (500)
      .json ({message: 'Error creating item', error: error.message});
  }
});

// PUT (update) an item by ID
router.put (
  '/:id',
  authMiddleware,
  upload.array ('photos', 5),
  async (req, res) => {
    try {
      const itemId = req.params.id;
      const updateData = req.body;
      const newFiles = req.files; // Array of file objects from multer

      let item = await AudioItem.findOne ({_id: itemId, user: req.user.id});
      if (!item) {
        return res
          .status (404)
          .json ({message: 'Item not found or not authorized'});
      }

      // Update text fields from req.body
      // Be careful with type conversions and only update fields present in the model
      const allowedFields = [
        'make',
        'model',
        'itemType',
        'condition',
        'isFullyFunctional',
        'issuesDescription',
        'specifications',
        'notes',
        'purchaseDate',
        'purchasePrice',
        'userEstimatedValue',
        'userEstimatedValueDate',
        'isForSale',
        'askingPrice',
        'saleNotes',
        'aiValueInsight',
        'aiSuggestions',
        'aiLastEvaluated',
      ];

      for (const key of allowedFields) {
        if (updateData.hasOwnProperty (key)) {
          if (key === 'isFullyFunctional' || key === 'isForSale') {
            item[key] = updateData[key] === 'true' || updateData[key] === true;
          } else if (
            ['purchasePrice', 'userEstimatedValue', 'askingPrice'].includes (
              key
            )
          ) {
            item[key] = updateData[key] === '' || updateData[key] === null
              ? null
              : parseFloat (updateData[key]);
          } else if (
            [
              'purchaseDate',
              'userEstimatedValueDate',
              'aiLastEvaluated',
            ].includes (key)
          ) {
            item[key] = updateData[key] ? new Date (updateData[key]) : null;
          } else if (['aiValueInsight', 'aiSuggestions'].includes (key)) {
            // Assuming these are sent as JSON strings from client if not FormData
            // If they are part of FormData and are objects, direct assignment is fine.
            // If client sends them as stringified JSON:
            // item[key] = typeof updateData[key] === 'string' ? JSON.parse(updateData[key]) : updateData[key];
            // For now, assuming client sends them correctly if they are part of FormData
            item[key] = updateData[key];
          } else {
            item[key] = updateData[key];
          }
        }
      }
      if (item.isFullyFunctional) {
        item.issuesDescription = undefined; // Clear issues if functional
      }

      // Handle photo URLs
      // Client sends 'existingPhotoUrls' as an array of URLs to keep.
      // New photos are in 'req.files'.
      let updatedPhotoUrls = [];
      if (updateData.existingPhotoUrls) {
        if (Array.isArray (updateData.existingPhotoUrls)) {
          updatedPhotoUrls = updateData.existingPhotoUrls;
        } else if (
          typeof updateData.existingPhotoUrls === 'string' &&
          updateData.existingPhotoUrls.length > 0
        ) {
          // If client sends a single string (e.g. from a non-array form field), split by comma or assume one URL
          // For safety, let's assume it's an array or a single URL string.
          // If it's a single URL string, it should be parsed as such.
          // The client (EditItemPage) sends an array, so this branch might not be needed if client is consistent.
          try {
            // Attempt to parse if it's a JSON string array
            const parsedUrls = JSON.parse (updateData.existingPhotoUrls);
            if (Array.isArray (parsedUrls)) updatedPhotoUrls = parsedUrls;
          } catch (e) {
            // If not a JSON string array, and it's a non-empty string, treat as single URL
            // This part is tricky and depends on how client sends it if not an array.
            // Given EditItemPage sends an array, this might be over-engineering.
            // For now, let's rely on client sending an array or an empty array.
            // If `updateData.existingPhotoUrls` is just one string URL, it won't be an array.
            // The client's `FormData` for `existingPhotoUrls` might send multiple entries
            // or a single entry with a stringified array.
            // Let's assume client sends it such that req.body.existingPhotoUrls is an array or undefined.
            // If it's a single string from FormData, req.body.existingPhotoUrls will be that string.
            // If multiple entries with same name, req.body.existingPhotoUrls will be an array.
            // This is why logging req.body is important.
            // For now, assuming it's an array if present.
          }
        }
      }
      // If existingPhotoUrls is not sent at all, it means client wants to keep all current photos
      // unless new photos are added (which would replace all if this logic isn't careful).
      // A robust way: client ALWAYS sends the full list of URLs to keep.
      // If `updateData.existingPhotoUrls` is not in `req.body`, it means no change to existing photos unless new ones are added.
      // This is complex. Let's assume client sends `existingPhotoUrls` as the list of URLs to keep.
      // If it's an empty array, all old photos are removed.

      if (newFiles && newFiles.length > 0) {
        newFiles.forEach (file => {
          const newPhotoUrl =
            file.publicUrl ||
            `https://storage.googleapis.com/${process.env.GCS_BUCKET_NAME}/${file.filename}`;
          updatedPhotoUrls.push (newPhotoUrl);
        });
      }
      item.photoUrls = updatedPhotoUrls;

      const savedItem = await item.save ();
      res.status (200).json (savedItem);
    } catch (error) {
      console.error ('Error updating item:', error);
      if (error.name === 'ValidationError') {
        return res
          .status (400)
          .json ({message: 'Validation failed', errors: error.errors});
      }
      // Check for Multer errors that might not have been caught by its own error handler
      if (error instanceof multer.MulterError) {
        return res
          .status (400)
          .json ({
            message: `File upload error: ${error.message}`,
            code: error.code,
          });
      }
      res
        .status (500)
        .json ({message: 'Error updating item', error: error.message});
    }
  }
);

// DELETE an item by ID
router.delete ('/:id', authMiddleware, async (req, res) => {
  try {
    const item = await AudioItem.findOneAndDelete ({
      _id: req.params.id,
      user: req.user.id,
    });
    if (!item) {
      return res
        .status (404)
        .json ({message: 'Item not found or not authorized'});
    }
    // Optionally, delete images from GCS here if needed
    res.status (200).json ({message: 'Item deleted successfully'});
  } catch (error) {
    console.error ('Error deleting item:', error);
    res
      .status (500)
      .json ({message: 'Error deleting item', error: error.message});
  }
});

// --- AI Related Route Handlers (Inline) ---

// PATCH an item for AI evaluation (value and suggestions)
router.patch ('/:id/ai-evaluation', authMiddleware, async (req, res) => {
  try {
    const item = await AudioItem.findOne ({
      _id: req.params.id,
      user: req.user.id,
    });
    if (!item) {
      return res
        .status (404)
        .json ({message: 'Item not found or not authorized'});
    }

    const itemDescription = `${item.make} ${item.model} ${item.itemType}, Condition: ${item.condition}. Specifications: ${item.specifications || 'N/A'}. Notes: ${item.notes || 'N/A'}`;
    const photoUrls = item.photoUrls || [];

    // Call Gemini for value insight
    const valueInsight = await getGeminiEvaluation (itemDescription, photoUrls);
    // Call Gemini for gear suggestions
    const gearSuggestions = await getGeminiGearSuggestions (
      itemDescription,
      photoUrls
    ); // Or pass item details

    item.aiValueInsight = valueInsight;
    item.aiSuggestions = gearSuggestions;
    item.aiLastEvaluated = new Date ();

    await item.save ();
    res.status (200).json (item); // Return the updated item
  } catch (error) {
    console.error ('Error during AI evaluation:', error);
    if (error.message && error.message.includes ('429')) {
      // Basic check for rate limiting
      return res
        .status (429)
        .json ({
          message: 'AI service is busy or rate limited. Please try again later.',
          error: error.message,
        });
    }
    res
      .status (500)
      .json ({message: 'Error during AI evaluation', error: error.message});
  }
});

// POST route for AI gear suggestions (if you still need this separate from ai-evaluation)
router.post ('/:id/ai-suggest-gear', authMiddleware, async (req, res) => {
  try {
    const item = await AudioItem.findOne ({
      _id: req.params.id,
      user: req.user.id,
    });
    if (!item) {
      return res
        .status (404)
        .json ({message: 'Item not found or not authorized'});
    }
    const itemDescription = `${item.make} ${item.model} ${item.itemType}, Condition: ${item.condition}.`;
    const photoUrls = item.photoUrls || [];

    const suggestions = await getGeminiGearSuggestions (
      itemDescription,
      photoUrls
    );

    // Decide if you want to save these suggestions to the item or just return them
    // For now, just returning them as per typical POST behavior for suggestions
    // If saving:
    // item.aiSuggestions = suggestions;
    // item.aiLastEvaluated = new Date(); // Or a separate timestamp for suggestions
    // await item.save();
    // return res.status(200).json(item);

    res.status (200).json ({aiSuggestions: suggestions});
  } catch (error) {
    console.error ('Error getting AI gear suggestions:', error);
    res
      .status (500)
      .json ({
        message: 'Error getting AI gear suggestions',
        error: error.message,
      });
  }
});

module.exports = router;
