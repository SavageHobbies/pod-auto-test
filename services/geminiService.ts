import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Trend, MarketingCopy } from '../types.ts';

// Do not change this. The API key is set in the environment.
const ai = new GoogleGenAI({apiKey: process.env.API_KEY});

export const generateTrendAnalysis = async (topic: string): Promise<Trend[]> => {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Analyze the print-on-demand market for the topic "${topic}". Identify 3 distinct, profitable niches. For each niche, provide a brief description, an opportunity score from 1-100 (where 100 is high opportunity), a list of 5 relevant SEO keywords, and 3 hypothetical image URLs for visual examples (use placeholder image services, e.g., https://via.placeholder.com/300x200).`,
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
                        imageExamples: { type: Type.ARRAY, items: { type: Type.STRING } },
                        keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
                    },
                    required: ["niche", "description", "opportunityScore", "imageExamples", "keywords"],
                }
            }
        }
    });

    const jsonText = response.text.trim();
    if (jsonText.startsWith('[') && jsonText.endsWith(']')) {
        return JSON.parse(jsonText);
    } else {
        throw new Error("Failed to parse trend analysis from AI response.");
    }
};

export const generateDesignImage = async (prompt: string, imagePart?: { inlineData: { data: string, mimeType: string } }, textToAdd?: string): Promise<string> => {
    let fullPrompt = `A high-resolution, print-ready design for a t-shirt with a transparent background. The design should be: ${prompt}.`;
    if (textToAdd) {
        fullPrompt += ` Include the text "${textToAdd}" clearly and stylishly in the design.`;
    }
    
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: fullPrompt,
        config: {
            numberOfImages: 1,
            aspectRatio: '1:1',
            outputMimeType: 'image/png',
        }
    });

    if (response.generatedImages?.length > 0) {
        return `data:image/png;base64,${response.generatedImages[0].image.imageBytes}`;
    } else {
        throw new Error("AI failed to generate an image.");
    }
};

export const editDesignImage = async (baseImageUrl: string, modificationPrompt: string): Promise<string> => {
    const base64Data = baseImageUrl.split(',')[1];
    
    const imagePart = { inlineData: { data: base64Data, mimeType: 'image/png' } };
    const textPart = { text: modificationPrompt };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [imagePart, textPart] },
        config: { responseModalities: [Modality.IMAGE, Modality.TEXT] }
    });
    
    const imageContent = response.candidates[0].content.parts.find(p => p.inlineData);
    if (imageContent?.inlineData) {
        return `data:image/png;base64,${imageContent.inlineData.data}`;
    }
    
    throw new Error("AI failed to return an edited image.");
};

export const generateInverseDesignVariant = async (designUrl: string): Promise<string> => {
    const designBase64 = designUrl.split(',')[1];
    const prompt = "Take this design. Invert the colors so that any black lines or fills become white. Crucially, all transparent areas must remain transparent. Do not add a background. Do not place it on a t-shirt. Simply provide the inverted design on a transparent background.";
    
    const designPart = { inlineData: { data: designBase64, mimeType: 'image/png' } };
    const textPart = { text: prompt };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [designPart, textPart] },
        config: { responseModalities: [Modality.IMAGE, Modality.TEXT] }
    });

    const imageContent = response.candidates[0].content.parts.find(p => p.inlineData);
    if (imageContent?.inlineData) {
        return `data:image/png;base64,${imageContent.inlineData.data}`;
    }
    
    throw new Error("AI failed to return an inverted design variant.");
};

export const generateMockupImage = async (designUrl: string, scene: string, color: string, productType: string, theme?: string): Promise<string> => {
    const designBase64 = designUrl.split(',')[1];
    let prompt = `Create a single, realistic product mockup. Place the following design naturally onto a ${color} ${productType}. The scene should be: ${scene}. The design should be scaled appropriately and placed in a standard location on the product. Do not distort the design.`;
    if (theme) {
        prompt += ` The scene should also have a ${theme} theme.`
    }
    
    const designPart = { inlineData: { data: designBase64, mimeType: 'image/png' } };
    const textPart = { text: prompt };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [designPart, textPart] },
        config: { responseModalities: [Modality.IMAGE, Modality.TEXT] }
    });

    const imageContent = response.candidates[0].content.parts.find(p => p.inlineData);
    if (imageContent?.inlineData) {
        return `data:image/png;base64,${imageContent.inlineData.data}`;
    }
    
    throw new Error("AI failed to return a mockup image.");
};

export const generateVideoMockup = async (mockupUrl: string): Promise<string> => {
    const mockupBase64 = mockupUrl.split(',')[1];
    
    let operation = await ai.models.generateVideos({
        model: 'veo-2.0-generate-001',
        prompt: 'Create a short, dynamic 5-second video ad for this product mockup. Add subtle, ambient motion like a slow pan or zoom. Do not add any text, graphics, or logos to the video.',
        image: { imageBytes: mockupBase64, mimeType: 'image/png' },
        config: { numberOfVideos: 1 }
    });

    while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (downloadLink && process.env.API_KEY) {
         const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
         const blob = await response.blob();
         return URL.createObjectURL(blob);
    }

    throw new Error("Failed to generate video mockup or API_KEY is missing.");
};

export const generateMarketingCopy = async (asset: { name: string, tags: string[], imageUrl: string }): Promise<MarketingCopy> => {
    const prompt = `Generate marketing copy for a print-on-demand product based on the provided image. The design's base name is "${asset.name}". Analyze the image and create a catchy title (max 60 chars), a compelling product description (max 250 chars), and a list of 10 relevant SEO tags/keywords.`;
    const imagePart = { inlineData: { data: asset.imageUrl.split(',')[1], mimeType: 'image/png' } };
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [ { text: prompt }, imagePart ] },
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    tags: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ['title', 'description', 'tags'],
            }
        }
    });
    
    const jsonText = response.text.trim();
    if (jsonText.startsWith('{') && jsonText.endsWith('}')) {
        return JSON.parse(jsonText);
    } else {
        throw new Error("Failed to parse marketing copy from AI response.");
    }
};