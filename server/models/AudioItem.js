// server/models/AudioItem.js
const mongoose = require ('mongoose');

const audioItemSchema = new mongoose.Schema (
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Audio item must belong to a user.'],
    },
    status: {
      type: String,
      required: true,
      enum: {
        values: ['Personal Collection', 'For Sale', 'For Trade'],
        message: 'Status is not a valid option.',
      },
      default: 'Personal Collection',
    },
    privacy: {
      type: String,
      required: true,
      enum: {
        values: ['Public', 'Private'],
        message: 'Privacy setting is not valid.',
      },
      default: 'Public',
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
    },
    specifications: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    photoUrls: [String],
    purchaseDate: Date,
    purchasePrice: Number,
    askingPrice: {
      type: Number,
      min: [0, 'Asking price cannot be negative.'],
    },
    userEstimatedValue: Number,
    userEstimatedValueDate: Date,

    // --- VAV-UPDATE ---
    // Added a dedicated object to track AI identification vs. user input.
    identification: {
      wasCorrected: {type: Boolean, default: false},
      userInput: {type: String, default: ''},
      aiIdentifiedAs: {type: String, default: ''},
    },

    aiAnalysis: {
      type: Object,
      default: null,
    },
    aiAnalyzedOn: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const AudioItem = mongoose.model ('AudioItem', audioItemSchema);

module.exports = AudioItem;
