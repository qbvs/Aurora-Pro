import { GoogleGenAI, Type } from "@google/genai";
import { AIResponse, LinkItem, addLog } from "../types";

// Helper to get client instance safely
const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  // Check for empty string or undefined
  if (!apiKey || apiKey.trim().length === 0) {
    addLog('error', "Gemini API Key is missing or empty! Check Vercel Environment Variables.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

const handleApiError = (error: any, context: string): never => {
    const errorMessage = (error as any)?.message || '';
    addLog('error', `AI ${context} failed: ${error}`);
    if (errorMessage.includes('"code":429') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
        throw new Error('QUOTA_EXCEEDED');
    }
    throw error;
};

export const analyzeUrl = async (url: string): Promise<AIResponse> => {
  addLog('info', `AI Analyzing URL: ${url}`);
  const ai = getAiClient();
  if (!ai) {
    throw new Error("API Key not configured");
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
    if (!text) throw new Error("No response text from AI");
    
    addLog('info', `AI Analysis Success for ${url}`);
    return JSON.parse(text) as AIResponse;

  } catch (error) {
    handleApiError(error, 'Analysis');
  }
};

export const generateCategoryLinks = async (categoryTitle: string, count: number): Promise<Partial<LinkItem>[]> => {
  addLog('info', `AI Generating links for category: ${categoryTitle}`);
  const ai = getAiClient();
  if (!ai) return [];

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
    if (!text) {
        addLog('warn', "AI returned empty text for category links");
        return [];
    }
    const result = JSON.parse(text) as Partial<LinkItem>[];
    addLog('info', `AI generated ${result.length} links`);
    return result;

  } catch (error) {
     handleApiError(error, 'Link Generation');
  }
};

export const getAiGreeting = async (): Promise<string> => {
  const ai = getAiClient();
  if (!ai) return "";
  
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
    // Greeting failure is non-critical, so we just log it silently and don't bother the user.
    addLog('warn', `AI Greeting failed (non-critical): ${e}`);
    return "";
  }
};

export const suggestIcon = async (text: string): Promise<string> => {
  const ai = getAiClient();
  if (!ai) return "Sparkles";

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
    return iconName.split(' ')[0];
  } catch (e) {
    // We don't throw QUOTA_EXCEEDED here because it's a background task. 
    // Failing silently is better than interrupting the user's typing.
    addLog('warn', `Icon suggestion failed (non-critical): ${e}`);
    return "Sparkles";
  }
};