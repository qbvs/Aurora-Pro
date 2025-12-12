import { GoogleGenAI, Type } from "@google/genai";
import { AIResponse, LinkItem } from "../types";

// Initialize the API client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const analyzeUrl = async (url: string): Promise<AIResponse> => {
  if (!process.env.API_KEY) {
    console.warn("No API Key found. Returning mock data.");
    const isSearch = url.includes('bing') || url.includes('google') || url.includes('baidu');
    return {
      title: isSearch ? "Search Engine" : "新链接",
      description: "暂无描述",
      brandColor: "#cccccc",
      searchUrlPattern: isSearch ? `${url}/search?q=` : undefined
    };
  }

  try {
    const prompt = `
      Analyze the following URL: ${url}.
      I need you to act as a web scraper and metadata extractor.
      
      1. Provide the likely website Title.
      2. Provide a short Description (in Chinese, max 10 words).
      3. Provide a hex color code that represents the brand.
      4. If this URL looks like a Search Engine, provide the "searchUrlPattern" (e.g., https://google.com/search?q=).
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            brandColor: { type: Type.STRING },
            searchUrlPattern: { type: Type.STRING, nullable: true },
          },
          required: ["title", "description", "brandColor"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(text) as AIResponse;

  } catch (error) {
    console.error("AI Analysis failed:", error);
    return {
      title: "新链接",
      description: "暂无描述",
      brandColor: "#cccccc"
    };
  }
};

export const generateCategoryLinks = async (categoryTitle: string, count: number): Promise<Partial<LinkItem>[]> => {
  if (!process.env.API_KEY) return [];

  try {
    const prompt = `
      Generate ${count} popular, high-quality, and useful website links for the category "${categoryTitle}".
      For each website, provide:
      1. Title (Name of the site)
      2. URL (Full https address)
      3. Description (Short Chinese description, max 10 words)
      4. Brand Color (Hex code)
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              url: { type: Type.STRING },
              description: { type: Type.STRING },
              color: { type: Type.STRING },
            },
            required: ["title", "url", "description", "color"]
          }
        }
      }
    });

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text) as Partial<LinkItem>[];

  } catch (error) {
    console.error("AI Generation failed:", error);
    return [];
  }
};

export const getAiGreeting = async (): Promise<string> => {
  if (!process.env.API_KEY) return "";
  
  try {
    const prompt = `
      Generate a short, inspiring, and positive greeting or quote specifically for a developer, designer, or creator.
      The language MUST be Simplified Chinese.
      The length must be under 20 words.
      Do not include quotation marks or author names, just the text.
      Tone: Encouraging, elegant, or witty.
    `;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    return response.text?.trim() || "";
  } catch (e) {
    console.error("Greeting gen failed", e);
    return "";
  }
};

export const suggestIcon = async (text: string): Promise<string> => {
  if (!process.env.API_KEY) return "Sparkles"; // Default fallback

  try {
    const prompt = `
      Suggest ONE single Lucide React icon name that best represents the text: "${text}".
      Return ONLY the icon name string (e.g. "Home", "Code", "Zap", "Folder").
      Do not explain.
    `;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    const iconName = response.text?.trim().replace(/['"`]/g, '') || "Sparkles";
    // Basic validation to ensure it looks like a name
    return iconName.split(' ')[0];
  } catch (e) {
    console.error("Icon suggestion failed", e);
    return "Sparkles";
  }
};
