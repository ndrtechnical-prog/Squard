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

function createInitial25Teams() {
  const teams = [];
  for (let t = 1; t <= 25; t++) {
    const seats = [];
    for (let s = 1; s <= 4; s++) {
      seats.push({
        id: `seat-t${t}-s${s}`,
        tournamentId: 'PUBG001',
        teamId: `team-${t}`,
        teamNumber: t,
        seatNumber: s,
        status: 'AVAILABLE',
        role: s === 1 ? 'captain' : 'member',
        isCaptain: s === 1
      });
    }
    teams.push({
      id: `team-${t}`,
      tournamentId: 'PUBG001',
      teamNumber: t,
      name: `Team ${t}`,
      captainUid: null,
      seats
    });
  }
  return teams;
}

function parseKarachiTimestamp(dateStr?: string, timeStr?: string): number {
  const cleanDate = (dateStr || '2026-10-30').trim();
  const rawTime = (timeStr || '11:00').trim();
  const cleanTime = rawTime.length === 5 ? rawTime : `${rawTime}:00`.slice(0, 5);
  const isoWithKarachiTz = `${cleanDate}T${cleanTime}:00+05:00`;
  const parsed = Date.parse(isoWithKarachiTz);
  return isNaN(parsed) ? (Date.now() + 2 * 3600 * 1000) : parsed;
}

export const onRequest = async (context: any) => {
  const { request } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    let firebaseSettings: any = null;
    let reservationsData: any = null;

    try {
      const [tRes, rRes] = await Promise.all([
        fetch(`${FIREBASE_DB_URL}/tournament/current.json`),
        fetch(`${FIREBASE_DB_URL}/SeatReservations/PUBG001.json`)
      ]);
      if (tRes.ok) firebaseSettings = await tRes.json();
      if (rRes.ok) reservationsData = await rRes.json();
    } catch (e) {
      console.warn('Error querying Firebase RTDB tournament:', e);
    }

    const matchDate = firebaseSettings?.matchDate || '2026-10-30';
    const matchTime = firebaseSettings?.matchTime || '11:00';
    const roomId = firebaseSettings?.roomId || '69151604';
    const roomPassword = firebaseSettings?.roomPassword || '1234';
    const youtubeUrl = firebaseSettings?.youtubeUrl || 'https://youtube.com/@flaregunpk?si=NycZ9BwNyELH405i';
    const manualStatus = firebaseSettings?.manualStatus || 'AUTO';

    const matchStartTime = parseKarachiTimestamp(matchDate, matchTime);
    const roomOpenTime = matchStartTime;
    const matchEndTime = matchStartTime + 60 * 60 * 1000;

    const current = Date.now();
    let status = 'REGISTRATION_OPEN';
    if (manualStatus && manualStatus !== 'AUTO') {
      status = manualStatus;
    } else {
      if (current < matchStartTime) {
        status = 'REGISTRATION_OPEN';
      } else if (current >= matchStartTime && current < matchStartTime + 15 * 60 * 1000) {
        status = 'ROOM_OPEN';
      } else if (current >= matchStartTime + 15 * 60 * 1000 && current < matchEndTime) {
        status = 'MATCH_LIVE';
      } else {
        status = 'WAIT_FOR_RESULT';
      }
    }

    // 25 teams with reservations overlay
    const teams = createInitial25Teams().map((team) => {
      const tNum = team.teamNumber;
      const teamRes = reservationsData?.[`TEAM${tNum}`] || reservationsData?.[`Team_${tNum}`];
      if (!teamRes) return team;

      const captainUid = teamRes.captainUid || null;
      const members = teamRes.members;

      const updatedSeats = team.seats.map((seat: any) => {
        const sNum = seat.seatNumber;
        let member: any = null;
        if (Array.isArray(members)) {
          member = members[sNum];
        } else if (members && typeof members === 'object') {
          member = members[String(sNum)] || members[sNum];
        }

        if (member && (member.status === 'reserved' || member.status === 'RESERVED_CONFIRMED' || member.status === 'APPROVED')) {
          return {
            ...seat,
            status: 'APPROVED',
            playerName: member.playerName || (sNum === 1 ? 'Player 1' : `Player ${sNum}`),
            playerUid: member.uid || member.playerUid
          };
        }
        return seat;
      });

      return {
        ...team,
        captainUid,
        seats: updatedSeats
      };
    });

    const isRoomUnlocked = status === 'ROOM_OPEN';
    const tournament = {
      id: firebaseSettings?.id || 'PUBG001',
      title: firebaseSettings?.title || 'PUBG Mobile 100-Player Squad Championship',
      gameType: 'PUBG',
      mapName: 'Erangel',
      matchType: 'Squad TPP (25 Teams)',
      serverRegion: 'Asia / Pakistan',
      totalTeams: 25,
      seatsPerTeam: 4,
      entryFeeSolo: 150,
      entryFeeDuo: 300,
      entryFeeSquad: 600,
      prizePoolTotal: 15000,
      roomOpenTime,
      matchStartTime,
      matchEndTime,
      roomId: isRoomUnlocked ? roomId : undefined,
      roomPassword: isRoomUnlocked ? roomPassword : undefined,
      matchDate,
      matchTime,
      youtubeUrl,
      manualStatus,
      timezone: 'Asia/Karachi',
      status,
      teams,
      serverTime: Date.now()
    };

    return new Response(JSON.stringify({
      tournament,
      paymentAccounts: defaultPaymentAccounts,
      SeatReservations: {
        PUBG001: reservationsData || {}
      }
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
