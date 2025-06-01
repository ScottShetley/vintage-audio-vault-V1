const express = require('express');
const AudioItem = require('../models/AudioItem'); // Adjust path as per your project structure
const { protect } = require('../middleware/authMiddleware'); // Adjust path

const router = express.Router();

// Protect all routes in this file
router.use(protect);

// --- POST /api/items (Create new item) ---
router.post('/', async (req, res) => {
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
      photoUrls,
      purchaseDate,
      purchasePrice,
      userEstimatedValue,
      userEstimatedValueDate,
    } = req.body;

    // Basic validation (Mongoose schema will also validate)
    if (!make || !model || !itemType || !condition || typeof isFullyFunctional === 'undefined') {
      return res.status(400).json({
        status: 'fail',
        message: 'Please provide all required fields: make, model, itemType, condition, isFullyFunctional.',
      });
    }

    const newItem = await AudioItem.create({
      user: req.user._id, // Associate item with the logged-in user
      make,
      model,
      itemType,
      condition,
      isFullyFunctional,
      issuesDescription,
      specifications,
      notes,
      photoUrls,
      purchaseDate,
      purchasePrice,
      userEstimatedValue,
      userEstimatedValueDate,
    });

    res.status(201).json({
      status: 'success',
      data: {
        item: newItem,
      },
    });
  } catch (error) {
    console.error('CREATE ITEM ERROR:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ status: 'fail', message: error.message, errors: error.errors });
    }
    res.status(500).json({ status: 'error', message: 'Server error while creating item.' });
  }
});

// --- GET /api/items (Get all items for authenticated user) ---
router.get('/', async (req, res) => {
  try {
    const items = await AudioItem.find({ user: req.user._id }).sort({ createdAt: -1 }); // Sort by newest
    res.status(200).json({
      status: 'success',
      results: items.length,
      data: {
        items,
      },
    });
  } catch (error) {
    console.error('GET ALL ITEMS ERROR:', error);
    res.status(500).json({ status: 'error', message: 'Server error while fetching items.' });
  }
});

// --- GET /api/items/:id (Get single item by ID) ---
router.get('/:id', async (req, res) => {
  try {
    const item = await AudioItem.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ status: 'fail', message: 'No item found with that ID.' });
    }

    // Ensure the logged-in user owns the item
    if (item.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ status: 'fail', message: 'You are not authorized to access this item.' });
    }

    res.status(200).json({ status: 'success', data: { item } });
  } catch (error) {
    console.error('GET SINGLE ITEM ERROR:', error);
    if (error.kind === 'ObjectId') { // Mongoose specific error for invalid ID format
        return res.status(400).json({ status: 'fail', message: 'Invalid item ID format.' });
    }
    res.status(500).json({ status: 'error', message: 'Server error while fetching item.' });
  }
});

// --- PUT /api/items/:id (Update item by ID) ---
router.put('/:id', async (req, res) => {
  try {
    let item = await AudioItem.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ status: 'fail', message: 'No item found with that ID to update.' });
    }

    if (item.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ status: 'fail', message: 'You are not authorized to update this item.' });
    }

    // Exclude user field from being updated directly via req.body
    const { user, ...updateData } = req.body;

    item = await AudioItem.findByIdAndUpdate(req.params.id, updateData, {
      new: true, // Return the modified document rather than the original
      runValidators: true, // Ensure schema validations are run on update
    });

    res.status(200).json({ status: 'success', data: { item } });
  } catch (error) {
    console.error('UPDATE ITEM ERROR:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ status: 'fail', message: error.message, errors: error.errors });
    }
    if (error.kind === 'ObjectId') {
        return res.status(400).json({ status: 'fail', message: 'Invalid item ID format.' });
    }
    res.status(500).json({ status: 'error', message: 'Server error while updating item.' });
  }
});

// --- DELETE /api/items/:id (Delete item by ID) ---
router.delete('/:id', async (req, res) => {
  try {
    const item = await AudioItem.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ status: 'fail', message: 'No item found with that ID to delete.' });
    }

    if (item.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ status: 'fail', message: 'You are not authorized to delete this item.' });
    }

    await AudioItem.findByIdAndDelete(req.params.id);

    res.status(204).json({ status: 'success', data: null }); // 204 No Content
  } catch (error) {
    console.error('DELETE ITEM ERROR:', error);
    if (error.kind === 'ObjectId') {
        return res.status(400).json({ status: 'fail', message: 'Invalid item ID format.' });
    }
    res.status(500).json({ status: 'error', message: 'Server error while deleting item.' });
  }
});

module.exports = router;