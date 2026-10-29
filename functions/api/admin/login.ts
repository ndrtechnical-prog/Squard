const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

const VALID_PASSWORDS = ['Ndr@77490869', 'pubgadmin2026'];

export const onRequest = async (context: any) => {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: corsHeaders
    });
  }

  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), {
        status: 400,
        headers: corsHeaders
      });
    }

    const { password } = body;
    const cleanPass = (password || '').toString().trim();

    const allowed = new Set(VALID_PASSWORDS);
    if (env?.ADMIN_SECRET) allowed.add(env.ADMIN_SECRET.trim());
    if (env?.ADMIN_PASSWORD) allowed.add(env.ADMIN_PASSWORD.trim());

    if (!cleanPass || !allowed.has(cleanPass)) {
      return new Response(JSON.stringify({ error: 'Incorrect administrator password.' }), {
        status: 401,
        headers: corsHeaders
      });
    }

    const token = 'pubg_adm_' + crypto.randomUUID().replace(/-/g, '') + Date.now().toString(36);

    return new Response(JSON.stringify({
      success: true,
      token,
      adminName: 'Tournament Director',
      message: 'Authenticated successfully.'
    }), {
      status: 200,
      headers: corsHeaders
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Authentication error' }), {
      status: 500,
      headers: corsHeaders
    });
  }
};
