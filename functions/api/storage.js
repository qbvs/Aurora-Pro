
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const key = url.searchParams.get('key');
  
  // 这里的 AURORA_KV 是你在 Cloudflare 后台绑定的 KV 命名空间的变量名
  if (!env.AURORA_KV) {
    return new Response(JSON.stringify({ error: 'KV binding not found' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    if (request.method === 'GET') {
      if (!key) return new Response('Key required', { status: 400 });
      
      const value = await env.AURORA_KV.get(key);
      // Cloudflare KV get returns null if not found, we return it as JSON
      return new Response(JSON.stringify(value ? JSON.parse(value) : null), {
        headers: { 'Content-Type': 'application/json' }
      });

    } else if (request.method === 'POST') {
      // POST 用于写入数据
      // 格式期望: { key: "...", value: ... } 或者通过 query param 传 key
      const body = await request.json();
      const saveKey = key || body.key;
      const saveValue = body.value !== undefined ? body.value : body;

      if (!saveKey) return new Response('Key required', { status: 400 });

      await env.AURORA_KV.put(saveKey, JSON.stringify(saveValue));
      
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response('Method not allowed', { status: 405 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
