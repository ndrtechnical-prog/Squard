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

    const { identifier, diamonds, note } = body;
    const cleanId = (identifier || '').toString().trim();
    const amount = Number(diamonds);

    if (!cleanId || isNaN(amount) || amount === 0) {
      return new Response(JSON.stringify({ error: 'Valid identifier and diamond amount are required.' }), {
        status: 400,
        headers: corsHeaders
      });
    }

    // Fetch user from Firebase
    let user: any = null;
    try {
      const fbRes = await fetch(`${FIREBASE_DB_URL}/users/${encodeURIComponent(cleanId)}.json`);
      if (fbRes.ok) {
        const text = await fbRes.text();
        if (text && text.trim() !== 'null' && text.trim().startsWith('{')) {
          try { user = JSON.parse(text); } catch {}
        }
      }
    } catch (e) {
      console.warn('Error fetching user:', e);
    }

    if (!user) {
      user = {
        uid: cleanId,
        pubgUid: cleanId,
        playerName: `Player_${cleanId.slice(-4)}`,
        balance: 0,
        createdAt: Date.now()
      };
    }

    const currentBal = typeof user.balance === 'number' ? user.balance : 0;
    const newBal = Math.max(0, currentBal + amount);
    user.balance = newBal;

    await fetch(`${FIREBASE_DB_URL}/users/${encodeURIComponent(cleanId)}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user)
    });

    return new Response(JSON.stringify({
      success: true,
      message: `Adjusted ${amount > 0 ? '+' : ''}${amount} 💎 for ${user.playerName || cleanId}. New Balance: ${newBal} 💎.`,
      user: {
        uid: user.uid,
        pubgUid: user.pubgUid,
        playerName: user.playerName,
        balance: newBal
      }
    }), {
      status: 200,
      headers: corsHeaders
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Error updating diamonds' }), {
      status: 500,
      headers: corsHeaders
    });
  }
};
