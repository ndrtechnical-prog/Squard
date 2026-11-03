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

export const MATCH_IMAGES = {
  ERANGEL: 'https://pub-f2dfd2610ba84b708d63b5ff463d0490.r2.dev/Images/file_00000000afa4820a999d77e1bf565969.png',
  LIVIK: 'https://pub-f2dfd2610ba84b708d63b5ff463d0490.r2.dev/Images/file_0000000076e081f78464dd659a240b41.png',
  TDM: 'https://pub-f2dfd2610ba84b708d63b5ff463d0490.r2.dev/Images/file_00000000560881f4be40c9c8b3189a56.png',
  FREE_FIRE: 'https://pub-f2dfd2610ba84b708d63b5ff463d0490.r2.dev/images%20(6).jpeg'
};

// Generate 25 Teams (100 seats) for Erangel Squad
export const createErangelTeams = (): Team[] => {
  const teams: Team[] = [];
  for (let t = 1; t <= 25; t++) {
    const seats: Seat[] = [];
    for (let s = 1; s <= 4; s++) {
      seats.push({
        id: `erangel-t${t}-s${s}`,
        tournamentId: 'PUBG_ERANGEL',
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
      tournamentId: 'PUBG_ERANGEL',
      teamNumber: t,
      name: `Team ${t}`,
      captainUid: null,
      seats
    });
  }
  return teams;
};

// Backward compatibility alias
export const createInitial25Teams = createErangelTeams;

// Generate 30 Teams (60 seats) for Livik Duo
export const createLivikTeams = (): Team[] => {
  const teams: Team[] = [];
  for (let t = 1; t <= 30; t++) {
    const seats: Seat[] = [];
    for (let s = 1; s <= 2; s++) {
      seats.push({
        id: `livik-t${t}-s${s}`,
        tournamentId: 'PUBG_LIVIK',
        teamId: `duo-${t}`,
        teamNumber: t,
        seatNumber: s,
        status: 'AVAILABLE',
        role: s === 1 ? 'captain' : 'member',
        isCaptain: s === 1
      });
    }
    teams.push({
      id: `duo-${t}`,
      tournamentId: 'PUBG_LIVIK',
      teamNumber: t,
      name: `Duo ${t}`,
      captainUid: null,
      seats
    });
  }
  return teams;
};

// Generate 2 Squads (8 seats) for Team Deathmatch (4v4 Warehouse)
export const createTdmTeams = (): Team[] => {
  const tdmConfig = [
    { teamNumber: 1, name: 'Team 1 (Alpha Red Squad)' },
    { teamNumber: 2, name: 'Team 2 (Omega Blue Squad)' }
  ];

  return tdmConfig.map(({ teamNumber, name }) => {
    const seats: Seat[] = [];
    for (let s = 1; s <= 4; s++) {
      seats.push({
        id: `tdm-t${teamNumber}-s${s}`,
        tournamentId: 'PUBG_TDM',
        teamId: `tdm-team-${teamNumber}`,
        teamNumber,
        seatNumber: s,
        status: 'AVAILABLE',
        role: s === 1 ? 'captain' : 'member',
        isCaptain: s === 1
      });
    }
    return {
      id: `tdm-team-${teamNumber}`,
      tournamentId: 'PUBG_TDM',
      teamNumber,
      name,
      captainUid: null,
      seats
    };
  });
};

// Generate Free Fire Clash Squad Teams (12 teams, 48 seats)
export const createFreeFireTeams = (): Team[] => {
  const teams: Team[] = [];
  for (let t = 1; t <= 12; t++) {
    const seats: Seat[] = [];
    for (let s = 1; s <= 4; s++) {
      seats.push({
        id: `ff-t${t}-s${s}`,
        tournamentId: 'FF_CLASH_SQUAD',
        teamId: `ff-team-${t}`,
        teamNumber: t,
        seatNumber: s,
        status: 'AVAILABLE',
        role: s === 1 ? 'captain' : 'member',
        isCaptain: s === 1
      });
    }
    teams.push({
      id: `ff-team-${t}`,
      tournamentId: 'FF_CLASH_SQUAD',
      teamNumber: t,
      name: `Squad ${t}`,
      captainUid: null,
      seats
    });
  }
  return teams;
};

export const getTodayKarachiDate = (): string => {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', { 
      timeZone: 'Asia/Karachi', 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    });
    return formatter.format(new Date());
  } catch {
    const d = new Date(Date.now() + 5 * 3600 * 1000);
    return d.toISOString().split('T')[0];
  }
};

export const formatMatchDisplayDateTime = (dateStr?: string, timeStr?: string): string => {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split(/[-/]/);
    if (parts.length === 3) {
      let year = parts[0];
      let monthIdx = parseInt(parts[1], 10) - 1;
      let day = parseInt(parts[2], 10);

      // Handle DD-MM-YYYY or DD/MM/YYYY
      if (parts[0].length <= 2 && parts[2].length === 4) {
        day = parseInt(parts[0], 10);
        monthIdx = parseInt(parts[1], 10) - 1;
        year = parts[2];
      }

      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      const monthName = monthNames[monthIdx] || parts[1];

      let formattedTime = (timeStr || '11:00').trim();
      const timeMatch = formattedTime.match(/^(\d{1,2}):(\d{2})/);
      if (timeMatch) {
        let h = parseInt(timeMatch[1], 10);
        const m = timeMatch[2];
        const ampm = h >= 12 ? 'pm' : 'am';
        h = h % 12 || 12;
        formattedTime = `${h}:${m} ${ampm}`;
      }
      return `${day}-${monthName}-${year} ${formattedTime}`;
    }
  } catch {}
  return `${dateStr} ${timeStr || ''}`.trim();
};

export const getInitialErangelTournament = (): Tournament => {
  const now = Date.now();
  const roomOpenTime = now + (3 * 3600 + 42 * 60 + 17) * 1000;
  const matchStartTime = roomOpenTime + 15 * 60 * 1000;
  const matchEndTime = matchStartTime + 60 * 60 * 1000;

  return {
    id: 'PUBG_ERANGEL',
    title: 'PUBG Mobile 100-Player Squad Championship',
    gameType: 'PUBG',
    mapName: 'Erangel',
    matchType: 'Squad TPP (25 Teams • 100 Slots)',
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
    matchDate: getTodayKarachiDate(),
    matchTime: '11:00',
    youtubeUrl: 'https://youtube.com/@flaregunpk?si=NycZ9BwNyELH405i',
    manualStatus: 'AUTO',
    timezone: 'Asia/Karachi',
    status: 'REGISTRATION_OPEN',
    teams: createErangelTeams(),
    serverTime: Date.now()
  };
};

export const getInitialLivikTournament = (): Tournament => {
  const now = Date.now();
  const roomOpenTime = now + (4 * 3600) * 1000;
  const matchStartTime = roomOpenTime + 15 * 60 * 1000;
  const matchEndTime = matchStartTime + 60 * 60 * 1000;

  return {
    id: 'PUBG_LIVIK',
    title: 'PUBG Mobile Livik Duo Battle Arena',
    gameType: 'PUBG',
    mapName: 'Livik',
    matchType: 'Duo TPP (30 Duos • 60 Slots)',
    serverRegion: 'Asia / Pakistan',
    totalTeams: 30,
    seatsPerTeam: 2,
    entryFeeSolo: 150,
    entryFeeDuo: 300,
    entryFeeSquad: 300,
    prizePoolTotal: 9000,
    roomOpenTime,
    matchStartTime,
    matchEndTime,
    roomId: '78210943',
    roomPassword: '5678',
    matchDate: getTodayKarachiDate(),
    matchTime: '12:00',
    youtubeUrl: 'https://youtube.com/@flaregunpk?si=NycZ9BwNyELH405i',
    manualStatus: 'AUTO',
    timezone: 'Asia/Karachi',
    status: 'REGISTRATION_OPEN',
    teams: createLivikTeams(),
    serverTime: Date.now()
  };
};

export const getInitialTdmTournament = (): Tournament => {
  const now = Date.now();
  const roomOpenTime = now + (5 * 3600) * 1000;
  const matchStartTime = roomOpenTime + 15 * 60 * 1000;
  const matchEndTime = matchStartTime + 60 * 60 * 1000;

  return {
    id: 'PUBG_TDM',
    title: 'PUBG Mobile 4v4 Team Deathmatch (TDM)',
    gameType: 'PUBG',
    mapName: 'Warehouse / TDM',
    matchType: '4v4 Team Deathmatch (2 Squads • 8 Slots)',
    serverRegion: 'Asia / Pakistan',
    totalTeams: 2,
    seatsPerTeam: 4,
    entryFeeSolo: 150,
    entryFeeDuo: 300,
    entryFeeSquad: 600,
    prizePoolTotal: 2200,
    roomOpenTime,
    matchStartTime,
    matchEndTime,
    roomId: '89102431',
    roomPassword: '9999',
    matchDate: getTodayKarachiDate(),
    matchTime: '01:00',
    youtubeUrl: 'https://youtube.com/@flaregunpk?si=NycZ9BwNyELH405i',
    manualStatus: 'AUTO',
    timezone: 'Asia/Karachi',
    status: 'REGISTRATION_OPEN',
    teams: createTdmTeams(),
    serverTime: Date.now()
  };
};

export const getInitialFreeFireTournament = (): Tournament => {
  const now = Date.now();
  const roomOpenTime = now + (3 * 3600 + 42 * 60 + 17) * 1000;
  const matchStartTime = roomOpenTime + 15 * 60 * 1000;
  const matchEndTime = matchStartTime + 60 * 60 * 1000;

  return {
    id: 'FF_CLASH_SQUAD',
    title: 'Free Fire Clash Squad Championship',
    gameType: 'FREE_FIRE',
    mapName: 'Bermuda',
    matchType: 'Clash Squad (12 Teams • 48 Slots)',
    serverRegion: 'Asia / Pakistan',
    totalTeams: 12,
    seatsPerTeam: 4,
    entryFeeSolo: 150,
    entryFeeDuo: 300,
    entryFeeSquad: 600,
    prizePoolTotal: 7200,
    roomOpenTime,
    matchStartTime,
    matchEndTime,
    roomId: '55610294',
    roomPassword: '7777',
    matchDate: getTodayKarachiDate(),
    matchTime: '11:00',
    youtubeUrl: 'https://youtube.com/@flaregunpk?si=NycZ9BwNyELH405i',
    manualStatus: 'AUTO',
    timezone: 'Asia/Karachi',
    status: 'REGISTRATION_OPEN',
    teams: createFreeFireTeams(),
    serverTime: Date.now()
  };
};

export const getInitialTournament = getInitialErangelTournament;

export const loadStoredTournament = (): Tournament => {
  try {
    const raw = localStorage.getItem('pubg_tournament_erangel_v1') || localStorage.getItem(STORAGE_KEY_TOURNAMENT);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.teams && parsed.teams.length >= 25) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to parse cached tournament:', e);
  }

  const initial = getInitialErangelTournament();
  localStorage.setItem('pubg_tournament_erangel_v1', JSON.stringify(initial));
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
  let cleanDate = (dateStr || '').trim();
  let rawTime = (timeStr || '').trim();
  if (!cleanDate) cleanDate = getTodayKarachiDate();
  if (!rawTime) rawTime = '11:00';

  const ampmMatch = rawTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (ampmMatch) {
    let hours = parseInt(ampmMatch[1], 10);
    const mins = ampmMatch[2];
    const modifier = (ampmMatch[3] || '').toUpperCase();
    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
    rawTime = `${String(hours).padStart(2, '0')}:${mins}`;
  }

  const cleanTime = rawTime.length >= 5 ? rawTime.slice(0, 5) : `${rawTime}:00`.slice(0, 5);
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
  const today = getTodayKarachiDate();
  const rawDate = firebaseSettings?.matchDate || base?.matchDate;
  const matchDate = (rawDate && rawDate >= today) ? rawDate : today;
  const matchTime = firebaseSettings?.matchTime || base?.matchTime || '11:00';
  const roomId = firebaseSettings?.roomId || base?.roomId || '69151604';
  const roomPassword = firebaseSettings?.roomPassword || base?.roomPassword || '1234';
  const youtubeUrl = firebaseSettings?.youtubeUrl || base?.youtubeUrl;
  const manualStatus = firebaseSettings?.manualStatus || base?.manualStatus || 'AUTO';

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

  // Preserve tournament's specific teams structure (30 Duos for Livik, 12 Squads for Free Fire, 2 Squads for TDM, 25 Squads for Erangel)
  const baseTeams = (base?.teams && base.teams.length > 0) ? base.teams : createInitial25Teams();
  const teams: Team[] = baseTeams.map((team) => {
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
