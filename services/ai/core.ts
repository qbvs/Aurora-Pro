
import { GoogleGenAI } from "@google/genai";
import { AIProviderConfig } from "../../types";
import { addLog } from "../logger";
import { getSettingsLocal } from "../storageService";

/**
 * 核心逻辑：解析环境变量
 * 意图：支持 Vercel 和本地 .env 的多种命名方式
 * 数据流：Key Name (string) -> API Key Value (string)
 */
export const getEnvValue = (key?: string): string => {
    if (!key) return '';
    const env = process.env;
    // 显式检查允许的键值，防止泄露
    switch (key) {
        case 'API_KEY': return env.API_KEY || '';
        case 'CUSTOM_API_KEY_1': return env.CUSTOM_API_KEY_1 || env.VITE_CUSTOM_API_KEY_1 || '';
        case 'CUSTOM_API_KEY_2': return env.CUSTOM_API_KEY_2 || env.VITE_CUSTOM_API_KEY_2 || '';
        case 'CUSTOM_API_KEY_3': return env.CUSTOM_API_KEY_3 || env.VITE_CUSTOM_API_KEY_3 || '';
        case 'CUSTOM_API_KEY_4': return env.CUSTOM_API_KEY_4 || env.VITE_CUSTOM_API_KEY_4 || '';
        case 'CUSTOM_API_KEY_5': return env.CUSTOM_API_KEY_5 || env.VITE_CUSTOM_API_KEY_5 || '';
        default: return '';
    }
};

/**
 * 核心逻辑：获取当前激活的 AI 配置
 * 意图：从本地设置中读取，如果不存在则回退到默认
 * 数据流：LocalStorage -> AIProviderConfig
 */
export const getActiveConfig = (): AIProviderConfig => {
    const settings = getSettingsLocal();
    const config = settings?.aiConfigs?.find(c => c.isActive) || settings?.aiConfigs?.[0];
    
    // 默认兜底配置
    if (!config) {
        return { 
            id: 'default', name: 'Default', type: 'google', 
            baseUrl: '', apiKey: process.env.API_KEY || '', 
            model: 'gemini-2.5-flash', isActive: true 
        };
    }

    // 解析 API Key (优先使用配置中的 envSlot)
    let resolvedKey = '';
    if (config.type === 'google') {
        resolvedKey = process.env.API_KEY || '';
    } else {
        if (config.envSlot) resolvedKey = getEnvValue(config.envSlot);
        if (!resolvedKey && config.apiKey) resolvedKey = config.apiKey;
    }

    return { ...config, apiKey: resolvedKey };
};

/**
 * 核心逻辑：通用 OpenAI 格式请求封装
 * 意图：兼容所有支持 OpenAI 接口的供应商 (DeepSeek, Mistral, Moonshot 等)
 */
export const fetchOpenAI = async (config: AIProviderConfig, messages: any[], context: string) => {
    let url = config.baseUrl.trim().replace(/\/$/, '');
    // 智能补全路径，防止用户配置错误
    if (!url.endsWith('/chat/completions')) {
        url = url.endsWith('/v1') ? `${url}/chat/completions` : `${url}/v1/chat/completions`;
    }

    addLog('info', `[${context}] POST ${url} (Model: ${config.model})`);

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.apiKey}` },
            body: JSON.stringify({ model: config.model, messages, temperature: 0.7 })
        });

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`HTTP ${res.status}: ${errText.substring(0, 100)}`);
        }
        const data = await res.json();
        return data.choices?.[0]?.message?.content || '';
    } catch (e: any) {
        addLog('error', `[${context}] 请求失败: ${e.message}`);
        throw new Error(e.message);
    }
};

/**
 * 工具逻辑：清洗 JSON 字符串
 * 意图：移除 Markdown 代码块标记，提取纯 JSON
 */
export const cleanJsonString = (text: string): string => {
    let clean = text.replace(/```json\n?|```/g, '').trim();
    const firstBrace = clean.indexOf('{');
    const firstBracket = clean.indexOf('[');
    const lastBrace = clean.lastIndexOf('}');
    const lastBracket = clean.lastIndexOf(']');
    
    // 尝试提取最外层的对象或数组
    if (firstBrace > -1 && lastBrace > -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
        return clean.substring(firstBrace, lastBrace + 1);
    }
    if (firstBracket > -1 && lastBracket > -1) {
        return clean.substring(firstBracket, lastBracket + 1);
    }
    return clean;
};
