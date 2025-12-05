
import { GoogleGenAI, Chat } from "@google/genai";
import { TravelPlan, HiddenGem } from "../types";

// Allow access to AI Studio global for key selection
declare global {
  interface Window {
    aistudio?: {
      openSelectKey: () => Promise<void>;
      hasSelectedApiKey: () => Promise<boolean>;
    };
  }
}

// Ensure API key is present
const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

// Helper for comprehensive error formatting
const formatError = (error: any): string => {
  console.error("GenAI API Error Details:", error);
  
  const msg = error?.message || error?.toString() || 'Unknown error';
  
  if (msg.includes('API key') || msg.includes('authentication')) {
    return 'Authentication failed. Please check your API key settings.';
  }
  if (msg.includes('429')) {
    return 'Rate limit exceeded. The API is busy, please wait a moment and try again.';
  }
  if (msg.includes('503')) {
    return 'Service overloaded or unavailable. Please try again later.';
  }
  if (msg.includes('SAFETY')) {
    return 'The request was blocked due to safety settings.';
  }
  
  return `AI Request Failed: ${msg}`;
};

export const searchLocationWithMaps = async (query: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Find the location '${query}'. Return a brief summary of what it is, exactly where it is, and its map coordinates if possible.`,
      config: {
        tools: [{ googleMaps: {} }],
        systemInstruction: "You are a location finder helper. Be concise.",
      },
    });

    const text = response.text;
    if (!text) throw new Error("No information found for this location.");

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    
    // Extract map link if available
    let mapLink = '';
    let mapTitle = '';
    
    if (groundingChunks) {
      groundingChunks.forEach((chunk: any) => {
        if (chunk.maps) {
          mapLink = chunk.maps.uri;
          mapTitle = chunk.maps.title;
        }
      });
    }

    return {
      text,
      mapLink,
      mapTitle
    };
  } catch (error) {
    throw new Error(formatError(error));
  }
};

// Generates 3 distinct visual previews of the location
export const generateLocationPreviews = async (location: string): Promise<string[]> => {
    try {
        // We generate 3 images in parallel using Flash Image
        const prompts = [
            `A hyper-realistic, 4k, wide-angle photograph of ${location}, daytime, clear blue sky, iconic view.`,
            `A cinematic sunset photo of ${location}, warm golden hour lighting, dramatic shadows, photorealistic.`,
            `An aerial drone shot of ${location}, showing surroundings and landscape, high detail, photorealistic.`
        ];

        const promises = prompts.map(async (prompt) => {
            try {
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash-image',
                    contents: { parts: [{ text: prompt }] },
                });
                
                for (const part of response.candidates?.[0]?.content?.parts || []) {
                    if (part.inlineData) {
                        return `data:image/png;base64,${part.inlineData.data}`;
                    }
                }
                return null;
            } catch (e) {
                console.warn("Failed to generate one image preview:", e);
                return null;
            }
        });

        const results = await Promise.all(promises);
        return results.filter((img): img is string => img !== null);
    } catch (error) {
        console.error("Full image generation failure", error);
        return [];
    }
}

// Generate a single spot image
export const generateSpotImage = async (spotName: string, location: string): Promise<string | null> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: `A photorealistic travel photography shot of the hidden spot "${spotName}" in ${location}. High quality, detailed, scenic, natural lighting.` }] },
        });
        
        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                return `data:image/png;base64,${part.inlineData.data}`;
            }
        }
        return null;
    } catch (e) {
        return null;
    }
}

export const generateDeepTravelItinerary = async (location: string): Promise<TravelPlan> => {
  try {
    // We use gemini-3-pro-preview with high thinking budget and JSON output
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `Create a comprehensive, structured travel guide for ${location}.
      
      Return the response in strictly valid JSON format.
      Structure the JSON with the following keys:
      
      {
        "confidence": "High" | "Medium" | "Low",
        "overview": "Brief summary of physical features (forests, beaches, mountains, etc.)",
        "disaster_profile": {
            "zone_type": "e.g., Earthquake prone zone",
            "risk_score": "X/10",
            "details": "Brief explanation of risks"
        },
        "safety_measures": ["Measure 1", "Measure 2"...],
        "itinerary": ["Day 1: ...", "Day 2: ...", ...],
        "weather": {
            "crowd_levels": "Brief text summary of crowds",
            "crowd_curve": [{"month": "Jan", "score": 45}, {"month": "Feb", "score": 50}, ... (for all 12 months, score 0-100 where 100 is max crowd)],
            "best_time_to_visit": "Months/Seasons",
            "forecast_summary": "Typical weather description"
        },
        "photography": {
            "basic_guide": "Best conditions, light level, terrain info",
            "technical_settings": {
                "iso": "Recommended ISO",
                "shutter_speed": "Recommended Shutter",
                "aperture": "Recommended Aperture",
                "notes": "Other settings"
            }
        },
        "trip_guide": {
            "transport_system": "How to get around",
            "travel_tips": ["Tip 1", "Tip 2"...],
            "packing_suggestions": ["Item 1", "Item 2"...],
            "common_scams": "Scams to watch out for"
        }
      }
      
      Do not format markdown code blocks, just return raw JSON string.`,
      config: {
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 32768 },
      },
    });

    if (!response.text) {
        throw new Error("The model returned an empty response.");
    }

    try {
        const data = JSON.parse(response.text);
        return data as TravelPlan;
    } catch (e) {
        console.error("Failed to parse JSON", response.text);
        throw new Error("Failed to parse the travel plan data.");
    }

  } catch (error) {
    throw new Error(formatError(error));
  }
};

export const createTravelChat = (context: string): Chat => {
  return ai.chats.create({
    model: "gemini-3-pro-preview",
    config: {
      systemInstruction: `You are a knowledgeable travel assistant. The user has just received a travel plan with the following details: 
      
      ${context}
      
      Answer their follow-up questions about this location, the itinerary, or travel advice. Keep answers helpful and concise.`,
    },
  });
};

export const searchHiddenSpots = async (location: string): Promise<HiddenGem[]> => {
  try {
    // Request strict JSON for hidden spots
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Find exactly 5 unique hidden gems or secret spots in or near ${location}.
      Return strictly a JSON array of objects. No markdown.
      Format: [{"name": "Spot Name", "description": "Short description of what it is", "location_hint": "Where is it roughly"}]`,
      config: {
        responseMimeType: "application/json"
      },
    });

    const text = response.text;
    if (!text) throw new Error("No results found for hidden spots.");

    try {
        const spots = JSON.parse(text) as HiddenGem[];
        return spots.slice(0, 5);
    } catch (e) {
        throw new Error("Failed to parse hidden spots data.");
    }

  } catch (error) {
    throw new Error(formatError(error));
  }
};

// Utilities for saving files
export const downloadFile = (content: string | Blob, filename: string, type: 'text/plain' | 'video/mp4') => {
    const blob = typeof content === 'string' 
        ? new Blob([content], { type }) 
        : content;
        
    const url = typeof content === 'string' || content instanceof Blob
        ? URL.createObjectURL(blob)
        : content; // If it's already a blob url

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    if (typeof content === 'string' || content instanceof Blob) {
        URL.revokeObjectURL(url);
    }
};

export const openApiKeySelection = async () => {
    if (window.aistudio) {
        try {
            await window.aistudio.openSelectKey();
        } catch (e) {
            console.error("Failed to open key selection", e);
        }
    }
}

export const generateReferenceImage = async (location: string, aspectRatio: '16:9' | '9:16'): Promise<string> => {
    // Use a fresh instance to ensure the latest API key is used
    const currentAi = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    
    // gemini-2.5-flash-image might not strictly adhere to imageConfig for aspect ratio,
    // so we also include it in the prompt.
    const ratioText = aspectRatio === '16:9' ? 'wide angle 16:9' : 'vertical 9:16';
    const prompt = `A cinematic, photorealistic, high-quality shot of ${location}. ${ratioText}, clear view, sunny day.`;

    try {
        const response = await currentAi.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: prompt }] },
            config: {
                imageConfig: {
                    aspectRatio: aspectRatio
                }
            }
        });
        
        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                return `data:image/png;base64,${part.inlineData.data}`;
            }
        }
        throw new Error("No image generated");
    } catch (e: any) {
        throw new Error(formatError(e));
    }
};

export const generateDroneVideo = async (imageBase64: string, prompt: string, aspectRatio: '16:9' | '9:16'): Promise<string> => {
    // Use a fresh instance for Veo to ensure paid key is used
    const currentAi = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    
    // Clean base64 string
    const cleanBase64 = imageBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");
    
    try {
        let operation = await currentAi.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview',
            prompt: prompt,
            image: {
                imageBytes: cleanBase64,
                mimeType: 'image/png', 
            },
            config: {
                numberOfVideos: 1,
                resolution: '720p',
                aspectRatio: aspectRatio
            }
        });

        // Poll for completion
        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 5000));
            operation = await currentAi.operations.getVideosOperation({operation: operation});
        }

        if (operation.error) {
            throw new Error(operation.error.message || "Video generation failed");
        }

        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (!downloadLink) throw new Error("No video URI returned");

        // Fetch the video content using the API key
        const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
        if (!response.ok) throw new Error("Failed to download video content");
        
        const blob = await response.blob();
        return URL.createObjectURL(blob);

    } catch (e: any) {
        throw new Error(formatError(e));
    }
};
