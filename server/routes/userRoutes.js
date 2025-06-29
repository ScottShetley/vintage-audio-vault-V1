// server/routes/userRoutes.js
const express = require ('express');
const router = express.Router ();
const mongoose = require ('mongoose');
const {protect} = require ('../middleware/authMiddleware');
const User = require ('../models/User');
const AudioItem = require ('../models/AudioItem');

router.get ('/me', protect, async (req, res) => {
  res.status (200).json (req.user);
});

// --- NEW FEED ENDPOINT ---
router.get ('/feed', protect, async (req, res) => {
  try {
    const loggedInUser = req.user;

    // Ensure the 'following' list is populated, even if it's empty
    if (!loggedInUser.following) {
      return res.status (200).json ([]);
    }

    const followingIds = loggedInUser.following;

    // Handle case where user follows no one
    if (followingIds.length === 0) {
      return res.status (200).json ([]);
    }

    const page = parseInt (req.query.page, 10) || 1;
    const limit = parseInt (req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const feedItems = await AudioItem.find ({
      user: {$in: followingIds},
      privacy: 'Public', // Match the public privacy setting from the schema
    })
      .sort ({createdAt: -1}) // Show newest items first
      .skip (skip)
      .limit (limit)
      .populate ('user', 'username'); // Populate author's username

    res.status (200).json (feedItems);
  } catch (error) {
    console.error ('Error fetching user feed:', error);
    res.status (500).json ({message: 'Server error while fetching feed.'});
  }
});
// --- END NEW FEED ENDPOINT ---

router.post ('/:id/follow', protect, async (req, res) => {
  const session = await mongoose.startSession ();
  session.startTransaction ();
  try {
    const userToFollowId = req.params.id;
    const currentUserId = req.user.id;

    if (userToFollowId === currentUserId) {
      await session.abortTransaction ();
      session.endSession ();
      return res.status (400).json ({message: 'You cannot follow yourself.'});
    }

    const currentUserUpdate = await User.findByIdAndUpdate (
      currentUserId,
      {$addToSet: {following: userToFollowId}},
      {new: true, session}
    );

    const userToFollowUpdate = await User.findByIdAndUpdate (
      userToFollowId,
      {$addToSet: {followers: currentUserId}},
      {new: true, session}
    );

    if (!currentUserUpdate || !userToFollowUpdate) {
      await session.abortTransaction ();
      session.endSession ();
      return res.status (404).json ({message: 'User not found.'});
    }

    await session.commitTransaction ();
    session.endSession ();

    res.status (200).json ({message: 'Successfully followed user.'});
  } catch (error) {
    await session.abortTransaction ();
    session.endSession ();
    console.error ('Follow user error:', error);
    res
      .status (500)
      .json ({message: 'Server error while trying to follow user.'});
  }
});

router.post ('/:id/unfollow', protect, async (req, res) => {
  const session = await mongoose.startSession ();
  session.startTransaction ();
  try {
    const userToUnfollowId = req.params.id;
    const currentUserId = req.user.id;

    await User.findByIdAndUpdate (
      currentUserId,
      {$pull: {following: userToUnfollowId}},
      {session}
    );

    await User.findByIdAndUpdate (
      userToUnfollowId,
      {$pull: {followers: currentUserId}},
      {session}
    );

    await session.commitTransaction ();
    session.endSession ();

    res.status (200).json ({message: 'Successfully unfollowed user.'});
  } catch (error) {
    await session.abortTransaction ();
    session.endSession ();
    console.error ('Unfollow user error:', error);
    res
      .status (500)
      .json ({message: 'Server error while trying to unfollow user.'});
  }
});

router.get ('/profile/:id', async (req, res) => {
  try {
    const profileUser = await User.findById (req.params.id).select (
      'username email followers following isCollectionPublic'
    );

    if (!profileUser) {
      return res.status (404).json ({message: 'User not found.'});
    }

    let items = [];
    if (profileUser.isCollectionPublic) {
      items = await AudioItem.find ({
        user: profileUser._id,
        privacy: 'Public',
      }).sort ({createdAt: -1});
    }

    const profileData = {
      _id: profileUser._id,
      username: profileUser.username,
      followersCount: profileUser.followers.length,
      followingCount: profileUser.following.length,
      items: items,
      isCollectionPublic: profileUser.isCollectionPublic,
    };

    res.status (200).json (profileData);
  } catch (error) {
    console.error ('Get profile error:', error);
    res.status (500).json ({message: 'Server error while fetching profile.'});
  }
});

module.exports = router;
