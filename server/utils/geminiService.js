// c:\Users\david\Desktop\projects\vintageaudiovault\server\utils\geminiService.js
const {
  GoogleGenerativeAI,
  HarmBlockThreshold,
  HarmCategory,
} = require ('@google/generative-ai');
const axios = require ('axios');
const {Readable} = require ('stream');

// Access your API key as an environment variable
const genAI = new GoogleGenerativeAI (process.env.GEMINI_API_KEY);

// --- MODEL NAMES ---
const MODEL_NAME_PRO = 'gemini-1.5-pro';
const MODEL_NAME_FLASH = 'gemini-1.5-flash';

// --- COMMON SAFETY SETTINGS ---
const DEFAULT_SAFETY_SETTINGS = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
];

// --- MODEL CONFIGURATIONS ---
const proModel = genAI.getGenerativeModel ({
  model: MODEL_NAME_PRO,
  safetySettings: DEFAULT_SAFETY_SETTINGS,
});
const flashModel = genAI.getGenerativeModel ({
  model: MODEL_NAME_FLASH,
  safetySettings: DEFAULT_SAFETY_SETTINGS,
});

async function getAiFullAnalysisForCollectionItem (itemData) {
  const {make, model, itemType, condition, notes, photoUrl} = itemData;

  const prompt = `
    You are a vintage audio expert, historian, and technician creating a comprehensive report for a user's collection item.
    The user has provided the following information:
    - Make: ${make}
    - Model: ${model}
    - Item Type: ${itemType}
    - Stated Condition: "${condition}"
    - User's Notes: "${notes || 'No notes provided.'}"
    
    You are also provided with one image of the item.

    Your Task: Generate a complete analysis as a single JSON object. The report must include all of the following fields.
    CRITICAL INSTRUCTION: Base your analysis ONLY on the provided information and your established knowledge base for the specific make and model. Do not invent features or speculate on aspects not typical for this item.

    1. "summary": A compelling, single-sentence summary of the item's reputation and significance.
    2. "detailedAnalysis": A detailed, multi-paragraph description covering the item's history, design philosophy, build quality, sound signature, and its place in the vintage audio market.
    3. "valueInsight": An object containing a market valuation, with the following sub-fields:
        - "productionDates": A string representing the manufacturing years (e.g., "1976-1980").
        - "marketDesirability": A paragraph explaining how sought-after the item is, considering rarity, performance, and aesthetics.
        - "estimatedValueUSD": A string representing the estimated market value range in USD (e.g., "$400 - $600").
        - "valuationConfidence": Your confidence in the valuation ('High', 'Medium', or 'Low'). If information is limited, provide a wider value range and a 'Low' confidence. You must always provide a value.
    4. "potentialIssues": A bulleted list of 3-5 common age-related issues or failure points for this specific model. Format this as a single string with each point starting with a hyphen and separated by a newline character (\\n).
    5. "restorationTips": A bulleted list of 3-5 common restoration or enhancement tips for this model. Format this as a single string with each point starting with a hyphen and separated by a newline character (\\n).
    6. "suggestedGear": An array of 3-5 suggested complementary vintage components (e.g., speakers, turntable). Each object in the array should have "make", "model", and a "reason" for the suggestion. Do not suggest another item of the same itemType as the input.
    7. "disclaimer": A standard disclaimer stating that this is an AI-generated estimate for informational purposes.

    Return ONLY the raw JSON object.`;

  const schema = {
    type: 'OBJECT',
    properties: {
      summary: {type: 'STRING'},
      detailedAnalysis: {type: 'STRING'},
      valueInsight: {
        type: 'OBJECT',
        properties: {
          productionDates: {type: 'STRING'},
          marketDesirability: {type: 'STRING'},
          estimatedValueUSD: {type: 'STRING'},
          valuationConfidence: {type: 'STRING'},
        },
        required: [
          'productionDates',
          'marketDesirability',
          'estimatedValueUSD',
          'valuationConfidence',
        ],
      },
      potentialIssues: {type: 'STRING'},
      restorationTips: {type: 'STRING'},
      suggestedGear: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            make: {type: 'STRING'},
            model: {type: 'STRING'},
            reason: {type: 'STRING'},
          },
          required: ['make', 'model', 'reason'],
        },
      },
      disclaimer: {type: 'STRING'},
    },
    required: [
      'summary',
      'detailedAnalysis',
      'valueInsight',
      'potentialIssues',
      'restorationTips',
      'suggestedGear',
      'disclaimer',
    ],
  };

  try {
    const imagePart = await urlToBase64 (photoUrl);
    const parts = [
      {text: prompt},
      imagePart ? {inlineData: imagePart} : {text: 'No image provided.'},
    ];

    const result = await proModel.generateContent ({
      contents: [{role: 'user', parts: parts}],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: schema,
        temperature: 0.6,
      },
    });
    const responseText = result.response.text ();
    return JSON.parse (responseText);
  } catch (error) {
    console.error ('Error in getAiFullAnalysisForCollectionItem:', error);
    return {
      error: `Gemini AI full analysis failed: ${error.message}`,
      summary: 'AI analysis could not be completed.',
      detailedAnalysis: 'An error occurred during generation. Please try again later.',
      valueInsight: {
        productionDates: 'N/A',
        marketDesirability: 'N/A',
        estimatedValueUSD: 'Error',
        valuationConfidence: 'Error',
      },
      potentialIssues: 'N/A',
      restorationTips: 'N/A',
      suggestedGear: [],
      disclaimer: 'An error occurred during AI analysis.',
    };
  }
}

async function getComprehensiveWildFindAnalysis (
  make,
  model,
  conditionDescription
) {
  const prompt = `
    You are a vintage audio expert providing a detailed analysis for a "Wild Find".
    
    Item Details:
    - Make: ${make}
    - Model: ${model}
    - Initial Visual Condition: "${conditionDescription}"

    Your Task: Based on the item details and your knowledge base, generate a comprehensive report. The report must be a JSON object and include all of the following fields:

    1.  "identifiedItem": A string combining the make and model (e.g., "Marantz 2270").
    2.  "visualCondition": A string containing the original visual condition description provided above.
    3.  "estimatedValue": A string representing the estimated market value range in USD (e.g., "$400 - $600").
    4.  "valuationConfidence": Your confidence in the valuation ('High', 'Medium', or 'Low'). If information is limited (e.g., for a generic model), provide a wider value range and a 'Low' confidence. You must always provide a value and never refuse to guess.
    5.  "detailedAnalysis": A detailed paragraph describing the item, its history, its reputation (e.g., sound quality, build quality), and its place in the vintage audio market.
    6.  "potentialIssues": A bulleted list of common problems or age-related issues to check for with this specific model. Format this as a single string with each point starting with a hyphen and separated by a newline character (\\n).
    7.  "restorationTips": A bulleted list of common restoration or enhancement tips for this model. Format this as a single string with each point starting with a hyphen and separated by a newline character (\\n).
    8.  "disclaimer": A standard disclaimer stating that this is an AI-generated estimate and professional evaluation is recommended.

    Return ONLY the raw JSON object.
    `;

  const schema = {
    type: 'OBJECT',
    properties: {
      identifiedItem: {type: 'STRING'},
      visualCondition: {type: 'STRING'},
      estimatedValue: {type: 'STRING'},
      valuationConfidence: {type: 'STRING'},
      detailedAnalysis: {type: 'STRING'},
      potentialIssues: {type: 'STRING'},
      restorationTips: {type: 'STRING'},
      disclaimer: {type: 'STRING'},
    },
    required: [
      'identifiedItem',
      'visualCondition',
      'estimatedValue',
      'valuationConfidence',
      'detailedAnalysis',
      'potentialIssues',
      'restorationTips',
      'disclaimer',
    ],
  };

  try {
    const result = await proModel.generateContent ({
      contents: [{role: 'user', parts: [{text: prompt}]}],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: schema,
        temperature: 0.6,
      },
    });
    const responseText = result.response.text ();
    return JSON.parse (responseText);
  } catch (error) {
    console.error ('Error in getComprehensiveWildFindAnalysis:', error);
    return {
      error: `Gemini AI comprehensive analysis failed: ${error.message}`,
      identifiedItem: `${make} ${model}`,
      visualCondition: conditionDescription,
      estimatedValue: 'Error',
      valuationConfidence: 'Error',
      detailedAnalysis: 'Could not generate detailed analysis due to an error.',
      potentialIssues: 'Could not generate potential issues due to an error.',
      restorationTips: 'Could not generate restoration tips due to an error.',
      disclaimer: 'An error occurred during AI analysis.',
    };
  }
}

async function getVisualAnalysis (fileObject) {
  if (!fileObject || !fileObject.buffer || !fileObject.mimetype) {
    throw new Error ('Invalid file object provided for visual analysis.');
  }
  const imagePart = {
    inlineData: {
      data: fileObject.buffer.toString ('base64'),
      mimeType: fileObject.mimetype,
    },
  };

  const prompt = `You are a factual, precise visual analysis AI. Your single most important rule is: DO NOT GUESS OR INVENT INFORMATION.
Analyze the provided image to identify ALL distinct pieces of vintage audio equipment shown.
For each item, provide:
1.  Manufacturer (make): Be as specific as possible. If the make is not clearly visible or known with high confidence, you MUST return "Unidentified Make".
2.  Model name/number (model): Be as specific as possible. Avoid generic terms. If a specific model is not clearly visible on the unit, you MUST return "Model Not Clearly Identifiable". Do not infer the model from the make alone.
3.  Visual Condition (conditionDescription): A detailed, objective description of the item's visual condition based only on what is visible in the image.
4.  Confidence Level (confidence): Your confidence in the identification, rated as "High", "Medium", or "Low".

Return your response as an array of objects in the specified JSON format.
If you cannot identify any items, return an empty array.`;

  const schema = {
    type: 'ARRAY',
    items: {
      type: 'OBJECT',
      properties: {
        make: {
          type: 'STRING',
          description: 'The manufacturer of the equipment.',
        },
        model: {
          type: 'STRING',
          description: 'The model name or number of the equipment.',
        },
        conditionDescription: {
          type: 'STRING',
          description: "A detailed description of the item's visual condition.",
        },
        confidence: {
          type: 'STRING',
          description: 'The confidence level of the identification (High, Medium, or Low).',
        },
      },
      required: ['make', 'model', 'conditionDescription', 'confidence'],
    },
  };

  try {
    const result = await proModel.generateContent ({
      contents: [{role: 'user', parts: [imagePart, {text: prompt}]}],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: schema,
        temperature: 0.2,
      },
    });
    return JSON.parse (result.response.text ());
  } catch (error) {
    console.error ('Error in getVisualAnalysis with proModel:', error);
    throw new Error (`Gemini AI visual analysis failed: ${error.message}`);
  }
}

async function getFactualFeatures (make, model) {
  const prompt = `Act as a vintage audio archivist. Using your knowledge base, provide the key features and common technical specifications for the following piece of equipment: ${make} ${model}. Prioritize factual information commonly found in manuals or reputable reviews. List the key features as an array of strings. For specifications, provide an array of objects, where each object has a "name" and a "value". Return your response in the specified JSON format. If the model is too generic (e.g. "Model Not Clearly Identifiable", "Unknown Model"), state that features and specs cannot be provided for a non-specific model.`;
  const schema = {
    type: 'OBJECT',
    properties: {
      keyFeatures: {
        type: 'ARRAY',
        items: {type: 'STRING'},
        description: 'A list of notable features. Can be empty if model is too generic.',
      },
      specifications: {
        type: 'ARRAY',
        description: 'A list of technical specifications. Can be empty if model is too generic.',
        items: {
          type: 'OBJECT',
          properties: {
            name: {
              type: 'STRING',
              description: 'The name of the specification (e.g., Power output).',
            },
            value: {
              type: 'STRING',
              description: 'The value of the specification (e.g., 45 watts per channel).',
            },
          },
          required: ['name', 'value'],
        },
      },
      message: {
        type: 'STRING',
        description: 'A message, e.g., if features/specs cannot be provided for a non-specific model.',
      },
    },
    required: ['keyFeatures', 'specifications'],
  };
  try {
    const result = await proModel.generateContent ({
      contents: [{role: 'user', parts: [{text: prompt}]}],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: schema,
      },
    });
    return JSON.parse (result.response.text ());
  } catch (error) {
    console.error ('Error in getFactualFeatures:', error);
    throw new Error (
      `Gemini AI factual feature retrieval failed: ${error.message}`
    );
  }
}

async function getSynthesizedValuation (visualData, factualData) {
  const prompt = `Act as a vintage audio equipment appraiser. You need to provide an estimated market value for an item.
Item Context:
Make: ${visualData.make}
Model: ${visualData.model}
Key Features: ${factualData.keyFeatures && factualData.keyFeatures.length > 0 ? factualData.keyFeatures.join (', ') : 'Not available or not specific.'}
Observed Condition (from image analysis): ${visualData.conditionDescription}
${factualData.message ? 'Note from feature analysis: ' + factualData.message : ''}

Your Task: Based on ALL the information above, provide an estimated market value range in USD, your confidence in that estimate, and a brief reasoning.
CRITICAL INSTRUCTION: You MUST provide a value range. If the model is generic or information is scarce, provide a very wide, conservative value range and a 'Low' confidence score. Never refuse to provide a value.
Your reasoning should explain how the item's features (or lack thereof) and its visual condition justify the estimated value.
Include a standard disclaimer. Return your response in the specified JSON format.`;
  const schema = {
    type: 'OBJECT',
    properties: {
      valueRange: {
        type: 'STRING',
        description: 'The estimated market value range in USD (e.g., "$250 - $350").',
      },
      valuationConfidence: {
        type: 'STRING',
        description: "The AI's confidence in the valuation ('High', 'Medium', or 'Low').",
      },
      reasoning: {
        type: 'STRING',
        description: "The explanation linking the item's condition and features to its value.",
      },
      disclaimer: {
        type: 'STRING',
        description: 'A standard disclaimer about the estimate.',
      },
    },
    required: ['valueRange', 'valuationConfidence', 'reasoning', 'disclaimer'],
  };
  try {
    const result = await proModel.generateContent ({
      contents: [{role: 'user', parts: [{text: prompt}]}],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: schema,
      },
    });
    return JSON.parse (result.response.text ());
  } catch (error) {
    console.error ('Error in getSynthesizedValuation:', error);
    throw new Error (`Gemini AI valuation synthesis failed: ${error.message}`);
  }
}

async function analyzeAdText (adTitle, adDescription) {
  const prompt = `Analyze the following vintage audio equipment ad title and description.
Your goal is to extract specific information.

Ad Title: "${adTitle}"
Ad Description: "${adDescription}"

Tasks:
1.  Identify the Make: Determine the manufacturer of the equipment. If not clearly stated, use "Unspecified Make".
2.  Identify the Model: Determine the model name or number. If not clearly stated, use "Unspecified Model".
3.  Summarize Seller's Stated Condition: Provide a concise summary of how the seller describes the item's condition, functionality, and any cosmetic issues.
4.  List Mentioned Key Features: Extract a list of key features or selling points mentioned by the seller (e.g., "fully recapped", "original remote", "wood cabinet"). If none, return an empty array.
5.  List Mentioned Problems/Missing Parts: Extract a list of any explicitly stated problems, damages, or missing components. If none, return an empty array.

Return your response in the specified JSON format. If a field cannot be determined, use an appropriate placeholder or an empty array for lists.`;

  const schema = {
    type: 'OBJECT',
    properties: {
      extractedMake: {
        type: 'STRING',
        description: 'The make of the equipment as extracted from the text, or "Unspecified Make".',
      },
      extractedModel: {
        type: 'STRING',
        description: 'The model of the equipment as extracted from the text, or "Unspecified Model".',
      },
      sellerConditionSummary: {
        type: 'STRING',
        description: "A summary of the seller's description of the item's condition and functionality.",
      },
      mentionedFeatures: {
        type: 'ARRAY',
        items: {type: 'STRING'},
        description: 'A list of key features mentioned by the seller.',
      },
      mentionedProblems: {
        type: 'ARRAY',
        items: {type: 'STRING'},
        description: 'A list of problems or missing parts mentioned by the seller.',
      },
    },
    required: [
      'extractedMake',
      'extractedModel',
      'sellerConditionSummary',
      'mentionedFeatures',
      'mentionedProblems',
    ],
  };

  try {
    const result = await proModel.generateContent ({
      contents: [{role: 'user', parts: [{text: prompt}]}],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: schema,
        temperature: 0.3,
      },
    });
    return JSON.parse (result.response.text ());
  } catch (error) {
    console.error ('Error in analyzeAdText:', error);
    return {
      extractedMake: 'Error processing text',
      extractedModel: 'Error processing text',
      sellerConditionSummary: "Could not analyze seller's text due to an error.",
      mentionedFeatures: [],
      mentionedProblems: [],
      error: `Gemini AI ad text analysis failed: ${error.message}`,
    };
  }
}

async function analyzeAdTextAndReturnWithOriginal (adTitle, adDescription) {
  const analysis = await analyzeAdText (adTitle, adDescription);
  return {...analysis, originalDescriptionForContext: adDescription};
}

async function getAdPriceComparisonInsight (
  aiValueRange,
  askingPrice,
  make,
  model,
  visualCondition,
  sellerTextSummary
) {
  const safeSellerTextSummary = sellerTextSummary || {};
  const mentionedFeatures = Array.isArray (
    safeSellerTextSummary.mentionedFeatures
  )
    ? safeSellerTextSummary.mentionedFeatures
    : [];
  const mentionedProblems = Array.isArray (
    safeSellerTextSummary.mentionedProblems
  )
    ? safeSellerTextSummary.mentionedProblems
    : [];
  const sellerCondition =
    safeSellerTextSummary.sellerConditionSummary || 'Not specified by seller.';
  const originalDescription =
    safeSellerTextSummary.originalDescriptionForContext || '';

  const prompt = `You are an AI assistant helping a user evaluate a vintage audio equipment ad.
Item: ${make} ${model}
AI Estimated Value Range (based on visual condition from image): ${aiValueRange}
Seller's Asking Price: $${askingPrice}
AI Visual Condition Assessment (from image): "${visualCondition}"
Seller's Stated Condition Summary (from ad text): "${sellerCondition}"
Seller's Mentioned Features (from ad text): ${mentionedFeatures.length > 0 ? mentionedFeatures.join (', ') : 'None mentioned.'}
Seller's Mentioned Problems (from ad text): ${mentionedProblems.length > 0 ? mentionedProblems.join (', ') : 'None mentioned.'}
Full Ad Description (for context on pricing flexibility): "${originalDescription}"

Task: Provide a brief insight comparing the seller's asking price to the AI's estimated value range.
Consider the AI's visual assessment, the seller's textual description of condition, mentioned features, and mentioned problems.
**Crucially, examine the seller's text (especially the "Full Ad Description" provided above) for any indication that the asking price is flexible (e.g., "OBO", "Or Best Offer", "accepting offers", "negotiable", "make an offer") or if the price seems unusually high or low relative to the stated condition and features.**
Explain if the asking price seems high, low, or reasonable *in light of the seller's description and any noted price flexibility*.
Keep the insight concise, 2-4 sentences.
Return your response in the specified JSON format.`;

  const schema = {
    type: 'OBJECT',
    properties: {
      insight: {
        type: 'STRING',
        description: "A concise insight comparing the asking price to the AI's estimated value, considering condition details and any price flexibility mentioned by the seller.",
      },
    },
    required: ['insight'],
  };

  try {
    const result = await proModel.generateContent ({
      contents: [{role: 'user', parts: [{text: prompt}]}],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: schema,
        temperature: 0.5,
      },
    });
    return JSON.parse (result.response.text ());
  } catch (error) {
    console.error ('Error in getAdPriceComparisonInsight:', error);
    return {
      insight: 'Could not generate price comparison insight due to an error.',
      error: `Gemini AI price comparison insight failed: ${error.message}`,
    };
  }
}

async function urlToBase64 (url) {
  try {
    const response = await axios.get (url, {responseType: 'arraybuffer'});
    const mimeType = response.headers['content-type'];
    const base64 = Buffer.from (response.data).toString ('base64');
    return {mimeType, data: base64};
  } catch (error) {
    console.error (
      `Failed to convert image URL to Base64 for ${url}:`,
      error.message
    );
    return null;
  }
}

async function getAiValueInsight (make, model, condition, imageUrls = []) {
  // --- START: FIX FOR JSON PARSING ERROR ---
  const itemInfo = `Item: ${make} ${model}, Condition: ${condition}.`;
  const personaAndTask = `You are a vintage audio equipment expert providing a market valuation.
  
  Your task is to respond with a JSON object containing a detailed valuation.
  CRITICAL INSTRUCTION: You MUST provide a value range. If information is scarce, provide a wide, conservative value range and a 'Low' confidence score. Never refuse to provide a value.
  
  The JSON object must contain the following fields:
  - "description": A concise description of the item.
  - "productionDates": The production years (e.g., "1978-1981").
  - "marketDesirability": A brief assessment of how sought-after this item is.
  - "estimatedValueUSD": Your estimated market value range in USD (e.g., "$500 - $750").
  - "valuationConfidence": Your confidence in the estimate ('High', 'Medium', or 'Low').
  - "disclaimer": A standard disclaimer.`;

  const schema = {
    type: 'OBJECT',
    properties: {
      description: {type: 'STRING'},
      productionDates: {type: 'STRING'},
      marketDesirability: {type: 'STRING'},
      estimatedValueUSD: {type: 'STRING'},
      valuationConfidence: {type: 'STRING'},
      disclaimer: {type: 'STRING'},
    },
    required: [
      'description',
      'productionDates',
      'marketDesirability',
      'estimatedValueUSD',
      'valuationConfidence',
      'disclaimer',
    ],
  };

  const parts = [{text: `${personaAndTask}\n${itemInfo}`}];

  if (imageUrls && imageUrls.length > 0) {
    const imagePartsPromises = imageUrls.slice (0, 5).map (async url => {
      const imageBase64 = await urlToBase64 (url);
      if (imageBase64) {
        return {inlineData: imageBase64};
      }
      return null;
    });
    const resolvedImageParts = (await Promise.all (imagePartsPromises)).filter (
      part => part !== null
    );
    if (resolvedImageParts.length > 0) {
      parts.push (...resolvedImageParts);
      parts.push ({
        text: '\nConsider the visual condition and specific model details from the image(s) in your assessment.',
      });
    } else {
      parts.push ({
        text: '\nNo images provided or images could not be processed.',
      });
    }
  } else {
    parts.push ({text: '\nNo images provided.'});
  }
  try {
    const result = await proModel.generateContent ({
      contents: [{role: 'user', parts: parts}],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: schema,
      },
    });
    const responseText = result.response.text ();
    return JSON.parse (responseText);
  } catch (e) {
    console.error (
      'Failed to parse JSON response from Gemini for value insight or API error:',
      e.message,
      e.response ? e.response.text () : 'No detailed API response text.'
    );
    return {
      error: 'AI response could not be parsed or API error.',
      description: 'Could not retrieve full AI insights.',
      productionDates: 'N/A',
      marketDesirability: 'N/A',
      estimatedValueUSD: 'Unable to determine market value range.',
      valuationConfidence: 'Error',
      disclaimer: 'An error occurred during AI analysis.',
    };
  }
  // --- END: FIX FOR JSON PARSING ERROR ---
}

async function getRelatedGearSuggestions (
  make,
  model,
  itemType,
  imageUrls = []
) {
  const itemInfo = `The provided item is a ${make} ${model} (Type: ${itemType}).`;
  let personaAndTask = `You are a knowledgeable vintage audio aficionado and system building expert. Your task is to suggest 3-5 complementary vintage audio components that would pair exceptionally well with the provided item. ${itemInfo} Consider the following when making your suggestions: 1. Complementary Nature: Suggest components that complete or enhance a system with the provided item. For example: - If the item is a Receiver or Amplifier, suggest suitable Speakers, a Turntable, a Tape Deck, or a CD Player. **Do NOT suggest another Receiver or Amplifier.** - If the item is a Turntable, suggest a compatible Phono Pre-amplifier (if needed), Receiver/Amplifier, or Speakers. **Do NOT suggest another Turntable.** - If the item is Speakers, suggest a suitable Receiver/Amplifier. **Do NOT suggest other Speakers.** - If the item is a source component like a Tape Deck or CD Player, suggest a Receiver/Amplifier or Integrated Amplifier. 2. Era and Aesthetics: Prioritize components from a similar manufacturing era or those with a compatible aesthetic to create a visually and historically cohesive system. 3. Manufacturer Synergy: Pay special attention to other components that ${make} (the manufacturer of the input item) might have released as part of the same product line or system around the time the ${model} was produced. These are often designed to work well together. 4. Reasoning: For each suggestion, briefly explain why it's a good match (e.g., sonic synergy, contemporary pairing, aesthetic compatibility, part of the original system). Provide your suggestions in the specified JSON format.`;
  const parts = [{text: personaAndTask}];
  if (imageUrls && imageUrls.length > 0) {
    const imagePartsPromises = imageUrls.slice (0, 3).map (async url => {
      const imageBase64 = await urlToBase64 (url);
      if (imageBase64) {
        return {inlineData: imageBase64};
      }
      return null;
    });
    const resolvedImageParts = (await Promise.all (imagePartsPromises)).filter (
      part => part !== null
    );
    if (resolvedImageParts.length > 0) {
      parts.push (...resolvedImageParts);
      parts.push ({
        text: '\nConsider the visual details from the image(s) when suggesting aesthetically compatible gear.',
      });
    } else {
      parts.push ({
        text: '\nNo images provided or images could not be processed for suggestions.',
      });
    }
  } else {
    parts.push ({text: '\nNo images provided for suggestions.'});
  }
  try {
    const result = await proModel.generateContent ({
      contents: [{role: 'user', parts: parts}],
    });
    return JSON.parse (result.response.text ());
  } catch (e) {
    console.error (
      'Failed to parse JSON response from Gemini for suggestions or API error:',
      e.message,
      e.response ? e.response.text () : 'No detailed API response text.'
    );
    return {
      error: 'AI response could not be parsed or API error.',
      suggestions: [
        {
          make: 'Error',
          model: 'Failed to retrieve suggestions',
          reason: 'Please try again. The AI service may have encountered an issue.',
        },
      ],
    };
  }
}

// --- GCS HELPER FUNCTIONS ---
const uploadToGcs = async (file, bucketName, storage) => {
  if (!file || !file.buffer) {
    console.error ('UploadToGcs Error: Invalid or empty file object provided.');
    throw new Error ('Invalid or empty file object provided.');
  }

  const bucket = storage.bucket (bucketName);

  // Sanitize the filename to remove characters that are not URL-friendly
  // This replaces anything that isn't a letter, number, dot, underscore, or hyphen with an underscore.
  const sanitizedFilename = file.originalname.replace (/[^\w.-]/g, '_');

  const blob = bucket.file (`audio-items/${Date.now ()}-${sanitizedFilename}`);

  try {
    // With Uniform bucket-level access, we only need to save the file.
    await blob.save (file.buffer, {
      metadata: {
        contentType: file.mimetype,
      },
    });

    const publicUrl = `https://storage.googleapis.com/${bucketName}/${blob.name}`;
    console.log (`SUCCESS: Uploaded file. It is now available at ${publicUrl}`);
    return publicUrl;
  } catch (err) {
    console.error ('GCS UPLOAD FAILED:', err);
    throw new Error (`GCS upload failed: ${err.message}`);
  }
};

const deleteFromGcs = async (fileUrl, bucketName, storage) => {
  try {
    const bucket = storage.bucket (bucketName);
    const fileName = fileUrl.split (`${bucketName}/`)[1];
    if (fileName) {
      await bucket.file (fileName).delete ();
      console.log (`Successfully deleted ${fileName} from GCS.`);
    }
  } catch (error) {
    console.error (`Failed to delete file from GCS: ${fileUrl}`, error);
  }
};

module.exports = {
  getAiFullAnalysisForCollectionItem,
  getComprehensiveWildFindAnalysis,
  getVisualAnalysis,
  getFactualFeatures,
  getSynthesizedValuation,
  analyzeAdText: analyzeAdTextAndReturnWithOriginal,
  getAdPriceComparisonInsight,
  getAiValueInsight,
  getRelatedGearSuggestions,
  uploadToGcs,
  deleteFromGcs,
};
