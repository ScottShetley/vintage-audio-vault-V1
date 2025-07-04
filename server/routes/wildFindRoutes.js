// server/routes/wildFindRoutes.js
const express = require ('express');
const router = express.Router ();
const {protect} = require ('../middleware/authMiddleware');
const WildFind = require ('../models/wildFind');

// GET all saved finds for the logged-in user
router.get ('/', protect, async (req, res) => {
  try {
    const finds = await WildFind.find ({userId: req.user.id}).sort ({
      createdAt: -1,
    });
    res.status (200).json (finds);
  } catch (error) {
    console.error ('Error fetching wild finds:', error);
    res.status (500).json ({message: 'Server error while fetching finds.'});
  }
});

// --- CORRECTED ROUTE: ADDED SECURE PERMISSION LOGIC ---
// GET a single saved find by its ID
router.get ('/:id', protect, async (req, res) => {
  try {
    const find = await WildFind.findById (req.params.id);

    // If no find exists with that ID, return 404.
    if (!find) {
      return res.status (404).json ({message: 'Find not found.'});
    }

    // *** NEW LOGIC ***
    // Check for permissions:
    // Allow access if the find is public OR if the requester is the owner.
    const isOwner = find.userId.toString () === req.user.id;
    if (!find.isPublic && !isOwner) {
      // If the find is NOT public and the user is NOT the owner, deny access.
      // We return 404 to avoid confirming the existence of a private resource.
      return res.status (404).json ({message: 'Find not found.'});
    }

    // If permissions are valid, send the find data.
    res.status (200).json (find);
  } catch (error) {
    // Handle cases where the provided ID is not a valid MongoDB ObjectId format.
    if (error.kind === 'ObjectId') {
      return res.status (404).json ({message: 'Find not found.'});
    }
    // Handle other potential server errors.
    console.error ('Error fetching single find:', error);
    res.status (500).json ({message: 'Server error while fetching find.'});
  }
});

// POST a new find (handles both Wild Finds and Ad Analyses)
router.post ('/', protect, async (req, res) => {
  try {
    const {
      findType,
      imageUrl,
      sourceUrl,
      askingPrice,
      analysis,
      adAnalysis,
    } = req.body;
    const userId = req.user.id;

    if (!findType || !imageUrl) {
      return res
        .status (400)
        .json ({message: 'findType and imageUrl are required.'});
    }

    let newFindData = {userId, findType, imageUrl};

    if (findType === 'Wild Find') {
      if (!analysis)
        return res
          .status (400)
          .json ({message: 'Analysis object is required for Wild Find.'});
      newFindData.analysis = analysis;
    } else if (findType === 'Ad Analysis') {
      if (!adAnalysis)
        return res
          .status (400)
          .json ({message: 'Ad Analysis object is required for Ad Analysis.'});
      newFindData.adAnalysis = adAnalysis;
      newFindData.sourceUrl = sourceUrl;
      newFindData.askingPrice = askingPrice;
    } else {
      return res.status (400).json ({message: 'Invalid findType specified.'});
    }

    const newFind = new WildFind (newFindData);
    const savedFind = await newFind.save ();

    res
      .status (201)
      .json ({message: 'Find saved successfully!', find: savedFind});
  } catch (error) {
    console.error ('Error saving find:', error);
    res.status (500).json ({message: 'Server error while saving find.'});
  }
});

// DELETE a saved find
router.delete ('/:id', protect, async (req, res) => {
  try {
    const find = await WildFind.findById (req.params.id);
    // Secure this by ensuring a find exists and the user owns it.
    if (!find || find.userId.toString () !== req.user.id) {
      return res.status (404).json ({message: 'Find not found.'});
    }
    await WildFind.deleteOne ({_id: req.params.id});
    res.status (200).json ({message: 'Find deleted successfully.'});
  } catch (error) {
    console.error ('Error deleting wild find:', error);
    res.status (500).json ({message: 'Server error while deleting find.'});
  }
});

module.exports = router;
