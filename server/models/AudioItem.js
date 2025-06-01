const mongoose = require ('mongoose');

const itemTypeEnum = [
  'Receiver',
  'Turntable',
  'Speakers',
  'Amplifier',
  'Pre-amplifier',
  'Tape Deck',
  'CD Player',
];

const conditionEnum = [
  'Mint',
  'Near Mint',
  'Excellent',
  'Very Good',
  'Good',
  'Fair',
  'For Parts/Not Working',
  'Restored',
];

const audioItemSchema = new mongoose.Schema (
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // References the 'User' model
      required: [true, 'User ID is required.'],
    },
    make: {
      type: String,
      required: [true, 'Make is required.'],
      trim: true,
    },
    model: {
      type: String,
      required: [true, 'Model is required.'],
      trim: true,
    },
    itemType: {
      type: String,
      required: [true, 'Item type is required.'],
      enum: {
        values: itemTypeEnum,
        message: '"{VALUE}" is not a supported item type.',
      },
    },
    condition: {
      type: String,
      required: [true, 'Condition is required.'],
      enum: {
        values: conditionEnum,
        message: '"{VALUE}" is not a supported condition.',
      },
    },
    isFullyFunctional: {
      type: Boolean,
      required: [true, 'Functional status is required.'],
    },
    issuesDescription: {
      type: String,
      trim: true,
      // Consider adding a custom validator to make this required if isFullyFunctional is false
      // For example:
      // validate: {
      //   validator: function(v) {
      //     return this.isFullyFunctional || (!this.isFullyFunctional && v && v.length > 0);
      //   },
      //   message: 'Issues description is required if the item is not fully functional.'
      // }
    },
    specifications: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    photoUrls: {
      type: [String],
      validate: [val => val.length <= 5, 'Cannot upload more than 5 photos.'],
      // You might also want to add validation for URL format for each string in the array
    },
    purchaseDate: {
      type: Date,
    },
    purchasePrice: {
      type: Number,
      min: [0, 'Purchase price cannot be negative.'],
    },
    userEstimatedValue: {
      type: Number,
      min: [0, 'Estimated value cannot be negative.'],
    },
    userEstimatedValueDate: {
      type: Date,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

// Optional: Add an index for fields frequently queried together, e.g., user and itemType
// audioItemSchema.index({ user: 1, itemType: 1 });

const AudioItem = mongoose.model ('AudioItem', audioItemSchema);

module.exports = AudioItem;
