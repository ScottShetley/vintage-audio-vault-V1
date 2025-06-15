// server/models/AudioItem.js
const mongoose = require ('mongoose');

const audioItemSchema = new mongoose.Schema (
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Audio item must belong to a user.'],
    },
    make: {
      type: String,
      required: [true, 'Make is required.'],
      trim: true,
      maxlength: [50, 'Make cannot be more than 50 characters.'],
    },
    model: {
      type: String,
      required: [true, 'Model is required.'],
      trim: true,
      maxlength: [50, 'Model cannot be more than 50 characters.'],
    },
    itemType: {
      type: String,
      required: [true, 'Item type is required.'],
      enum: {
        values: [
          'Receiver',
          'Turntable',
          'Speakers',
          'Amplifier',
          'Pre-amplifier',
          'Tape Deck',
          'CD Player',
          'Equalizer',
          'Tuner',
          'Integrated Amplifier',
          'Other',
        ],
        message: 'Item type is not supported.',
      },
    },
    condition: {
      type: String,
      required: [true, 'Condition is required.'],
      enum: {
        values: [
          'Mint',
          'Near Mint',
          'Excellent',
          'Very Good',
          'Good',
          'Fair',
          'For Parts/Not Working',
          'Restored',
        ],
        message: 'Condition is not a valid option.',
      },
    },
    isFullyFunctional: {
      type: Boolean,
      required: [true, 'Functional status is required.'],
      default: true,
    },
    issuesDescription: {
      type: String,
      trim: true,
      // Only required if not fully functional, handled in route/validation logic
    },
    specifications: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    photoUrls: [String], // Array of GCS public URLs
    purchaseDate: Date,
    purchasePrice: Number,
    userEstimatedValue: Number,
    userEstimatedValueDate: Date,

    // --- ADDED: Fields for AI Evaluation Persistence ---
    aiValueInsight: {
      type: Object, // Store the entire JSON object from Gemini
      default: null,
    },
    aiSuggestions: {
      type: Object, // Store the entire JSON object from Gemini
      default: null,
    },
    aiLastEvaluated: {
      type: Date, // Timestamp of the last AI evaluation
      default: null,
    },

    // --- ADDED: Fields for "Willing to Sell" / Marketplace ---
    isForSale: {
      type: Boolean,
      default: false, // Default to not for sale
    },
    askingPrice: {
      type: Number,
      min: [0, 'Asking price cannot be negative.'],
      default: null, // Optional
    },
    saleNotes: {
      type: String,
      trim: true,
      maxlength: [500, 'Sale notes cannot exceed 500 characters.'],
      default: null, // Optional
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
  }
);

const AudioItem = mongoose.model ('AudioItem', audioItemSchema);

module.exports = AudioItem;
