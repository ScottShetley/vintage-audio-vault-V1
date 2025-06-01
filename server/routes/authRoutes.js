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
    const {email, password} = req.body;

    // 1. Validate input
    if (!email || !password) {
      return res.status (400).json ({
        status: 'fail',
        message: 'Please provide email and password.',
      });
    }

    // 2. Check if user already exists
    const existingUser = await User.findOne ({email});
    if (existingUser) {
      return res.status (409).json ({
        // 409 Conflict
        status: 'fail',
        message: 'User with this email already exists.',
      });
    }

    // 3. Create new user (password will be hashed by the pre-save hook in User model)
    const newUser = await User.create ({
      email,
      password,
    });

    // 4. Generate JWT
    const token = signToken (newUser._id);

    // 5. Send response (excluding password)
    // Mongoose's .save() or .create() returns the document, but password is not selected by default.
    // If you want to explicitly remove it or send specific fields:
    const userResponse = {...newUser.toObject ()};
    delete userResponse.password; // Ensure password is not sent, even if somehow selected
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
    // Handle Mongoose validation errors specifically if needed
    if (error.name === 'ValidationError') {
      return res.status (400).json ({
        status: 'fail',
        message: error.message,
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

// --- Login Route ---
// POST /api/auth/login
router.post ('/login', async (req, res) => {
  try {
    const {email, password} = req.body;

    // 1. Validate input
    if (!email || !password) {
      return res.status (400).json ({
        status: 'fail',
        message: 'Please provide email and password.',
      });
    }

    // 2. Find user by email (and select password explicitly)
    const user = await User.findOne ({email}).select ('+password');

    // 3. Check if user exists and password is correct
    if (!user || !await user.correctPassword (password, user.password)) {
      return res.status (401).json ({
        // 401 Unauthorized
        status: 'fail',
        message: 'Incorrect email or password.',
      });
    }

    // 4. If everything is ok, generate JWT
    const token = signToken (user._id);

    // 5. Update lastLogin
    user.lastLogin = Date.now ();
    await user.save ({validateBeforeSave: false}); // Skip validation if only updating lastLogin

    // 6. Send response (excluding password)
    const userResponse = {...user.toObject ()};
    delete userResponse.password;
    delete userResponse.passwordResetToken;
    delete userResponse.passwordResetExpires;
    delete userResponse.verificationToken;

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
