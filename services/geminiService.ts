import { GoogleGenAI, Type } from "@google/genai";
import { AIResponse, LinkItem, addLog, AIProviderConfig } from "../types";
import { loadSettings } from "./storageService";
import { INITIAL_SETTINGS } from "../constants";

// --- Helpers ---

// Get the actual API Key (resolving Env Slots if necessary)
const resolveApiKey = (config: AIProviderConfig): string => {
    if (config.envSlot && (process.env as any)[config.envSlot]) {
        return (process.env as any)[config.envSlot];
    }
    // Fallback to manual key or default google key
    if (config.type === 'google' && (!config.apiKey || config.apiKey.trim() === '')) {
        return process.env.API_KEY || '';
    }
    return config.apiKey || '';
};

// Get the active configuration
const getActiveConfig = async (): Promise<AIProviderConfig> => {
    const settings = await loadSettings();
    const config = settings?.aiConfigs?.find(c => c.isActive) || INITIAL_SETTINGS.aiConfigs[0];
    
    const resolvedKey = resolveApiKey(config);
    return { ...config, apiKey: resolvedKey };
};

// Standardized Error Handler
const handleAiError = (error: any, context: string): Error => {
    const errorMessage = (error as any)?.message || String(error) || 'Unknown AI Error';
    addLog('error', `AI ${context} failed: ${errorMessage}`);
    
    if (String(errorMessage).includes('"code":429') || String(errorMessage).includes('RESOURCE_EXHAUSTED') || String(errorMessage).includes('429')) {
        return new Error('QUOTA_EXCEEDED');
    }
    if (error instanceof Error) return error;
    return new Error(String(errorMessage));
};

// Helper to normalize Base URL
const normalizeBaseUrl = (url: string): string => {
    if (!url) return '';
    let normalized = url.trim().replace(/\/$/, ''); // Remove trailing slash
    return normalized;
};

// --- Connection Testing & Model Fetching (For UI) ---

export interface TestResult {
    success: boolean;
    message: string;
}

export const testAiConnection = async (config: AIProviderConfig): Promise<TestResult> => {
    try {
        let apiKey = config.apiKey;
        if (!apiKey && config.envSlot) {
             apiKey = (process.env as any)[config.envSlot] || '';
        }
        if (config.type === 'google' && !apiKey) apiKey = process.env.API_KEY || '';

        if (!apiKey) return { success: false, message: '未配置 API Key' };

        if (config.type === 'google') {
            const ai = new GoogleGenAI({ apiKey });
            await ai.models.generateContent({
                model: config.model || 'gemini-2.5-flash',
                contents: 'Test',
            });
            return { success: true, message: '连接成功' };
        } else {
            const baseUrl = normalizeBaseUrl(config.baseUrl);
            
            // 1. Try fetching models first
            const modelsEndpoint = baseUrl.endsWith('/v1') ? '/models' : '/v1/models';
            const modelsUrl = `${baseUrl}${modelsEndpoint}`;
            
            addLog('info', `Testing connection to: ${modelsUrl}`);

            try {
                const response = await fetch(modelsUrl, {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${apiKey}` }
                });

                if (response.ok) {
                    return { success: true, message: '连接成功 (模型列表可用)' };
                }
                
                if (response.status === 401 || response.status === 403) {
                     return { success: false, message: `鉴权失败 (${response.status})` };
                }
            } catch (netErr) {
                 addLog('warn', `Model list network error: ${netErr}`);
            }

            // 2. Fallback: Try a minimal chat completion
            const chatEndpoint = baseUrl.endsWith('/v1') ? '/chat/completions' : '/v1/chat/completions';
            const chatUrl = `${baseUrl}${chatEndpoint}`;

            addLog('info', `Fallback testing chat: ${chatUrl}`);

            const chatRes = await fetch(chatUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: config.model || 'gpt-3.5-turbo',
                    messages: [{ role: 'user', content: 'Hi' }],
                    max_tokens: 1
                })
            });

            if (chatRes.ok) {
                return { success: true, message: '连接成功' };
            }

            const errorText = await chatRes.text();
            
            // HTTP 400 with "model" error means Auth & Connection are GOOD, just model name is bad.
            if (chatRes.status === 400 || (errorText.includes('model') && (errorText.includes('invalid') || errorText.includes('exist')))) {
                 addLog('warn', `Connection OK but Model Invalid: ${errorText}`);
                 return { success: true, message: '连接成功 (注意：当前模型名无效)' };
            }

            if (chatRes.status === 401 || chatRes.status === 403) {
                return { success: false, message: 'API Key 无效' };
            }

            return { success: false, message: `HTTP ${chatRes.status} 错误` };
        }
    } catch (e) {
        const msg = (e as any).message || String(e);
        addLog('error', `Connection Test Failed: ${msg}`);
        return { success: false, message: '连接失败' };
    }
};

export const fetchAiModels = async (config: AIProviderConfig): Promise<string[]> => {
    try {
        let apiKey = config.apiKey;
        if (!apiKey && config.envSlot) apiKey = (process.env as any)[config.envSlot] || '';
        if (config.type === 'google' && !apiKey) apiKey = process.env.API_KEY || '';

        if (!apiKey) return [];

        if (config.type === 'google') {
            return ['gemini-2.5-flash', 'gemini-2.0-flash-lite-preview-02-05', 'gemini-1.5-pro', 'gemini-1.5-flash'];
        } else {
            const baseUrl = normalizeBaseUrl(config.baseUrl);
            const endpoint = baseUrl.endsWith('/v1') ? '/models' : '/v1/models';
            const url = `${baseUrl}${endpoint}`;
            
            addLog('info', `Fetching models from: ${url}`);

            const response = await fetch(url, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${apiKey}` }
            });

            if (!response.ok) {
                addLog('warn', `Fetch models failed: ${response.status}`);
                return [];
            }
            
            const data = await response.json();
            // OpenAI format: { data: [{ id: '...' }, ...] }
            if (data && Array.isArray(data.data)) {
                return data.data.map((m: any) => m.id);
            }
            return [];
        }
    } catch (e) {
        addLog('warn', `Fetch Models Exception: ${e}`);
        return [];
    }
};

// --- Core Functionality ---

export const analyzeUrl = async (url: string): Promise<AIResponse> => {
  addLog('info', `AI Analyzing URL: ${url}`);
  const config = await getActiveConfig();
  
  if (!config.apiKey) throw new Error("API Key not configured");

  const promptText = `
    Analyze the following URL: ${url}.
    I need you to act as a web scraper and metadata extractor.
    
    1. Provide the likely website Title.
    2. Provide a short Description (in Chinese, max 10 words).
    3. Provide a hex color code that represents the brand.
    4. If this URL looks like a Search Engine, provide the "searchUrlPattern" (e.g., https://google.com/search?q=).

    Return JSON ONLY. Format:
    { "title": "...", "description": "...", "brandColor": "...", "searchUrlPattern": "..." }
  `;

  try {
    if (config.type === 'google') {
        const ai = new GoogleGenAI({ apiKey: config.apiKey });
        const response = await ai.models.generateContent({
            model: config.model || 'gemini-2.5-flash',
            contents: promptText,
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
        if (!text) throw new Error("No response text");
        return JSON.parse(text) as AIResponse;

    } else {
        const baseUrl = normalizeBaseUrl(config.baseUrl);
        const endpoint = baseUrl.endsWith('/v1') ? '/chat/completions' : '/v1/chat/completions';
        
        const res = await fetch(`${baseUrl}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`
            },
            body: JSON.stringify({
                model: config.model,
                messages: [
                    { role: "system", content: "You are a JSON-only response bot. You must strictly output valid JSON." },
                    { role: "user", content: promptText }
                ],
                response_format: { type: "json_object" } 
            })
        });

        if (!res.ok) {
            const err = await res.text();
            throw new Error(`API Error ${res.status}: ${err}`);
        }

        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;
        if (!content) throw new Error("Empty response from API");
        
        return JSON.parse(content) as AIResponse;
    }

  } catch (error) {
    throw handleAiError(error, 'Analysis');
  }
};

export const generateCategoryLinks = async (categoryTitle: string, count: number): Promise<Partial<LinkItem>[]> => {
  addLog('info', `AI Generating links for category: ${categoryTitle}`);
  const config = await getActiveConfig();
  if (!config.apiKey) return [];

  const promptText = `
      Generate ${count} popular, high-quality, and useful website links for the category "${categoryTitle}".
      For each website, provide:
      1. Title (Name of the site)
      2. URL (Full https address)
      3. Description (Short Chinese description, max 10 words)
      4. Brand Color (Hex code)

      Return JSON ONLY. Format:
      [ { "title": "...", "url": "...", "description": "...", "color": "..." }, ... ]
  `;

  try {
    if (config.type === 'google') {
        const ai = new GoogleGenAI({ apiKey: config.apiKey });
        const response = await ai.models.generateContent({
            model: config.model || 'gemini-2.5-flash',
            contents: promptText,
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
        const result = JSON.parse(text);
        addLog('info', `AI generated ${result.length} links`);
        return result;

    } else {
        const baseUrl = normalizeBaseUrl(config.baseUrl);
        const endpoint = baseUrl.endsWith('/v1') ? '/chat/completions' : '/v1/chat/completions';

        const res = await fetch(`${baseUrl}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`
            },
            body: JSON.stringify({
                model: config.model,
                messages: [
                    { role: "system", content: "You are a JSON-only response bot. You must strictly output valid JSON array." },
                    { role: "user", content: promptText }
                ]
            })
        });

        if (!res.ok) throw new Error(`API Error ${res.status}`);
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;
        const cleanJson = content.replace(/```json\n?|\n?```/g, '').trim();
        return JSON.parse(cleanJson);
    }

  } catch (error) {
     throw handleAiError(error, 'Link Generation');
  }
};

export const getAiGreeting = async (): Promise<string> => {
  const config = await getActiveConfig();
  if (!config.apiKey) return "";
  
  const promptText = `
      Generate a short, inspiring, and positive greeting or quote specifically for a developer, designer, or creator.
      The language MUST be Simplified Chinese.
      The length must be under 20 words.
      Do not include quotation marks or author names, just the text.
      Tone: Encouraging, elegant, or witty.
  `;

  try {
     if (config.type === 'google') {
        const ai = new GoogleGenAI({ apiKey: config.apiKey });
        const response = await ai.models.generateContent({
            model: config.model || 'gemini-2.5-flash',
            contents: promptText,
        });
        return response.text?.trim() || "";
     } else {
        const baseUrl = normalizeBaseUrl(config.baseUrl);
        const endpoint = baseUrl.endsWith('/v1') ? '/chat/completions' : '/v1/chat/completions';
        
        const res = await fetch(`${baseUrl}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`
            },
            body: JSON.stringify({
                model: config.model,
                messages: [{ role: "user", content: promptText }]
            })
        });
        if (!res.ok) throw new Error("API Fail");
        const data = await res.json();
        return data.choices?.[0]?.message?.content?.trim() || "";
     }
  } catch (e) {
    addLog('warn', `AI Greeting failed: ${e}`);
    return "";
  }
};

export const suggestIcon = async (text: string): Promise<string> => {
  const config = await getActiveConfig();
  if (!config.apiKey) return "Sparkles";

  const promptText = `
      Suggest ONE single Lucide React icon name that best represents the text: "${text}".
      Return ONLY the icon name string (e.g. "Home", "Code", "Zap", "Folder").
      Do not explain.
  `;

  try {
    let result = "Sparkles";
    if (config.type === 'google') {
        const ai = new GoogleGenAI({ apiKey: config.apiKey });
        const response = await ai.models.generateContent({
            model: config.model || 'gemini-2.5-flash',
            contents: promptText,
        });
        result = response.text || "";
    } else {
        const baseUrl = normalizeBaseUrl(config.baseUrl);
        const endpoint = baseUrl.endsWith('/v1') ? '/chat/completions' : '/v1/chat/completions';

        const res = await fetch(`${baseUrl}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`
            },
            body: JSON.stringify({
                model: config.model,
                messages: [{ role: "user", content: promptText }]
            })
        });
        const data = await res.json();
        result = data.choices?.[0]?.message?.content || "";
    }
    
    return result.trim().replace(/['"`]/g, '').split(' ')[0] || "Sparkles";

  } catch (e) {
    addLog('warn', `Icon suggestion failed: ${e}`);
    return "Sparkles";
  }
};