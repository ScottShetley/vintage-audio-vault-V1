// server/routes/wildFindRoutes.js
const express = require ('express');
const router = express.Router ();
const {protect} = require ('../middleware/authMiddleware');
const WildFind = require ('../models/WildFind');

/**
 * @route   GET /api/wild-finds
 * @desc    Get all saved 'Wild Finds' for the logged-in user
 * @access  Private
 */
router.get ('/', protect, async (req, res) => {
  try {
    // req.user.id is available from the 'protect' middleware
    const finds = await WildFind.find ({userId: req.user.id}).sort ({
      createdAt: -1,
    });
    res.status (200).json (finds);
  } catch (error) {
    console.error ('Error fetching wild finds:', error);
    res.status (500).json ({message: 'Server error while fetching finds.'});
  }
});

/**
 * @route   GET /api/wild-finds/:id
 * @desc    Get a single saved 'Wild Find' by its ID
 * @access  Private
 */
router.get ('/:id', protect, async (req, res) => {
  try {
    const find = await WildFind.findById (req.params.id);

    if (!find) {
      return res.status (404).json ({message: 'Find not found.'});
    }

    // Ensure the find belongs to the requesting user
    if (find.userId.toString () !== req.user.id) {
      // Return 404 to not reveal the existence of the resource to unauthorized users
      return res.status (404).json ({message: 'Find not found.'});
    }

    res.status (200).json (find);
  } catch (error) {
    console.error ('Error fetching single wild find:', error);
    // Handle cases like an invalid ObjectId format which would otherwise cause a server error
    if (error.kind === 'ObjectId') {
      return res.status (404).json ({message: 'Find not found.'});
    }
    res.status (500).json ({message: 'Server error while fetching find.'});
  }
});

/**
 * @route   POST /api/wild-finds
 * @desc    Save a new 'Wild Find' analysis
 * @access  Private
 */
router.post ('/', protect, async (req, res) => {
  try {
    const {imageUrl, analysis} = req.body;

    // Basic validation
    if (!imageUrl || !analysis) {
      return res
        .status (400)
        .json ({message: 'Missing imageUrl or analysis data.'});
    }
    if (
      !analysis.identifiedItem ||
      !analysis.visualCondition ||
      !analysis.estimatedValue
    ) {
      return res
        .status (400)
        .json ({message: 'Analysis object is missing required fields.'});
    }

    const newFind = new WildFind ({
      userId: req.user.id, // from protect middleware
      imageUrl,
      analysis,
    });

    const savedFind = await newFind.save ();

    res.status (201).json ({
      message: 'Find saved successfully!',
      find: savedFind,
    });
  } catch (error) {
    console.error ('Error saving wild find:', error);
    res.status (500).json ({message: 'Server error while saving find.'});
  }
});

/**
 * @route   DELETE /api/wild-finds/:id
 * @desc    Delete a saved 'Wild Find' by its ID
 * @access  Private
 */
router.delete ('/:id', protect, async (req, res) => {
  try {
    const find = await WildFind.findById (req.params.id);

    if (!find) {
      return res.status (404).json ({message: 'Find not found.'});
    }

    // Ensure the find belongs to the requesting user
    if (find.userId.toString () !== req.user.id) {
      return res
        .status (403)
        .json ({message: 'User not authorized to delete this find.'});
    }

    await WildFind.deleteOne ({_id: req.params.id});

    res.status (200).json ({message: 'Find deleted successfully.'});
  } catch (error) {
    console.error ('Error deleting wild find:', error);
    res.status (500).json ({message: 'Server error while deleting find.'});
  }
});

module.exports = router;
