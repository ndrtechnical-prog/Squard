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
    // Clear all seat reservations in Firebase RTDB
    await fetch(`${FIREBASE_DB_URL}/SeatReservations/PUBG001.json`, {
      method: 'DELETE'
    });

    return new Response(JSON.stringify({
      success: true,
      message: 'All 100 seats reset to AVAILABLE successfully across Firebase RTDB.'
    }), {
      status: 200,
      headers: corsHeaders
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Error resetting seats' }), {
      status: 500,
      headers: corsHeaders
    });
  }
};
