const FIREBASE_DB_URL = 'https://pubg-matches-43fa1-default-rtdb.firebaseio.com';

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Cache-Control': 'no-cache'
};

const defaultPaymentAccounts = [
  {
    methodKey: 'EASYPAISA',
    title: 'Easypaisa Mobile Account',
    accountName: 'muhammad Nadir',
    accountNumber: '03052838367',
    instructions: 'Send exact PKR amount to Easypaisa number. Take screenshot and submit TRX ID.',
    isActive: true
  },
  {
    methodKey: 'JAZZCASH',
    title: 'JazzCash Mobile Account',
    accountName: 'muhammad Nadir',
    accountNumber: '03052838367',
    instructions: 'Send exact PKR amount via JazzCash App or *786#. Take screenshot and submit TRX ID.',
    isActive: true
  }
];

export const onRequest = async (context: any) => {
  const { request } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    let tournamentData: any = null;
    let reservationsData: any = null;

    try {
      const [tRes, rRes] = await Promise.all([
        fetch(`${FIREBASE_DB_URL}/tournament/current.json`),
        fetch(`${FIREBASE_DB_URL}/SeatReservations/PUBG001.json`)
      ]);
      if (tRes.ok) tournamentData = await tRes.json();
      if (rRes.ok) reservationsData = await rRes.json();
    } catch (e) {
      console.warn('Error querying Firebase RTDB tournament:', e);
    }

    if (tournamentData && Array.isArray(tournamentData.teams)) {
      if (reservationsData && typeof reservationsData === 'object') {
        tournamentData.teams = tournamentData.teams.map((t: any) => {
          const teamKey = `Team_${t.teamNumber}`;
          const teamRes = reservationsData[teamKey];
          if (teamRes && typeof teamRes === 'object') {
            const seats = t.seats.map((s: any) => {
              const seatKey = `seat_${s.seatNumber}`;
              const sRes = teamRes[seatKey];
              if (sRes && sRes.status === 'RESERVED_CONFIRMED') {
                return {
                  ...s,
                  status: 'APPROVED',
                  playerName: sRes.playerName || s.playerName,
                  playerUid: sRes.playerUid || s.playerUid
                };
              }
              return s;
            });
            return { ...t, seats };
          }
          return t;
        });
      }

      return new Response(JSON.stringify({
        tournament: { ...tournamentData, serverTime: Date.now() },
        paymentAccounts: defaultPaymentAccounts
      }), {
        status: 200,
        headers: corsHeaders
      });
    }

    // Fallback default structure
    return new Response(JSON.stringify({
      tournament: null,
      paymentAccounts: defaultPaymentAccounts
    }), {
      status: 200,
      headers: corsHeaders
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Error fetching tournament' }), {
      status: 500,
      headers: corsHeaders
    });
  }
};
