// server/utils/geminiService.js
const {
  GoogleGenerativeAI,
  HarmBlockThreshold,
  HarmCategory,
} = require ('@google/generative-ai');
const axios = require ('axios');

// Access your API key as an environment variable
const genAI = new GoogleGenerativeAI (process.env.GEMINI_API_KEY);

// --- Model for Value Insights (No changes here) ---
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

// --- Model for Gear Suggestions (No changes to model config, only prompt will change) ---
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

// Helper function to convert image URL to Base64 (No changes here)
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
 * (No changes to this function's logic, just uses the dedicated valueInsightModel)
 */
async function getAiValueInsight (make, model, condition, imageUrls = []) {
  const itemInfo = `Item: ${make} ${model}, Condition: ${condition}.`;
  const personaAndTask = `You are a vintage audio equipment expert providing a market valuation. Based on the provided item information and any images, analyze its key features, production era, and market desirability. Provide a concise description, production dates, market desirability assessment, and an estimated market value range in USD. If a value cannot be determined, state that clearly.`;

  const parts = [{text: `${personaAndTask}\n${itemInfo}`}];

  if (imageUrls && imageUrls.length > 0) {
    const imagePartsPromises = imageUrls.slice (0, 5).map (async url => {
      // Process up to 5 images
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
    const response = await result.response;
    const parsedResponse = JSON.parse (response.text ());
    // Ensure disclaimer is always present, even if AI provides one.
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

/**
 * Suggests related vintage audio equipment.
 * (MODIFIED PROMPT within this function)
 */
async function getRelatedGearSuggestions (
  make,
  model,
  itemType,
  imageUrls = []
) {
  // --- MODIFIED PROMPT ---
  const itemInfo = `The provided item is a ${make} ${model} (Type: ${itemType}).`;
  let personaAndTask = `You are a knowledgeable vintage audio aficionado and system building expert. Your task is to suggest 3-5 complementary vintage audio components that would pair exceptionally well with the provided item.

${itemInfo}

Consider the following when making your suggestions:
1.  Complementary Nature: Suggest components that complete or enhance a system with the provided item. For example:
    - If the item is a Receiver or Amplifier, suggest suitable Speakers, a Turntable, a Tape Deck, or a CD Player. **Do NOT suggest another Receiver or Amplifier.**
    - If the item is a Turntable, suggest a compatible Phono Pre-amplifier (if needed), Receiver/Amplifier, or Speakers. **Do NOT suggest another Turntable.**
    - If the item is Speakers, suggest a suitable Receiver/Amplifier. **Do NOT suggest other Speakers.**
    - If the item is a source component like a Tape Deck or CD Player, suggest a Receiver/Amplifier or Integrated Amplifier.
2.  Era and Aesthetics: Prioritize components from a similar manufacturing era or those with a compatible aesthetic to create a visually and historically cohesive system.
3.  Manufacturer Synergy: Pay special attention to other components that ${make} (the manufacturer of the input item) might have released as part of the same product line or system around the time the ${model} was produced. These are often designed to work well together.
4.  Reasoning: For each suggestion, briefly explain why it's a good match (e.g., sonic synergy, contemporary pairing, aesthetic compatibility, part of the original system).

Provide your suggestions in the specified JSON format.`;
  // --- END MODIFIED PROMPT ---

  const parts = [{text: personaAndTask}];

  if (imageUrls && imageUrls.length > 0) {
    const imagePartsPromises = imageUrls.slice (0, 3).map (async url => {
      // Process up to 3 images for suggestions
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
    const response = await result.response;
    return JSON.parse (response.text ());
  } catch (e) {
    console.error (
      'Failed to parse JSON response from Gemini for suggestions or API error:',
      e.message,
      e.response ? e.response.text () : 'No detailed API response text.'
    );
    return {
      error: 'AI response could not be parsed or API error.', // Added error field
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

module.exports = {
  getAiValueInsight,
  getRelatedGearSuggestions,
};
