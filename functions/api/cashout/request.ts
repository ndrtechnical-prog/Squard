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

    const { userUid, pubgId, amount, paymentMethod, accountNumber, accountTitle } = body;
    const cleanUid = (userUid || pubgId || '').toString().trim();
    const reqAmount = Number(amount);

    if (!cleanUid || !reqAmount || reqAmount < 100 || !accountNumber || !paymentMethod) {
      return new Response(JSON.stringify({ error: 'Missing required cash-out parameters. Minimum 100 Diamonds.' }), {
        status: 400,
        headers: corsHeaders
      });
    }

    // Fetch user from Firebase RTDB
    let user: any = null;
    try {
      const fbRes = await fetch(`${FIREBASE_DB_URL}/users/${encodeURIComponent(cleanUid)}.json`);
      if (fbRes.ok) user = await fbRes.json();
    } catch (e) {
      console.warn('Error fetching user:', e);
    }

    const currentBalance = user && typeof user.balance === 'number' ? user.balance : 0;
    if (currentBalance < reqAmount) {
      return new Response(JSON.stringify({
        error: `Insufficient balance! You have ${currentBalance} 💎, but requested ${reqAmount} 💎.`
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    // Deduct user balance in Firebase RTDB
    const newBalance = currentBalance - reqAmount;
    if (user) {
      user.balance = newBalance;
      await fetch(`${FIREBASE_DB_URL}/users/${encodeURIComponent(cleanUid)}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
      });
    }

    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const cashOutRecord = {
      requestId,
      userUid: cleanUid,
      pubgId: cleanUid,
      amount: reqAmount,
      paymentMethod,
      accountNumber,
      accountTitle: accountTitle || cleanUid,
      status: 'PENDING',
      requestedAt: Date.now()
    };

    await fetch(`${FIREBASE_DB_URL}/CashOutRequests/${encodeURIComponent(requestId)}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cashOutRecord)
    });

    return new Response(JSON.stringify({
      success: true,
      message: `Cash-out request of ${reqAmount} 💎 submitted successfully.`,
      request: cashOutRecord,
      newBalance
    }), {
      status: 200,
      headers: corsHeaders
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Error processing cash-out' }), {
      status: 500,
      headers: corsHeaders
    });
  }
};
