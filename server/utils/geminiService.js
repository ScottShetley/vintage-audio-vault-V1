// server/utils/geminiService.js
const {
  GoogleGenerativeAI,
  HarmBlockThreshold,
  HarmCategory,
} = require ('@google/generative-ai');
const axios = require ('axios');

// Access your API key as an environment variable
const genAI = new GoogleGenerativeAI (process.env.GEMINI_API_KEY);

const textModel = genAI.getGenerativeModel ({
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
      // --- MODIFIED: More explicit schema for AI Value Insight ---
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

// Helper function to convert image URL to Base64
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
 * Generates a market value insight for an audio item, optionally using images, with structured JSON output.
 * @param {string} make - The make of the item.
 * @param {string} model - The model of the item.
 * @param {string} condition - The condition of the item.
 * @param {string[]} imageUrls - Optional array of image URLs for visual context.
 * @returns {Promise<Object>} A promise that resolves to the AI-generated value insight in JSON.
 */
async function getAiValueInsight (make, model, condition, imageUrls = []) {
  const personaAndTask = `You are a vintage audio equipment expert. I'm interested in learning more about specific pieces of equipment.
    For the item provided, provide comprehensive detailed information structured as a JSON object, focusing on its market value, desirability, and context.
    
    Item Details:
    Make: ${make}
    Model: ${model}
    Condition: ${condition}

    Your response must be a JSON object with the following keys and content based on your expertise and web search of reputable vintage audio marketplaces (eBay sold listings, Reverb.com sold items, Audiogon classifieds/sold history):
    {
      "description": "Brief description and key features relevant to its value. If images are provided, incorporate visual details into the description.",
      "productionDates": "When the item was primarily manufactured (e.g., '1970-1975'). If unsure, provide a best estimate or state 'Varies'.",
      "marketDesirability": "How sought after this model is among collectors. Discuss factors like rarity, sound quality, build, aesthetics, historical significance, and repairability. Conclude with a clear statement on its desirability (e.g., 'Highly desirable', 'Moderately desirable', 'Niche appeal').",
      "estimatedValueUSD": "A current estimated market value range in USD (e.g., '$X - $Y USD'). Provide ranges for different sub-conditions if applicable (e.g., 'for parts/project', 'good working', 'fully restored'). If no sufficient comparable market data is found, clearly state 'Unable to determine market value range due to lack of comparable data.'",
      "disclaimer": "This is an automated estimate for informational purposes only and not a formal appraisal. Market values fluctuate and depend on many factors including actual condition, seller, and buyer."
    }
    Ensure the JSON is well-formed.`;

  const parts = [{text: personaAndTask}];

  if (imageUrls && imageUrls.length > 0) {
    const base64Images = await Promise.all (
      imageUrls.map (url => urlToBase64 (url))
    );
    base64Images.forEach (imgData => {
      if (imgData) {
        parts.push ({
          inlineData: {
            mimeType: imgData.mimeType,
            data: imgData.data,
          },
        });
      }
    });
  }

  const result = await textModel.generateContent ({
    contents: [{role: 'user', parts: parts}],
  });
  const response = await result.response;
  try {
    const parsedResponse = JSON.parse (response.text ());
    // Ensure the disclaimer matches the expected standard one
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
 * Suggests related vintage audio equipment based on an item's details, optionally using images, with structured JSON output.
 * @param {string} make - The make of the item.
 * @param {string} model - The model of the item.
 * @param {string} itemType - The type of item (e.g., Receiver, Turntable).
 * @param {string[]} imageUrls - Optional array of image URLs for visual context.
 * @returns {Promise<Object>} A promise that resolves to the AI-generated list of related gear in JSON.
 */
async function getRelatedGearSuggestions (
  make,
  model,
  itemType,
  imageUrls = []
) {
  const personaAndTask = `You are a vintage audio equipment expert. I'm interested in learning more about specific pieces of equipment.
    For the item provided (Make: ${make}, Model: ${model}, Item Type: ${itemType}):
    - Suggest 3-5 other vintage audio equipment models that are complementary, from a similar era, or of a similar quality tier.
    - Briefly explain why each suggestion is relevant (e.g., common pairings, similar sound profile, aesthetic match).
    - Consider any visual information from the images provided to refine the suggestions (e.g., aesthetic style, typical pairings seen in photos).

    The output must be a JSON object with a single key:
    {
      "suggestions": [
        {"make": "...", "model": "...", "reason": "..."},
        // ... up to 5 suggestions
      ]
    }
    If you cannot find specific suggestions, provide general recommendations for that item type.`;

  const parts = [{text: personaAndTask}];

  if (imageUrls && imageUrls.length > 0) {
    const base64Images = await Promise.all (
      imageUrls.map (url => urlToBase64 (url))
    );
    base64Images.forEach (imgData => {
      if (imgData) {
        parts.push ({
          inlineData: {
            mimeType: imgData.mimeType,
            data: imgData.data,
          },
        });
      }
    });
  }

  const result = await textModel.generateContent ({
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
