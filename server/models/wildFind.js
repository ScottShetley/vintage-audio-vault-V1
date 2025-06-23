// server/models/WildFind.js
const mongoose = require ('mongoose');

const WildFindSchema = new mongoose.Schema (
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User', // This creates a reference to the User model
    },
    imageUrl: {
      type: String,
      required: true,
    },
    analysis: {
      identifiedItem: {
        type: String,
        required: true,
      },
      visualCondition: {
        type: String,
        required: true,
      },
      estimatedValue: {
        type: String,
        required: true,
      },
    },
  },
  {
    timestamps: true, // This automatically adds createdAt and updatedAt fields
  }
);

module.exports = mongoose.model ('WildFind', WildFindSchema);
