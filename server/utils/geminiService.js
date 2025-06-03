// server/utils/geminiService.js
const {
  GoogleGenerativeAI,
  HarmBlockThreshold,
  HarmCategory,
} = require ('@google/generative-ai');
const axios = require ('axios'); // --- ADDED: Axios for fetching image data ---

// Access your API key as an environment variable
const genAI = new GoogleGenerativeAI (process.env.GEMINI_API_KEY);

const textModel = genAI.getGenerativeModel ({
  model: 'gemini-1.5-pro', // Using 1.5 Pro. If you get access to 'gemini-2.5-pro', you can try that.
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
    maxOutputTokens: 1024,
  },
});

// --- ADDED: Helper function to convert image URL to Base64 ---
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
    return null; // Return null if conversion fails
  }
}
// --- END ADDED Helper ---

/**
 * Generates a market value insight for an audio item, optionally using images.
 * @param {string} make - The make of the item.
 * @param {string} model - The model of the item.
 * @param {string} condition - The condition of the item.
 * @param {string[]} imageUrls - Optional array of image URLs for visual context.
 * @returns {Promise<string>} A promise that resolves to the AI-generated value insight.
 */
async function getAiValueInsight (make, model, condition, imageUrls = []) {
  const textPrompt = `Provide a market value range (e.g., "$X - $Y USD") for a vintage audio equipment item with the following details:
    Make: ${make}
    Model: ${model}
    Condition: ${condition}

    Crucially, perform a targeted web search on reputable vintage audio marketplaces like eBay (specifically completed/sold listings), Reverb.com (sold items), and Audiogon (classifieds/sold history). Analyze the recent sold prices from these sites.
    Consider any visual information provided in the images to refine the estimate (e.g., specific cosmetic condition, rare features visible, overall aesthetic).
    If no sufficient comparable data is found, state that clearly.
    The output should be a concise value range and a clear disclaimer that it is an automated estimate for informational purposes only and not a formal appraisal.`;

  const parts = [{text: textPrompt}];

  // --- MODIFIED: Convert image URLs to Base64 and add as inlineData ---
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
  // --- END MODIFIED ---

  const result = await textModel.generateContent ({
    contents: [{role: 'user', parts: parts}],
  });
  const response = await result.response;
  return response.text ();
}

/**
 * Suggests related vintage audio equipment based on an item's details, optionally using images.
 * @param {string} make - The make of the item.
 * @param {string} model - The model of the item.
 * @param {string} itemType - The type of item (e.g., Receiver, Turntable).
 * @param {string[]} imageUrls - Optional array of image URLs for visual context.
 * @returns {Promise<string>} A promise that resolves to the AI-generated list of related gear.
 */
async function getRelatedGearSuggestions (
  make,
  model,
  itemType,
  imageUrls = []
) {
  const textPrompt = `Suggest 3-5 other vintage audio equipment models that are complementary, from a similar era, or of a similar quality tier to the following item:
    Make: ${make}
    Model: ${model}
    Item Type: ${itemType}

    Consider any visual information provided in the images to refine the suggestions (e.g., aesthetic style, typical pairings seen in photos).
    The output should be a simple numbered list of makes and models.`;

  const parts = [{text: textPrompt}];

  // --- MODIFIED: Convert image URLs to Base64 and add as inlineData ---
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
  // --- END MODIFIED ---

  const result = await textModel.generateContent ({
    contents: [{role: 'user', parts: parts}],
  });
  const response = await result.response;
  return response.text ();
}

module.exports = {
  getAiValueInsight,
  getRelatedGearSuggestions,
};
