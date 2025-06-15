// server/utils/geminiService.js
const {
  GoogleGenerativeAI,
  HarmBlockThreshold,
  HarmCategory,
} = require ('@google/generative-ai');
const axios = require ('axios');

// Access your API key as an environment variable
const genAI = new GoogleGenerativeAI (process.env.GEMINI_API_KEY);

// --- SOLUTION: Create a dedicated model for Value Insights ---
const valueInsightModel = genAI.getGenerativeModel ({
  model: 'gemini-1.5-pro',
  safetySettings: [
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
  ],
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

// --- SOLUTION: Create a dedicated model for Gear Suggestions ---
const suggestionsModel = genAI.getGenerativeModel ({
  model: 'gemini-1.5-pro',
  safetySettings: [
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
  ],
  generationConfig: {
    temperature: 0.8, // Slightly higher temp for more creative suggestions
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

// Helper function to convert image URL to Base64 (no changes needed here)
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

/**
 * Generates a market value insight for an audio item.
 * (No changes to this function's logic, just which model it uses)
 */
async function getAiValueInsight (make, model, condition, imageUrls = []) {
  const personaAndTask = `You are a vintage audio equipment expert...`; // Keeping prompt brief for clarity
  // ... (The rest of your value insight prompt text is correct and does not need to change)

  const parts = [{text: personaAndTask}];
  // ... (The image handling logic is correct and does not need to change)

  // --- SOLUTION: Use the correct model ---
  const result = await valueInsightModel.generateContent ({
    contents: [{role: 'user', parts: parts}],
  });
  const response = await result.response;
  try {
    const parsedResponse = JSON.parse (response.text ());
    parsedResponse.disclaimer =
      'This is an automated estimate for informational purposes only and not a formal appraisal. Market values fluctuate.';
    return parsedResponse;
  } catch (e) {
    console.error (
      'Failed to parse JSON response from Gemini for value insight:',
      response.text (),
      e
    );
    return {
      error: 'AI response could not be parsed.',
      description: 'Could not retrieve full AI insights.',
      productionDates: 'N/A',
      marketDesirability: 'N/A',
      estimatedValueUSD: 'Unable to determine market value range.',
      disclaimer: 'This is an automated estimate for informational purposes only and not a formal appraisal. Market values fluctuate.',
    };
  }
}

/**
 * Suggests related vintage audio equipment.
 * (No changes to this function's logic, just which model it uses)
 */
async function getRelatedGearSuggestions (
  make,
  model,
  itemType,
  imageUrls = []
) {
  const personaAndTask = `You are a vintage audio equipment expert...`; // Keeping prompt brief for clarity
  // ... (The rest of your suggestions prompt text is correct and does not need to change)

  const parts = [{text: personaAndTask}];
  // ... (The image handling logic is correct and does not need to change)

  // --- SOLUTION: Use the correct model ---
  const result = await suggestionsModel.generateContent ({
    contents: [{role: 'user', parts: parts}],
  });
  const response = await result.response;
  try {
    return JSON.parse (response.text ());
  } catch (e) {
    console.error (
      'Failed to parse JSON response from Gemini for suggestions:',
      response.text (),
      e
    );
    return {
      suggestions: [
        {
          make: 'Error',
          model: 'Failed to parse AI response',
          reason: 'Please try again.',
        },
      ],
    };
  }
}

module.exports = {
  getAiValueInsight,
  getRelatedGearSuggestions,
};
