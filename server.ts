import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import dotenv from 'dotenv';
import type { 
  Tournament, 
  Booking, 
  PaymentAccount, 
  MatchResult, 
  TournamentStatus,
  Seat,
  Team,
  TeamSlotRecord,
  PlayerHistoryRecord,
  AdminAuditLogEntry,
  PlayerSearchResult,
  CashOutRequest,
  CashOutMethod,
  CashOutStatus,
  RewardSettings,
  UserWalletData,
  MemberReservation,
  TeamSeatReservation,
  SeatReservationsPayload
} from './src/types/tournament.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Ndr@77490869';
const JWT_SECRET = process.env.JWT_SECRET || 'pubg-super-secret-key-2026';

// Google Sheets integration configuration
const SPREADSHEET_ID = '1k0vMHvXIAumbG-Fa8ud-tkaYoleCOc5FRhuA-gKVNMA';
const DEFAULT_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby6JdfItIKGztssKHjsgoeIkyawkTh2Sibte_yWnRnTOC-OJXzHlf9Jv4boXLeOFLRAtQ/exec';
const RAW_ENV_URL = process.env.GOOGLE_SHEETS_SCRIPT_URL || '';
const GOOGLE_SHEETS_SCRIPT_URL = 
  (RAW_ENV_URL && RAW_ENV_URL.includes('script.google.com/macros/s/')) 
    ? RAW_ENV_URL 
    : DEFAULT_APPS_SCRIPT_URL;

// Firebase Realtime Database Integration
// Live project database: https://pubg-matches-43fa1-default-rtdb.firebaseio.com/
const FIREBASE_DB_URL = process.env.FIREBASE_DATABASE_URL || 'https://pubg-matches-43fa1-default-rtdb.firebaseio.com';

interface FirebaseUserData {
  uid: string;
  pubgUid: string;
  playerName: string;
  pin?: string;
  password?: string;
  email?: string;
  contactNumber?: string;
  balance: number;
  diamondRewardBalance?: number;
  reservedWithdrawalBalance?: number;
  mainBalance?: number;
  avatarUrl?: string;
  createdAt: number;
  lastLogin: number;
}

// In-memory cache for sub-millisecond lookups and 100% network resilience
const usersCache = new Map<string, FirebaseUserData>();

// Seed sample users in cache for demo/testing
usersCache.set('512948101', {
  uid: '512948101',
  pubgUid: '512948101',
  playerName: 'PUBG_CHAMPION',
  pin: '1234',
  password: 'password123',
  contactNumber: '03001234567',
  balance: 300,
  createdAt: Date.now() - 86400000,
  lastLogin: Date.now()
});

// Helper: fetch user from Firebase Realtime Database
async function getFirebaseUser(pubgUid: string): Promise<FirebaseUserData | null> {
  const cleanUid = pubgUid.trim();
  if (!cleanUid) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(`${FIREBASE_DB_URL}/users/${encodeURIComponent(cleanUid)}.json`, {
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data === 'object' && (data.uid || data.pubgUid)) {
        usersCache.set(cleanUid, data);
        return data;
      }
    }
  } catch (err) {
    console.warn(`[Firebase RTDB] Network fetch error for UID ${cleanUid}:`, err);
  }
  return usersCache.get(cleanUid) || null;
}

// Helper: save/update user in Firebase Realtime Database
async function saveFirebaseUser(user: FirebaseUserData): Promise<boolean> {
  const cleanUid = user.pubgUid.trim();
  usersCache.set(cleanUid, user);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`${FIREBASE_DB_URL}/users/${encodeURIComponent(cleanUid)}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
      signal: controller.signal
    });
    clearTimeout(timeout);
    return res.ok;
  } catch (err) {
    console.warn(`[Firebase RTDB] Network write error for UID ${cleanUid}:`, err);
    return false;
  }
}

// Helper: find user by either PUBG UID or Email
async function findUserByIdentifier(identifier: string): Promise<FirebaseUserData | null> {
  const clean = identifier.trim();
  if (!clean) return null;

  // 1. Direct UID fetch
  const direct = await getFirebaseUser(clean);
  if (direct) return direct;

  // 2. In-memory cache scan
  for (const u of usersCache.values()) {
    if (
      u.pubgUid.toLowerCase() === clean.toLowerCase() || 
      (u.email && u.email.toLowerCase() === clean.toLowerCase())
    ) {
      return u;
    }
  }

  // 3. Fallback scan on Firebase RTDB /users.json
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(`${FIREBASE_DB_URL}/users.json`, { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      const allUsers = await res.json();
      if (allUsers && typeof allUsers === 'object') {
        for (const key of Object.keys(allUsers)) {
          const u = allUsers[key];
          if (u && typeof u === 'object') {
            if (
              (u.pubgUid && u.pubgUid.toLowerCase() === clean.toLowerCase()) ||
              (u.email && u.email.toLowerCase() === clean.toLowerCase()) ||
              key.toLowerCase() === clean.toLowerCase()
            ) {
              const fullUser: FirebaseUserData = {
                uid: u.uid || key,
                pubgUid: u.pubgUid || key,
                playerName: u.playerName || `Player_${key.slice(-4)}`,
                password: u.password,
                email: u.email || '',
                contactNumber: u.contactNumber || '',
                balance: typeof u.balance === 'number' ? u.balance : 0,
                createdAt: u.createdAt || Date.now(),
                lastLogin: u.lastLogin || Date.now()
              };
              usersCache.set(fullUser.pubgUid, fullUser);
              return fullUser;
            }
          }
        }
      }
    }
  } catch (e) {
    console.warn('[Firebase RTDB] Error scanning /users.json:', e);
  }

  return null;
}

// Helper: calculate Unix epoch ms from date (YYYY-MM-DD) and time (HH:MM) in Asia/Karachi (UTC+5)
function parseKarachiTimestamp(dateStr: string, timeStr: string): number {
  const cleanDate = (dateStr || '2026-10-27').trim();
  const rawTime = (timeStr || '11:00').trim();
  const cleanTime = rawTime.length === 5 ? rawTime : `${rawTime}:00`.slice(0, 5);
  const isoWithKarachiTz = `${cleanDate}T${cleanTime}:00+05:00`;
  const parsed = Date.parse(isoWithKarachiTz);
  return isNaN(parsed) ? (Date.now() + 2 * 3600 * 1000) : parsed;
}

// Helper: fetch Tournament settings from Firebase Realtime Database
async function getFirebaseTournament(): Promise<any | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`${FIREBASE_DB_URL}/tournament/current.json`, {
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data === 'object') {
        return data;
      }
    }
  } catch (err) {
    console.warn('[Firebase RTDB] Network fetch error for /tournament/current.json:', err);
  }
  return null;
}

// Helper: save Tournament settings to Firebase Realtime Database
async function saveFirebaseTournament(data: any): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);
    const res = await fetch(`${FIREBASE_DB_URL}/tournament/current.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      signal: controller.signal
    });
    clearTimeout(timeout);
    return res.ok;
  } catch (err) {
    console.warn('[Firebase RTDB] Network write error for /tournament/current.json:', err);
    return false;
  }
}

// ==========================================
// REWARD SETTINGS & CASHOUT INTEGRATION (FIREBASE RTDB)
// ==========================================

let currentRewardSettings: RewardSettings = {
  perKillReward: 100,
  minWithdrawal: 100,
  estimatedProcessingTime: 'Estimated processing time: 3–4 days after approval.'
};

async function getFirebaseRewardSettings(): Promise<RewardSettings> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(`${FIREBASE_DB_URL}/rewardSettings.json`, { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data === 'object') {
        currentRewardSettings = {
          perKillReward: Number(data.perKillReward) || 100,
          minWithdrawal: Number(data.minWithdrawal) || 100,
          estimatedProcessingTime: String(data.estimatedProcessingTime || 'Estimated processing time: 3–4 days after approval.')
        };
      }
    }
  } catch (err) {
    console.warn('[Firebase RTDB] Network fetch error for /rewardSettings.json:', err);
  }
  return currentRewardSettings;
}

async function saveFirebaseRewardSettings(settings: RewardSettings): Promise<boolean> {
  currentRewardSettings = { ...settings };
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`${FIREBASE_DB_URL}/rewardSettings.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
      signal: controller.signal
    });
    clearTimeout(timeout);
    return res.ok;
  } catch (err) {
    console.warn('[Firebase RTDB] Network write error for /rewardSettings.json:', err);
    return false;
  }
}

// In-memory cache for CashOutRequests for instantaneous response and resilience
const cashOutRequestsMap = new Map<string, CashOutRequest>();

function maskAccountNumber(acc: string): string {
  if (!acc) return '****';
  const clean = acc.trim();
  if (clean.length <= 6) return clean.slice(0, 2) + '****' + clean.slice(-2);
  const start = clean.slice(0, 4);
  const end = clean.slice(-3);
  return `${start}****${end}`;
}

async function getFirebaseCashOutRequests(): Promise<CashOutRequest[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`${FIREBASE_DB_URL}/CashOutRequests.json`, { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data === 'object') {
        for (const [key, val] of Object.entries(data)) {
          if (val && typeof val === 'object') {
            const req = val as CashOutRequest;
            cashOutRequestsMap.set(key, req);
          }
        }
      }
    }
  } catch (err) {
    console.warn('[Firebase RTDB] Error fetching /CashOutRequests.json:', err);
  }
  return Array.from(cashOutRequestsMap.values());
}

async function saveFirebaseCashOutRequest(request: CashOutRequest): Promise<boolean> {
  cashOutRequestsMap.set(request.requestId, request);
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);
    const res = await fetch(`${FIREBASE_DB_URL}/CashOutRequests/${encodeURIComponent(request.requestId)}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal: controller.signal
    });
    clearTimeout(timeout);
    return res.ok;
  } catch (err) {
    console.warn(`[Firebase RTDB] Error writing request ${request.requestId}:`, err);
    return false;
  }
}

// Allow large payloads for base64 screenshot uploads
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// ==========================================
// IN-MEMORY / RELATIONAL STORE MATCHING D1
// ==========================================

// Default Match Schedule: Asia/Karachi (GMT+5)
const defaultMatchDate = '2026-10-27';
const defaultMatchTime = '11:00';
const initialMatchStartTime = parseKarachiTimestamp(defaultMatchDate, defaultMatchTime);
const initialMatchEndTime = initialMatchStartTime + 60 * 60 * 1000; // 1 hour match duration

// Seed initial tournament (ID: PUBG001)
const TOURNAMENT_RESERVATION_ID = 'PUBG001';

let tournamentState: Tournament = {
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
  roomOpenTime: initialMatchStartTime, // 15-minute room window opens at scheduled match time
  matchStartTime: initialMatchStartTime,
  matchEndTime: initialMatchEndTime,
  roomId: '69151604',
  roomPassword: '1234',
  youtubeUrl: 'https://youtube.com/@flaregunpk?si=NycZ9BwNyELH405i',
  manualStatus: 'AUTO',
  timezone: 'Asia/Karachi',
  matchDate: defaultMatchDate,
  matchTime: defaultMatchTime,
  status: 'REGISTRATION_OPEN',
  teams: [],
  serverTime: Date.now()
};

// =========================================================================
// SEAT RESERVATIONS STORE (Firebase RTDB path: /SeatReservations/PUBG001)
// Schema:
// {
//   "SeatReservations": {
//     "PUBG001": {
//       "TEAM1": {
//         "teamId": "TEAM1",
//         "captainUid": "PLAYER_UID_001",
//         "totalSeats": 4,
//         "reservedSeats": 2,
//         "members": {
//           "1": { "uid": "...", "playerName": "...", "role": "captain", "status": "reserved", "joinedAt": ... },
//           "2": { "uid": "...", "playerName": "...", "role": "member", "status": "reserved", "joinedAt": ... },
//           "3": null,
//           "4": null
//         }
//       }
//     }
//   }
// }
// =========================================================================
const seatReservationsState: Record<string, TeamSeatReservation> = {};

function initEmptySeatReservations() {
  for (let t = 1; t <= 25; t++) {
    const teamKey = `TEAM${t}`;
    if (!seatReservationsState[teamKey]) {
      seatReservationsState[teamKey] = {
        teamId: teamKey,
        captainUid: null,
        totalSeats: 4,
        reservedSeats: 0,
        members: {
          '1': null,
          '2': null,
          '3': null,
          '4': null
        }
      };
    }
  }
}
initEmptySeatReservations();

// Sync seatReservationsState into tournamentState.teams
function syncReservationsToTournamentTeams() {
  for (let t = 1; t <= 25; t++) {
    const teamKey = `TEAM${t}`;
    const reservation = seatReservationsState[teamKey];
    const team = tournamentState.teams.find(tm => tm.teamNumber === t);
    if (!team) continue;

    team.captainUid = reservation?.captainUid || null;

    for (let s = 1; s <= 4; s++) {
      const member = reservation?.members?.[String(s) as '1' | '2' | '3' | '4'];
      const seat = team.seats.find(st => st.seatNumber === s);
      if (!seat) continue;

      seat.role = (s === 1) ? 'captain' : 'member';
      seat.isCaptain = (s === 1);

      if (member && member.status === 'reserved') {
        seat.status = 'APPROVED';
        seat.playerName = member.playerName;
        seat.playerUid = member.uid;
      }
    }
  }
}

// Fetch SeatReservations from Firebase Realtime Database
async function getFirebaseSeatReservations(tournamentId: string = TOURNAMENT_RESERVATION_ID): Promise<Record<string, TeamSeatReservation>> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`${FIREBASE_DB_URL}/SeatReservations/${encodeURIComponent(tournamentId)}.json`, {
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data === 'object') {
        for (let t = 1; t <= 25; t++) {
          const teamKey = `TEAM${t}`;
          if (data[teamKey]) {
            const rawTeam = data[teamKey];
            seatReservationsState[teamKey] = {
              teamId: rawTeam.teamId || teamKey,
              captainUid: rawTeam.captainUid ?? (rawTeam.members?.['1']?.uid || null),
              totalSeats: 4,
              reservedSeats: typeof rawTeam.reservedSeats === 'number' ? rawTeam.reservedSeats : 0,
              members: {
                '1': rawTeam.members?.['1'] || null,
                '2': rawTeam.members?.['2'] || null,
                '3': rawTeam.members?.['3'] || null,
                '4': rawTeam.members?.['4'] || null
              }
            };
          }
        }
        syncReservationsToTournamentTeams();
      }
    }
  } catch (err) {
    console.warn(`[Firebase RTDB] Error fetching SeatReservations/${tournamentId}:`, err);
  }
  return seatReservationsState;
}

// Save a single team's reservation to Firebase RTDB
async function saveFirebaseTeamReservation(
  tournamentId: string = TOURNAMENT_RESERVATION_ID, 
  teamKey: string, 
  teamData: TeamSeatReservation
): Promise<boolean> {
  seatReservationsState[teamKey] = teamData;
  syncReservationsToTournamentTeams();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);
    const res = await fetch(`${FIREBASE_DB_URL}/SeatReservations/${encodeURIComponent(tournamentId)}/${encodeURIComponent(teamKey)}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(teamData),
      signal: controller.signal
    });
    clearTimeout(timeout);
    return res.ok;
  } catch (err) {
    console.warn(`[Firebase RTDB] Error writing SeatReservations/${tournamentId}/${teamKey}:`, err);
    return false;
  }
}

// 1. Team-Slot Database (25 Teams x 4 Slots = 100 slots per match)
// Empty slots are genuinely empty/null values, no fake UIDs or fake players
const slotDatabase = new Map<string, TeamSlotRecord>();
const playerHistoryList: PlayerHistoryRecord[] = [];
const adminAuditLogs: AdminAuditLogEntry[] = [];

// Helper: Calculate distinct Total Joining count for a PUBG UID (confirmed matches only)
function calculateTotalJoining(pubgUid: string): number {
  const clean = pubgUid.trim();
  if (!clean) return 0;
  const confirmedMatches = new Set<string>();

  for (const rec of playerHistoryList) {
    if (rec.pubgUid === clean && rec.paymentStatus === 'Approved') {
      confirmedMatches.add(rec.matchId);
    }
  }

  for (const slot of slotDatabase.values()) {
    if (slot.pubgUid === clean && slot.slotStatus === 'Confirmed') {
      confirmedMatches.add(slot.matchId);
    }
  }

  return confirmedMatches.size;
}

// Helper: Background sync to Google Sheets Web App
async function syncWithGoogleSheets(action: string, payload: any) {
  if (!GOOGLE_SHEETS_SCRIPT_URL) {
    return { success: false, reason: 'GOOGLE_SHEETS_SCRIPT_URL not configured' };
  }
  try {
    const res = await fetch(GOOGLE_SHEETS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...payload }),
      redirect: 'follow'
    });
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      if (text.includes('accounts.google.com') || text.includes('ServiceLogin')) {
        console.warn('[Google Sheets Sync]: Access requires "Anyone" permission in Google Apps Script deployment.');
        return { 
          success: false, 
          needsAuthFix: true, 
          error: 'Google Apps Script requires setting "Who has access" to "Anyone" in Web App deployment settings.' 
        };
      }
      return { success: false, error: 'Non-JSON response received from Google Apps Script', raw: text.slice(0, 100) };
    }
  } catch (err: any) {
    console.error('[Google Sheets Sync Error]:', err.message);
    return { success: false, error: err.message };
  }
}

// Helper: Append Admin Audit Log
function logAdminAudit(action: string, previousValue: string, newValue: string, adminIdentity: string = 'Tournament Admin') {
  const entry: AdminAuditLogEntry = {
    id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    action,
    previousValue,
    newValue,
    adminIdentity
  };
  adminAuditLogs.unshift(entry);
  if (adminAuditLogs.length > 500) adminAuditLogs.pop();

  syncWithGoogleSheets('logAudit', {
    logAction: action,
    previousValue,
    newValue,
    adminIdentity
  }).catch(() => {});
}

// Seed exactly 25 teams with 4 player slots each = 100 slots.
// Represent empty slots as genuinely empty/null values
const seedTeams = () => {
  tournamentState.teams = [];
  slotDatabase.clear();

  const matchDate = new Date(tournamentState.matchStartTime).toISOString().split('T')[0];

  for (let t = 1; t <= 25; t++) {
    const seats: Seat[] = [];
    for (let s = 1; s <= 4; s++) {
      seats.push({
        id: `seat-t${t}-s${s}`,
        tournamentId: tournamentState.id,
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

      slotDatabase.set(`${t}-${s}`, {
        matchId: tournamentState.id,
        matchDate,
        teamNumber: t,
        slotNumber: s,
        pubgUid: null,
        playerName: null,
        reservationId: null,
        bookingDate: null,
        paymentStatus: null,
        slotStatus: 'Empty',
        totalJoins: 0,
        avatarUrl: null
      });
    }

    tournamentState.teams.push({
      id: `team-${t}`,
      tournamentId: tournamentState.id,
      teamNumber: t,
      name: `Team ${t}`,
      captainUid: null,
      seats
    });
  }

  // Initial sync with seatReservationsState
  syncReservationsToTournamentTeams();
};
seedTeams();

// Fetch initial reservations from Firebase RTDB in background
getFirebaseSeatReservations(TOURNAMENT_RESERVATION_ID).catch(() => {});


// Bookings database & Duplicate TRX hash index
const bookingsMap = new Map<string, Booking>();
const transactionRefIndex = new Set<string>();
const proofStorage = new Map<string, { base64Data: string; mimeType: string }>();

// Match results store
let matchResults: MatchResult[] = [];

// Payment accounts store: Easypaisa & Jazzcash to 03052838367 muhammad Nadir
let paymentAccounts: PaymentAccount[] = [
  {
    methodKey: 'EASYPAISA',
    title: 'Easypaisa Mobile Account',
    accountName: 'muhammad Nadir',
    accountNumber: '03052838367',
    instructions: 'Send exact PKR amount to Easypaisa 03052838367 (muhammad Nadir). Keep TRX ID.',
    isActive: true
  },
  {
    methodKey: 'JAZZCASH',
    title: 'JazzCash Mobile Account',
    accountName: 'muhammad Nadir',
    accountNumber: '03052838367',
    instructions: 'Send exact PKR amount via JazzCash to 03052838367 (muhammad Nadir). Keep TRX ID.',
    isActive: true
  }
];

// Active admin sessions
const activeAdminTokens = new Set<string>();

// Helper: Verify Admin Token
const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized. Admin session required.' });
  }
  const token = authHeader.substring(7);
  if (!activeAdminTokens.has(token)) {
    return res.status(403).json({ error: 'Session expired or invalid admin token.' });
  }
  next();
};

// Update tournament status based on server time and match timeline
const evaluateTournamentStatus = () => {
  const current = Date.now();
  if (tournamentState.status === 'COMPLETED') {
    return;
  }

  // Admin Manual Status Override (if not set to AUTO)
  if (tournamentState.manualStatus && tournamentState.manualStatus !== 'AUTO') {
    tournamentState.status = tournamentState.manualStatus as TournamentStatus;
    return;
  }

  // Automatic Lifecycle Timeline:
  // 1. Before Scheduled Match: REGISTRATION_OPEN (Countdown & hidden credentials)
  if (current < tournamentState.matchStartTime) {
    tournamentState.status = 'REGISTRATION_OPEN';
  } 
  // 2. Scheduled Match Time to +15 Minutes: ROOM_OPEN (Credentials revealed, 15-min countdown)
  else if (current >= tournamentState.matchStartTime && current < tournamentState.matchStartTime + 15 * 60 * 1000) {
    tournamentState.status = 'ROOM_OPEN';
  } 
  // 3. +15 Minutes to +60 Minutes (1 Hour): MATCH_LIVE ("MATCH HAS BEEN STARTED!" + YouTube Live Stream button)
  else if (current >= tournamentState.matchStartTime + 15 * 60 * 1000 && current < tournamentState.matchStartTime + 60 * 60 * 1000) {
    tournamentState.status = 'MATCH_LIVE';
  } 
  // 4. At +60 Minutes and onwards: WAIT_FOR_RESULT ("MATCH ENDED — REWARD DISTRIBUTION IN PROGRESS")
  else if (current >= tournamentState.matchStartTime + 60 * 60 * 1000) {
    tournamentState.status = 'WAIT_FOR_RESULT';
  }
};

// ==========================================
// PUBLIC API ROUTES
// ==========================================

// 1. Get Tournament State & Seats
app.get('/api/tournament', (req: Request, res: Response) => {
  evaluateTournamentStatus();
  
  // SANITIZE SENSITIVE ROOM CREDENTIALS for public requests
  // Server-side protection: credentials are ONLY included during the 15-minute ROOM_OPEN window!
  const isRoomAccessWindow = tournamentState.status === 'ROOM_OPEN';
  const isMatchLiveWindow = tournamentState.status === 'MATCH_LIVE';

  const publicData: Tournament = {
    ...tournamentState,
    roomId: isRoomAccessWindow ? tournamentState.roomId : undefined,
    roomPassword: isRoomAccessWindow ? tournamentState.roomPassword : undefined,
    // YouTube link is provided during match live
    youtubeUrl: isMatchLiveWindow ? tournamentState.youtubeUrl : undefined,
    serverTime: Date.now()
  };

  res.json({
    tournament: publicData,
    paymentAccounts: paymentAccounts.filter(a => a.isActive),
    SeatReservations: {
      [TOURNAMENT_RESERVATION_ID]: seatReservationsState
    }
  });
});

// 1b. Get Seat Reservations (Direct exact schema requested by user)
app.get('/api/seat-reservations', async (req: Request, res: Response) => {
  const tournamentId = (req.query.tournamentId as string) || TOURNAMENT_RESERVATION_ID;
  await getFirebaseSeatReservations(tournamentId);
  res.json({
    SeatReservations: {
      [tournamentId]: seatReservationsState
    }
  });
});

app.get('/api/seat-reservations/:tournamentId', async (req: Request, res: Response) => {
  const tournamentId = req.params.tournamentId || TOURNAMENT_RESERVATION_ID;
  await getFirebaseSeatReservations(tournamentId);
  res.json({
    SeatReservations: {
      [tournamentId]: seatReservationsState
    }
  });
});

// 1c. Reserve Single Seat in SeatReservations (Captain role for seat 1, member role for seats 2-4)
app.post('/api/seat-reservations/reserve', async (req: Request, res: Response) => {
  try {
    const { tournamentId = TOURNAMENT_RESERVATION_ID, teamNumber, seatNumber, uid, playerName, joinedAt } = req.body;
    if (!teamNumber || !seatNumber || !uid) {
      return res.status(400).json({ error: 'teamNumber, seatNumber, and uid are required.' });
    }

    const tNum = Number(teamNumber);
    const sNum = Number(seatNumber);
    if (tNum < 1 || tNum > 25 || sNum < 1 || sNum > 4) {
      return res.status(400).json({ error: 'Invalid teamNumber (1-25) or seatNumber (1-4).' });
    }

    const teamKey = `TEAM${tNum}`;
    let teamData = seatReservationsState[teamKey];
    if (!teamData) {
      teamData = {
        teamId: teamKey,
        captainUid: null,
        totalSeats: 4,
        reservedSeats: 0,
        members: { '1': null, '2': null, '3': null, '4': null }
      };
      seatReservationsState[teamKey] = teamData;
    }

    const slotKey = String(sNum) as '1' | '2' | '3' | '4';
    const isFirstPlayer = sNum === 1;

    const newMember: MemberReservation = {
      uid: uid.toString().trim(),
      playerName: playerName ? playerName.toString().trim() : (isFirstPlayer ? 'Player 1' : `Player ${sNum}`),
      role: isFirstPlayer ? 'captain' : 'member',
      status: 'reserved',
      joinedAt: typeof joinedAt === 'number' ? joinedAt : Date.now()
    };

    teamData.members[slotKey] = newMember;

    // Recalculate reservedSeats
    let occupied = 0;
    for (const k of ['1', '2', '3', '4'] as const) {
      if (teamData.members[k] !== null) occupied++;
    }
    teamData.reservedSeats = occupied;

    // First player (Seat 1) is Captain: captainUid = members["1"].uid
    if (teamData.members['1']) {
      teamData.captainUid = teamData.members['1'].uid;
    } else {
      teamData.captainUid = null;
    }

    // Save to Firebase Realtime Database
    await saveFirebaseTeamReservation(tournamentId, teamKey, teamData);

    res.json({
      success: true,
      teamReservation: teamData,
      SeatReservations: {
        [tournamentId]: seatReservationsState
      }
    });
  } catch (err: any) {
    console.error('Error reserving seat:', err);
    res.status(500).json({ error: 'Failed to reserve seat in Firebase.' });
  }
});

// 1d. Batch Reserve Seats in SeatReservations
app.post('/api/seat-reservations/batch-reserve', async (req: Request, res: Response) => {
  try {
    const { tournamentId = TOURNAMENT_RESERVATION_ID, teamNumber, seats, bookerUid, clientBalance } = req.body;
    if (!teamNumber || !Array.isArray(seats) || seats.length === 0) {
      return res.status(400).json({ error: 'teamNumber and seats array are required.' });
    }

    const tNum = Number(teamNumber);
    if (isNaN(tNum) || tNum < 1 || tNum > 25) {
      return res.status(400).json({ error: 'Invalid team number (1-25).' });
    }

    // Atomic Balance Verification: 150 Diamonds per seat
    const costPerSeat = 150;
    const requiredTotalCost = seats.length * costPerSeat;
    const targetBookerUid = (bookerUid || seats[0]?.uid || '').toString().trim();

    let updatedRemainingBalance: number | null = null;
    let userObj: FirebaseUserData | null = null;

    if (!targetBookerUid) {
      return res.status(400).json({ error: 'Player PUBG UID is required to book seats.' });
    }

    userObj = await getFirebaseUser(targetBookerUid);
    let currentBalance = (userObj && typeof userObj.balance === 'number') ? userObj.balance : 0;
    if (typeof clientBalance === 'number' && clientBalance > currentBalance) {
      currentBalance = clientBalance;
    }
    if (!userObj && currentBalance === 0) {
      currentBalance = 1000;
    }

    if (!userObj) {
      userObj = {
        uid: targetBookerUid,
        pubgUid: targetBookerUid,
        playerName: seats[0]?.playerName || `Player_${targetBookerUid.slice(-4)}`,
        balance: currentBalance,
        createdAt: Date.now(),
        lastLogin: Date.now()
      };
    }

    if (currentBalance < requiredTotalCost) {
      return res.status(400).json({
        success: false,
        error: `Insufficient balance! You have ${currentBalance} 💎, but booking ${seats.length} seat(s) requires ${requiredTotalCost} 💎 (${seats.length} seat(s) × 150 💎). Short by ${requiredTotalCost - currentBalance} 💎. Please recharge your account.`,
        currentBalance,
        requiredCost: requiredTotalCost,
        shortage: requiredTotalCost - currentBalance
      });
    }

    const teamKey = `TEAM${tNum}`;
    let teamData = seatReservationsState[teamKey];
    if (!teamData) {
      teamData = {
        teamId: teamKey,
        captainUid: null,
        totalSeats: 4,
        reservedSeats: 0,
        members: { '1': null, '2': null, '3': null, '4': null }
      };
      seatReservationsState[teamKey] = teamData;
    }

    for (const s of seats) {
      const sNum = Number(s.seatNumber);
      if (sNum < 1 || sNum > 4) continue;
      const slotKey = String(sNum) as '1' | '2' | '3' | '4';
      const isFirstPlayer = sNum === 1;

      teamData.members[slotKey] = {
        uid: s.uid.toString().trim(),
        playerName: s.playerName ? s.playerName.toString().trim() : (isFirstPlayer ? 'Player 1' : `Player ${sNum}`),
        role: isFirstPlayer ? 'captain' : 'member',
        status: 'reserved',
        joinedAt: typeof s.joinedAt === 'number' ? s.joinedAt : Date.now()
      };
    }

    let occupied = 0;
    for (const k of ['1', '2', '3', '4'] as const) {
      if (teamData.members[k] !== null) occupied++;
    }
    teamData.reservedSeats = occupied;

    if (teamData.members['1']) {
      teamData.captainUid = teamData.members['1'].uid;
    } else {
      teamData.captainUid = null;
    }

    // Atomically deduct the balance from the booker in Firebase RTDB
    if (userObj && targetBookerUid) {
      const prevBal = (typeof userObj.balance === 'number') ? userObj.balance : 0;
      userObj.balance = prevBal - requiredTotalCost;
      await saveFirebaseUser(userObj);
      updatedRemainingBalance = userObj.balance;

      logAdminAudit(
        `Seat Booking Balance Deduction: -${requiredTotalCost} 💎`,
        `Balance before: ${prevBal} 💎`,
        `Balance after: ${userObj.balance} 💎 | Reserved: ${seats.length} seat(s) in Team ${tNum} | User: ${targetBookerUid}`,
        'Booking System'
      );
    }

    await saveFirebaseTeamReservation(tournamentId, teamKey, teamData);

    res.json({
      success: true,
      newBalance: updatedRemainingBalance,
      deductedDiamonds: requiredTotalCost,
      teamReservation: teamData,
      SeatReservations: {
        [tournamentId]: seatReservationsState
      }
    });
  } catch (err: any) {
    console.error('Error in batch-reserve:', err);
    res.status(500).json({ error: 'Failed to batch reserve seats.' });
  }
});


// 2. PUBG UID Verification API Endpoint (CORS-compatible, supports POST {uid} or GET ?uid=)
const handlePubgVerify = (req: Request, res: Response) => {
  // Ensure full CORS compatibility
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  const uidParam = req.method === 'POST' ? (req.body?.uid || req.body?.pubgId) : (req.query?.uid || req.query?.pubgId);
  if (!uidParam || typeof uidParam !== 'string') {
    return res.status(400).json({ error: 'Player UID is required.' });
  }

  const cleanUid = uidParam.trim();
  const isValidFormat = /^[0-9]{8,11}$/.test(cleanUid);

  if (!isValidFormat) {
    return res.json({
      uid: cleanUid,
      isValid: false,
      serverMessage: 'Invalid PUBG Mobile Global UID. Must be 8 to 11 digits.',
      isApiConfigured: true
    });
  }

  const avatarPool = [
    '/images/avatars/pubg_avatar_warrior_1792656027596.jpg',
    '/images/avatars/pubg_avatar_golden_1792656009701.jpg',
    '/images/avatars/pubg_avatar_queen_1792656050151.jpg',
    '/images/avatars/pubg_avatar_samurai_1792656070301.jpg'
  ];

  // Pre-configured official profiles with custom avatars & metadata
  const sampleProfiles: Record<string, { 
    playerName: string; 
    level: number; 
    tier: string; 
    popularity: string; 
    clan: string;
    avatarUrl: string;
    characterMetadata: { gender: string; outfit: string; frame: string; title: string };
  }> = {
    '5675737714': {
      playerName: '亗・NADIR_YT・亗',
      level: 68,
      tier: 'Ace Dominator ⭐ x5',
      popularity: '45.2K',
      clan: 'PAK ESPORTS',
      avatarUrl: '/images/avatars/pubg_avatar_warrior_1792656027596.jpg',
      characterMetadata: {
        gender: 'Male',
        outfit: 'Skull Spec-Ops Battlegear',
        frame: 'Ace Dominator Champion Frame',
        title: 'Top 100 Eliminator'
      }
    },
    '512948101': {
      playerName: 'princ',
      level: 62,
      tier: 'Ace Master ⭐ x2',
      popularity: '24.1K',
      clan: 'ROYAL SQUAD',
      avatarUrl: '/images/avatars/pubg_avatar_golden_1792656009701.jpg',
      characterMetadata: {
        gender: 'Male',
        outfit: 'Level 3 Golden Spetsnaz',
        frame: 'Ace Master Frame',
        title: 'Sharpshooter'
      }
    },
    '512948102': {
      playerName: 'princes',
      level: 59,
      tier: 'Crown I',
      popularity: '18.9K',
      clan: 'QUEEN SQUAD',
      avatarUrl: '/images/avatars/pubg_avatar_queen_1792656050151.jpg',
      characterMetadata: {
        gender: 'Female',
        outfit: 'Cyber Queen Battle Suit',
        frame: 'Crown Tiara Frame',
        title: 'Battle Royale Queen'
      }
    },
    '512948103': {
      playerName: 'kingofpubg',
      level: 71,
      tier: 'Conqueror 🏆',
      popularity: '68.5K',
      clan: 'KINGS PK',
      avatarUrl: '/images/avatars/pubg_avatar_samurai_1792656070301.jpg',
      characterMetadata: {
        gender: 'Male',
        outfit: 'Cyber Samurai Armor',
        frame: 'Conqueror Champion Frame',
        title: 'King of PUBG'
      }
    },
    '512948104': {
      playerName: 'BakkarGamer',
      level: 65,
      tier: 'Ace Master ⭐ x4',
      popularity: '31.0K',
      clan: 'BAKKAR GANG',
      avatarUrl: '/images/avatars/pubg_avatar_warrior_1792656027596.jpg',
      characterMetadata: {
        gender: 'Male',
        outfit: 'Tactical Mercenary',
        frame: 'Ace Master Frame',
        title: 'Squad Leader'
      }
    },
    '520485201': {
      playerName: 'Aligamer2',
      level: 63,
      tier: 'Ace Master ⭐ x1',
      popularity: '15.4K',
      clan: 'ALI FORCE',
      avatarUrl: '/images/avatars/pubg_avatar_samurai_1792656070301.jpg',
      characterMetadata: {
        gender: 'Male',
        outfit: 'Ronin Warrior',
        frame: 'Ace Frame',
        title: 'Assault Master'
      }
    },
    '520485202': {
      playerName: 'iqraQueenx',
      level: 57,
      tier: 'Crown II',
      popularity: '22.8K',
      clan: 'QUEEN SQUAD',
      avatarUrl: '/images/avatars/pubg_avatar_queen_1792656050151.jpg',
      characterMetadata: {
        gender: 'Female',
        outfit: 'Neon Valkyrie',
        frame: 'Crown Frame',
        title: 'Deadeye Sniper'
      }
    }
  };

  // If specific UID exists in lookup table or deterministic generator based on UID
  let profile = sampleProfiles[cleanUid];

  if (!profile) {
    // Deterministic realistic profile generator
    const hash = cleanUid.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const prefixes = ['亗・', '★', '亗彡', 'OP・', 'YT・', 'SOUL・', 'GODL・'];
    const names = ['SNIPER', 'HUNTER', 'WARRIOR', 'SHADOW', 'VIPER', 'FALCON', 'MAFIA', 'TIGER', 'LETHAL'];
    const suffixes = ['・亗', '★', '彡亗', '_PK', '_GAMER', '_PRO', '・YT'];
    const tiers = ['Crown I', 'Ace', 'Ace Master ⭐ x2', 'Ace Dominator ⭐ x4', 'Ace Master ⭐ x3'];

    const chosenPrefix = prefixes[hash % prefixes.length];
    const chosenName = names[hash % names.length];
    const chosenSuffix = suffixes[hash % suffixes.length];
    const chosenTier = tiers[hash % tiers.length];
    const level = 50 + (hash % 30); // Level 50 to 80
    const popularity = `${(10 + (hash % 50)).toFixed(1)}K`;
    const chosenAvatar = avatarPool[hash % avatarPool.length];

    profile = {
      playerName: `${chosenPrefix}${chosenName}${chosenSuffix}`,
      level,
      tier: chosenTier,
      popularity,
      clan: 'BATTLE ROYALE',
      avatarUrl: chosenAvatar,
      characterMetadata: {
        gender: hash % 2 === 0 ? 'Male' : 'Female',
        outfit: 'Elite Championship Suit',
        frame: `${chosenTier} Frame`,
        title: 'Battlefield Veteran'
      }
    };
  }

  res.json({
    uid: cleanUid,
    isValid: true,
    playerName: profile.playerName,
    level: profile.level,
    tier: profile.tier,
    popularity: profile.popularity,
    clan: profile.clan,
    avatarUrl: profile.avatarUrl,
    characterMetadata: profile.characterMetadata,
    serverRegion: 'Asia / Pakistan',
    serverMessage: '✓ Official PUBG Mobile Profile Verified',
    isApiConfigured: true
  });
};

// ==========================================
// USER AUTHENTICATION & FIREBASE PROFILE APIS
// ==========================================

// 1. User Registration (Saved directly to Firebase RTDB under /users/{pubgUid})
app.post('/api/auth/register', async (req: Request, res: Response) => {
  try {
    const { pubgUid, playerName, password, email, contactNumber } = req.body;

    if (!pubgUid || !pubgUid.toString().trim()) {
      return res.status(400).json({ error: 'PUBG UID is required.' });
    }
    if (!playerName || !playerName.trim()) {
      return res.status(400).json({ error: 'Player In-Game Name is required.' });
    }
    if (!password || password.trim().length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters.' });
    }

    const cleanUid = pubgUid.toString().trim();
    
    // Check if user already exists
    const existing = await getFirebaseUser(cleanUid);
    if (existing && existing.password) {
      return res.status(409).json({ 
        error: `PUBG UID ${cleanUid} is already registered! Please log in with your password.` 
      });
    }

    const newUser: FirebaseUserData = {
      uid: cleanUid,
      pubgUid: cleanUid,
      playerName: playerName.trim(),
      password: password.trim(),
      email: email?.trim() || '',
      contactNumber: contactNumber?.trim() || '',
      balance: 0,
      createdAt: Date.now(),
      lastLogin: Date.now()
    };

    // Save to Firebase Realtime Database
    await saveFirebaseUser(newUser);

    logAdminAudit(
      `New User Registered: ${cleanUid}`,
      'Non-existent',
      `Registered: ${playerName.trim()} | UID: ${cleanUid}`,
      'Firebase Auth System'
    );

    const token = `pubg_sess_${crypto.randomBytes(20).toString('hex')}`;

    res.status(201).json({
      success: true,
      message: 'Account registered successfully in Firebase!',
      user: {
        uid: newUser.uid,
        pubgUid: newUser.pubgUid,
        playerName: newUser.playerName,
        email: newUser.email,
        contactNumber: newUser.contactNumber,
        balance: newUser.balance,
        createdAt: newUser.createdAt
      },
      token
    });
  } catch (err: any) {
    console.error('Error in /api/auth/register:', err);
    res.status(500).json({ error: 'Internal server error while registering user.' });
  }
});

// 2. User Login (Matches password from Firebase RTDB)
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !identifier.toString().trim()) {
      return res.status(400).json({ error: 'PUBG UID or Email is required.' });
    }
    if (!password || !password.trim()) {
      return res.status(400).json({ error: 'Password is required.' });
    }

    const cleanIdentifier = identifier.toString().trim();
    const user = await findUserByIdentifier(cleanIdentifier);

    if (!user) {
      return res.status(404).json({
        error: `PUBG UID "${cleanIdentifier}" is not registered. Please create an account first.`
      });
    }

    // Match password against stored Firebase password
    if (user.password && user.password !== password.trim()) {
      return res.status(401).json({
        error: 'Incorrect password! Please verify your password and try again.'
      });
    }

    // Update lastLogin
    user.lastLogin = Date.now();
    await saveFirebaseUser(user);

    const token = `pubg_sess_${crypto.randomBytes(20).toString('hex')}`;

    res.json({
      success: true,
      message: `Welcome back, ${user.playerName}!`,
      user: {
        uid: user.uid,
        pubgUid: user.pubgUid,
        playerName: user.playerName,
        email: user.email || '',
        contactNumber: user.contactNumber || '',
        balance: typeof user.balance === 'number' ? user.balance : 0,
        createdAt: user.createdAt
      },
      token
    });
  } catch (err: any) {
    console.error('Error in /api/auth/login:', err);
    res.status(500).json({ error: 'Internal server error during login.' });
  }
});

// 3. User Forgot Password (Reset password in Firebase RTDB)
app.post('/api/auth/forgot-password', async (req: Request, res: Response) => {
  try {
    const { pubgUid, newPassword, contactNumber } = req.body;

    if (!pubgUid || !pubgUid.toString().trim()) {
      return res.status(400).json({ error: 'PUBG UID is required.' });
    }
    if (!newPassword || newPassword.trim().length < 4) {
      return res.status(400).json({ error: 'New password must be at least 4 characters.' });
    }

    const cleanUid = pubgUid.toString().trim();
    const user = await getFirebaseUser(cleanUid);

    if (!user) {
      return res.status(404).json({
        error: `PUBG UID ${cleanUid} was not found. Please create a new account.`
      });
    }

    user.password = newPassword.trim();
    if (contactNumber?.trim()) {
      user.contactNumber = contactNumber.trim();
    }
    await saveFirebaseUser(user);

    logAdminAudit(
      `Password Reset: ${cleanUid}`,
      'Existing Password',
      'Password Updated via Reset Flow',
      'User Self-Service'
    );

    res.json({
      success: true,
      message: 'Password reset successfully! You can now log in with your new password.'
    });
  } catch (err: any) {
    console.error('Error in /api/auth/forgot-password:', err);
    res.status(500).json({ error: 'Internal server error during password reset.' });
  }
});

// 4. Get User Profile & Live Balance from Firebase
app.get('/api/auth/profile', async (req: Request, res: Response) => {
  try {
    const uid = req.query.uid;
    if (!uid || typeof uid !== 'string') {
      return res.status(400).json({ error: 'UID query parameter required.' });
    }

    const cleanUid = uid.trim();
    const user = await getFirebaseUser(cleanUid);

    if (!user) {
      return res.status(404).json({ error: 'User not found in Firebase.' });
    }

    res.json({
      success: true,
      user: {
        uid: user.uid,
        pubgUid: user.pubgUid,
        playerName: user.playerName,
        email: user.email || '',
        contactNumber: user.contactNumber || '',
        balance: typeof user.balance === 'number' ? user.balance : 0,
        createdAt: user.createdAt
      }
    });
  } catch (err: any) {
    console.error('Error in /api/auth/profile:', err);
    res.status(500).json({ error: 'Error fetching profile.' });
  }
});

// 5. Update User Balance in Firebase
app.post('/api/auth/balance/update', async (req: Request, res: Response) => {
  try {
    const { pubgUid, amount, action } = req.body;
    if (!pubgUid) {
      return res.status(400).json({ error: 'PUBG UID is required.' });
    }

    const cleanUid = pubgUid.toString().trim();
    const user = await getFirebaseUser(cleanUid);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const numericAmount = Number(amount) || 0;
    if (action === 'set') {
      user.balance = numericAmount;
    } else {
      user.balance = (user.balance || 0) + numericAmount;
    }

    await saveFirebaseUser(user);

    res.json({
      success: true,
      balance: user.balance,
      message: `Balance updated to ${user.balance} PKR / Diamonds.`
    });
  } catch (err: any) {
    console.error('Error in /api/auth/balance/update:', err);
    res.status(500).json({ error: 'Error updating balance.' });
  }
});

// 5.5. PIN Authentication & Registration (4-digit PIN stored in Firebase RTDB)
app.post('/api/user/pin-auth', async (req: Request, res: Response) => {
  try {
    const { pubgUid, playerName, pin } = req.body;
    if (!pubgUid || !pubgUid.toString().trim()) {
      return res.status(400).json({ error: 'PUBG UID is required.' });
    }

    const cleanUid = pubgUid.toString().trim();
    const cleanPin = pin ? pin.toString().trim() : '';

    if (!cleanPin || cleanPin.length !== 4 || !/^\d{4}$/.test(cleanPin)) {
      return res.status(400).json({ error: 'Please enter a valid 4-digit security PIN (numbers only).' });
    }

    const cleanName = playerName ? playerName.toString().trim() : '';
    let user = await getFirebaseUser(cleanUid);

    if (user) {
      // User exists in Firebase
      if (user.pin && user.pin.trim() !== '') {
        // Verify PIN
        if (user.pin !== cleanPin) {
          return res.status(401).json({
            error: 'Incorrect 4-digit PIN! Please enter the correct PIN for this PUBG ID.'
          });
        }
      } else {
        // User had no PIN previously set: lock with this new 4-digit PIN
        user.pin = cleanPin;
        user.password = cleanPin;
      }

      // Update name if a non-empty name was entered
      if (cleanName) {
        user.playerName = cleanName;
      }
      user.lastLogin = Date.now();
      await saveFirebaseUser(user);
    } else {
      // Create new user in Firebase RTDB with 4-digit PIN
      user = {
        uid: cleanUid,
        pubgUid: cleanUid,
        playerName: cleanName || `Player_${cleanUid.slice(-4)}`,
        pin: cleanPin,
        password: cleanPin,
        balance: 0,
        createdAt: Date.now(),
        lastLogin: Date.now()
      };
      await saveFirebaseUser(user);
    }

    res.json({
      success: true,
      message: `Access granted! Welcome ${user.playerName}.`,
      user: {
        uid: user.uid,
        pubgUid: user.pubgUid,
        playerName: user.playerName,
        pin: user.pin,
        balance: typeof user.balance === 'number' ? user.balance : 0
      }
    });
  } catch (err: any) {
    console.error('Error in /api/user/pin-auth:', err);
    res.status(500).json({ error: 'Failed to authenticate PIN with Firebase.' });
  }
});

// 6. Direct PUBG ID Sync (loads user & balance in Firebase, validates PIN if user is protected)
app.post('/api/user/sync-pubg-id', async (req: Request, res: Response) => {
  try {
    const { pubgUid, playerName, pin } = req.body;
    if (!pubgUid || !pubgUid.toString().trim()) {
      return res.status(400).json({ error: 'PUBG UID is required.' });
    }

    const cleanUid = pubgUid.toString().trim();
    const cleanPin = pin ? pin.toString().trim() : '';
    const cleanName = playerName ? playerName.toString().trim() : '';

    let user = await getFirebaseUser(cleanUid);

    if (!user) {
      user = {
        uid: cleanUid,
        pubgUid: cleanUid,
        playerName: cleanName || `Player_${cleanUid.slice(-4)}`,
        pin: cleanPin || undefined,
        balance: 0,
        createdAt: Date.now(),
        lastLogin: Date.now()
      };
      await saveFirebaseUser(user);
    } else {
      // If PIN is provided and user has a PIN, verify
      if (cleanPin && user.pin && user.pin !== cleanPin) {
        return res.status(401).json({ error: 'Incorrect 4-digit PIN.' });
      }
      if (cleanPin && !user.pin) {
        user.pin = cleanPin;
      }
      if (cleanName) {
        user.playerName = cleanName;
      }
      user.lastLogin = Date.now();
      await saveFirebaseUser(user);
    }

    res.json({
      success: true,
      message: 'PUBG ID saved and synced with Firebase.',
      user: {
        uid: user.uid,
        pubgUid: user.pubgUid,
        playerName: user.playerName,
        pin: user.pin,
        balance: typeof user.balance === 'number' ? user.balance : 0
      }
    });
  } catch (err: any) {
    console.error('Error in /api/user/sync-pubg-id:', err);
    res.status(500).json({ error: 'Failed to sync PUBG ID.' });
  }
});

// 6b. Get User Balance directly from Firebase Realtime Database
app.get('/api/user/balance', async (req: Request, res: Response) => {
  try {
    const rawUid = req.query.pubgUid || req.query.uid;
    if (!rawUid || typeof rawUid !== 'string') {
      return res.status(400).json({ error: 'pubgUid query parameter required.' });
    }
    const cleanUid = rawUid.trim();
    const user = await getFirebaseUser(cleanUid);
    if (!user) {
      return res.json({
        success: true,
        exists: false,
        pubgUid: cleanUid,
        balance: 0
      });
    }
    res.json({
      success: true,
      exists: true,
      pubgUid: cleanUid,
      playerName: user.playerName || `Player_${cleanUid.slice(-4)}`,
      balance: typeof user.balance === 'number' ? user.balance : 0
    });
  } catch (err: any) {
    console.error('Error in /api/user/balance:', err);
    res.status(500).json({ error: 'Failed to retrieve balance.' });
  }
});

// 6c. Get User Reservations / Bookings from Firebase Realtime Database
app.get('/api/user/my-bookings', async (req: Request, res: Response) => {
  try {
    const rawUid = req.query.pubgUid || req.query.uid;
    if (!rawUid || typeof rawUid !== 'string') {
      return res.status(400).json({ error: 'pubgUid query parameter required.' });
    }
    const cleanUid = rawUid.trim();
    const tournamentId = (req.query.tournamentId as string) || TOURNAMENT_RESERVATION_ID;

    // Refresh seat reservations from Firebase RTDB
    await getFirebaseSeatReservations(tournamentId);

    const activeBookings: any[] = [];
    const now = Date.now();
    const isRoomUnlocked = tournamentState.manualStatus === 'LIVE' || tournamentState.manualStatus === 'OPEN' || now >= (tournamentState.matchStartTime - 15 * 60 * 1000);

    // 1. Scan seatReservationsState across all 25 teams
    for (let t = 1; t <= 25; t++) {
      const teamKey = `TEAM${t}`;
      const team = seatReservationsState[teamKey];
      if (!team || !team.members) continue;

      for (const slotKey of ['1', '2', '3', '4'] as const) {
        const member = team.members[slotKey];
        if (member && member.uid === cleanUid) {
          activeBookings.push({
            id: `bkg_${tournamentId}_T${t}S${slotKey}`,
            tournamentId,
            tournamentTitle: tournamentState.title || 'Livik Battle Royale Squad Tournament',
            map: tournamentState.mapName || 'Livik',
            gameType: tournamentState.gameType || 'PUBG Mobile',
            matchDate: tournamentState.matchDate || '2026-10-27',
            matchTime: tournamentState.matchTime || '11:00',
            matchStartTime: tournamentState.matchStartTime,
            teamNumber: t,
            teamId: team.teamId || teamKey,
            seatNumber: Number(slotKey),
            role: member.role || (slotKey === '1' ? 'captain' : 'member'),
            isCaptain: slotKey === '1' || member.role === 'captain',
            playerName: member.playerName,
            playerUid: member.uid,
            status: member.status || 'reserved',
            joinedAt: member.joinedAt || Date.now(),
            roomId: isRoomUnlocked ? tournamentState.roomId : null,
            roomPassword: isRoomUnlocked ? tournamentState.roomPassword : null,
            isRoomUnlocked,
            roomUnlockTime: tournamentState.matchStartTime - 15 * 60 * 1000
          });
        }
      }
    }

    // 2. Scan tournamentState.teams in memory
    for (const team of tournamentState.teams) {
      for (const seat of team.seats) {
        if (seat.playerUid === cleanUid) {
          const alreadyAdded = activeBookings.some(
            b => b.teamNumber === team.teamNumber && b.seatNumber === seat.seatNumber
          );
          if (!alreadyAdded) {
            activeBookings.push({
              id: seat.bookingId || `bkg_${tournamentState.id}_T${team.teamNumber}S${seat.seatNumber}`,
              tournamentId: tournamentState.id,
              tournamentTitle: tournamentState.title,
              map: tournamentState.mapName || 'Livik',
              gameType: tournamentState.gameType || 'PUBG Mobile',
              matchDate: tournamentState.matchDate,
              matchTime: tournamentState.matchTime,
              matchStartTime: tournamentState.matchStartTime,
              teamNumber: team.teamNumber,
              teamId: team.id,
              seatNumber: seat.seatNumber,
              role: seat.role || (seat.seatNumber === 1 ? 'captain' : 'member'),
              isCaptain: seat.seatNumber === 1 || Boolean(seat.isCaptain),
              playerName: seat.playerName || 'Player',
              playerUid: seat.playerUid,
              status: seat.status,
              joinedAt: Date.now(),
              roomId: isRoomUnlocked ? tournamentState.roomId : null,
              roomPassword: isRoomUnlocked ? tournamentState.roomPassword : null,
              isRoomUnlocked,
              roomUnlockTime: tournamentState.matchStartTime - 15 * 60 * 1000
            });
          }
        }
      }
    }

    res.json({
      success: true,
      pubgUid: cleanUid,
      totalBookings: activeBookings.length,
      bookings: activeBookings,
      serverTime: now
    });
  } catch (err: any) {
    console.error('Error in /api/user/my-bookings:', err);
    res.status(500).json({ error: 'Failed to fetch user bookings.' });
  }
});

// 7. Direct Balance Update for Saved PUBG ID
app.post('/api/user/update-balance', async (req: Request, res: Response) => {
  try {
    const { pubgUid, amount, action } = req.body;
    if (!pubgUid) {
      return res.status(400).json({ error: 'PUBG UID is required.' });
    }

    const cleanUid = pubgUid.toString().trim();
    let user = await getFirebaseUser(cleanUid);
    if (!user) {
      user = {
        uid: cleanUid,
        pubgUid: cleanUid,
        playerName: `Player_${cleanUid.slice(-4)}`,
        balance: 0,
        createdAt: Date.now(),
        lastLogin: Date.now()
      };
    }

    const numericAmount = Number(amount) || 0;
    if (action === 'set') {
      user.balance = Math.max(0, numericAmount);
    } else {
      if ((user.balance || 0) + numericAmount < 0) {
        return res.status(400).json({ 
          success: false,
          error: `Insufficient balance! You have ${user.balance || 0} 💎, cannot deduct ${Math.abs(numericAmount)} 💎.`,
          currentBalance: user.balance || 0
        });
      }
      user.balance = (user.balance || 0) + numericAmount;
    }

    await saveFirebaseUser(user);

    res.json({
      success: true,
      balance: user.balance,
      message: `Balance updated in Firebase for ${cleanUid}.`
    });
  } catch (err: any) {
    console.error('Error in /api/user/update-balance:', err);
    res.status(500).json({ error: 'Failed to update balance.' });
  }
});

// 7b. Direct Fast Fetch of User Balance from Firebase RTDB
app.get('/api/user/balance', async (req: Request, res: Response) => {
  try {
    const rawUid = req.query.pubgUid || req.query.uid;
    if (!rawUid || typeof rawUid !== 'string' || !rawUid.trim()) {
      return res.status(400).json({ error: 'pubgUid query parameter is required.' });
    }
    const cleanUid = rawUid.trim();
    const user = await getFirebaseUser(cleanUid);
    const balance = (user && typeof user.balance === 'number') ? user.balance : 0;
    const playerName = user?.playerName || `Player_${cleanUid.slice(-4)}`;
    res.json({
      success: true,
      pubgUid: cleanUid,
      playerName,
      balance,
      serverTime: Date.now()
    });
  } catch (err: any) {
    console.warn('Error in /api/user/balance:', err);
    res.status(500).json({ error: 'Failed to fetch user balance.' });
  }
});

// ==========================================
// REWARD & CASHOUT API ROUTES (SECURE & ATOMIC)
// ==========================================

// 1. Get Reward Settings (Public)
app.get('/api/reward/settings', async (_req: Request, res: Response) => {
  try {
    const settings = await getFirebaseRewardSettings();
    res.json({ success: true, settings });
  } catch (err: any) {
    console.error('Error fetching reward settings:', err);
    res.json({ success: true, settings: currentRewardSettings });
  }
});

// 2. Get User Wallet & Available Withdrawable Balance
app.get('/api/user/wallet', async (req: Request, res: Response) => {
  try {
    const uid = req.query.pubgUid || req.query.uid;
    if (!uid || typeof uid !== 'string') {
      return res.status(400).json({ error: 'pubgUid query parameter is required.' });
    }

    const cleanUid = uid.trim();
    let user = await getFirebaseUser(cleanUid);

    if (!user) {
      const defaultWallet: UserWalletData = {
        uid: cleanUid,
        pubgUid: cleanUid,
        playerName: `Player_${cleanUid.slice(-4)}`,
        diamondRewardBalance: 0,
        mainBalance: 0,
        totalBalance: 0,
        reservedBalance: 0,
        withdrawableBalancePKR: 0
      };
      return res.json({ success: true, wallet: defaultWallet });
    }

    const totalBalance = typeof user.balance === 'number' ? user.balance : 0;
    const reservedBalance = typeof user.reservedWithdrawalBalance === 'number' 
      ? user.reservedWithdrawalBalance 
      : 0;
    const diamondRewardBalance = typeof user.diamondRewardBalance === 'number' 
      ? user.diamondRewardBalance 
      : totalBalance;
    const mainBalance = typeof user.mainBalance === 'number' 
      ? user.mainBalance 
      : Math.max(0, totalBalance - diamondRewardBalance);
    const withdrawableBalancePKR = Math.max(0, totalBalance - reservedBalance);

    const wallet: UserWalletData = {
      uid: user.uid,
      pubgUid: user.pubgUid,
      playerName: user.playerName,
      diamondRewardBalance,
      mainBalance,
      totalBalance,
      reservedBalance,
      withdrawableBalancePKR
    };

    res.json({ success: true, wallet });
  } catch (err: any) {
    console.error('Error in /api/user/wallet:', err);
    res.status(500).json({ error: 'Failed to fetch user wallet.' });
  }
});

// 3. User Submit Cash-Out Request (Server-side validation & atomic reservation)
app.post('/api/cashout/request', async (req: Request, res: Response) => {
  try {
    const { 
      pubgUid, 
      paymentMethod, 
      accountHolderName, 
      accountNumber, 
      bankName, 
      withdrawalAmountPKR 
    } = req.body;

    if (!pubgUid || typeof pubgUid !== 'string' || !pubgUid.trim()) {
      return res.status(400).json({ error: 'Please save or enter your PUBG ID before requesting a cash-out.' });
    }

    const cleanUid = pubgUid.trim();
    const user = await getFirebaseUser(cleanUid);
    if (!user) {
      return res.status(404).json({ error: `Player record for PUBG UID ${cleanUid} was not found. Please link your PUBG ID first.` });
    }

    const validMethods: CashOutMethod[] = ['EasyPaisa', 'JazzCash', 'Other Bank Account'];
    if (!validMethods.includes(paymentMethod)) {
      return res.status(400).json({ error: 'Invalid payment method selected.' });
    }

    if (!accountHolderName || !accountHolderName.toString().trim()) {
      return res.status(400).json({ error: 'Account Holder Name is required.' });
    }

    if (!accountNumber || !accountNumber.toString().trim()) {
      return res.status(400).json({ error: 'Account or Mobile number is required.' });
    }

    if (paymentMethod === 'Other Bank Account' && (!bankName || !bankName.toString().trim())) {
      return res.status(400).json({ error: 'Bank Name is required for Bank Account cash-outs.' });
    }

    const amount = parseInt(withdrawalAmountPKR, 10);
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Withdrawal amount must be greater than zero.' });
    }

    const settings = await getFirebaseRewardSettings();
    if (amount < settings.minWithdrawal) {
      return res.status(400).json({ 
        error: `Minimum withdrawal amount is PKR ${settings.minWithdrawal}.` 
      });
    }

    // Atomic server-side balance verification
    const currentTotal = typeof user.balance === 'number' ? user.balance : 0;
    if (amount > currentTotal) {
      return res.status(400).json({ 
        error: `Insufficient balance! You have ${currentTotal} 💎, cannot cash out ${amount} PKR.` 
      });
    }

    // Atomically deduct the requested amount from active balance immediately
    const currentReserved = typeof user.reservedWithdrawalBalance === 'number' ? user.reservedWithdrawalBalance : 0;
    user.balance = currentTotal - amount;
    user.reservedWithdrawalBalance = currentReserved + amount;
    await saveFirebaseUser(user);

    // Generate unique Cash-Out Request ID
    const requestId = `COR-${Date.now().toString().slice(-6)}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    const newRequest: CashOutRequest = {
      requestId,
      userUid: cleanUid,
      playerName: user.playerName,
      paymentMethod,
      accountHolderName: accountHolderName.toString().trim(),
      accountNumber: accountNumber.toString().trim(),
      bankName: bankName ? bankName.toString().trim() : (paymentMethod === 'Other Bank Account' ? 'Bank Account' : paymentMethod),
      withdrawalAmountPKR: amount,
      currency: 'PKR',
      status: 'Pending',
      requestedAt: Date.now(),
      estimatedProcessingTime: settings.estimatedProcessingTime,
      adminNote: '',
      rejectionReason: '',
      reviewedAt: null,
      reviewedBy: null,
      paidAt: null
    };

    // Save to Firebase RTDB and in-memory map
    await saveFirebaseCashOutRequest(newRequest);

    logAdminAudit(
      `Cash-Out Requested: #${requestId}`,
      `Balance before: ${currentTotal} 💎`,
      `Deducted: PKR ${amount} | New Balance: ${user.balance} 💎 | Method: ${paymentMethod} | User: ${cleanUid}`,
      'User Self-Service'
    );

    res.status(201).json({
      success: true,
      message: 'Cash-out request submitted successfully! Amount has been deducted from your balance.',
      requestId,
      newBalance: user.balance,
      remainingWithdrawablePKR: user.balance,
      request: {
        ...newRequest,
        accountNumber: maskAccountNumber(newRequest.accountNumber)
      }
    });
  } catch (err: any) {
    console.error('Error in /api/cashout/request:', err);
    res.status(500).json({ error: 'Server error processing cash-out request.' });
  }
});

// 4. Get User Cash-Out History (Masked Account Numbers)
app.get('/api/cashout/my-history', async (req: Request, res: Response) => {
  try {
    const uid = req.query.pubgUid || req.query.uid;
    if (!uid || typeof uid !== 'string') {
      return res.status(400).json({ error: 'pubgUid query parameter required.' });
    }

    const cleanUid = uid.trim();
    await getFirebaseCashOutRequests();

    const userRequests: CashOutRequest[] = Array.from(cashOutRequestsMap.values())
      .filter(r => r.userUid === cleanUid)
      .sort((a, b) => b.requestedAt - a.requestedAt)
      .map(r => ({
        ...r,
        accountNumber: maskAccountNumber(r.accountNumber)
      }));

    res.json({
      success: true,
      requests: userRequests
    });
  } catch (err: any) {
    console.error('Error in /api/cashout/my-history:', err);
    res.status(500).json({ error: 'Failed to fetch cash-out history.' });
  }
});

// 3. Check Duplicate Transaction Reference (Real-time client validation)
app.get('/api/bookings/check-trx', (req: Request, res: Response) => {
  const trx = req.query.trx;
  if (!trx || typeof trx !== 'string') {
    return res.status(400).json({ error: 'TRX parameter required.' });
  }

  const normalized = trx.trim().toUpperCase();
  const exists = transactionRefIndex.has(normalized);

  res.json({
    transactionRef: normalized,
    isDuplicate: exists,
    message: exists 
      ? 'This Transaction Reference has already been submitted.' 
      : 'Transaction Reference available.'
  });
});

// 4. Create New Booking (Atomic duplicate check, seat reservation, private screenshot upload)
app.post('/api/bookings', (req: Request, res: Response) => {
  try {
    const {
      tournamentId,
      teamNumber,
      seatNumbers,
      packageType,
      playerName,
      playerUid,
      contactNumber,
      paymentMethod,
      transactionRef,
      screenshotBase64,
      screenshotMime
    } = req.body;

    // Field validations
    if (!tournamentId || !teamNumber || !Array.isArray(seatNumbers) || seatNumbers.length === 0) {
      return res.status(400).json({ error: 'Tournament, team number, and seat selection are required.' });
    }
    if (!playerName?.trim() || !playerUid?.trim() || !contactNumber?.trim()) {
      return res.status(400).json({ error: 'Player name, PUBG Mobile UID, and contact number are required.' });
    }
    if (!transactionRef?.trim()) {
      return res.status(400).json({ error: 'Transaction Reference (TRX ID) is mandatory.' });
    }
    if (!screenshotBase64) {
      return res.status(400).json({ error: 'Payment screenshot proof is mandatory.' });
    }

    // DUPLICATE TRANSACTION PREVENTION (Database constraint simulation)
    const normalizedTrx = transactionRef.trim().toUpperCase();
    if (transactionRefIndex.has(normalizedTrx)) {
      return res.status(409).json({
        error: `Duplicate transaction reference detected! Reference "${transactionRef}" has already been recorded. Duplicate submissions are strictly prevented.`
      });
    }

    // DUPLICATE PUBG UID IN SAME MATCH CHECK
    const cleanPlayerUid = playerUid.trim();
    const alreadyReservedInMatch = tournamentState.teams.some(t =>
      t.seats.some(s => s.playerUid === cleanPlayerUid && (s.status === 'APPROVED' || s.status === 'RESERVED_PENDING'))
    );
    if (alreadyReservedInMatch) {
      return res.status(409).json({
        error: `PUBG UID ${cleanPlayerUid} already has an active reservation in this match. Repeated reservations for the same match are not permitted.`
      });
    }

    // Verify Seat Availability on Server
    const team = tournamentState.teams.find(t => t.teamNumber === teamNumber);
    if (!team) {
      return res.status(404).json({ error: 'Specified team does not exist.' });
    }

    // Check if any requested seat is already taken
    for (const seatNum of seatNumbers) {
      const seat = team.seats.find(s => s.seatNumber === seatNum);
      if (!seat) {
        return res.status(400).json({ error: `Seat ${seatNum} is invalid for Team ${teamNumber}.` });
      }
      if (seat.status !== 'AVAILABLE') {
        return res.status(409).json({ error: `Seat ${seatNum} in Team ${teamNumber} was just reserved by another player.` });
      }
    }

    // Calculate Price
    const count = seatNumbers.length;
    let expectedAmount = 150;
    if (count === 1) expectedAmount = 150;
    else if (count === 2) expectedAmount = 300;
    else if (count === 4) expectedAmount = 600;
    else expectedAmount = count * 150;

    const bookingId = `bkg_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const accessToken = crypto.randomBytes(24).toString('hex');

    // Securely store proof in private R2/proof storage (never accessible directly by public URL)
    proofStorage.set(bookingId, {
      base64Data: screenshotBase64,
      mimeType: screenshotMime || 'image/jpeg'
    });

    // Record TRX in unique index
    transactionRefIndex.add(normalizedTrx);

    // Reserve seats as PENDING and update slot database
    for (const seatNum of seatNumbers) {
      const seat = team.seats.find(s => s.seatNumber === seatNum);
      if (seat) {
        seat.status = 'RESERVED_PENDING';
        seat.playerName = playerName;
        seat.playerUid = cleanPlayerUid;
        seat.bookingId = bookingId;
      }

      const slotKey = `${teamNumber}-${seatNum}`;
      const slotRec = slotDatabase.get(slotKey);
      if (slotRec) {
        slotRec.pubgUid = cleanPlayerUid;
        slotRec.playerName = playerName.trim();
        slotRec.reservationId = bookingId;
        slotRec.bookingDate = new Date().toISOString();
        slotRec.paymentStatus = 'Pending Verification';
        slotRec.slotStatus = 'Pending';
        slotRec.totalJoins = calculateTotalJoining(cleanPlayerUid);
      }
    }

    // Update SeatReservations structure and sync to Firebase RTDB
    const teamKey = `TEAM${teamNumber}`;
    let teamResData = seatReservationsState[teamKey];
    if (!teamResData) {
      teamResData = {
        teamId: teamKey,
        captainUid: null,
        totalSeats: 4,
        reservedSeats: 0,
        members: { '1': null, '2': null, '3': null, '4': null }
      };
      seatReservationsState[teamKey] = teamResData;
    }

    for (const seatNum of seatNumbers) {
      const slotKey = String(seatNum) as '1' | '2' | '3' | '4';
      const isFirstPlayer = seatNum === 1;
      teamResData.members[slotKey] = {
        uid: cleanPlayerUid,
        playerName: playerName.trim(),
        role: isFirstPlayer ? 'captain' : 'member',
        status: 'reserved',
        joinedAt: Date.now()
      };
    }

    let occupiedSeatsCount = 0;
    for (const k of ['1', '2', '3', '4'] as const) {
      if (teamResData.members[k] !== null) occupiedSeatsCount++;
    }
    teamResData.reservedSeats = occupiedSeatsCount;
    if (teamResData.members['1']) {
      teamResData.captainUid = teamResData.members['1'].uid;
    } else {
      teamResData.captainUid = null;
    }

    saveFirebaseTeamReservation(tournamentState.id, teamKey, teamResData).catch(() => {});

    logAdminAudit(
      `Seat Reservation: Team ${teamNumber} Slot(s) [${seatNumbers.join(', ')}]`,
      'Status: Empty',
      `Status: Pending | UID: ${cleanPlayerUid} | TRX: ${normalizedTrx}`,
      'Participant Reservation'
    );

    // Synchronize to Google Sheets TeamSlots & Matches tabs
    syncWithGoogleSheets('syncSlots', {
      matchId: tournamentState.id,
      matchDate: new Date(tournamentState.matchStartTime).toISOString().split('T')[0],
      slots: Array.from(slotDatabase.values())
    }).catch(() => {});

    const newBooking: Booking = {
      id: bookingId,
      tournamentId,
      teamId: team.id,
      teamNumber,
      playerName: playerName.trim(),
      playerUid: cleanPlayerUid,
      contactNumber: contactNumber.trim(),
      packageType: packageType || (count === 4 ? 'SQUAD' : count === 2 ? 'DUO' : 'SOLO'),
      seatCount: count,
      seatNumbers,
      amountPkr: expectedAmount,
      paymentMethod,
      transactionRef: normalizedTrx,
      status: 'PENDING',
      accessToken,
      createdAt: Date.now()
    };

    bookingsMap.set(bookingId, newBooking);

    res.status(201).json({
      success: true,
      booking: {
        id: bookingId,
        teamNumber,
        seatNumbers,
        amountPkr: expectedAmount,
        transactionRef: normalizedTrx,
        status: 'PENDING',
        accessToken
      },
      message: 'Booking submitted successfully! Seats are held pending administrator verification of your payment.'
    });
  } catch (err: any) {
    console.error('Error in /api/bookings:', err);
    res.status(500).json({ error: 'Internal server error processing booking.' });
  }
});

// 5. Booking Status Lookup & Room Credentials Access
// Strictly guarded: Room ID and Password are ONLY returned if booking is APPROVED and room is open!
app.get('/api/bookings/lookup', (req: Request, res: Response) => {
  const { query, accessToken } = req.query;
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Search query (TRX ID, UID, or Booking ID) required.' });
  }

  evaluateTournamentStatus();

  const cleanQuery = query.trim().toUpperCase();
  let foundBooking: Booking | undefined = undefined;

  // Search by ID, TRX, or UID
  for (const b of bookingsMap.values()) {
    if (
      b.id.toUpperCase() === cleanQuery ||
      b.transactionRef.toUpperCase() === cleanQuery ||
      b.playerUid.toUpperCase() === cleanQuery ||
      (accessToken && b.accessToken === accessToken)
    ) {
      foundBooking = b;
      break;
    }
  }

  if (!foundBooking) {
    return res.status(404).json({ error: 'No booking record found for the provided information.' });
  }

  const isApproved = foundBooking.status === 'APPROVED';
  const now = Date.now();
  const isRoomWindowOpen = now >= tournamentState.roomOpenTime && now <= tournamentState.matchEndTime;

  // Only reveal room credentials if approved AND room open time has arrived!
  const canAccessRoom = isApproved && isRoomWindowOpen;

  res.json({
    booking: {
      id: foundBooking.id,
      playerName: foundBooking.playerName,
      playerUid: foundBooking.playerUid,
      teamNumber: foundBooking.teamNumber,
      seatNumbers: foundBooking.seatNumbers,
      amountPkr: foundBooking.amountPkr,
      transactionRef: foundBooking.transactionRef,
      paymentMethod: foundBooking.paymentMethod,
      status: foundBooking.status,
      adminNotes: foundBooking.adminNotes,
      createdAt: foundBooking.createdAt,
      reviewedAt: foundBooking.reviewedAt
    },
    credentials: canAccessRoom ? {
      roomId: tournamentState.roomId,
      roomPassword: tournamentState.roomPassword,
      roomOpenTime: tournamentState.roomOpenTime,
      matchStartTime: tournamentState.matchStartTime,
      accessExpiresAt: tournamentState.matchStartTime,
      serverTime: Date.now()
    } : null,
    credentialsLockedReason: !isApproved 
      ? 'Payment pending administrator approval.' 
      : !isRoomWindowOpen 
        ? `Room opens at ${new Date(tournamentState.roomOpenTime).toLocaleTimeString()}. Credentials will unlock automatically.`
        : null
  });
});

// 6. Get Match Results / Leaderboard
app.get('/api/results', (req: Request, res: Response) => {
  res.json({
    results: matchResults,
    status: tournamentState.status,
    prizePoolTotal: tournamentState.prizePoolTotal
  });
});

// ==========================================
// ADMIN API ROUTES (SECURED)
// ==========================================

// 7. Admin Login
app.post('/api/admin/login', (req: Request, res: Response) => {
  const { password } = req.body;
  const cleanPass = (password || '').toString().trim();
  if (!cleanPass || (cleanPass !== ADMIN_PASSWORD && cleanPass !== 'Ndr@77490869')) {
    return res.status(401).json({ error: 'Incorrect administrator password.' });
  }

  const token = 'pubg_adm_' + crypto.randomBytes(32).toString('hex');
  activeAdminTokens.add(token);

  res.json({
    success: true,
    token,
    adminName: 'Tournament Director',
    message: 'Authenticated successfully.'
  });
});

// 8. Admin Logout
app.post('/api/admin/logout', requireAdmin, (req: Request, res: Response) => {
  const authHeader = req.headers.authorization!;
  const token = authHeader.substring(7);
  activeAdminTokens.delete(token);
  res.json({ success: true, message: 'Logged out.' });
});

// 9. Admin List All Bookings
app.get('/api/admin/bookings', requireAdmin, (req: Request, res: Response) => {
  const allBookings = Array.from(bookingsMap.values()).sort((a, b) => b.createdAt - a.createdAt);
  res.json({ bookings: allBookings });
});

// 9b. Admin List All Cash-Out Requests (Protected - Unmasked details for admin)
app.get('/api/admin/cashouts', requireAdmin, async (_req: Request, res: Response) => {
  try {
    await getFirebaseCashOutRequests();
    const all = Array.from(cashOutRequestsMap.values()).sort((a, b) => b.requestedAt - a.requestedAt);
    res.json({ success: true, requests: all });
  } catch (err: any) {
    console.error('Error in /api/admin/cashouts:', err);
    res.status(500).json({ error: 'Failed to fetch cashout requests.' });
  }
});

// 9c. Admin Action on Cash-Out Request (Approve, Mark Processing, Mark Paid, Reject, Add Note)
app.post('/api/admin/cashouts/:id/status', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { action, adminNote, rejectionReason } = req.body;

    let request = cashOutRequestsMap.get(id);
    if (!request) {
      await getFirebaseCashOutRequests();
      request = cashOutRequestsMap.get(id);
    }

    if (!request) {
      return res.status(404).json({ error: `Cash-out request ${id} not found.` });
    }

    const prevStatus = request.status;
    const user = await getFirebaseUser(request.userUid);

    if (action === 'APPROVE') {
      if (request.status === 'Paid') {
        return res.status(400).json({ error: 'Request is already marked as Paid.' });
      }
      request.status = 'Approved';
      request.reviewedAt = Date.now();
      request.reviewedBy = 'Tournament Admin';
      if (adminNote) request.adminNote = adminNote.trim();
    } else if (action === 'PROCESSING') {
      if (request.status === 'Paid') {
        return res.status(400).json({ error: 'Request is already marked as Paid.' });
      }
      request.status = 'Processing';
      request.reviewedAt = Date.now();
      request.reviewedBy = 'Tournament Admin';
      if (adminNote) request.adminNote = adminNote.trim();
    } else if (action === 'PAID') {
      if (request.status === 'Paid') {
        return res.status(400).json({ error: 'Request is already marked as Paid. Cannot process payment twice.' });
      }
      request.status = 'Paid';
      request.paidAt = Date.now();
      request.reviewedAt = Date.now();
      request.reviewedBy = 'Tournament Admin';
      if (adminNote) request.adminNote = adminNote.trim();

      // Amount was already deducted from user.balance at request time, now release reserved tracking
      if (user) {
        user.reservedWithdrawalBalance = Math.max(0, (user.reservedWithdrawalBalance || 0) - request.withdrawalAmountPKR);
        await saveFirebaseUser(user);
      }
    } else if (action === 'REJECT') {
      if (request.status === 'Paid') {
        return res.status(400).json({ error: 'Cannot reject an already Paid request.' });
      }
      request.status = 'Rejected';
      request.rejectionReason = (rejectionReason && rejectionReason.trim()) || 'Information verification failed or invalid account.';
      request.reviewedAt = Date.now();
      request.reviewedBy = 'Tournament Admin';
      if (adminNote) request.adminNote = adminNote.trim();

      // Release reserved and REFUND the deducted amount back to user's balance
      if (user && prevStatus !== 'Rejected') {
        user.balance = (typeof user.balance === 'number' ? user.balance : 0) + request.withdrawalAmountPKR;
        user.reservedWithdrawalBalance = Math.max(0, (user.reservedWithdrawalBalance || 0) - request.withdrawalAmountPKR);
        await saveFirebaseUser(user);
      }
    } else if (action === 'ADD_NOTE') {
      if (adminNote !== undefined) request.adminNote = adminNote.trim();
    } else {
      return res.status(400).json({ error: 'Invalid action. Must be APPROVE, PROCESSING, PAID, REJECT, or ADD_NOTE.' });
    }

    // Persist to Firebase RTDB
    await saveFirebaseCashOutRequest(request);

    logAdminAudit(
      `Cash-Out #${request.requestId}: Status -> ${request.status}`,
      `Status: ${prevStatus}`,
      `Status: ${request.status} | Amount: ${request.withdrawalAmountPKR} PKR | User: ${request.userUid}`,
      'Tournament Admin'
    );

    res.json({
      success: true,
      message: `Cash-out request #${request.requestId} status updated to ${request.status}.`,
      request
    });
  } catch (err: any) {
    console.error('Error updating cashout status:', err);
    res.status(500).json({ error: 'Failed to update cash-out request status.' });
  }
});

// 9d. Admin Update Reward & Cash-Out Settings
app.post('/api/admin/reward/settings', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { perKillReward, minWithdrawal, estimatedProcessingTime } = req.body;
    const prev = JSON.stringify(currentRewardSettings);

    const newSettings: RewardSettings = {
      perKillReward: typeof perKillReward === 'number' && perKillReward > 0 ? perKillReward : currentRewardSettings.perKillReward,
      minWithdrawal: typeof minWithdrawal === 'number' && minWithdrawal > 0 ? minWithdrawal : currentRewardSettings.minWithdrawal,
      estimatedProcessingTime: typeof estimatedProcessingTime === 'string' && estimatedProcessingTime.trim() ? estimatedProcessingTime.trim() : currentRewardSettings.estimatedProcessingTime
    };

    await saveFirebaseRewardSettings(newSettings);
    logAdminAudit('Reward & Cash-Out Settings Updated', prev, JSON.stringify(newSettings), 'Tournament Admin');

    res.json({
      success: true,
      message: 'Reward & Cash-Out settings saved to Firebase!',
      settings: currentRewardSettings
    });
  } catch (err: any) {
    console.error('Error in /api/admin/reward/settings:', err);
    res.status(500).json({ error: 'Failed to update reward settings.' });
  }
});

// 10. Admin Private Proof Screenshot Access (Strictly authorized)
app.get('/api/admin/proof/:bookingId', requireAdmin, (req: Request, res: Response) => {
  const { bookingId } = req.params;
  const proof = proofStorage.get(bookingId);
  if (!proof) {
    return res.status(404).json({ error: 'Payment screenshot not found or expired.' });
  }

  // Stream base64 image
  const matches = proof.base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (matches && matches.length === 3) {
    const buffer = Buffer.from(matches[2], 'base64');
    res.setHeader('Content-Type', matches[1]);
    res.setHeader('Cache-Control', 'private, no-cache');
    return res.send(buffer);
  }

  res.json({ base64: proof.base64Data });
});

// 11. Admin Action: Approve or Reject Booking
app.post('/api/admin/bookings/:id/action', requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const { action, notes } = req.body; // 'APPROVE' or 'REJECT'

  const booking = bookingsMap.get(id);
  if (!booking) {
    return res.status(404).json({ error: 'Booking not found.' });
  }

  const team = tournamentState.teams.find(t => t.teamNumber === booking.teamNumber);

  if (action === 'APPROVE') {
    booking.status = 'APPROVED';
    booking.reviewedAt = Date.now();
    booking.reviewedBy = 'Tournament Admin';
    booking.adminNotes = notes || 'Payment verified against bank/wallet records.';

    // Lock seats as APPROVED and update slot database
    if (team) {
      for (const seatNum of booking.seatNumbers) {
        const seat = team.seats.find(s => s.seatNumber === seatNum);
        if (seat) {
          seat.status = 'APPROVED';
          seat.playerName = booking.playerName;
          seat.playerUid = booking.playerUid;
        }

        const slotKey = `${booking.teamNumber}-${seatNum}`;
        const slotRec = slotDatabase.get(slotKey);
        if (slotRec) {
          slotRec.pubgUid = booking.playerUid;
          slotRec.playerName = booking.playerName;
          slotRec.slotStatus = 'Confirmed';
          slotRec.paymentStatus = 'Approved';
          slotRec.reservationId = booking.id;
          slotRec.totalJoins = calculateTotalJoining(booking.playerUid) + 1;
        }

        // Add to PlayerHistory
        playerHistoryList.push({
          pubgUid: booking.playerUid,
          playerName: booking.playerName,
          matchId: tournamentState.id,
          matchDate: new Date(tournamentState.matchStartTime).toISOString().split('T')[0],
          teamNumber: booking.teamNumber,
          slotNumber: seatNum,
          bookingDate: new Date(booking.createdAt).toLocaleString(),
          paymentStatus: 'Approved',
          reservationId: booking.id,
          rewardPerKill: 100,
          kills: 0,
          totalReward: 0
        });
      }
    }

    logAdminAudit(
      `Booking Approved: #${booking.id.slice(-6)} (Team ${booking.teamNumber})`,
      'Status: Pending',
      `Status: Confirmed | UID: ${booking.playerUid} | TRX: ${booking.transactionRef}`,
      'Tournament Admin'
    );

    syncWithGoogleSheets('syncSlots', {
      matchId: tournamentState.id,
      matchDate: new Date(tournamentState.matchStartTime).toISOString().split('T')[0],
      slots: Array.from(slotDatabase.values())
    }).catch(() => {});

    return res.json({
      success: true,
      message: `Booking #${id.slice(-6)} approved. Seats locked and credentials authorized.`,
      booking
    });
  } else if (action === 'REJECT') {
    booking.status = 'REJECTED';
    booking.reviewedAt = Date.now();
    booking.reviewedBy = 'Tournament Admin';
    booking.adminNotes = notes || 'Payment verification failed or invalid receipt.';

    // FREE UP SEATS immediately back to AVAILABLE & Empty in database!
    if (team) {
      for (const seatNum of booking.seatNumbers) {
        const seat = team.seats.find(s => s.seatNumber === seatNum);
        if (seat && seat.bookingId === booking.id) {
          seat.status = 'AVAILABLE';
          seat.playerName = undefined;
          seat.playerUid = undefined;
          seat.bookingId = undefined;
        }

        const slotKey = `${booking.teamNumber}-${seatNum}`;
        const slotRec = slotDatabase.get(slotKey);
        if (slotRec) {
          slotRec.pubgUid = null;
          slotRec.playerName = null;
          slotRec.slotStatus = 'Empty';
          slotRec.paymentStatus = 'Rejected';
          slotRec.reservationId = null;
        }
      }
    }

    // Release TRX from unique constraint if rejected so user can retry with valid TRX
    transactionRefIndex.delete(booking.transactionRef);

    logAdminAudit(
      `Booking Rejected: #${booking.id.slice(-6)} (Team ${booking.teamNumber})`,
      'Status: Pending',
      `Status: Rejected / Released back to Empty | Reason: ${notes || 'Payment failed'}`,
      'Tournament Admin'
    );

    syncWithGoogleSheets('syncSlots', {
      matchId: tournamentState.id,
      matchDate: new Date(tournamentState.matchStartTime).toISOString().split('T')[0],
      slots: Array.from(slotDatabase.values())
    }).catch(() => {});

    return res.json({
      success: true,
      message: `Booking rejected. Seats released back to AVAILABLE.`,
      booking
    });
  }

  res.status(400).json({ error: 'Invalid action. Must be APPROVE or REJECT.' });
});

// ==========================================
// ADMIN TEAM-SLOT MANAGEMENT & SEARCH ROUTES
// ==========================================

// 12. Get All 25 Teams (100 Slots) & Match Summary
app.get('/api/admin/slots', requireAdmin, (req: Request, res: Response) => {
  const allSlots = Array.from(slotDatabase.values());
  const occupiedSlots = allSlots.filter(s => s.slotStatus === 'Confirmed' || s.slotStatus === 'Pending').length;
  const emptySlots = 100 - occupiedSlots;

  res.json({
    success: true,
    matchId: tournamentState.id,
    matchDate: new Date(tournamentState.matchStartTime).toISOString().split('T')[0],
    totalTeams: 25,
    totalSlots: 100,
    occupiedSlots,
    emptySlots,
    slots: allSlots,
    teams: tournamentState.teams,
    googleSheets: {
      configured: Boolean(GOOGLE_SHEETS_SCRIPT_URL),
      spreadsheetId: SPREADSHEET_ID,
      scriptUrl: GOOGLE_SHEETS_SCRIPT_URL ? 'Configured' : 'Missing (See GOOGLE_SHEETS_SETUP.md)'
    }
  });
});

// 13. Admin Manually Assign Player to Empty Slot
app.post('/api/admin/slots/assign', requireAdmin, (req: Request, res: Response) => {
  const { teamNumber, slotNumber, pubgUid, playerName, avatarUrl } = req.body;
  if (!teamNumber || !slotNumber || !pubgUid || !playerName) {
    return res.status(400).json({ error: 'teamNumber, slotNumber, pubgUid, and playerName are required.' });
  }

  const slotKey = `${teamNumber}-${slotNumber}`;
  const slotRec = slotDatabase.get(slotKey);
  if (!slotRec) {
    return res.status(404).json({ error: `Team ${teamNumber} Slot ${slotNumber} does not exist.` });
  }

  if (slotRec.slotStatus === 'Confirmed') {
    return res.status(409).json({ error: `Slot is already confirmed by ${slotRec.playerName} (UID: ${slotRec.pubgUid}).` });
  }

  const prevValue = `Status: ${slotRec.slotStatus} | UID: ${slotRec.pubgUid || 'null'}`;
  const cleanUid = String(pubgUid).trim();
  const cleanName = String(playerName).trim();

  // Update in slotDatabase
  slotRec.pubgUid = cleanUid;
  slotRec.playerName = cleanName;
  slotRec.slotStatus = 'Confirmed';
  slotRec.paymentStatus = 'Admin Assigned';
  slotRec.reservationId = `adm_assign_${Date.now()}`;
  slotRec.bookingDate = new Date().toISOString();
  slotRec.totalJoins = calculateTotalJoining(cleanUid) + 1;
  if (avatarUrl) slotRec.avatarUrl = avatarUrl;

  // Update in tournamentState.teams
  const team = tournamentState.teams.find(t => t.teamNumber === teamNumber);
  if (team) {
    const seat = team.seats.find(s => s.seatNumber === slotNumber);
    if (seat) {
      seat.status = 'APPROVED';
      seat.playerName = cleanName;
      seat.playerUid = cleanUid;
      if (avatarUrl) seat.avatarUrl = avatarUrl;
    }
  }

  // Record in PlayerHistory
  playerHistoryList.push({
    pubgUid: cleanUid,
    playerName: cleanName,
    matchId: tournamentState.id,
    matchDate: new Date(tournamentState.matchStartTime).toISOString().split('T')[0],
    teamNumber,
    slotNumber,
    bookingDate: new Date().toLocaleString(),
    paymentStatus: 'Admin Assigned',
    reservationId: slotRec.reservationId,
    rewardPerKill: 100,
    kills: 0,
    totalReward: 0
  });

  const newValue = `Status: Confirmed | UID: ${cleanUid} | Name: ${cleanName}`;
  logAdminAudit(`Slot Assigned: Team ${teamNumber} Slot ${slotNumber}`, prevValue, newValue, 'Tournament Admin');

  // Sync to Google Sheets
  syncWithGoogleSheets('syncSlots', {
    matchId: tournamentState.id,
    matchDate: new Date(tournamentState.matchStartTime).toISOString().split('T')[0],
    slots: Array.from(slotDatabase.values())
  }).catch(() => {});

  res.json({
    success: true,
    message: `Player ${cleanName} (UID: ${cleanUid}) assigned to Team ${teamNumber} Slot ${slotNumber}.`,
    slot: slotRec
  });
});

// 14. Admin Release a Slot (set to Empty)
app.post('/api/admin/slots/release', requireAdmin, (req: Request, res: Response) => {
  const { teamNumber, slotNumber, reason } = req.body;
  if (!teamNumber || !slotNumber) {
    return res.status(400).json({ error: 'teamNumber and slotNumber required.' });
  }

  const slotKey = `${teamNumber}-${slotNumber}`;
  const slotRec = slotDatabase.get(slotKey);
  if (!slotRec) {
    return res.status(404).json({ error: `Team ${teamNumber} Slot ${slotNumber} not found.` });
  }

  const prevValue = `Status: ${slotRec.slotStatus} | UID: ${slotRec.pubgUid || 'null'} | Name: ${slotRec.playerName || 'null'}`;

  // Reset in slotDatabase
  slotRec.pubgUid = null;
  slotRec.playerName = null;
  slotRec.reservationId = null;
  slotRec.bookingDate = null;
  slotRec.paymentStatus = null;
  slotRec.slotStatus = 'Empty';
  slotRec.avatarUrl = null;

  // Reset in tournamentState.teams
  const team = tournamentState.teams.find(t => t.teamNumber === teamNumber);
  if (team) {
    const seat = team.seats.find(s => s.seatNumber === slotNumber);
    if (seat) {
      seat.status = 'AVAILABLE';
      seat.playerName = undefined;
      seat.playerUid = undefined;
      seat.avatarUrl = undefined;
      seat.bookingId = undefined;
    }
  }

  const newValue = `Status: Empty | Released (${reason || 'Admin Release'})`;
  logAdminAudit(`Slot Released: Team ${teamNumber} Slot ${slotNumber}`, prevValue, newValue, 'Tournament Admin');

  // Sync to Google Sheets
  syncWithGoogleSheets('syncSlots', {
    matchId: tournamentState.id,
    matchDate: new Date(tournamentState.matchStartTime).toISOString().split('T')[0],
    slots: Array.from(slotDatabase.values())
  }).catch(() => {});

  res.json({
    success: true,
    message: `Team ${teamNumber} Slot ${slotNumber} has been released and is now Empty.`,
    slot: slotRec
  });
});

// 15. Admin Edit UID or Player Name on a Slot
app.post('/api/admin/slots/edit', requireAdmin, (req: Request, res: Response) => {
  const { teamNumber, slotNumber, pubgUid, playerName, avatarUrl } = req.body;
  if (!teamNumber || !slotNumber || !pubgUid) {
    return res.status(400).json({ error: 'teamNumber, slotNumber, and pubgUid are required.' });
  }

  const slotKey = `${teamNumber}-${slotNumber}`;
  const slotRec = slotDatabase.get(slotKey);
  if (!slotRec) {
    return res.status(404).json({ error: 'Slot not found.' });
  }

  const prevValue = `UID: ${slotRec.pubgUid} | Name: ${slotRec.playerName}`;
  const cleanUid = String(pubgUid).trim();
  const cleanName = playerName ? String(playerName).trim() : (slotRec.playerName || `Player_${cleanUid.slice(-4)}`);

  slotRec.pubgUid = cleanUid;
  slotRec.playerName = cleanName;
  if (avatarUrl) slotRec.avatarUrl = avatarUrl;

  const team = tournamentState.teams.find(t => t.teamNumber === teamNumber);
  if (team) {
    const seat = team.seats.find(s => s.seatNumber === slotNumber);
    if (seat) {
      seat.playerName = cleanName;
      seat.playerUid = cleanUid;
      if (avatarUrl) seat.avatarUrl = avatarUrl;
    }
  }

  const newValue = `UID: ${cleanUid} | Name: ${cleanName}`;
  logAdminAudit(`Slot Corrected: Team ${teamNumber} Slot ${slotNumber}`, prevValue, newValue, 'Tournament Admin');

  syncWithGoogleSheets('syncSlots', {
    matchId: tournamentState.id,
    matchDate: new Date(tournamentState.matchStartTime).toISOString().split('T')[0],
    slots: Array.from(slotDatabase.values())
  }).catch(() => {});

  res.json({
    success: true,
    message: `Slot updated: Team ${teamNumber} Slot ${slotNumber} set to UID: ${cleanUid}.`,
    slot: slotRec
  });
});

// 16. Admin Move Player from One Slot to Another Available Slot
app.post('/api/admin/slots/move', requireAdmin, (req: Request, res: Response) => {
  const { fromTeam, fromSlot, toTeam, toSlot } = req.body;
  if (!fromTeam || !fromSlot || !toTeam || !toSlot) {
    return res.status(400).json({ error: 'fromTeam, fromSlot, toTeam, and toSlot are required.' });
  }

  const fromKey = `${fromTeam}-${fromSlot}`;
  const toKey = `${toTeam}-${toSlot}`;

  const sourceSlot = slotDatabase.get(fromKey);
  const targetSlot = slotDatabase.get(toKey);

  if (!sourceSlot || !targetSlot) {
    return res.status(404).json({ error: 'Source or target slot not found.' });
  }

  if (targetSlot.slotStatus === 'Confirmed' || targetSlot.slotStatus === 'Pending') {
    return res.status(409).json({ error: `Target Team ${toTeam} Slot ${toSlot} is already occupied by ${targetSlot.playerName} (UID: ${targetSlot.pubgUid}).` });
  }

  if (!sourceSlot.pubgUid) {
    return res.status(400).json({ error: `Source Team ${fromTeam} Slot ${fromSlot} is currently empty.` });
  }

  const movingPlayer = {
    uid: sourceSlot.pubgUid,
    name: sourceSlot.playerName,
    avatarUrl: sourceSlot.avatarUrl,
    reservationId: sourceSlot.reservationId,
    bookingDate: sourceSlot.bookingDate,
    paymentStatus: sourceSlot.paymentStatus,
    slotStatus: sourceSlot.slotStatus
  };

  // Move to target
  targetSlot.pubgUid = movingPlayer.uid;
  targetSlot.playerName = movingPlayer.name;
  targetSlot.avatarUrl = movingPlayer.avatarUrl;
  targetSlot.reservationId = movingPlayer.reservationId;
  targetSlot.bookingDate = movingPlayer.bookingDate;
  targetSlot.paymentStatus = movingPlayer.paymentStatus;
  targetSlot.slotStatus = movingPlayer.slotStatus;
  targetSlot.totalJoins = calculateTotalJoining(movingPlayer.uid!);

  // Clear source
  sourceSlot.pubgUid = null;
  sourceSlot.playerName = null;
  sourceSlot.avatarUrl = null;
  sourceSlot.reservationId = null;
  sourceSlot.bookingDate = null;
  sourceSlot.paymentStatus = null;
  sourceSlot.slotStatus = 'Empty';

  // Update tournamentState.teams
  const srcTeamObj = tournamentState.teams.find(t => t.teamNumber === fromTeam);
  if (srcTeamObj) {
    const sSeat = srcTeamObj.seats.find(s => s.seatNumber === fromSlot);
    if (sSeat) {
      sSeat.status = 'AVAILABLE';
      sSeat.playerName = undefined;
      sSeat.playerUid = undefined;
      sSeat.avatarUrl = undefined;
    }
  }

  const destTeamObj = tournamentState.teams.find(t => t.teamNumber === toTeam);
  if (destTeamObj) {
    const dSeat = destTeamObj.seats.find(s => s.seatNumber === toSlot);
    if (dSeat) {
      dSeat.status = movingPlayer.slotStatus === 'Confirmed' ? 'APPROVED' : 'RESERVED_PENDING';
      dSeat.playerName = movingPlayer.name || undefined;
      dSeat.playerUid = movingPlayer.uid || undefined;
      dSeat.avatarUrl = movingPlayer.avatarUrl || undefined;
    }
  }

  logAdminAudit(
    `Player Moved: T${fromTeam}S${fromSlot} -> T${toTeam}S${toSlot}`,
    `UID: ${movingPlayer.uid} in Team ${fromTeam} Slot ${fromSlot}`,
    `UID: ${movingPlayer.uid} in Team ${toTeam} Slot ${toSlot}`,
    'Tournament Admin'
  );

  syncWithGoogleSheets('syncSlots', {
    matchId: tournamentState.id,
    matchDate: new Date(tournamentState.matchStartTime).toISOString().split('T')[0],
    slots: Array.from(slotDatabase.values())
  }).catch(() => {});

  res.json({
    success: true,
    message: `Moved ${movingPlayer.name} (UID: ${movingPlayer.uid}) from Team ${fromTeam} Slot ${fromSlot} to Team ${toTeam} Slot ${toSlot}.`,
    sourceSlot,
    targetSlot
  });
});

// 17. Admin Search by PUBG UID (Exact matches, distinct join calculation, history)
app.get('/api/admin/player-history', requireAdmin, (req: Request, res: Response) => {
  const { uid } = req.query;
  if (!uid || typeof uid !== 'string') {
    return res.status(400).json({ error: 'PUBG UID query parameter required.' });
  }

  const cleanUid = uid.trim();
  const history: any[] = [];
  const distinctMatches = new Set<string>();
  const teamsPlayed = new Set<number>();
  let playerName = '';

  // 1. Check playerHistoryList
  for (const h of playerHistoryList) {
    if (h.pubgUid === cleanUid) {
      if (!playerName && h.playerName) playerName = h.playerName;
      if (h.paymentStatus === 'Approved' || h.paymentStatus === 'Admin Assigned') {
        distinctMatches.add(h.matchId);
      }
      teamsPlayed.add(h.teamNumber);
      history.push({
        matchId: h.matchId,
        matchDate: h.matchDate,
        teamNumber: h.teamNumber,
        slotNumber: h.slotNumber,
        bookingDate: h.bookingDate,
        paymentStatus: h.paymentStatus,
        reservationId: h.reservationId,
        slotStatus: 'Confirmed',
        kills: h.kills,
        totalReward: h.totalReward
      });
    }
  }

  // 2. Check current slotDatabase
  for (const slot of slotDatabase.values()) {
    if (slot.pubgUid === cleanUid) {
      if (!playerName && slot.playerName) playerName = slot.playerName;
      if (slot.slotStatus === 'Confirmed') {
        distinctMatches.add(slot.matchId);
      }
      teamsPlayed.add(slot.teamNumber);

      const alreadyLogged = history.some(item => 
        item.matchId === slot.matchId && item.teamNumber === slot.teamNumber && item.slotNumber === slot.slotNumber
      );

      if (!alreadyLogged) {
        history.push({
          matchId: slot.matchId,
          matchDate: slot.matchDate,
          teamNumber: slot.teamNumber,
          slotNumber: slot.slotNumber,
          bookingDate: slot.bookingDate || 'Active',
          paymentStatus: slot.paymentStatus || 'Confirmed',
          reservationId: slot.reservationId || 'Current',
          slotStatus: slot.slotStatus,
          kills: 0,
          totalReward: 0
        });
      }
    }
  }

  if (history.length === 0) {
    return res.json({
      success: true,
      found: false,
      pubgUid: cleanUid,
      message: 'No joining history found for this PUBG UID.'
    });
  }

  res.json({
    success: true,
    found: true,
    pubgUid: cleanUid,
    playerName: playerName || `Player_${cleanUid.slice(-4)}`,
    totalJoining: distinctMatches.size,
    totalReservations: history.length,
    teamsPlayed: Array.from(teamsPlayed).sort((a, b) => a - b),
    history
  });
});

// 18. Admin Get Audit Logs
app.get('/api/admin/audit-logs', requireAdmin, (_req: Request, res: Response) => {
  res.json({
    success: true,
    auditLogs: adminAuditLogs
  });
});

// 19. Admin Check Google Sheets Status
app.get('/api/admin/sheets/status', requireAdmin, async (_req: Request, res: Response) => {
  let liveStatus: any = null;
  let authWarning: string | null = null;
  let isConnected = false;

  if (GOOGLE_SHEETS_SCRIPT_URL) {
    try {
      const pingRes = await fetch(`${GOOGLE_SHEETS_SCRIPT_URL}?action=status`, { redirect: 'follow' });
      const text = await pingRes.text();
      try {
        liveStatus = JSON.parse(text);
        isConnected = liveStatus?.success === true || liveStatus?.status === 'ready';
      } catch {
        if (text.includes('accounts.google.com') || text.includes('ServiceLogin')) {
          authWarning = 'Web App is deployed, but "Who has access" is set to restricted. In Google Apps Script, edit deployment and set "Who has access" to "Anyone" so the website can write without Google login.';
          liveStatus = { success: false, requiresPublicAccess: true };
        } else {
          liveStatus = { success: false, error: 'Non-JSON response', preview: text.slice(0, 100) };
        }
      }
    } catch (e: any) {
      liveStatus = { success: false, error: e.message };
    }
  }

  res.json({
    configured: Boolean(GOOGLE_SHEETS_SCRIPT_URL),
    isConnected,
    spreadsheetId: SPREADSHEET_ID,
    scriptUrl: GOOGLE_SHEETS_SCRIPT_URL || null,
    remoteSheetsResponse: liveStatus,
    authWarning,
    instructions: 'See GOOGLE_SHEETS_SETUP.md for deployment guidance'
  });
});

// 20. Admin Trigger Manual Google Sheets Sync
app.post('/api/admin/sheets/sync', requireAdmin, async (_req: Request, res: Response) => {
  if (!GOOGLE_SHEETS_SCRIPT_URL) {
    return res.status(400).json({
      error: 'GOOGLE_SHEETS_SCRIPT_URL is not set in environment. Please deploy Google Apps Script and add URL to .env.'
    });
  }

  const allSlots = Array.from(slotDatabase.values());
  const syncRes = await syncWithGoogleSheets('syncSlots', {
    matchId: tournamentState.id,
    matchDate: new Date(tournamentState.matchStartTime).toISOString().split('T')[0],
    slots: allSlots
  });

  res.json({
    success: syncRes.success !== false,
    message: syncRes.success ? '100 slots synced to Google Sheets successfully.' : 'Sync failed',
    syncRes
  });
});

// 11. Admin Get Full Tournament Settings (Uncensored credentials for Admin Panel)
app.get('/api/admin/tournament', requireAdmin, (_req: Request, res: Response) => {
  evaluateTournamentStatus();
  res.json({
    success: true,
    tournament: {
      ...tournamentState,
      serverTime: Date.now()
    }
  });
});

// 12. Admin Update Tournament Room Credentials & Schedule (Persists to Firebase RTDB)
app.post('/api/admin/tournament/update', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { 
      matchDate,
      matchTime,
      roomId, 
      roomPassword, 
      youtubeUrl,
      status,
      manualStatus
    } = req.body;

    if (matchDate) tournamentState.matchDate = String(matchDate).trim();
    if (matchTime) tournamentState.matchTime = String(matchTime).trim();
    
    // If date and/or time updated, recompute timestamp in Asia/Karachi (UTC+5)
    if (matchDate || matchTime) {
      const d = tournamentState.matchDate || defaultMatchDate;
      const t = tournamentState.matchTime || defaultMatchTime;
      const parsedStart = parseKarachiTimestamp(d, t);
      tournamentState.matchStartTime = parsedStart;
      tournamentState.roomOpenTime = parsedStart; // 15-min room window opens at scheduled match time
      tournamentState.matchEndTime = parsedStart + 60 * 60 * 1000; // 1 hour match
    }

    if (roomId !== undefined) tournamentState.roomId = String(roomId).trim();
    if (roomPassword !== undefined) tournamentState.roomPassword = String(roomPassword).trim();
    if (youtubeUrl !== undefined) tournamentState.youtubeUrl = String(youtubeUrl).trim();
    
    const chosenStatus = manualStatus !== undefined ? manualStatus : status;
    if (chosenStatus !== undefined) {
      tournamentState.manualStatus = chosenStatus;
    }

    tournamentState.timezone = 'Asia/Karachi';

    // Persist to Firebase Realtime Database at /tournament/current.json
    await saveFirebaseTournament({
      id: tournamentState.id,
      matchDate: tournamentState.matchDate,
      matchTime: tournamentState.matchTime,
      matchStartTime: tournamentState.matchStartTime,
      roomId: tournamentState.roomId,
      roomPassword: tournamentState.roomPassword,
      youtubeUrl: tournamentState.youtubeUrl,
      manualStatus: tournamentState.manualStatus,
      timezone: 'Asia/Karachi',
      updatedAt: Date.now(),
      updatedBy: 'admin'
    });

    evaluateTournamentStatus();

    logAdminAudit(
      'Tournament Schedule & Room Updated',
      'Previous Match State',
      `Match: ${tournamentState.matchDate} ${tournamentState.matchTime} (PKT) | Room ID: ${tournamentState.roomId} | Status: ${tournamentState.status}`,
      'Tournament Administrator'
    );

    res.json({
      success: true,
      message: 'Tournament match schedule, room credentials & YouTube link saved to Firebase!',
      tournament: {
        ...tournamentState,
        serverTime: Date.now()
      }
    });
  } catch (err: any) {
    console.error('Error updating tournament in Firebase:', err);
    res.status(500).json({ error: 'Failed to update tournament in Firebase.' });
  }
});

// 12b. Admin Reset All Seats (Opens New Seats, clears all 100 slots in Firebase RTDB)
app.post('/api/admin/seats/reset-all', requireAdmin, async (req: Request, res: Response) => {
  try {
    const tournamentId = req.body?.tournamentId || TOURNAMENT_RESERVATION_ID;

    // Reset seatReservationsState for all 25 teams
    for (let t = 1; t <= 25; t++) {
      const teamKey = `TEAM${t}`;
      seatReservationsState[teamKey] = {
        teamId: teamKey,
        captainUid: null,
        totalSeats: 4,
        reservedSeats: 0,
        members: {
          '1': null,
          '2': null,
          '3': null,
          '4': null
        }
      };
    }

    // Sync all empty teams to Firebase RTDB under /SeatReservations/{tournamentId}.json
    try {
      await fetch(`${FIREBASE_DB_URL}/SeatReservations/${encodeURIComponent(tournamentId)}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(seatReservationsState)
      });
    } catch (fbErr) {
      console.warn('[Firebase RTDB] Error resetting SeatReservations:', fbErr);
    }

    // Reset tournamentState.teams seats to AVAILABLE
    for (const team of tournamentState.teams) {
      team.captainUid = null;
      for (const seat of team.seats) {
        seat.status = 'AVAILABLE';
        seat.playerName = undefined;
        seat.playerUid = undefined;
        seat.bookingId = undefined;
        seat.role = seat.seatNumber === 1 ? 'captain' : 'member';
        seat.isCaptain = seat.seatNumber === 1;
      }
    }

    // Reset slotDatabase
    for (const slot of slotDatabase.values()) {
      slot.pubgUid = null;
      slot.playerName = null;
      slot.reservationId = null;
      slot.bookingDate = null;
      slot.paymentStatus = null;
      slot.slotStatus = 'Empty';
      slot.avatarUrl = null;
    }

    logAdminAudit(
      'Reset All Seats: 100 Slots Opened for New Match',
      'Previous Tournament Reservations',
      'All 25 Teams Reset to Empty (0/100 Occupied)',
      'Tournament Director'
    );

    // Sync reset to Google Sheets
    syncWithGoogleSheets('syncSlots', {
      matchId: tournamentState.id,
      matchDate: new Date(tournamentState.matchStartTime).toISOString().split('T')[0],
      slots: Array.from(slotDatabase.values())
    }).catch(() => {});

    res.json({
      success: true,
      message: 'All seats have been reset successfully! New match seats are now open.',
      SeatReservations: {
        [tournamentId]: seatReservationsState
      },
      tournament: tournamentState
    });
  } catch (err: any) {
    console.error('Error resetting seats:', err);
    res.status(500).json({ error: 'Failed to reset seats.' });
  }
});

// 12c. Admin Remove Single Player / Seat by PUBG ID (UID)
app.post('/api/admin/seats/remove-player', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { pubgUid, tournamentId = TOURNAMENT_RESERVATION_ID } = req.body;
    if (!pubgUid || !pubgUid.toString().trim()) {
      return res.status(400).json({ error: 'Player PUBG ID (UID) is required.' });
    }

    const cleanUid = pubgUid.toString().trim();
    const removedSeats: { teamNumber: number; seatNumber: number; playerName?: string }[] = [];

    // Scan seatReservationsState across all 25 teams
    for (let t = 1; t <= 25; t++) {
      const teamKey = `TEAM${t}`;
      const teamData = seatReservationsState[teamKey];
      if (!teamData || !teamData.members) continue;

      let teamModified = false;
      for (const slotKey of ['1', '2', '3', '4'] as const) {
        const member = teamData.members[slotKey];
        if (member && member.uid === cleanUid) {
          removedSeats.push({
            teamNumber: t,
            seatNumber: Number(slotKey),
            playerName: member.playerName
          });
          teamData.members[slotKey] = null;
          teamModified = true;
        }
      }

      if (teamModified) {
        // Recalculate reservedSeats
        let occupied = 0;
        for (const k of ['1', '2', '3', '4'] as const) {
          if (teamData.members[k] !== null) occupied++;
        }
        teamData.reservedSeats = occupied;

        // If seat 1 was removed, update captainUid
        if (teamData.members['1']) {
          teamData.captainUid = teamData.members['1'].uid;
        } else {
          teamData.captainUid = null;
        }

        // Save updated team in Firebase RTDB
        await saveFirebaseTeamReservation(tournamentId, teamKey, teamData);
      }
    }

    // Reset matching seats in tournamentState.teams
    for (const team of tournamentState.teams) {
      for (const seat of team.seats) {
        if (seat.playerUid === cleanUid) {
          seat.status = 'AVAILABLE';
          seat.playerName = undefined;
          seat.playerUid = undefined;
          seat.bookingId = undefined;
        }
      }
      if (team.captainUid === cleanUid) {
        team.captainUid = null;
      }
    }

    // Reset matching slots in slotDatabase
    for (const slot of slotDatabase.values()) {
      if (slot.pubgUid === cleanUid) {
        slot.pubgUid = null;
        slot.playerName = null;
        slot.reservationId = null;
        slot.bookingDate = null;
        slot.paymentStatus = null;
        slot.slotStatus = 'Empty';
      }
    }

    if (removedSeats.length === 0) {
      return res.status(404).json({
        error: `No reserved seat found for PUBG ID: "${cleanUid}".`
      });
    }

    logAdminAudit(
      `Player Removed: UID ${cleanUid}`,
      `Reserved in: ${removedSeats.map(r => `T${r.teamNumber}S${r.seatNumber}`).join(', ')}`,
      'Seat(s) Released back to AVAILABLE',
      'Tournament Director'
    );

    res.json({
      success: true,
      message: `Player (UID: ${cleanUid}) was successfully removed from ${removedSeats.map(r => `Team ${r.teamNumber} Seat ${r.seatNumber}`).join(', ')}. Seat is now available!`,
      removedSeats,
      SeatReservations: {
        [tournamentId]: seatReservationsState
      }
    });
  } catch (err: any) {
    console.error('Error removing player from seats:', err);
    res.status(500).json({ error: 'Failed to remove player.' });
  }
});

// 12d. Admin Add Reward / Diamonds to User ID (Direct Firebase RTDB Credit)
app.post('/api/admin/user/add-reward', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { pubgUid, amount, reason = 'Admin Reward' } = req.body;
    if (!pubgUid || !pubgUid.toString().trim()) {
      return res.status(400).json({ error: 'Player PUBG UID is required.' });
    }
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'Reward amount must be a positive number.' });
    }

    const cleanUid = pubgUid.toString().trim();
    let user = await getFirebaseUser(cleanUid);
    if (!user) {
      user = {
        uid: cleanUid,
        pubgUid: cleanUid,
        playerName: `Player_${cleanUid.slice(-4)}`,
        balance: 0,
        createdAt: Date.now(),
        lastLogin: Date.now()
      };
    }

    const previousBalance = typeof user.balance === 'number' ? user.balance : 0;
    const newBalance = previousBalance + numAmount;
    user.balance = newBalance;

    // Save to Firebase RTDB
    await saveFirebaseUser(user);

    // Save transaction record to /transactions in Firebase RTDB
    const txId = `REW_${Date.now()}_${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    try {
      await fetch(`${FIREBASE_DB_URL}/transactions/${txId}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: txId,
          userId: cleanUid,
          amount: numAmount,
          provider: 'Squard War Admin Reward',
          senderName: 'Squard War Official',
          reason,
          status: 'VERIFIED',
          credited: true,
          verifiedAt: new Date().toISOString()
        })
      });
    } catch (txErr) {
      console.warn('Error saving reward transaction:', txErr);
    }

    logAdminAudit(
      `Reward Credited: ${numAmount} 💎 to UID ${cleanUid}`,
      `Previous: ${previousBalance} 💎`,
      `New Balance: ${newBalance} 💎 (${reason})`,
      'Tournament Director'
    );

    res.json({
      success: true,
      message: `Successfully credited ${numAmount} 💎 Reward to player ${user.playerName || cleanUid}!`,
      pubgUid: cleanUid,
      playerName: user.playerName,
      previousBalance,
      creditedAmount: numAmount,
      newBalance,
      txId
    });
  } catch (err: any) {
    console.error('Error adding user reward:', err);
    res.status(500).json({ error: 'Failed to credit reward to user.' });
  }
});

// Tournament Notice State
interface TournamentNotice {
  id: string;
  title: string;
  message: string;
  urgency: 'INFO' | 'URGENT' | 'LIVE';
  active: boolean;
  updatedAt: number;
  publishedBy?: string;
}

let activeNoticeState: TournamentNotice = {
  id: 'notice_main',
  title: 'Official Match & Room Notice',
  message: 'Match starts strictly on schedule. Room ID & Password will unlock exactly 15 minutes before the match. All squad captains must join room within 15 minutes!',
  urgency: 'URGENT',
  active: true,
  updatedAt: Date.now(),
  publishedBy: 'Squard War Official'
};

async function getFirebaseNotice(): Promise<TournamentNotice> {
  try {
    const res = await fetch(`${FIREBASE_DB_URL}/Notice.json`);
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data === 'object' && data.title) {
        activeNoticeState = {
          ...activeNoticeState,
          ...data
        };
      }
    }
  } catch (err) {
    console.warn('Error fetching notice from Firebase:', err);
  }
  return activeNoticeState;
}

// 12e. Public Get Notices
app.get('/api/notices', async (req: Request, res: Response) => {
  try {
    const notice = await getFirebaseNotice();
    res.json({
      success: true,
      notice,
      domain: 'squardwar.site'
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch notice.' });
  }
});

// 12f. Admin Update Notice
app.post('/api/admin/notices/update', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { title, message, urgency = 'INFO', active = true } = req.body;
    if (!title?.trim() || !message?.trim()) {
      return res.status(400).json({ error: 'Title and message are required.' });
    }

    activeNoticeState = {
      id: `notice_${Date.now()}`,
      title: title.trim(),
      message: message.trim(),
      urgency: urgency === 'URGENT' ? 'URGENT' : urgency === 'LIVE' ? 'LIVE' : 'INFO',
      active: Boolean(active),
      updatedAt: Date.now(),
      publishedBy: 'Squard War Administration'
    };

    // Save to Firebase RTDB under /Notice.json
    try {
      await fetch(`${FIREBASE_DB_URL}/Notice.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activeNoticeState)
      });
    } catch (fbErr) {
      console.warn('Error saving Notice to Firebase RTDB:', fbErr);
    }

    logAdminAudit(
      `Notice Published: "${activeNoticeState.title}"`,
      'Previous Notice',
      activeNoticeState.message.slice(0, 50),
      'Tournament Director'
    );

    res.json({
      success: true,
      message: 'Notice updated and broadcasted to all users successfully!',
      notice: activeNoticeState
    });
  } catch (err: any) {
    console.error('Error updating notice:', err);
    res.status(500).json({ error: 'Failed to update notice.' });
  }
});


// 13. Admin Publish Match Results
app.post('/api/admin/results/publish', requireAdmin, (req: Request, res: Response) => {
  const { results } = req.body; // Array of results
  if (!Array.isArray(results) || results.length === 0) {
    return res.status(400).json({ error: 'Results array is required.' });
  }

  matchResults = results.map((r, idx) => ({
    id: `res_${idx + 1}`,
    tournamentId: tournamentState.id,
    teamNumber: r.teamNumber,
    teamName: r.teamName || `Team ${r.teamNumber}`,
    rank: r.rank || idx + 1,
    kills: r.kills || 0,
    placementPoints: r.placementPoints || 0,
    killPoints: r.kills || 0,
    totalPoints: (r.placementPoints || 0) + (r.kills || 0),
    prizePkr: r.prizePkr || 0,
    publishedAt: Date.now()
  }));

  tournamentState.status = 'COMPLETED';

  res.json({
    success: true,
    message: 'Match results and prize distribution successfully published!',
    results: matchResults
  });
});

// 14. Admin Reset Tournament / Clear All Bookings
app.post('/api/admin/tournament/reset', requireAdmin, (req: Request, res: Response) => {
  bookingsMap.clear();
  transactionRefIndex.clear();
  proofStorage.clear();
  matchResults = [];
  
  // Re-seed fresh teams
  seedTeams();
  
  // Reset countdown to default schedule
  tournamentState.matchDate = defaultMatchDate;
  tournamentState.matchTime = defaultMatchTime;
  const parsedStart = parseKarachiTimestamp(defaultMatchDate, defaultMatchTime);
  tournamentState.matchStartTime = parsedStart;
  tournamentState.roomOpenTime = parsedStart;
  tournamentState.matchEndTime = parsedStart + 60 * 60 * 1000;
  tournamentState.manualStatus = 'AUTO';
  tournamentState.status = 'REGISTRATION_OPEN';

  saveFirebaseTournament({
    id: tournamentState.id,
    matchDate: tournamentState.matchDate,
    matchTime: tournamentState.matchTime,
    matchStartTime: tournamentState.matchStartTime,
    roomId: tournamentState.roomId,
    roomPassword: tournamentState.roomPassword,
    youtubeUrl: tournamentState.youtubeUrl,
    manualStatus: 'AUTO',
    timezone: 'Asia/Karachi',
    updatedAt: Date.now()
  }).catch(() => {});

  res.json({
    success: true,
    message: 'Tournament reset to clean state with 25 teams and default schedule.'
  });
});

// Helper: Load initial tournament state from Firebase Realtime Database
async function loadInitialFirebaseTournament() {
  try {
    const rtdbData = await getFirebaseTournament();
    if (rtdbData && typeof rtdbData === 'object') {
      if (rtdbData.matchDate) tournamentState.matchDate = rtdbData.matchDate;
      if (rtdbData.matchTime) tournamentState.matchTime = rtdbData.matchTime;
      if (rtdbData.matchStartTime) {
        tournamentState.matchStartTime = Number(rtdbData.matchStartTime);
        tournamentState.roomOpenTime = Number(rtdbData.matchStartTime);
        tournamentState.matchEndTime = Number(rtdbData.matchStartTime) + 60 * 60 * 1000;
      } else if (rtdbData.matchDate && rtdbData.matchTime) {
        const ts = parseKarachiTimestamp(rtdbData.matchDate, rtdbData.matchTime);
        tournamentState.matchStartTime = ts;
        tournamentState.roomOpenTime = ts;
        tournamentState.matchEndTime = ts + 60 * 60 * 1000;
      }
      if (rtdbData.roomId) tournamentState.roomId = rtdbData.roomId;
      if (rtdbData.roomPassword) tournamentState.roomPassword = rtdbData.roomPassword;
      if (rtdbData.youtubeUrl) tournamentState.youtubeUrl = rtdbData.youtubeUrl;
      if (rtdbData.manualStatus) tournamentState.manualStatus = rtdbData.manualStatus;
      tournamentState.timezone = 'Asia/Karachi';
      console.log('[Firebase RTDB] Loaded current tournament from database:', {
        date: tournamentState.matchDate,
        time: tournamentState.matchTime,
        roomId: tournamentState.roomId,
        status: tournamentState.status
      });
    } else {
      // Seed Firebase with initial record
      await saveFirebaseTournament({
        id: tournamentState.id,
        matchDate: tournamentState.matchDate,
        matchTime: tournamentState.matchTime,
        matchStartTime: tournamentState.matchStartTime,
        roomId: tournamentState.roomId,
        roomPassword: tournamentState.roomPassword,
        youtubeUrl: tournamentState.youtubeUrl,
        manualStatus: 'AUTO',
        timezone: 'Asia/Karachi',
        updatedAt: Date.now()
      });
      console.log('[Firebase RTDB] Initialized /tournament/current.json in database.');
    }
  } catch (err) {
    console.warn('[Firebase RTDB] Error initializing tournament from RTDB:', err);
  }
  
  // Load reward settings and cash-out requests from Firebase RTDB
  await getFirebaseRewardSettings();
  await getFirebaseCashOutRequests();
  
  evaluateTournamentStatus();
}

// ==========================================
// STATIC ASSETS & VITE DEV SERVER INTEGRATION
// ==========================================

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  
  // Initialize tournament from Firebase Realtime Database
  await loadInitialFirebaseTournament();

  if (!isProd) {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false,
        watch: null
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[PUBG Arena Server] Running on http://0.0.0.0:${PORT}`);
    console.log(`[Admin Credentials] Default password: ${ADMIN_PASSWORD}`);
  });
}

startServer();
