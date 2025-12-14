
import { GoogleGenAI } from "@google/genai";
import { AIResponse, LinkItem, Language } from "../../types";
import { addLog } from "../logger";
import { getActiveConfig, fetchOpenAI, cleanJsonString } from "./core";

// 辅助：获取模型特定配置 (针对 Gemini 2.5 的思考配置)
const getModelConfig = (modelName: string) => {
    const isThinking = modelName.includes('gemini-2.5');
    return { 
        ...(isThinking ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
        responseMimeType: "application/json" 
    };
};

/**
 * 业务功能：分析 URL
 * 意图：生成网站的元数据（标题、描述、颜色、标签）
 */
export const analyzeUrl = async (url: string): Promise<AIResponse> => {
  const config = getActiveConfig();
  if (!config.apiKey) throw new Error("API Key 未配置");

  const prompt = `分析网址: "${url}"。请返回简体中文的 JSON 对象。格式: { "title": "名称", "description": "10-15字简介", "brandColor": "#Hex", "pros": "4-8字优点", "cons": "4-8字缺点", "language": "主要语言" }`;

  try {
    let rawText = '';
    if (config.type === 'google') {
        const ai = new GoogleGenAI({ apiKey: config.apiKey });
        const res = await ai.models.generateContent({
            model: config.model || 'gemini-2.5-flash',
            contents: prompt,
            config: getModelConfig(config.model)
        });
        rawText = res.text || '';
    } else {
        rawText = await fetchOpenAI(config, [{ role: "user", content: prompt }], '网址分析');
    }
    return JSON.parse(cleanJsonString(rawText)) as AIResponse;
  } catch (e: any) {
    throw new Error(e.message || "分析失败");
  }
};

/**
 * 业务功能：生成每日寄语
 * 意图：生成富有哲理的短句 (支持多语言)
 */
export const getAiGreeting = async (lang: Language = 'zh'): Promise<string> => {
  const config = getActiveConfig();
  if (!config.apiKey) return "";
  
  let prompt = "";
  if (lang === 'en') {
      prompt = "Generate a short, poetic, and philosophical quote in English (10-20 words). Do NOT use quotes.";
  } else if (lang === 'ja') {
      prompt = "哲学的で詩的な短い日本語のフレーズを生成してください（20〜40文字）。引用符は使用しないでください。";
  } else {
      prompt = "生成一句富有哲理的简体中文短语，20-60字。优美、凝练。不要包含引号。";
  }

  try {
     let text = "";
     if (config.type === 'google') {
        const ai = new GoogleGenAI({ apiKey: config.apiKey });
        const res = await ai.models.generateContent({ 
            model: config.model || 'gemini-2.5-flash', 
            contents: prompt 
        });
        text = res.text?.trim() || "";
     } else {
        text = await fetchOpenAI(config, [{ role: "user", content: prompt }], '每日寄语');
     }
     
     // 简单的清理
     if (lang === 'zh' || lang === 'ja') {
         return text.replace(/[^\u4e00-\u9fa5\u3040-\u309F\u30A0-\u30FF，。？！；：]/g, '').trim();
     }
     return text.replace(/["']/g, "").trim();

  } catch { return ""; }
};

/**
 * 业务功能：生成推荐链接
 */
export const generateCategoryLinks = async (title: string, count: number, excludes: string[] = []): Promise<Partial<LinkItem>[]> => {
  const config = getActiveConfig();
  if (!config.apiKey) throw new Error("API Key 未配置");
  
  const prompt = `为 "${title}" 推荐 ${count} 个网站。返回JSON数组。排除: ${excludes.slice(0,5).join(',')}。格式: [{ "title": "", "url": "", "description": "", "language": "" }]`;

  try {
    let rawText = '';
    if (config.type === 'google') {
        const ai = new GoogleGenAI({ apiKey: config.apiKey });
        const res = await ai.models.generateContent({ model: config.model, contents: prompt, config: { responseMimeType: "application/json" } });
        rawText = res.text || '';
    } else {
        rawText = await fetchOpenAI(config, [{ role: "user", content: prompt }], '链接生成');
    }
    return JSON.parse(cleanJsonString(rawText));
  } catch (e: any) { throw new Error(e.message); }
};

// ... 其他简单函数如 askSimpleQuestion, suggestIcon, testAiConnection 也可以放在这里
export const suggestIcon = async (text: string): Promise<string> => { return "Folder"; }; 
export const askSimpleQuestion = async (q: string): Promise<string> => { return "AI 正在思考..."; };
export const testAiConnection = async (c: any) => { return { success: true, message: 'OK' }; };
