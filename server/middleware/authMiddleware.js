// c:\Users\david\Desktop\projects\vintageaudiovault\server\middleware\authMiddleware.js
const jwt = require ('jsonwebtoken');
const User = require ('../models/User'); // Adjust path as per your project structure

const protect = async (req, res, next) => {
  console.log (
    `--- PROTECT MIDDLEWARE CALLED for ${req.method} ${req.originalUrl} ---`
  ); // DEBUG LOG
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith ('Bearer')
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split (' ')[1];

      // Verify token
      const decoded = jwt.verify (
        token,
        process.env.JWT_SECRET || 'your-super-secret-key-for-dev'
      );

      // Get user from the token
      // Exclude password even if it was somehow included in the token (should not happen with just ID)
      // And exclude other sensitive fields that might be on the user model
      req.user = await User.findById (decoded.id).select (
        '-password -passwordResetToken -passwordResetExpires -verificationToken'
      );

      if (!req.user) {
        return res.status (401).json ({
          status: 'fail',
          message: 'Not authorized, user not found for this token.',
        });
      }

      next ();
    } catch (error) {
      console.error ('AUTH MIDDLEWARE ERROR:', error);
      if (error.name === 'JsonWebTokenError') {
        return res.status (401).json ({
          status: 'fail',
          message: 'Not authorized, token failed verification.',
        });
      }
      if (error.name === 'TokenExpiredError') {
        return res.status (401).json ({
          status: 'fail',
          message: 'Not authorized, token expired.',
        });
      }
      return res.status (401).json ({
        status: 'fail',
        message: 'Not authorized, token processing error.',
      });
    }
  }

  if (!token) {
    // This check should ideally be after the try-catch if the token extraction itself fails,
    // but it's common to see it here as a final catch-all if no Bearer token was found.
    // The logic above already handles cases where the token is present but invalid.
    // If the `if (req.headers.authorization ...)` block is not entered, token remains undefined.
    return res.status (401).json ({
      status: 'fail',
      message: 'Not authorized, no token provided.',
    });
  }
};

module.exports = {protect};
