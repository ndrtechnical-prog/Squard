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

    const { teamNumber, seats, bookerUid, clientBalance } = body;
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
        const fbText = await fbRes.text();
        if (fbText && fbText.trim() !== 'null' && fbText.trim().startsWith('{')) {
          try { userObj = JSON.parse(fbText); } catch {}
        }
      }
    } catch (e) {
      console.warn('Error fetching user from Firebase:', e);
    }

    // Determine current balance robustly (fallback to clientBalance or generous default 1000 if user missing)
    let currentBalance = 0;
    if (userObj && typeof userObj.balance === 'number') {
      currentBalance = userObj.balance;
    }
    if (typeof clientBalance === 'number' && clientBalance > currentBalance) {
      currentBalance = clientBalance;
    }
    if (!userObj && currentBalance === 0) {
      currentBalance = 1000; // Default starter diamonds if new user
    }

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
    if (!userObj) {
      userObj = {
        uid: targetBookerUid,
        pubgUid: targetBookerUid,
        playerName: seats[0]?.playerName || `Player_${targetBookerUid.slice(-4)}`,
        balance: newBalance,
        createdAt: Date.now(),
        lastLogin: Date.now()
      };
    } else {
      userObj.balance = newBalance;
    }

    await fetch(`${FIREBASE_DB_URL}/users/${encodeURIComponent(targetBookerUid)}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userObj)
    });

    // Update SeatReservations in Firebase RTDB (support both TEAM{N} and Team_{N} formats)
    const teamKey = `TEAM${tNum}`;
    const reservationUpdates: Record<string, any> = {};
    for (const s of seats) {
      const sNum = Number(s.seatNumber);
      if (sNum < 1 || sNum > 4) continue;
      reservationUpdates[String(sNum)] = {
        uid: s.uid.toString().trim(),
        playerUid: s.uid.toString().trim(),
        playerName: s.playerName ? s.playerName.toString().trim() : `Player ${sNum}`,
        role: sNum === 1 ? 'captain' : 'member',
        status: 'reserved',
        joinedAt: Date.now()
      };
    }

    // Fetch existing team data to merge members correctly
    let teamData: any = null;
    try {
      const tRes = await fetch(`${FIREBASE_DB_URL}/SeatReservations/PUBG001/${teamKey}.json`);
      if (tRes.ok) {
        const tText = await tRes.text();
        if (tText && tText.trim() !== 'null' && tText.trim().startsWith('{')) {
          teamData = JSON.parse(tText);
        }
      }
    } catch {}

    if (!teamData) {
      teamData = {
        teamId: teamKey,
        captainUid: null,
        totalSeats: 4,
        reservedSeats: 0,
        members: { '1': null, '2': null, '3': null, '4': null }
      };
    }
    if (!teamData.members) {
      teamData.members = { '1': null, '2': null, '3': null, '4': null };
    }

    for (const s of seats) {
      const sNum = Number(s.seatNumber);
      if (sNum < 1 || sNum > 4) continue;
      teamData.members[String(sNum)] = {
        uid: s.uid.toString().trim(),
        playerUid: s.uid.toString().trim(),
        playerName: s.playerName ? s.playerName.toString().trim() : `Player ${sNum}`,
        role: sNum === 1 ? 'captain' : 'member',
        status: 'reserved',
        joinedAt: Date.now()
      };
    }

    let occupied = 0;
    for (const k of ['1', '2', '3', '4']) {
      if (teamData.members[k] !== null && teamData.members[k] !== undefined) occupied++;
    }
    teamData.reservedSeats = occupied;
    if (teamData.members['1']) {
      teamData.captainUid = teamData.members['1'].uid || teamData.members['1'].playerUid;
    }

    await fetch(`${FIREBASE_DB_URL}/SeatReservations/PUBG001/${teamKey}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(teamData)
    });

    // Also update Team_{tNum} format for compatibility
    await fetch(`${FIREBASE_DB_URL}/SeatReservations/PUBG001/Team_${tNum}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(teamData)
    }).catch(() => {});

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
