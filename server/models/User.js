const mongoose = require ('mongoose');
const bcrypt = require ('bcryptjs');
const crypto = require ('crypto');

const userSchema = new mongoose.Schema (
  {
    email: {
      type: String,
      required: [true, 'Please provide your email'],
      unique: true,
      lowercase: true,
      // Basic email validation, consider a more robust validator if needed
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please fill a valid email address',
      ],
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: 8, // Enforce a minimum password length
      select: false, // Password will not be returned in queries by default
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true, // Allows multiple documents to have a null value for this field
    },
    appleId: {
      type: String,
      unique: true,
      sparse: true, // Allows multiple documents to have a null value for this field
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
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

// Pre-save hook to hash password before saving
userSchema.pre ('save', async function (next) {
  // Only run this function if password was actually modified
  if (!this.isModified ('password')) return next ();

  // Hash the password with cost of 12
  this.password = await bcrypt.hash (this.password, 12);

  // Delete passwordConfirm field if you were using one for confirmation
  // this.passwordConfirm = undefined; // Example if you had a passwordConfirm field
  next ();
});

// Instance method to check if the entered password is correct
// It's more idiomatic for instance methods to use `this` to access instance properties
userSchema.methods.correctPassword = async function (candidatePassword) {
  // this.password refers to the hashed password of the user instance
  // Ensure password field was selected if it's `select: false` in schema
  // e.g., const user = await User.findOne({ email }).select('+password');
  return await bcrypt.compare (candidatePassword, this.password);
};

// Instance method to generate a password reset token
userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes (32).toString ('hex');

  this.passwordResetToken = crypto
    .createHash ('sha256')
    .update (resetToken)
    .digest ('hex');

  // Set token to expire in 10 minutes (adjust as needed)
  this.passwordResetExpires = Date.now () + 10 * 60 * 1000;

  return resetToken; // Return the unhashed token (to be sent to the user via email)
};

// Instance method to generate an email verification token
userSchema.methods.createVerificationToken = function () {
  const unhashedToken = crypto.randomBytes (32).toString ('hex');

  this.verificationToken = crypto
    .createHash ('sha256')
    .update (unhashedToken)
    .digest ('hex');
  // Note: The schema doesn't have a verificationTokenExpires field.
  // If one were added, it could be set here (e.g., this.verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000;)
  return unhashedToken; // Return the unhashed token (to be used in the verification link)
};

const User = mongoose.model ('User', userSchema);

module.exports = User;
