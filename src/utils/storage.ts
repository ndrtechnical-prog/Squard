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
