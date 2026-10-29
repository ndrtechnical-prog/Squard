import { Env, EventContext } from './types';

export const onRequestGet = async (context: EventContext<Env>) => {
  try {
    const { env } = context;

    if (!env.DB) {
      const fbRes = await fetch('https://pubg-matches-43fa1-default-rtdb.firebaseio.com/tournament/current.json');
      if (fbRes.ok) {
        const tournament = await fbRes.json();
        return new Response(JSON.stringify({ tournament, paymentAccounts: [] }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return new Response(JSON.stringify({ error: 'Database not available' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Fetch active tournament
    const tournament = await env.DB.prepare(
      'SELECT * FROM tournaments WHERE status != "COMPLETED" ORDER BY created_at DESC LIMIT 1'
    ).first();

    if (!tournament) {
      return new Response(JSON.stringify({ error: 'No active tournament found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Fetch teams and seats
    const teamsResult = await env.DB.prepare(
      'SELECT * FROM teams WHERE tournament_id = ? ORDER BY team_number ASC'
    ).bind(tournament.id).all();

    const seatsResult = await env.DB.prepare(
      'SELECT * FROM seats WHERE tournament_id = ? ORDER BY team_number ASC, seat_number ASC'
    ).bind(tournament.id).all();

    // Fetch active payment accounts
    const paymentMethodsResult = await env.DB.prepare(
      'SELECT * FROM payment_settings WHERE is_active = 1'
    ).all();

    const teams = (teamsResult.results || []).map((team: any) => ({
      id: team.id,
      tournamentId: team.tournament_id,
      teamNumber: team.team_number,
      name: team.name,
      seats: (seatsResult.results || [])
        .filter((s: any) => s.team_id === team.id)
        .map((s: any) => ({
          id: s.id,
          tournamentId: s.tournament_id,
          teamId: s.team_id,
          teamNumber: s.team_number,
          seatNumber: s.seat_number,
          status: s.status,
          playerName: s.player_name,
          playerUid: s.player_uid
        }))
    }));

    // Mask sensitive room credentials on public endpoint
    const publicTournament = {
      id: tournament.id,
      title: tournament.title,
      gameType: tournament.game_type,
      mapName: tournament.map_name,
      matchType: tournament.match_type,
      serverRegion: tournament.server_region,
      totalTeams: tournament.total_teams,
      seatsPerTeam: tournament.seats_per_team,
      entryFeeSolo: tournament.entry_fee_solo,
      entryFeeDuo: tournament.entry_fee_duo,
      entryFeeSquad: tournament.entry_fee_squad,
      prizePoolTotal: tournament.prize_pool_total,
      roomOpenTime: tournament.room_open_time,
      matchStartTime: tournament.match_start_time,
      matchEndTime: tournament.match_end_time,
      status: tournament.status,
      teams,
      serverTime: Date.now()
    };

    return new Response(JSON.stringify({
      tournament: publicTournament,
      paymentAccounts: paymentMethodsResult.results || []
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Database query error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
