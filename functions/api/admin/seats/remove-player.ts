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

    const { teamNumber, seatNumber } = body;
    if (!teamNumber || !seatNumber) {
      return new Response(JSON.stringify({ error: 'teamNumber and seatNumber are required.' }), {
        status: 400,
        headers: corsHeaders
      });
    }

    const teamKey = `Team_${teamNumber}`;
    const seatKey = `seat_${seatNumber}`;

    await fetch(`${FIREBASE_DB_URL}/SeatReservations/PUBG001/${teamKey}/${seatKey}.json`, {
      method: 'DELETE'
    });

    return new Response(JSON.stringify({
      success: true,
      message: `Seat ${seatNumber} in Team ${teamNumber} released to AVAILABLE.`
    }), {
      status: 200,
      headers: corsHeaders
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Error releasing seat' }), {
      status: 500,
      headers: corsHeaders
    });
  }
};
