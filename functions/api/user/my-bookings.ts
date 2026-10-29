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
  const url = new URL(request.url);

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const rawUid = url.searchParams.get('pubgUid') || url.searchParams.get('uid');
  if (!rawUid) {
    return new Response(JSON.stringify({ error: 'pubgUid query parameter is required.' }), {
      status: 400,
      headers: corsHeaders
    });
  }

  const cleanUid = rawUid.trim();

  try {
    const [rRes, tRes] = await Promise.all([
      fetch(`${FIREBASE_DB_URL}/SeatReservations/PUBG001.json`),
      fetch(`${FIREBASE_DB_URL}/tournament/current.json`)
    ]);

    let reservations: any = null;
    let tData: any = null;
    if (rRes.ok) reservations = await rRes.json();
    if (tRes.ok) tData = await tRes.json();

    const activeBookings: any[] = [];

    if (reservations && typeof reservations === 'object') {
      for (let t = 1; t <= 25; t++) {
        const team = reservations[`TEAM${t}`] || reservations[`Team_${t}`];
        if (!team || !team.members) continue;

        const members = team.members;
        for (let s = 1; s <= 4; s++) {
          let m = Array.isArray(members) ? members[s] : (members[String(s)] || members[s]);
          if (m && m.uid === cleanUid) {
            activeBookings.push({
              id: `bkg_PUBG001_T${t}S${s}`,
              tournamentId: 'PUBG001',
              tournamentTitle: tData?.title || 'PUBG Mobile 100-Player Squad Championship',
              map: tData?.mapName || 'Erangel',
              gameType: tData?.gameType || 'PUBG Mobile',
              matchDate: tData?.matchDate || '2026-10-30',
              matchTime: tData?.matchTime || '11:00',
              matchStartTime: tData?.matchStartTime || (Date.now() + 24 * 3600 * 1000),
              teamNumber: t,
              teamId: `TEAM${t}`,
              seatNumber: s,
              role: s === 1 ? 'captain' : 'member',
              isCaptain: s === 1,
              playerName: m.playerName || 'Player',
              playerUid: m.uid,
              status: 'APPROVED',
              joinedAt: m.joinedAt || Date.now(),
              roomId: tData?.roomId || '69151604',
              roomPassword: tData?.roomPassword || '1234',
              isRoomUnlocked: true,
              roomUnlockTime: tData?.roomOpenTime || Date.now()
            });
          }
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      bookings: activeBookings
    }), {
      status: 200,
      headers: corsHeaders
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Error fetching user bookings' }), {
      status: 500,
      headers: corsHeaders
    });
  }
};
