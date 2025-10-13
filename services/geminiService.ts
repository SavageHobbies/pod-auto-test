import { GoogleGenAI, Type, Modality } from "@google/genai";
import { DesignAsset, Trend, MarketingCopy, MockupStyle } from "../types.ts";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to convert image URL (http or data URL) to a generative part
const urlToGenerativePart = async (url: string, mimeType: string) => {
    const response = await fetch(url);
    const blob = await response.blob();
    const reader = new FileReader();
    const base64EncodedDataPromise = new Promise<string>((resolve) => {
        reader.onloadend = () => {
            const dataUrl = reader.result as string;
            // Handle cases where the data URL might not have a comma (though it should)
            const commaIndex = dataUrl.indexOf(',');
            if (commaIndex > -1) {
                resolve(dataUrl.substring(commaIndex + 1));
            } else {
                // If no comma, it might be just the base64 data already
                resolve(dataUrl);
            }
        };
        reader.readAsDataURL(blob);
    });
    const data = await base64EncodedDataPromise;
    return {
        inlineData: {
            data,
            mimeType,
        },
    };
};

/**
 * Generates a design image using AI.
 */
export const generateDesignImage = async (
  prompt: string,
  imagePart?: { inlineData: { data: string; mimeType: string } },
  textToAdd?: string
): Promise<string> => {
    
    let fullPrompt = `
        You are an expert graphic designer creating art for print-on-demand t-shirts.
        Your task is to create a design based on the following prompt: "${prompt}".
    `;

    if (textToAdd) {
        if (textToAdd.toLowerCase().includes('quote') || textToAdd.toLowerCase().includes('message') || textToAdd.toLowerCase().includes('statement')) {
             fullPrompt += ` The design should creatively incorporate a text phrase that fits the instruction: "${textToAdd}".`;
        } else {
             fullPrompt += ` The design must include the text: "${textToAdd}". The text should be stylish, legible, and well-integrated.`;
        }
    }

    fullPrompt += `
        CRITICAL REQUIREMENTS:
        1. The FINAL output MUST have a transparent background. Do not add any color or shape behind the design.
        2. The design should be high-resolution and suitable for printing on apparel.
        3. Create a single, clean, centered design.
    `;
    
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: fullPrompt,
        config: {
            numberOfImages: 1,
            outputMimeType: 'image/png',
            aspectRatio: '1:1'
        }
    });
    
    if (response.generatedImages && response.generatedImages.length > 0) {
        const base64Image = response.generatedImages[0].image.imageBytes;
        return `data:image/png;base64,${base64Image}`;
    } else {
        throw new Error("AI failed to generate an image.");
    }
};

// FIX: Added editDesignImage function to support design modification feature.
/**
 * Edits a design image based on a prompt.
 */
export const editDesignImage = async (base64ImageUrl: string, prompt: string): Promise<string> => {
    const mimeType = base64ImageUrl.substring(base64ImageUrl.indexOf(":") + 1, base64ImageUrl.indexOf(";"));
    const imagePart = await urlToGenerativePart(base64ImageUrl, mimeType);
    const fullPrompt = `
        Modify the provided image based on this instruction: "${prompt}".
        IMPORTANT: Preserve the transparent background. Do not add a new background.
        The output should be the modified image, ready for print on a t-shirt.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [imagePart, { text: fullPrompt }] },
        config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
    });

    const imageOutputPart = response.candidates?.[0]?.content.parts.find(part => part.inlineData);
    if (imageOutputPart?.inlineData) {
        const { data, mimeType } = imageOutputPart.inlineData;
        return `data:${mimeType};base64,${data}`;
    }
    throw new Error("AI failed to edit the design.");
};

/**
 * Generates an inverted (white) version of a design for dark products.
 */
export const generateInverseDesignVariant = async (base64ImageUrl: string): Promise<string> => {
    const mimeType = base64ImageUrl.substring(base64ImageUrl.indexOf(":") + 1, base64ImageUrl.indexOf(";"));
    const imagePart = await urlToGenerativePart(base64ImageUrl, mimeType);
    const prompt = `
        You are a print-on-demand design assistant. Your task is to invert a design for use on dark apparel.
        Analyze the provided image, which has a transparent background.
        Create a new version of this image where all black or dark-colored elements are converted to pure white (#FFFFFF).
        CRITICAL:
        1. The background MUST remain transparent. Do not add any background color.
        2. Preserve all original shapes, lines, and details. Do not change the art style.
        3. This is a color replacement task. Do not outline or redraw the image.
        4. The final output must be only the modified image on a transparent background.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [imagePart, { text: prompt }] },
        config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
    });

    const imageOutputPart = response.candidates?.[0]?.content.parts.find(part => part.inlineData);
    if (imageOutputPart?.inlineData) {
        const { data, mimeType } = imageOutputPart.inlineData;
        return `data:${mimeType};base64,${data}`;
    }
    throw new Error("AI failed to generate the design variant.");
};

/**
 * Generates a product mockup.
 */
export const generateMockupImage = async (
  designImageUrl: string,
  scene: string,
  color: string,
  productType: string,
  theme?: string
): Promise<string> => {
    const designPart = await urlToGenerativePart(designImageUrl, 'image/png');
    const prompt = `
        Create a single, high-quality, photorealistic mockup image.
        - Product Type: A ${productType}.
        - Product Color: The product must be the color ${color}.
        - The Scene: The scene must be: "${scene}".
        ${theme ? `- Thematic Elements: The scene should incorporate a subtle ${theme} theme.` : ''}

        CRITICAL INSTRUCTIONS:
        1. Place the following user-provided design onto the product.
        2. The design has a transparent background. You MUST treat the design as a final, non-editable decal.
        3. DO NOT change the colors of the design. DO NOT fill in any transparent areas of the design. Render it exactly as provided.
        4. The design must be realistically scaled, centered, and placed on the product. Avoid making it too large or distorted.
        5. The final image should be a professional, clean product photograph.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [designPart, { text: prompt }] },
        config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
    });

    const imagePart = response.candidates?.[0]?.content.parts.find(part => part.inlineData);
    if (imagePart?.inlineData) {
        const { data, mimeType } = imagePart.inlineData;
        return `data:${mimeType};base64,${data}`;
    }
    throw new Error("AI failed to generate a mockup image.");
};

/**
 * Generates a short video ad from a mockup image.
 */
export const generateVideoMockup = async (mockupImageUrl: string, style: MockupStyle): Promise<string> => {
    const imagePart = await urlToGenerativePart(mockupImageUrl, 'image/jpeg');

    const isPerson = ['man', 'woman', 'kid'].includes(style);
    const prompt = isPerson
        ? `
            Animate this photorealistic mockup image into a 5-second video ad.
            CRITICAL FRAMING: The camera frame MUST remain wide enough to clearly show the entire t-shirt design from the chest up at all times. DO NOT zoom in on the person's face. The product design is the hero.
            MOTION: The person in the image should make a subtle, natural movement like turning slightly, adjusting their pose, or a gentle, confident expression. The motion should be realistic and focus on the person enjoying wearing the product.
            STYLE: Keep it clean, professional, and focused on showcasing the apparel.
          `
        : `Create a clean, 5-second video ad from the provided mockup image. Use subtle, professional motion like a slow zoom, pan, or gentle 3D effect. CRITICAL: Do NOT add any text, logos, or extra graphics. The video should only feature the product mockup with natural-looking motion.`;

    let operation = await ai.models.generateVideos({
        model: 'veo-2.0-generate-001',
        prompt: prompt,
        image: {
            imageBytes: imagePart.inlineData.data,
            mimeType: imagePart.inlineData.mimeType,
        },
        config: { numberOfVideos: 1 }
    });

    while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) throw new Error("Video generation failed to return a download link.");

    const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    if (!response.ok) throw new Error(`Failed to fetch video: ${response.statusText}`);
    
    const videoBlob = await response.blob();
    return URL.createObjectURL(videoBlob);
};

export const generateTrendAnalysis = async (topic: string): Promise<Trend[]> => {
    const prompt = `Analyze the print-on-demand market for the topic "${topic}". Identify 4 distinct, profitable niches. For each niche, provide: A short, compelling description. An opportunity score from 1-100. 3 relevant SEO keywords. 3 descriptive prompts for generating example images.`;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        niche: { type: Type.STRING },
                        description: { type: Type.STRING },
                        opportunityScore: { type: Type.NUMBER },
                        keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
                        imageExamples: { type: Type.ARRAY, items: { type: Type.STRING, description: "A detailed image generation prompt." } }
                    },
                    required: ["niche", "description", "opportunityScore", "keywords", "imageExamples"],
                }
            }
        }
    });
    const trendsData = JSON.parse(response.text) as any[];
    const trendsWithImages: Trend[] = await Promise.all(
        trendsData.map(async (trend: any) => {
            try {
                const imagePrompts = trend.imageExamples.slice(0, 3);
                const imageGenPromises = imagePrompts.map((p: string) => ai.models.generateImages({
                    model: 'imagen-4.0-generate-001',
                    prompt: p,
                    config: { numberOfImages: 1, outputMimeType: 'image/jpeg', aspectRatio: '4:3'}
                }));
                const imageResults = await Promise.all(imageGenPromises);
                const imageUrls = imageResults.map(res => `data:image/jpeg;base64,${res.generatedImages[0].image.imageBytes}`);
                return { ...trend, imageExamples: imageUrls };
            } catch (e) {
                // FIX: Added a return statement in the catch block to handle potential errors during image generation and satisfy the function's return type.
                console.error(`Failed to generate images for trend "${trend.niche}":`, e);
                return { ...trend, imageExamples: [] }; // Gracefully handle image generation failure
            }
        })
    );
    return trendsWithImages;
};

// FIX: Added generateMarketingCopy function to support the marketing copy generation feature.
/**
 * Generates marketing copy for a given design asset.
 */
export const generateMarketingCopy = async (asset: DesignAsset): Promise<MarketingCopy> => {
    const prompt = `
        Generate compelling marketing copy for a print-on-demand product featuring the design "${asset.name}".
        The design has the following tags: ${asset.tags.join(', ')}.
        Create a catchy title, an engaging product description (2-3 sentences), and a list of 5 relevant SEO tags/keywords.
    `;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING, description: 'A catchy, short title for the product listing.' },
                    description: { type: Type.STRING, description: 'An engaging product description, 2-3 sentences long.' },
                    tags: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'A list of 5 relevant SEO tags or keywords.' }
                },
                required: ["title", "description", "tags"],
            }
        }
    });

    return JSON.parse(response.text) as MarketingCopy;
};