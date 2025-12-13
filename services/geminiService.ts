
import { GoogleGenAI } from "@google/genai";
import { AIResponse, LinkItem, AIProviderConfig } from "../types";
import { addLog } from "./logger";
import { getSettingsLocal } from "./storageService";

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
    if (config.type === 'google') {
        return process.env.API_KEY || '';
    }
    if (config.envSlot) {
        const val = getEnvValue(config.envSlot);
        if (val) return val;
    }
    if (config.apiKey && config.apiKey.trim() !== '') {
        return config.apiKey;
    }
    return '';
};

const getActiveConfig = (): AIProviderConfig => {
    const settings = getSettingsLocal(); 
    const config = settings?.aiConfigs?.find(c => c.isActive) || settings?.aiConfigs?.[0];
    if (!config) return { id: 'default', name: 'Default', type: 'google', baseUrl: '', apiKey: process.env.API_KEY || '', model: 'gemini-2.5-flash', isActive: true };
    const resolvedKey = resolveApiKey(config);
    return { ...config, apiKey: resolvedKey };
};

const handleAiError = (error: any, context: string): Error => {
    const errorMessage = (error as any)?.message || String(error) || '未知错误';
    addLog('error', `AI ${context} 失败: ${errorMessage}`);
    return error instanceof Error ? error : new Error(String(errorMessage));
};

const normalizeBaseUrl = (url: string): string => {
    if (!url) return '';
    return url.trim().replace(/\/$/, '');
};

const cleanJsonString = (text: string): string => {
    let clean = text.replace(/```json\n?|```/g, '').trim();
    const firstBrace = clean.indexOf('{');
    const firstBracket = clean.indexOf('[');
    const lastBrace = clean.lastIndexOf('}');
    const lastBracket = clean.lastIndexOf(']');
    
    if (firstBrace > -1 && lastBrace > -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
        return clean.substring(firstBrace, lastBrace + 1);
    }
    if (firstBracket > -1 && lastBracket > -1) {
        return clean.substring(firstBracket, lastBracket + 1);
    }
    return clean;
};

// --- Core Functionality ---

// Speed optimization: Use thinkingBudget: 0 for 2.5 models when latency matters
const getModelConfig = (modelName: string) => {
    // Only apply to gemini-2.5 models which support thinking config
    if (modelName.includes('gemini-2.5') || modelName.includes('gemini-2.0')) {
        return { thinkingConfig: { thinkingBudget: 0 }, responseMimeType: "application/json" };
    }
    return { responseMimeType: "application/json" };
};

export const analyzeUrl = async (url: string): Promise<AIResponse> => {
  const config = getActiveConfig();
  if (!config.apiKey) throw new Error("API Key not configured");

  const promptText = `Analyze: "${url}". Return JSON (Chinese):
  { "title": "Name", "description": "8 word summary", "brandColor": "#hex", "pros": "4 char pro", "cons": "4 char con" }`;

  try {
    let rawText = '';
    if (config.type === 'google') {
        const ai = new GoogleGenAI({ apiKey: config.apiKey });
        const response = await ai.models.generateContent({
            model: config.model || 'gemini-2.5-flash',
            contents: promptText,
            config: getModelConfig(config.model)
        });
        rawText = response.text || '';
    } else {
        // OpenAI fallback
        const baseUrl = normalizeBaseUrl(config.baseUrl);
        const endpoint = `${baseUrl}${baseUrl.endsWith('/v1') ? '' : '/v1'}/chat/completions`;
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.apiKey}` },
            body: JSON.stringify({
                model: config.model,
                messages: [{ role: "user", content: promptText }]
            })
        });
        const data = await res.json();
        rawText = data.choices?.[0]?.message?.content || '';
    }
    
    return JSON.parse(cleanJsonString(rawText)) as AIResponse;
  } catch (error) {
    throw handleAiError(error, '网址分析');
  }
};

export const generateCategoryLinks = async (categoryTitle: string, count: number, existingUrls: string[] = []): Promise<Partial<LinkItem>[]> => {
  const config = getActiveConfig();
  if (!config.apiKey) return [];
  
  const promptText = `List ${count} BEST sites for "${categoryTitle}". JSON Array (Chinese):
  [{ "title": "Name", "url": "https://...", "description": "8 word summary", "color": "#hex", "pros": "4 char pro", "cons": "4 char con" }]
  Exclude: ${existingUrls.slice(0, 10).join(',')}`;

  try {
    let rawText = '';
    if (config.type === 'google') {
        const ai = new GoogleGenAI({ apiKey: config.apiKey });
        const response = await ai.models.generateContent({
            model: config.model || 'gemini-2.5-flash',
            contents: promptText,
            config: getModelConfig(config.model)
        });
        rawText = response.text || '';
    } else {
        const baseUrl = normalizeBaseUrl(config.baseUrl);
        const endpoint = `${baseUrl}${baseUrl.endsWith('/v1') ? '' : '/v1'}/chat/completions`;
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.apiKey}` },
            body: JSON.stringify({
                model: config.model,
                messages: [{ role: "user", content: promptText }]
            })
        });
        const data = await res.json();
        rawText = data.choices?.[0]?.message?.content || '';
    }

    return JSON.parse(cleanJsonString(rawText));
  } catch (error) {
     throw handleAiError(error, '内容生成');
  }
};

export const getAiGreeting = async (): Promise<string> => {
  const config = getActiveConfig();
  if (!config.apiKey) return "";
  
  // STRICT Constraint for Simplified Chinese only
  const promptText = `Generate ONE short, scenic, or philosophical sentence in Simplified Chinese.
  Topics: Nature, Future, Perseverance, Universe.
  Constraints:
  1. STRICTLY SIMPLIFIED CHINESE ONLY. NO ENGLISH.
  2. Max 15 characters.
  3. No lists, no options, no explanations.
  4. Example: "星河滚烫，你是人间理想。" or "心有山海，静而无边。"
  5. DO NOT output "Here are 5 options...". Just return the text.`;

  try {
     let text = '';
     if (config.type === 'google') {
        const ai = new GoogleGenAI({ apiKey: config.apiKey });
        const response = await ai.models.generateContent({ 
            model: config.model || 'gemini-2.5-flash', 
            contents: promptText,
            config: { thinkingConfig: { thinkingBudget: 0 } }
        });
        text = response.text?.trim() || "";
     } else {
        const baseUrl = normalizeBaseUrl(config.baseUrl);
        const endpoint = `${baseUrl}${baseUrl.endsWith('/v1') ? '' : '/v1'}/chat/completions`;
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.apiKey}` },
            body: JSON.stringify({
                model: config.model,
                messages: [{ role: "user", content: promptText }]
            })
        });
        const data = await res.json();
        text = data.choices?.[0]?.message?.content?.trim() || "";
     }
     // Clean up ANY non-chinese characters if they appear at start/end
     return text.replace(/[^\u4e00-\u9fa5，。？！]/g, '').trim(); 
  } catch { return ""; }
};

export const suggestIcon = async (text: string): Promise<string> => {
  const config = getActiveConfig();
  if (!config.apiKey) return "Sparkles";
  // Optimize prompt for better Lucide matching
  const promptText = `Suggest the BEST SINGLE Lucide React icon name for "${text}".
  Examples: "Video" -> "Play", "Code" -> "Code2", "Design" -> "Palette".
  Output STRICTLY ONLY the icon string name. No quotes.`;
  
  try {
    if (config.type === 'google') {
        const ai = new GoogleGenAI({ apiKey: config.apiKey });
        const response = await ai.models.generateContent({ model: config.model, contents: promptText, config: { thinkingConfig: { thinkingBudget: 0 } } });
        return response.text?.trim().split(/[\s"']+/)[0] || "Sparkles";
    }
    return "Sparkles";
  } catch { return "Sparkles"; }
};

export const testAiConnection = async (config: AIProviderConfig) => {
    if (!config.apiKey && !process.env.API_KEY) return { success: false, message: '未配置 API Key' };
    try {
        if (config.type === 'google') {
             const key = resolveApiKey(config);
             const ai = new GoogleGenAI({ apiKey: key });
             await ai.models.generateContent({ model: config.model || 'gemini-2.5-flash', contents: 'Hi' });
        } else {
             const baseUrl = normalizeBaseUrl(config.baseUrl);
             const endpoint = `${baseUrl}${baseUrl.endsWith('/v1') ? '' : '/v1'}/models`;
             await fetch(endpoint, { headers: { 'Authorization': `Bearer ${config.apiKey}` } });
        }
        return { success: true, message: '连接成功 (Connected)' };
    } catch (e: any) {
        return { success: false, message: '连接失败: ' + (e.message || 'Unknown Error') };
    }
};

export const fetchAiModels = async (config: AIProviderConfig) => {
    return ['gemini-2.5-flash', 'gemini-1.5-pro', 'gpt-4o'];
};
