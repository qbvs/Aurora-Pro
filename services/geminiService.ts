import { GoogleGenAI, Type } from "@google/genai";
import { AIResponse, LinkItem, addLog, AIProviderConfig } from "../types";
import { getSettingsLocal } from "./storageService"; // Use local only!
import { INITIAL_SETTINGS } from "../constants";

// --- Helpers ---

const getEnvValue = (key?: string): string => {
    if (!key) return '';
    switch (key) {
        case 'CUSTOM_API_KEY_1': return process.env.CUSTOM_API_KEY_1 || '';
        case 'CUSTOM_API_KEY_2': return process.env.CUSTOM_API_KEY_2 || '';
        case 'CUSTOM_API_KEY_3': return process.env.CUSTOM_API_KEY_3 || '';
        case 'CUSTOM_API_KEY_4': return process.env.CUSTOM_API_KEY_4 || '';
        case 'CUSTOM_API_KEY_5': return process.env.CUSTOM_API_KEY_5 || '';
        case 'API_KEY': return process.env.API_KEY || '';
        default: return '';
    }
};

const resolveApiKey = (config: AIProviderConfig): string => {
    if (config.envSlot) {
        const val = getEnvValue(config.envSlot);
        if (val) return val;
        return ''; 
    }
    if (config.apiKey && config.apiKey.trim() !== '') {
        return config.apiKey;
    }
    if (config.type === 'google') {
        return process.env.API_KEY || '';
    }
    return '';
};

const getActiveConfig = (): AIProviderConfig => {
    // Synchronous read from LocalStorage. 
    // This ensures we get exactly what the user just saved, not stale data from cloud.
    const settings = getSettingsLocal(); 
    const config = settings?.aiConfigs?.find(c => c.isActive) || INITIAL_SETTINGS.aiConfigs[0];
    
    const resolvedKey = resolveApiKey(config);
    return { ...config, apiKey: resolvedKey };
};

const handleAiError = (error: any, context: string): Error => {
    const errorMessage = (error as any)?.message || String(error) || 'Unknown AI Error';
    addLog('error', `AI ${context} failed: ${errorMessage}`);
    
    if (String(errorMessage).includes('"code":429') || String(errorMessage).includes('RESOURCE_EXHAUSTED') || String(errorMessage).includes('429')) {
        return new Error('QUOTA_EXCEEDED');
    }
    if (error instanceof Error) return error;
    return new Error(String(errorMessage));
};

const normalizeBaseUrl = (url: string): string => {
    if (!url) return '';
    let normalized = url.trim().replace(/\/$/, '');
    return normalized;
};

// --- Connection Testing & Model Fetching ---

export interface TestResult {
    success: boolean;
    message: string;
}

export const testAiConnection = async (config: AIProviderConfig): Promise<TestResult> => {
    try {
        const apiKey = resolveApiKey(config);

        if (!apiKey) {
            if (config.envSlot) {
                return { success: false, message: `环境变量 ${config.envSlot} 未读取到` };
            }
            return { success: false, message: 'API Key 为空' };
        }

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
            
            addLog('info', `Testing: ${modelsUrl} (Model: ${config.model})`);

            try {
                const response = await fetch(modelsUrl, {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${apiKey}` }
                });

                if (response.ok) {
                    return { success: true, message: '连接成功 (模型列表可用)' };
                }
            } catch (netErr) {
                 // ignore network error on models endpoint, try chat
            }

            // 2. Fallback: Chat Completion
            const chatEndpoint = baseUrl.endsWith('/v1') ? '/chat/completions' : '/v1/chat/completions';
            const chatUrl = `${baseUrl}${chatEndpoint}`;

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
            
            // Critical: If status is 400/404 but error message is about Model, 
            // it means Auth is GOOD. Return success (Green) but with warning.
            if (chatRes.status === 400 || chatRes.status === 404 || errorText.includes('model')) {
                 addLog('warn', `Connection OK but Model Invalid: ${errorText}`);
                 return { success: true, message: '连接通畅，但模型名称无效 (请核对模型名)' };
            }

            if (chatRes.status === 401 || chatRes.status === 403) {
                return { success: false, message: 'API Key 无效' };
            }

            return { success: false, message: `HTTP ${chatRes.status} 错误` };
        }
    } catch (e) {
        const msg = (e as any).message || String(e);
        addLog('error', `Test Failed: ${msg}`);
        return { success: false, message: '连接失败' };
    }
};

export const fetchAiModels = async (config: AIProviderConfig): Promise<string[]> => {
    try {
        const apiKey = resolveApiKey(config);
        if (!apiKey) return [];

        if (config.type === 'google') {
            return ['gemini-2.5-flash', 'gemini-2.0-flash-lite-preview-02-05', 'gemini-1.5-pro', 'gemini-1.5-flash'];
        } else {
            const baseUrl = normalizeBaseUrl(config.baseUrl);
            const endpoint = baseUrl.endsWith('/v1') ? '/models' : '/v1/models';
            const url = `${baseUrl}${endpoint}`;
            
            const response = await fetch(url, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${apiKey}` }
            });

            if (!response.ok) return [];
            
            const data = await response.json();
            if (data && Array.isArray(data.data)) {
                return data.data.map((m: any) => m.id);
            }
            return [];
        }
    } catch (e) {
        return [];
    }
};

// --- Core Functionality ---

export const analyzeUrl = async (url: string): Promise<AIResponse> => {
  const config = getActiveConfig(); // Sync
  if (!config.apiKey) throw new Error("API Key not configured");

  addLog('info', `Analyzing ${url} using ${config.model}`);

  const promptText = `
    Analyze the following URL: ${url}.
    I need you to act as a web scraper and metadata extractor.
    Return JSON ONLY. Format:
    { "title": "...", "description": "max 10 words Chinese", "brandColor": "#hex", "searchUrlPattern": "..." }
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
                    { role: "system", content: "You are a JSON-only response bot. Output valid JSON." },
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
        return JSON.parse(content) as AIResponse;
    }

  } catch (error) {
    throw handleAiError(error, 'Analysis');
  }
};

export const generateCategoryLinks = async (categoryTitle: string, count: number): Promise<Partial<LinkItem>[]> => {
  const config = getActiveConfig();
  if (!config.apiKey) return [];
  
  addLog('info', `Generating links for ${categoryTitle} using ${config.model}`);

  const promptText = `
      Generate ${count} website links for category "${categoryTitle}".
      Return JSON ONLY array. Format:
      [ { "title": "...", "url": "...", "description": "max 10 words Chinese", "color": "#hex" }, ... ]
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
        return JSON.parse(text);

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
                    { role: "system", content: "You are a JSON-only response bot. Output valid JSON array." },
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
  const config = getActiveConfig();
  if (!config.apiKey) return "";
  
  const promptText = `Generate a 15-word inspiring Chinese greeting for a developer. No quotes.`;

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
    return "";
  }
};

export const suggestIcon = async (text: string): Promise<string> => {
  const config = getActiveConfig();
  if (!config.apiKey) return "Sparkles";
  const promptText = `Suggest one Lucide React icon name for "${text}". Return string only.`;
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
    return "Sparkles";
  }
};