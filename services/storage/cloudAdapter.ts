
import { addLog } from "../logger";

// 判断是否配置了 Vercel KV 环境变量
const isVercelConfigured = () => !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

/**
 * 核心逻辑：验证云端连接
 * 意图：主动探测 KV 存储是否可用
 * 输出：Boolean
 */
export const verifyCloudConnection = async (): Promise<boolean> => {
    if (isVercelConfigured()) {
        try {
            const url = `${process.env.KV_REST_API_URL?.replace(/\/$/, '')}/get/test-key`;
            const res = await fetch(url, { headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` } });
            return res.status < 500;
        } catch { return false; }
    } else {
        // Cloudflare KV 通过 Function 代理
        try {
            const res = await fetch(`/api/storage?key=test-key`);
            return res.ok;
        } catch { return false; }
    }
};

/**
 * 核心逻辑：通用 KV 请求
 * 意图：屏蔽 Vercel REST API 和 Cloudflare Functions 的差异
 */
export const kvFetch = async (command: 'GET' | 'SET', key: string, value?: any) => {
  try {
    // 策略 A: Vercel KV (REST API)
    if (isVercelConfigured()) {
      const url = `${process.env.KV_REST_API_URL?.replace(/\/$/, '')}/`;
      const body = command === 'SET' 
        ? JSON.stringify([command, key, JSON.stringify(value)])
        : JSON.stringify([command, key]);

      const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` },
        body
      });
      if (!res.ok) throw new Error(`Vercel KV Error: ${res.status}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      
      // 解析嵌套的 JSON 字符串结果
      if (json.result) {
         try { return typeof json.result === 'string' ? JSON.parse(json.result) : json.result; } 
         catch { return json.result; }
      }
      return null;
    } 
    // 策略 B: Cloudflare KV (Function API)
    else {
      if (command === 'GET') {
        const res = await fetch(`/api/storage?key=${key}`);
        return res.ok ? await res.json() : null;
      } else {
        const res = await fetch(`/api/storage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key, value })
        });
        if (!res.ok) throw new Error('Cloudflare Write Failed');
        return value;
      }
    }
  } catch (e: any) {
    addLog('warn', `云同步失败: ${e.message}`);
    return null;
  }
};
