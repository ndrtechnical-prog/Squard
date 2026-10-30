const FIREBASE_DB_URL = 'https://pubg-matches-43fa1-default-rtdb.firebaseio.com';

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Cache-Control': 'no-cache'
};

export const onRequest = async (context: any) => {
  const { request } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const res = await fetch(`${FIREBASE_DB_URL}/Notice.json`);
    let notice = null;
    if (res.ok) {
      const text = await res.text();
      if (text && text.trim() !== 'null' && text.trim().startsWith('{')) {
        try { notice = JSON.parse(text); } catch {}
      }
    }
    return new Response(JSON.stringify({
      success: true,
      notice: notice || null
    }), {
      status: 200,
      headers: corsHeaders
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Error fetching notice' }), {
      status: 500,
      headers: corsHeaders
    });
  }
};
