import { Tournament, Team, Seat, PaymentAccount } from '../types/tournament';

const STORAGE_KEY_TOURNAMENT = 'pubg_arena_tournament_v2';
const STORAGE_KEY_BALANCE = 'pubg_user_diamonds_balance';

export const OFFICIAL_PAYMENT_INFO = {
  mobile: '03052838367',
  accountName: 'muhammad Nadir',
  methods: ['Easypaisa', 'Jazzcash'],
  ratePkrPerDiamond: 1, // 1 Diamond = 1 PKR
  whatsappNumber: '923052838367'
};

// Generate 25 Teams with the pre-approved players specified by user
export const createInitial25Teams = (): Team[] => {
  const teams: Team[] = [];

  for (let t = 1; t <= 25; t++) {
    const seats: Seat[] = [];

    for (let s = 1; s <= 4; s++) {
      seats.push({
        id: `seat-t${t}-s${s}`,
        tournamentId: 'PUBG001',
        teamId: `team-${t}`,
        teamNumber: t,
        seatNumber: s,
        status: 'AVAILABLE',
        role: s === 1 ? 'captain' : 'member',
        isCaptain: s === 1,
        playerName: undefined,
        playerUid: undefined,
        avatarUrl: undefined
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
};

export const getInitialTournament = (): Tournament => {
  const now = Date.now();
  const roomOpenTime = now + (3 * 3600 + 42 * 60 + 17) * 1000;
  const matchStartTime = roomOpenTime + 15 * 60 * 1000;
  const matchEndTime = matchStartTime + 60 * 60 * 1000;

  return {
    id: 'PUBG001',
    title: 'PUBG Mobile 100-Player Squad Championship',
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
    roomId: '69151604',
    roomPassword: '1234',
    matchDate: '2026-10-27',
    matchTime: '11:00',
    youtubeUrl: 'https://youtube.com/@flaregunpk?si=NycZ9BwNyELH405i',
    manualStatus: 'AUTO',
    timezone: 'Asia/Karachi',
    status: 'REGISTRATION_OPEN',
    teams: createInitial25Teams(),
    serverTime: Date.now()
  };
};

export const loadStoredTournament = (): Tournament => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TOURNAMENT);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Ensure 25 teams exist
      if (parsed.teams && parsed.teams.length >= 25) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to parse cached tournament:', e);
  }

  const initial = getInitialTournament();
  saveStoredTournament(initial);
  return initial;
};

export const saveStoredTournament = (tournament: Tournament): void => {
  try {
    localStorage.setItem(STORAGE_KEY_TOURNAMENT, JSON.stringify(tournament));
  } catch (e) {
    console.warn('Failed to save tournament:', e);
  }
};

export const loadUserBalance = (): number => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BALANCE);
    if (raw !== null) {
      const val = parseInt(raw, 10);
      if (!isNaN(val)) return val;
    }
  } catch (e) {
    console.warn('Failed to read balance:', e);
  }
  return 0; // default 0 Diamonds
};

export const saveUserBalance = (amount: number): void => {
  try {
    localStorage.setItem(STORAGE_KEY_BALANCE, amount.toString());
  } catch (e) {
    console.warn('Failed to save balance:', e);
  }
};

export const defaultPaymentAccounts: PaymentAccount[] = [
  {
    methodKey: 'EASYPAISA',
    title: 'Easypaisa Mobile Account',
    accountName: OFFICIAL_PAYMENT_INFO.accountName,
    accountNumber: OFFICIAL_PAYMENT_INFO.mobile,
    instructions: 'Send exact PKR amount to Easypaisa number. Take screenshot and submit TRX ID.',
    isActive: true
  },
  {
    methodKey: 'JAZZCASH',
    title: 'JazzCash Mobile Account',
    accountName: OFFICIAL_PAYMENT_INFO.accountName,
    accountNumber: OFFICIAL_PAYMENT_INFO.mobile,
    instructions: 'Send exact PKR amount via JazzCash App or *786#. Take screenshot and submit TRX ID.',
    isActive: true
  }
];

// Helper to parse date/time into timestamp (Asia/Karachi UTC+5)
export function parseKarachiTimestamp(dateStr?: string, timeStr?: string): number {
  const cleanDate = (dateStr || '2026-10-30').trim();
  const rawTime = (timeStr || '11:00').trim();
  const cleanTime = rawTime.length === 5 ? rawTime : `${rawTime}:00`.slice(0, 5);
  const isoWithKarachiTz = `${cleanDate}T${cleanTime}:00+05:00`;
  const parsed = Date.parse(isoWithKarachiTz);
  return isNaN(parsed) ? (Date.now() + 2 * 3600 * 1000) : parsed;
}

// Master Tournament Merger: Combines 25 teams with live Firebase RTDB settings & reservations
export function mergeTournamentWithFirebase(
  base: Tournament,
  firebaseSettings: any,
  reservationsData: any
): Tournament {
  const matchDate = firebaseSettings?.matchDate || base.matchDate || '2026-10-30';
  const matchTime = firebaseSettings?.matchTime || base.matchTime || '11:00';
  const roomId = firebaseSettings?.roomId || base.roomId || '69151604';
  const roomPassword = firebaseSettings?.roomPassword || base.roomPassword || '1234';
  const youtubeUrl = firebaseSettings?.youtubeUrl || base.youtubeUrl;
  const manualStatus = firebaseSettings?.manualStatus || base.manualStatus || 'AUTO';

  const matchStartTime = parseKarachiTimestamp(matchDate, matchTime);
  const roomOpenTime = matchStartTime;
  const matchEndTime = matchStartTime + 60 * 60 * 1000;

  const current = Date.now();
  let status: any = 'REGISTRATION_OPEN';
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

  // Generate 25 clean teams and overlay live reservations
  const teams: Team[] = createInitial25Teams().map((team) => {
    const tNum = team.teamNumber;
    const teamRes = reservationsData?.[`TEAM${tNum}`] || reservationsData?.[`Team_${tNum}`];
    if (!teamRes) return team;

    const captainUid = teamRes.captainUid || null;
    const members = teamRes.members;

    const updatedSeats = team.seats.map((seat) => {
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
          status: 'APPROVED' as const,
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

  return {
    ...base,
    id: firebaseSettings?.id || base.id || 'PUBG001',
    title: firebaseSettings?.title || base.title,
    matchDate,
    matchTime,
    matchStartTime,
    roomOpenTime,
    matchEndTime,
    roomId,
    roomPassword,
    youtubeUrl,
    manualStatus,
    status,
    teams,
    serverTime: Date.now()
  };
}
