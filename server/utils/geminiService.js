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

// --- NEW WILD FIND ANALYSIS FUNCTIONS (MULTI-STEP) ---

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

  const prompt = `Analyze the provided image to identify ALL distinct pieces of vintage audio equipment shown.
For each item, provide:
1.  Manufacturer (make): Be as specific as possible. If entirely undeterminable, use "Unidentified Make".
2.  Model name/number (model): Be as specific as possible. Avoid generic terms like 'Unknown'. If a specific model cannot be determined despite your best effort, use "Model Not Clearly Identifiable".
3.  Visual Condition (conditionDescription): A detailed description of the item's visual condition.

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
      },
      required: ['make', 'model', 'conditionDescription'],
    },
  };

  try {
    // *** CHANGED TO proModel for potentially better identification accuracy ***
    const result = await proModel.generateContent ({
      contents: [{role: 'user', parts: [imagePart, {text: prompt}]}],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: schema,
        // Consider adding temperature if results are too rigid or too creative
        // temperature: 0.6,
      },
    });
    return JSON.parse (result.response.text ());
  } catch (error) {
    console.error ('Error in getVisualAnalysis with proModel:', error);
    // Fallback to flashModel if proModel fails for some reason (optional, or just let it error)
    // console.log('Falling back to flashModel for getVisualAnalysis');
    // try {
    //   const fallbackResult = await flashModel.generateContent ({
    //     contents: [{role: 'user', parts: [imagePart, {text: prompt}]}],
    //     generationConfig: {
    //       responseMimeType: 'application/json',
    //       responseSchema: schema,
    //     },
    //   });
    //   return JSON.parse (fallbackResult.response.text ());
    // } catch (fallbackError) {
    //   console.error ('Error in getVisualAnalysis with flashModel fallback:', fallbackError);
    //   throw new Error (`Gemini AI visual analysis failed on both models: ${fallbackError.message}`);
    // }
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
        // Optional message field
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
Observed Condition: ${visualData.conditionDescription}
${factualData.message ? 'Note from feature analysis: ' + factualData.message : ''}

Your Task: Based on ALL the information above, provide an estimated market value range in USD.
Crucially, provide a brief reasoning that explains how the item's features (or lack of specific features if model is generic) and its specific visual condition justify the estimated value.
For example, mention if the value is higher due to rarity or lower due to cosmetic damage or if a specific valuation is difficult due to a generic model.
Include a standard disclaimer. Return your response in the specified JSON format.`;
  const schema = {
    type: 'OBJECT',
    properties: {
      valueRange: {
        type: 'STRING',
        description: 'The estimated market value range in USD (e.g., "$250 - $350", or "Difficult to determine for generic model").',
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
    required: ['valueRange', 'reasoning', 'disclaimer'],
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

// --- EXISTING AI FUNCTIONS (FOR ITEMS ALREADY IN DATABASE) ---
const valueInsightModel = genAI.getGenerativeModel ({
  model: MODEL_NAME_PRO,
  safetySettings: DEFAULT_SAFETY_SETTINGS,
  generationConfig: {
    temperature: 0.7,
    topP: 0.95,
    topK: 60,
    maxOutputTokens: 2048,
    responseMimeType: 'application/json',
    responseSchema: {
      type: 'OBJECT',
      properties: {
        description: {
          type: 'STRING',
          description: 'Brief description and key features relevant to its value.',
        },
        productionDates: {
          type: 'STRING',
          description: "When the item was manufactured (e.g., '1970-1975').",
        },
        marketDesirability: {
          type: 'STRING',
          description: 'How sought after it is, considering rarity, sound quality, build, aesthetics, repairability.',
        },
        estimatedValueUSD: {
          type: 'STRING',
          description: "A market value range in USD (e.g., '$X - $Y'). Explicitly state 'Unable to determine' if no data.",
        },
        disclaimer: {
          type: 'STRING',
          description: 'Standard disclaimer about automated estimates.',
        },
      },
      required: [
        'description',
        'productionDates',
        'marketDesirability',
        'estimatedValueUSD',
        'disclaimer',
      ],
    },
  },
});

const suggestionsModel = genAI.getGenerativeModel ({
  model: MODEL_NAME_PRO,
  safetySettings: DEFAULT_SAFETY_SETTINGS,
  generationConfig: {
    temperature: 0.8,
    topP: 0.95,
    topK: 60,
    maxOutputTokens: 2048,
    responseMimeType: 'application/json',
    responseSchema: {
      type: 'OBJECT',
      properties: {
        suggestions: {
          type: 'ARRAY',
          description: 'An array of 3-5 suggested items.',
          items: {
            type: 'OBJECT',
            properties: {
              make: {
                type: 'STRING',
                description: 'The manufacturer of the suggested item.',
              },
              model: {
                type: 'STRING',
                description: 'The model name/number of the suggested item.',
              },
              reason: {
                type: 'STRING',
                description: 'A brief explanation of why this item is a good suggestion.',
              },
            },
            required: ['make', 'model', 'reason'],
          },
        },
      },
      required: ['suggestions'],
    },
  },
});

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
  const itemInfo = `Item: ${make} ${model}, Condition: ${condition}.`;
  const personaAndTask = `You are a vintage audio equipment expert providing a market valuation. Based on the provided item information and any images, analyze its key features, production era, and market desirability. Provide a concise description, production dates, market desirability assessment, and an estimated market value range in USD. If a value cannot be determined, state that clearly.`;
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
    const result = await valueInsightModel.generateContent ({
      contents: [{role: 'user', parts: parts}],
    });
    const parsedResponse = JSON.parse (result.response.text ());
    parsedResponse.disclaimer =
      'This is an automated estimate for informational purposes only and not a formal appraisal. Market values fluctuate.';
    return parsedResponse;
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
      disclaimer: 'This is an automated estimate for informational purposes only and not a formal appraisal. Market values fluctuate.',
    };
  }
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
    const result = await suggestionsModel.generateContent ({
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
const uploadToGcs = (file, bucketName, storage) =>
  new Promise ((resolve, reject) => {
    const bucket = storage.bucket (bucketName);
    const blob = bucket.file (
      `audio-items/${Date.now ()}-${file.originalname.replace (/ /g, '_')}`
    );
    const stream = blob.createWriteStream ({
      metadata: {contentType: file.mimetype},
      resumable: false,
    });
    stream.on ('error', err => {
      console.error ('GCS Upload Stream Error:', err);
      reject (err);
    });
    stream.on ('finish', () => {
      const publicUrl = `https://storage.googleapis.com/${bucketName}/${blob.name}`;
      resolve (publicUrl);
    });
    stream.end (file.buffer);
  });

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
    // Optionally re-throw or handle more gracefully depending on requirements
    // For now, just logging, as per original code.
  }
};

module.exports = {
  getVisualAnalysis,
  getFactualFeatures,
  getSynthesizedValuation,
  getAiValueInsight,
  getRelatedGearSuggestions,
  uploadToGcs,
  deleteFromGcs,
};
