export type GameType = 'PUBG' | 'FREE_FIRE';

export type TournamentStatus = 
  | 'REGISTRATION_OPEN'
  | 'ROOM_OPEN'          // 15-minute credential access window
  | 'MATCH_LIVE'          // 1-hour match timeline in progress
  | 'WAIT_FOR_RESULT'     // Match finished, scores pending
  | 'COMPLETED';          // Results & prize distribution published

export type SeatStatus = 'AVAILABLE' | 'RESERVED_PENDING' | 'APPROVED';

export type BookingStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type PackageType = 'SOLO' | 'DUO' | 'SQUAD';

export interface Seat {
  id: string;
  tournamentId: string;
  teamId: string;
  teamNumber: number;
  seatNumber: number; // 1 to 4
  status: SeatStatus;
  playerName?: string;
  playerUid?: string;
  role?: 'captain' | 'member';
  isCaptain?: boolean;
  avatarUrl?: string; // Player PUBG Mobile Profile Picture
  bookingId?: string;
}

export interface Team {
  id: string;
  tournamentId: string;
  teamNumber: number;
  name: string;
  captainUid?: string | null;
  seats: Seat[];
}

export interface MemberReservation {
  uid: string;
  playerName: string;
  role: 'captain' | 'member';
  status: 'reserved';
  joinedAt: number;
}

export interface TeamSeatReservation {
  teamId: string;
  captainUid: string | null;
  totalSeats: number;
  reservedSeats: number;
  members: {
    '1': MemberReservation | null;
    '2': MemberReservation | null;
    '3': MemberReservation | null;
    '4': MemberReservation | null;
  };
}

export interface SeatReservationsPayload {
  SeatReservations: {
    [tournamentId: string]: {
      [teamKey: string]: TeamSeatReservation;
    };
  };
}


export interface Tournament {
  id: string;
  title: string;
  gameType: GameType;
  mapName: string;
  matchType: string;
  serverRegion: string;
  totalTeams: number;
  seatsPerTeam: number;
  entryFeeSolo: number;
  entryFeeDuo: number;
  entryFeeSquad: number;
  prizePoolTotal: number;
  roomOpenTime: number; // epoch ms (when 15-min room window opens = matchStartTime)
  matchStartTime: number; // epoch ms
  matchEndTime: number; // epoch ms (matchStartTime + 60 mins)
  roomId?: string; // sensitive: only sent if authorized and roomOpenTime reached
  roomPassword?: string; // sensitive: only sent if authorized and roomOpenTime reached
  status: TournamentStatus;
  teams: Team[];
  serverTime: number; // current server timestamp
  matchDate?: string; // e.g. "2026-10-27"
  matchTime?: string; // e.g. "11:00"
  youtubeUrl?: string; // e.g. "https://youtube.com/@flaregunpk?si=NycZ9BwNyELH405i"
  manualStatus?: string; // "AUTO" or specific status override
  timezone?: string; // "Asia/Karachi"
}

export interface Booking {
  id: string;
  tournamentId: string;
  teamId: string;
  teamNumber: number;
  playerName: string;
  playerUid: string;
  contactNumber: string;
  packageType: PackageType;
  seatCount: number;
  seatNumbers: number[];
  amountPkr: number;
  paymentMethod: 'EASYPAISA' | 'JAZZCASH' | 'BANK_TRANSFER';
  transactionRef: string;
  screenshotUrl?: string; // Authorized URL or base64 stream
  status: BookingStatus;
  adminNotes?: string;
  accessToken: string;
  createdAt: number;
  reviewedAt?: number;
  reviewedBy?: string;
}

export interface PaymentAccount {
  methodKey: 'EASYPAISA' | 'JAZZCASH' | 'BANK_TRANSFER';
  title: string;
  accountName: string;
  accountNumber: string;
  iban?: string;
  instructions: string;
  isActive: boolean;
}

export interface MatchResult {
  id: string;
  tournamentId: string;
  teamNumber: number;
  teamName: string;
  rank: number;
  kills: number;
  placementPoints: number;
  killPoints: number;
  totalPoints: number;
  prizePkr: number;
  publishedAt: number;
}

export interface PubgProfileVerification {
  uid: string;
  isValid: boolean;
  playerName?: string;
  level?: number;
  tier?: string;
  avatarUrl?: string;
  popularity?: string;
  clan?: string;
  serverRegion?: string;
  characterMetadata?: {
    gender?: string;
    outfit?: string;
    frame?: string;
    title?: string;
  };
  serverMessage: string;
  isApiConfigured: boolean;
}

export type SheetSlotStatus = 'Empty' | 'Pending' | 'Confirmed' | 'Rejected';

export interface TeamSlotRecord {
  matchId: string;
  matchDate: string;
  teamNumber: number; // 1 to 25
  slotNumber: number; // 1 to 4
  pubgUid: string | null;
  playerName: string | null;
  reservationId: string | null;
  bookingDate: string | null;
  paymentStatus: string | null;
  slotStatus: SheetSlotStatus;
  totalJoins: number;
  avatarUrl?: string | null;
}

export interface PlayerHistoryRecord {
  pubgUid: string;
  playerName: string;
  matchId: string;
  matchDate: string;
  teamNumber: number;
  slotNumber: number;
  bookingDate: string;
  paymentStatus: string;
  reservationId: string;
  rewardPerKill: number;
  kills: number;
  totalReward: number;
}

export interface MatchSummary {
  matchId: string;
  matchDate: string;
  matchStatus: string;
  totalTeams: number; // 25
  totalSlots: number; // 100
  occupiedSlots: number;
  emptySlots: number;
}

export interface AdminAuditLogEntry {
  id: string;
  timestamp: string;
  action: string;
  previousValue: string;
  newValue: string;
  adminIdentity: string;
}

export interface PlayerSearchResult {
  success?: boolean;
  found?: boolean;
  message?: string;
  pubgUid: string;
  playerName: string;
  totalJoining: number;
  totalReservations: number;
  teamsPlayed: number[];
  history: {
    matchId: string;
    matchDate: string;
    teamNumber: number;
    slotNumber: number;
    bookingDate: string;
    paymentStatus: string;
    reservationId: string;
    slotStatus: string;
    kills?: number;
    totalReward?: number;
  }[];
}

export interface AuthUser {
  uid: string;
  pubgUid: string;
  playerName: string;
  pin?: string;
  email?: string;
  contactNumber?: string;
  balance: number;
  avatarUrl?: string;
  createdAt?: number;
  lastLogin?: number;
}

export type CashOutMethod = 'EasyPaisa' | 'JazzCash' | 'Other Bank Account';

export type CashOutStatus = 'Pending' | 'Approved' | 'Processing' | 'Paid' | 'Rejected';

export interface CashOutRequest {
  requestId: string;
  userUid: string;
  playerName: string;
  paymentMethod: CashOutMethod;
  accountHolderName: string;
  accountNumber: string; // Visible unmasked only to authorized admin
  bankName?: string;
  withdrawalAmountPKR: number;
  currency: 'PKR';
  status: CashOutStatus;
  requestedAt: number;
  estimatedProcessingTime: string;
  adminNote?: string;
  rejectionReason?: string;
  reviewedAt?: number | null;
  reviewedBy?: string | null;
  paidAt?: number | null;
}

export interface UserWalletData {
  uid: string;
  pubgUid: string;
  playerName: string;
  diamondRewardBalance: number;
  mainBalance: number;
  totalBalance: number;
  reservedBalance: number;
  withdrawableBalancePKR: number;
}

export interface RewardSettings {
  perKillReward: number;
  minWithdrawal: number;
  estimatedProcessingTime: string;
}

