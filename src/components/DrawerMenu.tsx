import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, 
  Trophy, 
  Lock, 
  Edit3, 
  ShieldCheck, 
  LogOut, 
  User, 
  Sparkles, 
  RefreshCw, 
  Copy, 
  Check, 
  Loader2, 
  Calendar 
} from 'lucide-react';
import { Tournament } from '../types/tournament';

interface UserBookingItem {
  id: string;
  tournamentId: string;
  tournamentTitle: string;
  map: string;
  gameType: string;
  matchDate: string;
  matchTime: string;
  matchStartTime: number;
  teamNumber: number;
  teamId: string;
  seatNumber: number;
  role: 'captain' | 'member';
  isCaptain: boolean;
  playerName: string;
  playerUid: string;
  status: string;
  joinedAt: number;
  roomId: string | null;
  roomPassword: string | null;
  isRoomUnlocked: boolean;
  roomUnlockTime: number;
}

interface DrawerMenuProps {
  isOpen: boolean;
  onClose: () => void;
  tournament: Tournament | null;
  savedPubgId?: string;
  savedPlayerName?: string;
  userBalance: number;
  onOpenResults: () => void;
  onOpenAdmin: () => void;
  onClearPubgId: () => void;
  onEditPubgId: () => void;
}

export const DrawerMenu: React.FC<DrawerMenuProps> = ({
  isOpen,
  onClose,
  tournament,
  savedPubgId,
  savedPlayerName,
  userBalance,
  onOpenResults,
  onOpenAdmin,
  onClearPubgId,
  onEditPubgId
}) => {
  // Bookings state pulled directly from Firebase
  const [bookings, setBookings] = useState<UserBookingItem[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);

  const cleanUid = (savedPubgId || '').trim();

  // Load cached bookings from localStorage
  useEffect(() => {
    if (!cleanUid) {
      setBookings([]);
      return;
    }
    try {
      const cached = localStorage.getItem(`user_bookings_${cleanUid}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          setBookings(parsed);
        }
      }
    } catch {}
  }, [cleanUid]);

  // Direct fetch from Firebase RTDB
  const fetchMyBookings = useCallback(async () => {
    if (!cleanUid) {
      setBookings([]);
      return;
    }

    setIsLoadingBookings(true);
    setBookingError(null);

    try {
      const cacheKey = `user_bookings_${cleanUid}`;
      const bookingsList: UserBookingItem[] = [];

      const modes = [
        { key: 'ERANGEL', path: 'reservations', tPath: 'tournament/current' },
        { key: 'LIVIK', path: 'reservations_livik', tPath: 'tournament/livik' },
        { key: 'TDM', path: 'reservations_tdm', tPath: 'tournament/tdm' },
        { key: 'FREE_FIRE', path: 'reservations_freefire', tPath: 'tournament/freefire' }
      ];

      for (const mode of modes) {
        try {
          const [rRes, tRes] = await Promise.all([
            fetch(`https://pubg-matches-43fa1-default-rtdb.firebaseio.com/${mode.path}.json`),
            fetch(`https://pubg-matches-43fa1-default-rtdb.firebaseio.com/${mode.tPath}.json`)
          ]);

          let reservations: any = null;
          let tData: any = null;

          if (rRes.ok) {
            const rText = await rRes.text();
            if (rText && rText.trim() !== 'null' && rText.trim().startsWith('{')) {
              try { reservations = JSON.parse(rText); } catch {}
            }
          }
          if (tRes.ok) {
            const tText = await tRes.text();
            if (tText && tText.trim() !== 'null' && tText.trim().startsWith('{')) {
              try { tData = JSON.parse(tText); } catch {}
            }
          }

          if (reservations && typeof reservations === 'object') {
            const maxTeams = mode.key === 'TDM' ? 2 : (mode.key === 'LIVIK' ? 30 : (mode.key === 'FREE_FIRE' ? 12 : 25));
            const seatsPerTeam = mode.key === 'LIVIK' ? 2 : 4;

            for (let t = 1; t <= maxTeams; t++) {
              const team = reservations[`TEAM${t}`] || reservations[`Team_${t}`];
              if (!team || !team.members) continue;

              const members = team.members;
              for (let s = 1; s <= seatsPerTeam; s++) {
                let m = Array.isArray(members) ? members[s] : (members[String(s)] || members[s]);
                if (m && (m.uid === cleanUid || m.playerUid === cleanUid)) {
                  const matchTime = tData?.matchTime || '11:00';
                  const matchDate = tData?.matchDate || new Date().toISOString().split('T')[0];
                  const roomId = tData?.roomId || '69151604';
                  const roomPassword = tData?.roomPassword || '1234';

                  bookingsList.push({
                    id: `bkg_${mode.key}_T${t}S${s}`,
                    tournamentId: mode.key,
                    tournamentTitle: tData?.title || `${mode.key} Championship Match`,
                    map: tData?.mapName || mode.key,
                    gameType: mode.key === 'FREE_FIRE' ? 'Free Fire' : 'PUBG Mobile',
                    matchDate,
                    matchTime,
                    matchStartTime: tData?.matchStartTime || (Date.now() + 2 * 3600 * 1000),
                    teamNumber: t,
                    teamId: `TEAM${t}`,
                    seatNumber: s,
                    role: s === 1 ? 'captain' : 'member',
                    isCaptain: s === 1,
                    playerName: m.playerName || savedPlayerName || 'Player',
                    playerUid: cleanUid,
                    status: 'APPROVED',
                    joinedAt: m.joinedAt || Date.now(),
                    roomId,
                    roomPassword,
                    isRoomUnlocked: true,
                    roomUnlockTime: tData?.roomOpenTime || Date.now()
                  });
                }
              }
            }
          }
        } catch (innerErr) {
          console.warn(`Mode ${mode.key} fetch error:`, innerErr);
        }
      }

      setBookings(bookingsList);
      try {
        localStorage.setItem(cacheKey, JSON.stringify(bookingsList));
      } catch {}
      setBookingError(null);
    } catch (err: any) {
      console.warn('Error fetching user bookings:', err);
      setBookingError(null);
    } finally {
      setIsLoadingBookings(false);
    }
  }, [cleanUid, savedPlayerName]);

  // Fetch whenever menu opens
  useEffect(() => {
    if (isOpen && cleanUid) {
      fetchMyBookings();
    }
  }, [isOpen, cleanUid, fetchMyBookings]);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, keyId: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    setCopiedKey(keyId);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-black/85 backdrop-blur-sm transition-opacity"
      />

      {/* Slide-out Drawer */}
      <div className="relative w-full max-w-sm sm:max-w-md bg-gradient-to-b from-[#18110b] via-[#120b06] to-[#0a0603] border-r border-amber-900/40 h-full p-4 sm:p-5 flex flex-col justify-between shadow-2xl z-10 overflow-y-auto selection:bg-amber-500 selection:text-black">
        <div className="space-y-4">
          {/* 1. Header */}
          <div className="flex items-center justify-between pb-3 border-b border-amber-950/50">
            <div className="flex items-center gap-2">
              <span className="font-heading text-xl font-bold tracking-wider text-white uppercase">
                SQUARD<span className="text-amber-400">WAR</span>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-[10px] font-mono text-amber-300">
                squardwar.site
              </span>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-[#22170f] text-amber-200/70 hover:text-white flex items-center justify-center border border-amber-800/40 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Section Title Banner: My Bookings & Reservations */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#120a06] border border-amber-900/50">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <Trophy className="w-4 h-4" />
              </div>
              <span className="font-heading uppercase font-bold text-xs tracking-wider text-white">
                My Bookings &amp; Slots
              </span>
            </div>

            {bookings.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500 text-black">
                {bookings.length} {bookings.length === 1 ? 'Slot' : 'Slots'}
              </span>
            )}
          </div>

          {/* Player Profile & Active Reservations Section */}
          <div className="space-y-3.5 animate-in fade-in duration-150">
            {/* Authenticated Player Summary Card */}
            {cleanUid ? (
              <div className="p-3.5 rounded-xl bg-gradient-to-br from-[#22160e] via-[#1a100a] to-[#120b06] border border-amber-500/50 space-y-2.5 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 via-amber-400 to-amber-700 p-0.5 shadow">
                      <div className="w-full h-full bg-[#18100a] rounded-[10px] flex items-center justify-center text-amber-300 font-black text-sm">
                        {savedPlayerName ? savedPlayerName.charAt(0).toUpperCase() : 'P'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-black text-white leading-tight flex items-center gap-1.5">
                        <span>{savedPlayerName || 'PUBG Player'}</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      </div>
                      <div className="text-[10px] font-mono text-amber-300/80 mt-0.5">
                        UID: <span className="text-amber-200 font-bold">{cleanUid}</span>
                      </div>
                    </div>
                  </div>

                  {/* Balance Display */}
                  <div className="text-right">
                    <span className="text-[9px] uppercase tracking-wider text-amber-400/80 font-mono block">Balance</span>
                    <span className="text-xs sm:text-sm font-black font-mono text-amber-300 flex items-center justify-end gap-1">
                      {userBalance} 💎
                    </span>
                  </div>
                </div>

                {/* Profile Controls */}
                <div className="pt-2 border-t border-amber-900/40 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={fetchMyBookings}
                    disabled={isLoadingBookings}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#25180f] hover:bg-amber-950/60 border border-amber-800/40 text-[10px] font-bold text-amber-300 transition-colors cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoadingBookings ? 'animate-spin' : ''}`} />
                    <span>Sync Firebase</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={onEditPubgId}
                      className="p-1.5 rounded-lg bg-[#25180f] hover:bg-amber-950/60 border border-amber-800/40 text-amber-300 hover:text-white transition-colors cursor-pointer"
                      title="Edit Profile"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={onClearPubgId}
                      className="p-1.5 rounded-lg bg-[#25180f] hover:bg-red-950/60 border border-amber-800/40 hover:border-red-500/60 text-amber-400/70 hover:text-red-300 transition-colors cursor-pointer"
                      title="Logout / Change UID"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-[#1a110a] border border-amber-800/40 text-center space-y-2">
                <User className="w-8 h-8 text-amber-400/50 mx-auto" />
                <p className="text-xs text-amber-200/80">
                  Koi UID save nahi hai. Slot reserve karein ya profile set karein.
                </p>
                <button
                  type="button"
                  onClick={onEditPubgId}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 text-black font-bold text-xs cursor-pointer shadow hover:bg-amber-400 transition-colors"
                >
                  Set Gaming Profile &amp; PIN
                </button>
              </div>
            )}

            {/* List of Booked Seats / Matches */}
            {cleanUid && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-heading font-black text-amber-400 uppercase tracking-wide flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>Current Reservations ({bookings.length})</span>
                  </span>
                  <button
                    type="button"
                    onClick={fetchMyBookings}
                    className="text-[10px] text-amber-300/80 hover:text-amber-200 flex items-center gap-1 font-mono cursor-pointer"
                  >
                    <RefreshCw className={`w-2.5 h-2.5 ${isLoadingBookings ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>
                </div>

                {isLoadingBookings ? (
                  <div className="py-8 text-center text-amber-300/60 text-xs flex flex-col items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
                    <span>Checking reservations on Firebase...</span>
                  </div>
                ) : bookings.length === 0 ? (
                  <div className="p-4 rounded-xl bg-[#150d07] border border-amber-900/40 text-center space-y-2">
                    <Calendar className="w-7 h-7 text-amber-400/40 mx-auto" />
                    <div>
                      <p className="text-xs font-bold text-amber-200">Aapki koi reservation nahi mili</p>
                      <p className="text-[11px] text-amber-400/60 mt-0.5">
                        UID: <span className="font-mono">{cleanUid}</span>
                      </p>
                    </div>
                    <button
                      onClick={onClose}
                      className="py-2 px-4 rounded-lg bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white text-xs font-bold uppercase cursor-pointer"
                    >
                      Reserve a Squad Seat
                    </button>
                  </div>
                ) : (
                  /* Bookings Cards */
                  <div className="space-y-3">
                    {bookings.map((booking) => (
                      <div 
                        key={booking.id}
                        className="p-3 rounded-xl bg-gradient-to-b from-[#1b120a] to-[#120a05] border border-amber-500/50 shadow-md space-y-2.5"
                      >
                        {/* Header: Team & Seat on left, IGN and Match Time on right */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-xs font-heading font-black text-amber-300 uppercase">
                            {booking.isCaptain && <span title="Captain" className="text-amber-400">👑</span>}
                            <span>Team {booking.teamNumber}</span>
                            <span className="text-amber-400/60">•</span>
                            <span>Seat {booking.seatNumber}</span>
                          </div>

                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-bold text-white tracking-wide">{booking.playerName}</span>
                            <span className="text-[11px] text-amber-300 font-mono bg-black/60 px-2 py-0.5 rounded border border-amber-900/40">
                              {booking.matchTime} PKT
                            </span>
                          </div>
                        </div>

                        {/* Room Credentials (if unlocked) or Clean Locked notice */}
                        {booking.isRoomUnlocked && booking.roomId ? (
                          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-amber-900/40">
                            {/* Room ID */}
                            <div className="p-2 rounded-lg bg-black/70 border border-emerald-500/40 flex items-center justify-between">
                              <div>
                                <span className="text-[9px] text-slate-400 uppercase font-mono block">Room ID</span>
                                <span className="text-sm font-black font-mono text-emerald-300">{booking.roomId}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(booking.roomId!, `room_${booking.id}`)}
                                className="p-1.5 rounded-md bg-[#22160d] text-amber-300 hover:text-white cursor-pointer"
                              >
                                {copiedKey === `room_${booking.id}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>

                            {/* Room Password */}
                            <div className="p-2 rounded-lg bg-black/70 border border-emerald-500/40 flex items-center justify-between">
                              <div>
                                <span className="text-[9px] text-slate-400 uppercase font-mono block">Password</span>
                                <span className="text-sm font-black font-mono text-emerald-300">{booking.roomPassword}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(booking.roomPassword!, `pass_${booking.id}`)}
                                className="p-1.5 rounded-md bg-[#22160d] text-amber-300 hover:text-white cursor-pointer"
                              >
                                {copiedKey === `pass_${booking.id}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="py-2 px-3 rounded-lg bg-black/50 border border-amber-900/40 text-[11px] text-amber-200/80 flex items-center gap-2">
                            <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span>Room ID &amp; Password unlock 15 minutes before match</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Footer & Discreet Admin Icon */}
        <div className="pt-3 mt-4 border-t border-amber-950/50 flex items-center justify-between text-[11px] text-amber-300/60">
          <span className="font-mono text-[10px] text-amber-400/50">Squard War © 2026</span>
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenAdmin();
            }}
            aria-label="Admin Portal"
            title="Admin Login"
            className="w-7 h-7 rounded-lg bg-[#150d07] hover:bg-amber-950/60 border border-amber-900/40 hover:border-amber-500/60 flex items-center justify-center text-amber-400/70 hover:text-amber-300 transition-colors cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
