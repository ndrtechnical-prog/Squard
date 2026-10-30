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

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    let settings: any = {
      perKillReward: 100,
      minWithdrawal: 100,
      estimatedProcessingTime: 'Estimated processing time: 3–4 days after approval.'
    };

    try {
      const res = await fetch(`${FIREBASE_DB_URL}/rewardSettings.json`);
      if (res.ok) {
        const text = await res.text();
        if (text && text.trim() !== 'null' && text.trim().startsWith('{')) {
          const data = JSON.parse(text);
          if (data && typeof data === 'object') {
            settings = {
              perKillReward: Number(data.perKillReward) || 100,
              minWithdrawal: Number(data.minWithdrawal) || 100,
              estimatedProcessingTime: String(data.estimatedProcessingTime || 'Estimated processing time: 3–4 days after approval.')
            };
          }
        }
      }
    } catch (e) {
      console.warn('Error fetching reward settings:', e);
    }

    return new Response(JSON.stringify({
      success: true,
      settings
    }), {
      status: 200,
      headers: corsHeaders
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Error fetching reward settings' }), {
      status: 500,
      headers: corsHeaders
    });
  }
};
