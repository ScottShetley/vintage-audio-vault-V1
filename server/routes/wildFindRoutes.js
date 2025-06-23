// server/routes/wildFindRoutes.js
const express = require ('express');
const router = express.Router ();
const {protect} = require ('../middleware/authMiddleware');
// Reminder: Corrected the case sensitivity here from 'wildFind' to 'WildFind'
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

module.exports = router;
