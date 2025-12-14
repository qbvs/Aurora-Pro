
import { GoogleGenAI } from "@google/genai";
import { AIResponse, LinkItem, AIProviderConfig } from "../types";
import { addLog } from "./logger";
import { getSettingsLocal } from "./storageService";

// --- Helpers ---

// Updated helper to support CUSTOM_API_KEY_X format directly
const getEnvValue = (key?: string): string => {
    if (!key) return '';
    // Fix: Removed dynamic process.env[key] access which causes ReferenceError in browser
    
    // Explicitly check known keys that Vite defines
    switch (key) {
        case 'API_KEY': return process.env.API_KEY || '';
        case 'CUSTOM_API_KEY_1': return process.env.CUSTOM_API_KEY_1 || process.env.VITE_CUSTOM_API_KEY_1 || '';
        case 'CUSTOM_API_KEY_2': return process.env.CUSTOM_API_KEY_2 || process.env.VITE_CUSTOM_API_KEY_2 || '';
        case 'CUSTOM_API_KEY_3': return process.env.CUSTOM_API_KEY_3 || process.env.VITE_CUSTOM_API_KEY_3 || '';
        case 'CUSTOM_API_KEY_4': return process.env.CUSTOM_API_KEY_4 || process.env.VITE_CUSTOM_API_KEY_4 || '';
        case 'CUSTOM_API_KEY_5': return process.env.CUSTOM_API_KEY_5 || process.env.VITE_CUSTOM_API_KEY_5 || '';
        default: return '';
    }
};

// Fix: Updated API key resolution to strictly follow @google/genai guidelines.
// For Google services, it now exclusively uses `process.env.API_KEY`.
// Manual input and other env slots are only for other provider types (e.g., 'openai').
const resolveApiKey = (config: AIProviderConfig): string => {
    if (config.type === 'google') {
        return process.env.API_KEY || '';
    }

    // For other types like 'openai'
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
    if (!config) {
        return { 
            id: 'default', 
            name: 'Default', 
            type: 'google', 
            baseUrl: '', 
            apiKey: process.env.API_KEY || '', 
            model: 'gemini-2.5-flash', 
            isActive: true 
        };
    }
    const resolvedKey = resolveApiKey(config);
    return { ...config, apiKey: resolvedKey };
};

const handleAiError = (error: any, context: string): Error => {
    const errorMessage = (error as any)?.message || String(error) || '未知错误';
    addLog('error', `[${context}] 异常: ${errorMessage}`);
    return error instanceof Error ? error : new Error(String(errorMessage));
};

const constructOpenAiEndpoint = (baseUrl: string): string => {
    if (!baseUrl) return '';
    let url = baseUrl.trim().replace(/\/$/, '');
    
    // Some providers like Aliyun need strict path adherence, others need /chat/completions
    // If user provided a full path including v1, respect it mostly.
    // Simple heuristic: if it doesn't end in chat/completions, append it.
    if (!url.endsWith('/chat/completions')) {
        return `${url}/chat/completions`;
    }
    return url;
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

const getThinkingConfig = (modelName: string) => {
    if (modelName.includes('gemini-2.5')) {
        return { thinkingConfig: { thinkingBudget: 0 } };
    }
    return undefined;
};

const getModelConfig = (modelName: string) => {
    const thinking = getThinkingConfig(modelName);
    return { 
        ...(thinking || {}),
        responseMimeType: "application/json" 
    };
};

const fetchOpenAI = async (config: AIProviderConfig, messages: any[], context: string) => {
    const endpoint = constructOpenAiEndpoint(config.baseUrl);
    addLog('info', `[${context}] POST ${endpoint} (模型: ${config.model})`);
    
    try {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'Authorization': `Bearer ${config.apiKey}` 
            },
            body: JSON.stringify({
                model: config.model,
                messages: messages,
                temperature: 0.7 
            })
        });

        if (!res.ok) {
            const errText = await res.text();
            let errMsg = `HTTP ${res.status}`;
            
            try {
                const errJson = JSON.parse(errText);
                if (errJson.error && errJson.error.message) {
                    errMsg = `服务器拒绝: ${errJson.error.message}`;
                } else {
                    errMsg = `服务器错误 (${res.status}): ${errText.substring(0, 50)}`;
                }
            } catch {
                errMsg = `HTTP ${res.status}: ${errText.substring(0, 100)}`;
            }

            addLog('error', `[${context}] ${errMsg}`);
            throw new Error(errMsg);
        }

        const data = await res.json();
        return data.choices?.[0]?.message?.content || '';
    } catch (e: any) {
        throw new Error(e.message); 
    }
};

export const analyzeUrl = async (url: string): Promise<AIResponse> => {
  const config = getActiveConfig();
  if (!config.apiKey) throw new Error("API Key 未配置");

  const promptText = `分析网址: "${url}"。请返回简体中文的 JSON 对象。格式: { "title": "网站名称", "description": "10-15字的中文简介", "brandColor": "#十六进制颜色码", "pros": "4-8字的优点标签", "cons": "4-8字的缺点标签" }`;

  try {
    let rawText = '';
    const modelName = config.model || 'gemini-2.5-flash';
    if (config.type === 'google') {
        const ai = new GoogleGenAI({ apiKey: config.apiKey });
        const response = await ai.models.generateContent({
            model: modelName,
            contents: promptText,
            config: getModelConfig(modelName)
        });
        rawText = response.text || '';
    } else {
        rawText = await fetchOpenAI(config, [{ role: "user", content: promptText }], '网址分析');
    }
    
    return JSON.parse(cleanJsonString(rawText)) as AIResponse;
  } catch (error) {
    throw handleAiError(error, '网址分析');
  }
};

export const generateCategoryLinks = async (categoryTitle: string, count: number, existingUrls: string[] = []): Promise<Partial<LinkItem>[]> => {
  const config = getActiveConfig();
  if (!config.apiKey) throw new Error("API Key 未配置");
  
  const promptText = `为 "${categoryTitle}" 推荐 ${count} 个最优秀的网站。请返回简体中文的 JSON 数组。不要包含以下网址: ${existingUrls.slice(0, 10).join(',')}。格式: [{ "title": "", "url": "https://...", "description": "", "color": "#hex", "pros": "4-8字优点", "cons": "4-8字缺点" }]`;

  try {
    let rawText = '';
    const modelName = config.model || 'gemini-2.5-flash';
    if (config.type === 'google') {
        const ai = new GoogleGenAI({ apiKey: config.apiKey });
        const response = await ai.models.generateContent({
            model: modelName,
            contents: promptText,
            config: getModelConfig(modelName)
        });
        rawText = response.text || '';
    } else {
        rawText = await fetchOpenAI(config, [{ role: "user", content: promptText }], '链接生成');
    }

    const parsed = JSON.parse(cleanJsonString(rawText));
    if (!Array.isArray(parsed)) throw new Error("AI 返回的不是列表格式，请重试。");
    return parsed;
  } catch (error) {
     throw handleAiError(error, '内容生成');
  }
};

export const getAiGreeting = async (): Promise<string> => {
  const config = getActiveConfig();
  if (!config.apiKey) return "";
  
  const promptText = `请生成一句富有哲理和诗意的简体中文短语，适合用作个人导航页的每日寄语。内容可以源自中国古典文学、成语典故、名人名言或具有现代感的深刻洞察。请避免生成任何与'开发者'、'设计师'、'代码'或'编程'直接相关的、过于行业化或说教式的句子。目标是创造一种宁静、启发性或引人深思的氛围。语言必须优美、凝练。长度在20至60个字符之间。不要包含引号或作者名。`;

  try {
     let text = '';
     const modelName = config.model || 'gemini-2.5-flash';
     if (config.type === 'google') {
        const ai = new GoogleGenAI({ apiKey: config.apiKey });
        const response = await ai.models.generateContent({ 
            model: modelName, 
            contents: promptText, 
            config: getThinkingConfig(modelName)
        });
        text = response.text?.trim() || "";
     } else {
        text = await fetchOpenAI(config, [{ role: "user", content: promptText }], '每日寄语');
     }
     return text.replace(/[^\u4e00-\u9fa5，。？！；：]/g, '').trim(); 
  } catch { return ""; }
};

export const askSimpleQuestion = async (question: string): Promise<string> => {
  const config = getActiveConfig();
  if (!config.apiKey) return "请先配置 API Key";
  
  const promptText = `请用简练、清晰的中文回答用户的问题。字数控制在 100 字以内，除非问题需要长篇大论。
  用户问题: "${question}"`;

  try {
     let text = '';
     const modelName = config.model || 'gemini-2.5-flash';
     if (config.type === 'google') {
        const ai = new GoogleGenAI({ apiKey: config.apiKey });
        const response = await ai.models.generateContent({ 
            model: modelName, 
            contents: promptText, 
            config: getThinkingConfig(modelName)
        });
        text = response.text?.trim() || "AI 思考超时";
     } else {
        text = await fetchOpenAI(config, [{ role: "user", content: promptText }], 'AI问答');
     }
     return text;
  } catch (e: any) { 
      throw handleAiError(e, 'AI问答');
  }
};

export const suggestIcon = async (text: string): Promise<string> => {
  const config = getActiveConfig();
  if (!config.apiKey) return "Folder"; 
  
  const promptText = `任务: 将输入 "${text}" 映射到最匹配的一个 Lucide React 图标。
  规则:
  1. 只返回图标的名称 (PascalCase格式)。
  2. 必须是真实的图标名，不要创造。
  3. 如果输入是 "Aurora", 建议返回 "Sparkles" 或 "Zap"。
  4. 如果输入是中文 (例如 月亮)，先翻译成概念 (Moon)，再寻找图标。
  5. 示例: "月亮"->"Moon", "游戏"->"Gamepad2", "设置"->"Settings"。`;
  
  try {
    let rawText = '';
    const modelName = config.model || 'gemini-2.5-flash';
    if (config.type === 'google') {
        const ai = new GoogleGenAI({ apiKey: config.apiKey });
        const response = await ai.models.generateContent({ 
            model: modelName, 
            contents: promptText, 
            config: getThinkingConfig(modelName) 
        });
        rawText = response.text?.trim() || "Folder";
    } else {
        rawText = await fetchOpenAI(config, [{ role: "user", content: promptText }], '图标推荐');
    }
    
    let cleanName = rawText.replace(/```/g, '').replace(/json/g, '').trim();
    
    const match = cleanName.match(/[a-zA-Z0-9]+/);
    if (match) {
        cleanName = match[0];
        cleanName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
    } else {
        return "Folder";
    }

    if (cleanName.length < 2) return "Folder";
    return cleanName;
  } catch { return "Folder"; }
};

export const testAiConnection = async (config: AIProviderConfig) => {
    const key = resolveApiKey(config);
    if (!key) return { success: false, message: 'API Key 未找到' };
    
    const testConfig = { ...config, apiKey: key };

    try {
        const modelName = config.model || 'gemini-2.5-flash';
        if (config.type === 'google') {
             const ai = new GoogleGenAI({ apiKey: key });
             await ai.models.generateContent({ model: modelName, contents: 'Hi' });
        } else {
             await fetchOpenAI(testConfig, [{role: 'user', content: 'hi'}], '连接测试');
        }
        return { success: true, message: '连接成功' };
    } catch (e: any) {
        return { success: false, message: e.message || '连接失败' };
    }
};

export const fetchAiModels = async (config: AIProviderConfig) => {
    return ['gemini-2.5-flash', 'gemini-3-pro-preview', 'gpt-4o', 'gpt-3.5-turbo'];
};
