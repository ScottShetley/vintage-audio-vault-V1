// server/models/WildFind.js
const mongoose = require ('mongoose');

const WildFindSchema = new mongoose.Schema (
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    // General fields for all find types
    findType: {
      type: String,
      enum: ['Wild Find', 'Ad Analysis'],
      required: true,
    },
    imageUrl: {
      type: String,
      required: true,
    },
    // Fields specific to an Ad Analysis
    sourceUrl: {
      type: String, // For the original ad URL
    },
    askingPrice: {
      type: Number,
    },
    adAnalysis: {
      type: mongoose.Schema.Types.Mixed, // To store the complex object from the Ad Analyzer AI
    },
    // Fields specific to a classic Wild Find
    analysis: {
      identifiedItem: {type: String},
      visualCondition: {type: String},
      estimatedValue: {type: String},
      detailedAnalysis: {type: String},
      potentialIssues: {type: String},
      restorationTips: {type: String},
      disclaimer: {type: String},
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model ('WildFind', WildFindSchema);
