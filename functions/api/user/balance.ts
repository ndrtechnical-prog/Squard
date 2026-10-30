const FIREBASE_DB_URL = 'https://pubg-matches-43fa1-default-rtdb.firebaseio.com';

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Cache-Control': 'no-store, no-cache, must-revalidate'
};

export const onRequest = async (context: any) => {
  const { request } = context;
  const url = new URL(request.url);

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const pubgUid = (url.searchParams.get('pubgUid') || url.searchParams.get('uid') || '').trim();
  if (!pubgUid) {
    return new Response(JSON.stringify({ error: 'PUBG UID is required' }), {
      status: 400,
      headers: corsHeaders
    });
  }

  try {
    const res = await fetch(`${FIREBASE_DB_URL}/users/${encodeURIComponent(pubgUid)}.json`);
    if (res.ok) {
      const text = await res.text();
      let data: any = null;
      if (text && text.trim() !== 'null' && text.trim().startsWith('{')) {
        try { data = JSON.parse(text); } catch {}
      }
      const balance = data && typeof data.balance === 'number' ? data.balance : 0;
      return new Response(JSON.stringify({
        success: true,
        pubgUid,
        balance,
        user: data || null
      }), {
        status: 200,
        headers: corsHeaders
      });
    }

    return new Response(JSON.stringify({ success: true, pubgUid, balance: 0 }), {
      status: 200,
      headers: corsHeaders
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Error fetching balance' }), {
      status: 500,
      headers: corsHeaders
    });
  }
};
