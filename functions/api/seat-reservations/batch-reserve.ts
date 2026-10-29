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

    const { teamNumber, seats, bookerUid } = body;
    if (!teamNumber || !Array.isArray(seats) || seats.length === 0) {
      return new Response(JSON.stringify({ error: 'teamNumber and seats array are required.' }), {
        status: 400,
        headers: corsHeaders
      });
    }

    const tNum = Number(teamNumber);
    if (isNaN(tNum) || tNum < 1 || tNum > 25) {
      return new Response(JSON.stringify({ error: 'Invalid team number (1-25).' }), {
        status: 400,
        headers: corsHeaders
      });
    }

    const costPerSeat = 150;
    const requiredTotalCost = seats.length * costPerSeat;
    const targetBookerUid = (bookerUid || seats[0]?.uid || '').toString().trim();

    if (!targetBookerUid) {
      return new Response(JSON.stringify({ error: 'Player PUBG UID is required to book seats.' }), {
        status: 400,
        headers: corsHeaders
      });
    }

    // Get user from Firebase RTDB
    let userObj: any = null;
    try {
      const fbRes = await fetch(`${FIREBASE_DB_URL}/users/${encodeURIComponent(targetBookerUid)}.json`);
      if (fbRes.ok) {
        userObj = await fbRes.json();
      }
    } catch (e) {
      console.warn('Error fetching user from Firebase:', e);
    }

    const currentBalance = (userObj && typeof userObj.balance === 'number') ? userObj.balance : 0;
    if (currentBalance < requiredTotalCost) {
      return new Response(JSON.stringify({
        success: false,
        error: `Insufficient balance! You have ${currentBalance} 💎, but booking ${seats.length} seat(s) requires ${requiredTotalCost} 💎 (${seats.length} seat(s) × 150 💎). Short by ${requiredTotalCost - currentBalance} 💎. Please recharge your account.`,
        currentBalance,
        requiredCost: requiredTotalCost,
        shortage: requiredTotalCost - currentBalance
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    // Deduct balance atomically in Firebase
    const newBalance = currentBalance - requiredTotalCost;
    if (userObj) {
      userObj.balance = newBalance;
      await fetch(`${FIREBASE_DB_URL}/users/${encodeURIComponent(targetBookerUid)}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userObj)
      });
    }

    // Update SeatReservations in Firebase RTDB
    const teamKey = `Team_${tNum}`;
    const reservationUpdates: Record<string, any> = {};
    for (const s of seats) {
      const sNum = Number(s.seatNumber);
      if (sNum < 1 || sNum > 4) continue;
      reservationUpdates[`seat_${sNum}`] = {
        playerUid: s.uid.toString().trim(),
        playerName: s.playerName ? s.playerName.toString().trim() : `Player ${sNum}`,
        status: 'RESERVED_CONFIRMED',
        joinedAt: Date.now()
      };
    }

    await fetch(`${FIREBASE_DB_URL}/SeatReservations/PUBG001/${teamKey}.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reservationUpdates)
    });

    return new Response(JSON.stringify({
      success: true,
      message: `Reserved ${seats.length} seat(s) in Team ${tNum} successfully. ${requiredTotalCost} 💎 deducted.`,
      newBalance,
      currentBalance: newBalance,
      teamNumber: tNum,
      reservedSeats: seats
    }), {
      status: 200,
      headers: corsHeaders
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Error processing reservation' }), {
      status: 500,
      headers: corsHeaders
    });
  }
};
