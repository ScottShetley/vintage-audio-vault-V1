// server/routes/userRoutes.js (Final Correct Version)
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { protect } = require('../middleware/authMiddleware');
const User = require('../models/User');
const AudioItem = require('../models/AudioItem');
const WildFind = require('../models/WildFind');

router.get('/me', protect, async (req, res) => {
  res.status(200).json(req.user);
});

router.get('/feed', protect, async (req, res) => {
  try {
    const loggedInUser = req.user;

    if (!loggedInUser.following || loggedInUser.following.length === 0) {
      return res.status(200).json([]);
    }

    const followingIds = loggedInUser.following;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const [audioItems, wildFinds] = await Promise.all([
      AudioItem.find({ user: { $in: followingIds }, privacy: 'Public' })
        .populate('user', 'username _id'),
      WildFind.find({ userId: { $in: followingIds } })
        .populate('userId', 'username _id'),
    ]);

    const normalizedAudioItems = audioItems.map(item => ({
      id: item._id, // Use id for the key
      title: `${item.make} ${item.model}`,
      imageUrl: item.photoUrls?.[0],
      tag: 'My Collection',
      detailPath: `/item/${item._id}`,
      createdAt: item.createdAt,
      user: item.user,
    }));

    const normalizedWildFinds = wildFinds.map(find => ({
      id: find._id, // Use id for the key
      title: find.findType === 'Wild Find' 
        ? find.analysis?.identifiedItem || 'Wild Find' 
        : `Ad Analysis: ${find.adAnalysis?.identifiedMake || 'Unknown'}`,
      imageUrl: find.imageUrl,
      tag: find.findType,
      detailPath: `/saved-finds/${find._id}`,
      createdAt: find.createdAt,
      user: find.userId,
    }));

    const combinedFeed = [...normalizedAudioItems, ...normalizedWildFinds];
    
    combinedFeed.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const paginatedFeed = combinedFeed.slice(skip, skip + limit);

    // Add username to each item for the card display
    const finalFeed = paginatedFeed.map(item => ({
        ...item,
        username: item.user?.username,
        userId: item.user?._id
    }));

    res.status(200).json(finalFeed);

  } catch (error) {
    console.error('Error fetching user feed:', error);
    res.status(500).json({ message: 'Server error while fetching feed.' });
  }
});

// ... (The rest of the file remains unchanged) ...
router.post('/:id/follow', protect, async (req, res) => {
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

router.post('/:id/unfollow', protect, async (req, res) => {
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

router.get('/profile/:id', async (req, res) => {
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