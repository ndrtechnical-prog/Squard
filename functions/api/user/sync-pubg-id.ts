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

    const { pubgUid, playerName, pin } = body;
    if (!pubgUid || !pubgUid.toString().trim()) {
      return new Response(JSON.stringify({ error: 'PUBG UID is required.' }), {
        status: 400,
        headers: corsHeaders
      });
    }

    const cleanUid = pubgUid.toString().trim();
    const cleanPin = pin ? pin.toString().trim() : '';
    const cleanName = playerName ? playerName.toString().trim() : '';

    let user: any = null;
    try {
      const fbRes = await fetch(`${FIREBASE_DB_URL}/users/${encodeURIComponent(cleanUid)}.json`);
      if (fbRes.ok) {
        const fbText = await fbRes.text();
        if (fbText && fbText.trim() !== 'null' && fbText.trim().startsWith('{')) {
          user = JSON.parse(fbText);
        }
      }
    } catch (e) {
      console.warn('Firebase RTDB read error:', e);
    }

    if (user) {
      if (cleanPin && (!user.pin || user.pin.trim() === '')) {
        user.pin = cleanPin;
        user.password = cleanPin;
      }
      if (cleanName && (!user.playerName || user.playerName.startsWith('Player_'))) {
        user.playerName = cleanName;
      }
      user.lastLogin = Date.now();

      await fetch(`${FIREBASE_DB_URL}/users/${encodeURIComponent(cleanUid)}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
      });
    } else {
      user = {
        uid: cleanUid,
        pubgUid: cleanUid,
        playerName: cleanName || `Player_${cleanUid.slice(-4)}`,
        pin: cleanPin,
        password: cleanPin,
        balance: 0,
        createdAt: Date.now(),
        lastLogin: Date.now()
      };

      await fetch(`${FIREBASE_DB_URL}/users/${encodeURIComponent(cleanUid)}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Account synced successfully.`,
      user: {
        uid: user.uid,
        pubgUid: user.pubgUid,
        playerName: user.playerName,
        pin: user.pin,
        balance: typeof user.balance === 'number' ? user.balance : 0
      }
    }), {
      status: 200,
      headers: corsHeaders
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Failed to sync PUBG ID' }), {
      status: 500,
      headers: corsHeaders
    });
  }
};
