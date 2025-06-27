// server/models/User.js
const mongoose = require ('mongoose');
const bcrypt = require ('bcryptjs');
const crypto = require ('crypto');

const userSchema = new mongoose.Schema (
  {
    // --- ADDED: Username field ---
    username: {
      type: String,
      required: [true, 'A username is required.'],
      unique: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters long.'],
      maxlength: [20, 'Username cannot be more than 20 characters long.'],
      match: [
        /^[a-zA-Z0-9_]+$/,
        'Username can only contain letters, numbers, and underscores.',
      ],
    },
    // --- END ADDED ---
    email: {
      type: String,
      required: [true, 'Please provide your email'],
      unique: true,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please fill a valid email address',
      ],
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: 8,
      select: false,
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    appleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    followers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    following: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    isCollectionPublic: {
      type: Boolean,
      default: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: {
      type: String,
      select: false,
    },
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
    },
    lastLogin: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to hash password before saving
userSchema.pre ('save', async function (next) {
  if (!this.isModified ('password')) return next ();
  this.password = await bcrypt.hash (this.password, 12);
  next ();
});

// Instance method to check if the entered password is correct
userSchema.methods.correctPassword = async function (candidatePassword) {
  return await bcrypt.compare (candidatePassword, this.password);
};

// Instance method to generate a password reset token
userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes (32).toString ('hex');

  this.passwordResetToken = crypto
    .createHash ('sha256')
    .update (resetToken)
    .digest ('hex');

  this.passwordResetExpires = Date.now () + 10 * 60 * 1000;

  return resetToken;
};

// Instance method to generate an email verification token
userSchema.methods.createVerificationToken = function () {
  const unhashedToken = crypto.randomBytes (32).toString ('hex');

  this.verificationToken = crypto
    .createHash ('sha256')
    .update (unhashedToken)
    .digest ('hex');
  return unhashedToken;
};

const User = mongoose.model ('User', userSchema);

module.exports = User;
