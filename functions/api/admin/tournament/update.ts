const FIREBASE_DB_URL = 'https://pubg-matches-43fa1-default-rtdb.firebaseio.com';

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

export const onRequest = async (context: any) => {
  const { request } = context;

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

    // Read current tournament from Firebase
    let current: any = {};
    try {
      const fbRes = await fetch(`${FIREBASE_DB_URL}/tournament/current.json`);
      if (fbRes.ok) {
        const text = await fbRes.text();
        if (text && text.trim() !== 'null' && text.trim().startsWith('{')) {
          try { current = JSON.parse(text); } catch {}
        }
      }
    } catch (e) {
      console.warn('Error reading tournament:', e);
    }

    const updated = {
      ...current,
      ...body,
      updatedAt: Date.now()
    };

    // Save to Firebase RTDB
    await fetch(`${FIREBASE_DB_URL}/tournament/current.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    });

    return new Response(JSON.stringify({
      success: true,
      message: 'Tournament schedule & room settings updated successfully.',
      tournament: updated
    }), {
      status: 200,
      headers: corsHeaders
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Error updating tournament' }), {
      status: 500,
      headers: corsHeaders
    });
  }
};
