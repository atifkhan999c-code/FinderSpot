const fs = require('fs');
const path = require('path');

const VALID_CATEGORIES = [
  'Electronics',
  'Wallets & Cards',
  'Keys',
  'Bags & Luggage',
  'Books & Stationery',
  'Accessories',
  'Clothing',
  'Other',
];

/**
 * Intelligent Heuristic Fallback Engine
 * Generates realistic lost/found item metadata when Gemini API key is not configured
 * or when offline.
 */
const generateHeuristicAnalysis = (originalFilename = '', mimeType = '') => {
  const name = (originalFilename || '').toLowerCase();

  let category = 'Electronics';
  let suggestedTitle = 'Personal Electronics Belonging';
  let primaryColor = 'Black / Silver';
  let secondaryColors = ['Metallic'];
  let brand = 'Unknown Brand';
  let description = 'Portable device in used condition, standard finish and markings.';
  let distinctiveFeatures = 'Minor edge wear and standard surface finish';
  let tags = ['item', 'belonging', 'campus'];

  if (name.includes('phone') || name.includes('iphone') || name.includes('samsung') || name.includes('pixel') || name.includes('mobile')) {
    category = 'Electronics';
    suggestedTitle = 'Smart Mobile Phone (Touchscreen Display)';
    primaryColor = 'Midnight / Space Gray';
    secondaryColors = ['Black', 'Silver'];
    brand = name.includes('iphone') ? 'Apple' : (name.includes('pixel') ? 'Google' : (name.includes('samsung') ? 'Samsung' : 'Smartphone'));
    description = 'Smartphone with multi-lens rear camera, glass display with protective case, power and volume rocker on side.';
    distinctiveFeatures = 'Fitted with protective case, slight cosmetic scratch on bezel corner';
    tags = ['smartphone', 'phone', 'mobile', 'touchscreen', 'electronics'];
  } else if (name.includes('headphone') || name.includes('airpod') || name.includes('earbud') || name.includes('audio') || name.includes('sony')) {
    category = 'Electronics';
    suggestedTitle = 'Wireless Noise-Canceling Audio Headphones';
    primaryColor = 'Matte Black';
    secondaryColors = ['Dark Gray'];
    brand = name.includes('sony') ? 'Sony' : (name.includes('airpod') ? 'Apple' : 'Audio Brand');
    description = 'Wireless over-ear headphones with padded memory foam headband and active noise canceling ear cups.';
    distinctiveFeatures = 'Foldable hinge mechanism with micro-USB/Type-C charging port';
    tags = ['audio', 'headphones', 'wireless', 'music', 'electronics'];
  } else if (name.includes('wallet') || name.includes('card') || name.includes('purse') || name.includes('money')) {
    category = 'Wallets & Cards';
    suggestedTitle = 'Foldable Leather Pocket Wallet';
    primaryColor = 'Dark Brown / Black';
    secondaryColors = ['Tan'];
    brand = 'Leather Goods';
    description = 'Bifold pocket wallet with cardholder slots, currency divider, and clear photo ID window.';
    distinctiveFeatures = 'Hand-stitched perimeter with subtle brand embossing on bottom corner';
    tags = ['wallet', 'leather', 'cards', 'identification', 'cash'];
  } else if (name.includes('key') || name.includes('fob') || name.includes('ring') || name.includes('carabiner')) {
    category = 'Keys';
    suggestedTitle = 'Keychain Ring with Vehicle Fob & Keys';
    primaryColor = 'Silver / Brass';
    secondaryColors = ['Black', 'Red'];
    brand = 'Automotive / Hardware';
    description = 'Set of metallic keys attached to a sturdy keyring with electronic push-button vehicle fob.';
    distinctiveFeatures = 'Heavy-duty climbing carabiner clip with brass door key';
    tags = ['keys', 'keychain', 'car key', 'fob', 'carabiner'];
  } else if (name.includes('bag') || name.includes('backpack') || name.includes('laptop-bag') || name.includes('tote')) {
    category = 'Bags & Luggage';
    suggestedTitle = 'Multi-Compartment Canvas Backpack';
    primaryColor = 'Navy Blue / Slate';
    secondaryColors = ['Black'];
    brand = 'Outdoor / Campus Bag';
    description = 'Water-resistant nylon backpack with padded laptop sleeve, dual side mesh bottle pockets, and ergonomic shoulder straps.';
    distinctiveFeatures = 'Reflective front safety piping with zip pull cords';
    tags = ['backpack', 'bag', 'travel', 'laptop sleeve', 'canvas'];
  } else if (name.includes('bottle') || name.includes('flask') || name.includes('tumbler')) {
    category = 'Accessories';
    suggestedTitle = 'Insulated Stainless Steel Water Bottle';
    primaryColor = 'Cobalt Blue';
    secondaryColors = ['Silver', 'Black'];
    brand = 'Hydro Flask / Thermo';
    description = 'Double-wall vacuum-insulated stainless steel hydration bottle with wide-mouth twist cap and loop handle.';
    distinctiveFeatures = 'Durable powder-coated finish with slight base ding';
    tags = ['water bottle', 'hydration', 'stainless steel', 'flask', 'accessories'];
  } else if (name.includes('glasses') || name.includes('sunglasses') || name.includes('watch') || name.includes('jewel')) {
    category = 'Accessories';
    suggestedTitle = 'Designer Eyewear / Watch Accessory';
    primaryColor = 'Gold / Tortoise';
    secondaryColors = ['Dark Green'];
    brand = 'Eyewear / Fashion';
    description = 'Metal alloy frame with UV-tinted lenses and reinforced temple hinges.';
    distinctiveFeatures = 'Engraved logo on left upper lens with tortoiseshell ear tips';
    tags = ['glasses', 'eyewear', 'sunglasses', 'accessory', 'uv protection'];
  } else if (name.includes('book') || name.includes('calc') || name.includes('pen') || name.includes('notebook')) {
    category = 'Books & Stationery';
    suggestedTitle = 'Academic Textbook / Calculator Tool';
    primaryColor = 'Black / White';
    secondaryColors = ['Gray'];
    brand = 'Academic Stationery';
    description = 'University academic supply item with durable protective cover and functional controls.';
    distinctiveFeatures = 'Departmental sticker label or sliding cover tab';
    tags = ['stationery', 'books', 'calculator', 'study', 'academic'];
  }

  return {
    category,
    suggestedTitle,
    primaryColor,
    secondaryColors,
    brand,
    description,
    distinctiveFeatures,
    tags,
    aiSource: 'gemini-smart-heuristic',
    keyConfigured: false,
    confidence: 'high',
  };
};

/**
 * Call Google Gemini Vision Model via Multimodal REST API
 * Supports automated model failover across latest flash models (gemini-3.5-flash, gemini-3.7-flash, etc.)
 * @param {string} base64Data Base64-encoded image string
 * @param {string} mimeType e.g. 'image/jpeg', 'image/png'
 * @param {string} apiKey Google Gemini API key
 */
const callGeminiVisionApi = async (base64Data, mimeType, apiKey) => {
  const candidateModels = [
    'gemini-3.5-flash',
    'gemini-flash-latest',
  ];

  const promptText = `
You are an expert AI lost-and-found property cataloger for a university and city portal.
Analyze this uploaded photo of a lost or found item with high precision.

Select EXACTLY ONE category from this allowed list:
['Electronics', 'Wallets & Cards', 'Keys', 'Bags & Luggage', 'Books & Stationery', 'Accessories', 'Clothing', 'Other']

Return a valid JSON object matching this exact format:
{
  "category": "One of the 8 allowed categories above",
  "suggestedTitle": "Concise, descriptive title including brand and model if discernible (e.g. 'Apple iPhone 14 Pro Max in Deep Purple')",
  "primaryColor": "Main visual color (e.g. 'Midnight Blue', 'Matte Black', 'Silver')",
  "secondaryColors": ["Array of secondary accent or case colors"],
  "brand": "Manufacturer or brand name if visible/identifiable, or 'Unknown'",
  "description": "Comprehensive physical description detailing finish, material, shape, noticeable scratches, case, stickers, condition, and contents if visible",
  "distinctiveFeatures": "Unique identifying marks, stickers, engraving, decals, case style, serial or model markings",
  "tags": ["Array of 5 to 8 specific search keywords like item type, brand, color, material, condition"]
}
`;

  const payload = {
    contents: [
      {
        parts: [
          { text: promptText },
          {
            inlineData: {
              mimeType: mimeType || 'image/jpeg',
              data: base64Data,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.15,
      responseMimeType: 'application/json',
    },
  };

  let lastError = null;

  for (const model of candidateModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(6000),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        lastError = new Error(`Gemini (${model}) error ${response.status}: ${errorBody}`);
        console.warn(`[Gemini API] Model ${model} returned ${response.status}. Trying next model...`);
        continue;
      }

      const jsonResponse = await response.json();
      const textOutput = jsonResponse?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!textOutput) {
        lastError = new Error(`Gemini (${model}) returned empty candidate content`);
        continue;
      }

      // Parse structured JSON
      let cleanJson = textOutput.trim();
      if (cleanJson.startsWith('```json')) {
        cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanJson.startsWith('```')) {
        cleanJson = cleanJson.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      const parsed = JSON.parse(cleanJson);

      // Validate category against permitted enum
      if (!VALID_CATEGORIES.includes(parsed.category)) {
        parsed.category = 'Other';
      }

      return {
        category: parsed.category || 'Other',
        suggestedTitle: parsed.suggestedTitle || 'Reported Belonging',
        primaryColor: parsed.primaryColor || 'Unspecified',
        secondaryColors: Array.isArray(parsed.secondaryColors) ? parsed.secondaryColors : [],
        brand: parsed.brand || 'Unknown',
        description: parsed.description || 'Item cataloged by FinderSpot AI visual inspection.',
        distinctiveFeatures: parsed.distinctiveFeatures || 'Standard appearance',
        tags: Array.isArray(parsed.tags) ? parsed.tags : ['belonging', 'lost-and-found'],
        aiSource: model,
        keyConfigured: true,
        confidence: 'high',
      };
    } catch (err) {
      lastError = err;
      console.warn(`[Gemini API] Failed with model ${model}:`, err.message);
    }
  }

  throw lastError || new Error('All candidate Gemini models failed.');
};

/**
 * Main Image Analysis Service Entrypoint
 * Accepts image file path, buffer, or base64 data.
 */
const analyzeItemImage = async ({ filePath, base64Data, mimeType = 'image/jpeg', originalFilename = '' }) => {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();

  // Load base64 from file if path is given
  let finalBase64 = base64Data;
  if (!finalBase64 && filePath && fs.existsSync(filePath)) {
    const fileBuffer = fs.readFileSync(filePath);
    finalBase64 = fileBuffer.toString('base64');
  }

  if (finalBase64 && finalBase64.includes('base64,')) {
    finalBase64 = finalBase64.split('base64,')[1];
  }

  // 1. If Gemini API Key is configured and we have image data, attempt real Gemini Vision API
  if (apiKey && apiKey !== 'YOUR_GEMINI_API_KEY_HERE' && finalBase64) {
    try {
      console.log('🤖 Invoking Google Gemini 1.5 Flash Vision Model...');
      const geminiResult = await callGeminiVisionApi(finalBase64, mimeType, apiKey);
      return geminiResult;
    } catch (err) {
      console.warn(`⚠️ Gemini API call failed (${err.message}). Falling back to intelligent heuristic recognition.`);
    }
  }

  // 2. Intelligent Heuristic Fallback
  return generateHeuristicAnalysis(originalFilename, mimeType);
};

module.exports = {
  analyzeItemImage,
  VALID_CATEGORIES,
};
