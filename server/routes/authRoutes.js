// c:\Users\david\Desktop\projects\vintageaudiovault\server\routes\authRoutes.js
const express = require ('express');
const jwt = require ('jsonwebtoken');
const User = require ('../models/User'); // Adjust path as per your project structure

const router = express.Router ();

// --- Helper function to sign JWT ---
const signToken = id => {
  return jwt.sign (
    {id},
    process.env.JWT_SECRET || 'your-super-secret-key-for-dev',
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '90d',
    }
  );
};

// --- Registration Route ---
// POST /api/auth/register
router.post ('/register', async (req, res) => {
  try {
    // --- UPDATED: Destructure username from request body ---
    const {username, email, password} = req.body;

    // --- UPDATED: Validate all three fields ---
    if (!username || !email || !password) {
      return res.status (400).json ({
        status: 'fail',
        message: 'Please provide username, email, and password.',
      });
    }

    // --- UPDATED: Check if username or email already exist ---
    const existingUser = await User.findOne ({$or: [{email}, {username}]});
    if (existingUser) {
      const message = existingUser.email === email
        ? 'User with this email already exists.'
        : 'This username is already taken.';
      return res.status (409).json ({
        // 409 Conflict
        status: 'fail',
        message,
      });
    }

    // --- UPDATED: Create new user with username ---
    const newUser = await User.create ({
      username: username,
      email: email,
      password: password,
    });

    // 4. Generate JWT
    const token = signToken (newUser._id);

    // 5. Send response (excluding password)
    const userResponse = {...newUser.toObject ()};
    delete userResponse.password;
    delete userResponse.passwordResetToken;
    delete userResponse.passwordResetExpires;
    delete userResponse.verificationToken;

    res.status (201).json ({
      status: 'success',
      token,
      data: {
        user: userResponse,
      },
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status (400).json ({
        status: 'fail',
        message: 'Validation failed. Please check your inputs.',
        errors: error.errors,
      });
    }
    console.error ('REGISTRATION ERROR:', error);
    res.status (500).json ({
      status: 'error',
      message: 'An unexpected error occurred. Please try again.',
    });
  }
});

// --- Login Route (No changes needed here) ---
// POST /api/auth/login
router.post ('/login', async (req, res) => {
  try {
    const {email, password} = req.body;

    if (!email || !password) {
      return res.status (400).json ({
        status: 'fail',
        message: 'Please provide email and password.',
      });
    }

    const user = await User.findOne ({email}).select ('+password');

    if (!user || !await user.correctPassword (password, user.password)) {
      return res.status (401).json ({
        status: 'fail',
        message: 'Incorrect email or password.',
      });
    }

    const token = signToken (user._id);

    user.lastLogin = Date.now ();
    await user.save ({validateBeforeSave: false});

    const userResponse = {...user.toObject ()};
    delete userResponse.password;

    res.status (200).json ({
      status: 'success',
      token,
      data: {
        user: userResponse,
      },
    });
  } catch (error) {
    console.error ('LOGIN ERROR:', error);
    res.status (500).json ({
      status: 'error',
      message: 'An unexpected error occurred. Please try again.',
    });
  }
});

module.exports = router;
