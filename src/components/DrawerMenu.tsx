import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, 
  Trophy, 
  Search, 
  Lock, 
  Edit3, 
  FileText, 
  ShieldCheck, 
  Mail, 
  Phone, 
  MessageCircle, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  AlertTriangle, 
  CheckCircle2, 
  CreditCard,
  Building,
  Clock,
  ExternalLink,
  LogOut,
  User,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  Key,
  Hash,
  Loader2,
  Calendar,
  Download
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
  onOpenLookup: () => void;
  onOpenResults: () => void;
  onOpenAdmin: () => void;
  onClearPubgId: () => void;
  onEditPubgId: () => void;
  onOpenInstallApp?: () => void;
}

type MenuTab = 'bookings' | 'rules';
type AccordionSection = 'terms' | 'privacy' | 'contact' | 'faq' | null;

export const DrawerMenu: React.FC<DrawerMenuProps> = ({
  isOpen,
  onClose,
  tournament,
  savedPubgId,
  savedPlayerName,
  userBalance,
  onOpenLookup,
  onOpenResults,
  onOpenAdmin,
  onClearPubgId,
  onEditPubgId,
  onOpenInstallApp
}) => {
  const [activeTab, setActiveTab] = useState<MenuTab>('bookings');
  const [openSection, setOpenSection] = useState<AccordionSection>('terms');

  // Bookings state pulled directly from Firebase
  const [bookings, setBookings] = useState<UserBookingItem[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);

  const cleanUid = (savedPubgId || '').trim();

  // Fetch user reservations from Firebase
  const fetchMyBookings = useCallback(async () => {
    if (!cleanUid) {
      setBookings([]);
      return;
    }
    setIsLoadingBookings(true);
    setBookingError(null);
    try {
      const res = await fetch(`/api/user/my-bookings?pubgUid=${encodeURIComponent(cleanUid)}&t=${Date.now()}`);
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.bookings)) {
        setBookings(data.bookings);
      } else {
        setBookings([]);
        if (data.error) setBookingError(data.error);
      }
    } catch (err: any) {
      console.warn('Error fetching user bookings:', err);
      setBookingError('Unable to load bookings from Firebase.');
    } finally {
      setIsLoadingBookings(false);
    }
  }, [cleanUid]);

  // Fetch whenever menu opens or tab switches to bookings
  useEffect(() => {
    if (isOpen && activeTab === 'bookings' && cleanUid) {
      fetchMyBookings();
    }
  }, [isOpen, activeTab, cleanUid, fetchMyBookings]);

  if (!isOpen) return null;

  const toggleSection = (section: AccordionSection) => {
    setOpenSection(prev => prev === section ? null : section);
  };

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

          {/* Install App Quick Action in Menu */}
          {onOpenInstallApp && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenInstallApp();
              }}
              className="w-full p-2.5 rounded-xl bg-gradient-to-r from-amber-600/20 via-amber-500/10 to-amber-600/20 border border-amber-500/50 flex items-center justify-between text-xs text-amber-200 hover:text-white transition-all cursor-pointer shadow-sm group"
            >
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                <span className="font-heading uppercase font-bold tracking-wide">Install Squard War App</span>
              </div>
              <span className="text-[10px] font-mono text-amber-400 font-semibold bg-black/40 px-2 py-0.5 rounded-md">
                PWA
              </span>
            </button>
          )}

          {/* 2. Top Segmented Navigation Tabs */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#120a06] border border-amber-900/40 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('bookings')}
              className={`py-2 px-3 rounded-lg text-xs font-bold uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'bookings'
                  ? 'bg-amber-500 text-black shadow font-black'
                  : 'text-amber-200/70 hover:text-white hover:bg-amber-950/30'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>My Bookings</span>
              {bookings.length > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  activeTab === 'bookings' ? 'bg-black text-amber-300' : 'bg-amber-500/30 text-amber-300'
                }`}>
                  {bookings.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('rules')}
              className={`py-2 px-3 rounded-lg text-xs font-bold uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'rules'
                  ? 'bg-amber-500 text-black shadow font-black'
                  : 'text-amber-200/70 hover:text-white hover:bg-amber-950/30'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Rules &amp; Info</span>
            </button>
          </div>

          {/* TAB 1: MY BOOKINGS (Direct Firebase RTDB Integration) */}
          {activeTab === 'bookings' && (
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
                        <div className="text-[11px] text-amber-400 font-mono">
                          UID: {cleanUid}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[9px] text-amber-200/60 uppercase block leading-none font-medium">Balance</span>
                      <span className="text-xs font-black text-amber-400 font-mono">{userBalance} 💎</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-amber-900/40 text-xs">
                    <button
                      onClick={fetchMyBookings}
                      disabled={isLoadingBookings}
                      className="py-1 px-2.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[11px] font-semibold border border-amber-500/40 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3 h-3 ${isLoadingBookings ? 'animate-spin' : ''}`} />
                      <span>Sync Firebase</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          onClose();
                          onEditPubgId();
                        }}
                        className="py-1 px-2 rounded-lg bg-[#22160d] hover:bg-[#2c1d12] text-amber-200/80 text-[11px] font-medium border border-amber-800/40 cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => {
                          onClose();
                          onClearPubgId();
                        }}
                        title="Logout"
                        className="py-1 px-2 rounded-lg bg-[#19110b] hover:bg-red-950/80 text-amber-200/60 hover:text-red-300 text-[11px] font-medium border border-amber-800/30 cursor-pointer"
                      >
                        <LogOut className="w-3 h-3 text-red-400" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Unlinked User State */
                <div className="p-4 rounded-xl bg-[#1c130c]/90 border border-amber-900/40 text-center space-y-2.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 mx-auto">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase font-heading">
                      No Account Linked
                    </h4>
                    <p className="text-[11px] text-amber-200/60 leading-relaxed mt-1">
                      Enter your PUBG ID, Name and 4-Digit Security PIN to see your booked squad seats and match credentials.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      onClose();
                      onEditPubgId();
                    }}
                    className="w-full py-2.5 rounded-xl pubg-amber-glow-btn text-white text-xs font-bold uppercase tracking-wider cursor-pointer shadow flex items-center justify-center gap-2"
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>Login / Set PUBG ID</span>
                  </button>
                </div>
              )}

              {/* Live Reservations List */}
              {cleanUid && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[11px] font-bold text-amber-300/80 uppercase tracking-wider font-mono flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      <span>Current Reservations ({bookings.length})</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">Firebase RTDB</span>
                  </div>

                  {isLoadingBookings ? (
                    <div className="p-6 rounded-xl bg-[#120a06] border border-amber-900/30 text-center space-y-2 text-amber-200/70">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-amber-400" />
                      <p className="text-xs">Fetching your reservations from Firebase...</p>
                    </div>
                  ) : bookingError ? (
                    <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/40 text-xs text-red-200 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                      <span>{bookingError}</span>
                    </div>
                  ) : bookings.length === 0 ? (
                    <div className="p-4 rounded-xl bg-[#130b06] border border-amber-900/40 text-center space-y-2.5">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
                        <Trophy className="w-4 h-4" />
                      </div>
                      <div className="text-xs text-slate-300">
                        <p className="font-semibold">No active bookings found for this UID.</p>
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
                          className="p-3.5 rounded-xl bg-gradient-to-b from-[#1b120a] to-[#120a05] border-2 border-amber-500/60 shadow-lg space-y-2.5"
                        >
                          {/* Top Row: Team Badge & Seat Badge with Crown */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/50 text-amber-300 text-xs font-heading font-black uppercase">
                                Squad Team {booking.teamNumber}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {booking.map} ({booking.gameType})
                              </span>
                            </div>

                            {/* Seat & Role Badge */}
                            <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/60 border border-amber-600/40 text-xs font-mono font-bold text-amber-300">
                              {booking.isCaptain && (
                                <span title="Squad Captain" className="text-amber-400">👑</span>
                              )}
                              <span>Seat {booking.seatNumber}</span>
                              <span className="text-[10px] uppercase text-amber-400/80 font-normal">
                                ({booking.isCaptain ? 'Leader' : 'Member'})
                              </span>
                            </div>
                          </div>

                          {/* Player Info */}
                          <div className="p-2.5 rounded-lg bg-[#0e0703] border border-amber-900/40 flex items-center justify-between text-xs">
                            <div>
                              <span className="text-[10px] text-amber-200/50 uppercase block font-mono">Registered IGN</span>
                              <span className="font-bold text-white">{booking.playerName}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] text-amber-200/50 uppercase block font-mono">Match Schedule</span>
                              <span className="font-bold text-amber-300 font-mono text-[11px]">
                                {booking.matchTime} PKT
                              </span>
                            </div>
                          </div>

                          {/* Room Credentials (Unlocked 15 mins before match or Locked Countdown) */}
                          <div className="p-2.5 rounded-lg bg-[#0f0905] border border-amber-700/50 space-y-2">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1">
                                <Lock className="w-3 h-3 text-amber-400" />
                                <span>Room Access Details</span>
                              </span>
                              {booking.isRoomUnlocked ? (
                                <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/40">
                                  UNLOCKED ✅
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px] font-mono border border-amber-500/30">
                                  Unlocks 15m Before Match
                                </span>
                              )}
                            </div>

                            {booking.isRoomUnlocked && booking.roomId ? (
                              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-amber-900/40">
                                {/* Room ID */}
                                <div className="p-1.5 rounded bg-black/60 border border-emerald-500/40 flex items-center justify-between">
                                  <div>
                                    <span className="text-[9px] text-slate-400 uppercase font-mono block">Room ID</span>
                                    <span className="text-xs font-black font-mono text-emerald-300">{booking.roomId}</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => copyToClipboard(booking.roomId!, `room_${booking.id}`)}
                                    className="p-1 rounded bg-[#22160d] text-amber-300 hover:text-white cursor-pointer"
                                  >
                                    {copiedKey === `room_${booking.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                  </button>
                                </div>

                                {/* Room Password */}
                                <div className="p-1.5 rounded bg-black/60 border border-emerald-500/40 flex items-center justify-between">
                                  <div>
                                    <span className="text-[9px] text-slate-400 uppercase font-mono block">Password</span>
                                    <span className="text-xs font-black font-mono text-emerald-300">{booking.roomPassword}</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => copyToClipboard(booking.roomPassword!, `pass_${booking.id}`)}
                                    className="p-1 rounded bg-[#22160d] text-amber-300 hover:text-white cursor-pointer"
                                  >
                                    {copiedKey === `pass_${booking.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="p-2 rounded bg-black/40 border border-amber-900/30 text-[10px] text-amber-200/70 leading-tight flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                <span>Room ID and Password will display here automatically 15 minutes prior to game start.</span>
                              </div>
                            )}
                          </div>

                          {/* Footer verification tag */}
                          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                            <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Firebase Status: Reserved</span>
                            </span>
                            <span className="font-mono">
                              ID: {booking.id.slice(-9)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: RULES & SUPPORT (The 4 Clean Accordion Sections) */}
          {activeTab === 'rules' && (
            <div className="space-y-2.5 animate-in fade-in duration-150">
              {/* Quick Action Buttons */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <button
                  onClick={() => { onClose(); onOpenLookup(); }}
                  className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-[#1c130c] hover:bg-[#251a10] border border-amber-900/40 text-amber-200 hover:text-white text-[11px] font-semibold transition-colors cursor-pointer text-center"
                >
                  <Search className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Check Room</span>
                </button>

                <button
                  onClick={() => { onClose(); onOpenResults(); }}
                  className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-[#1c130c] hover:bg-[#251a10] border border-amber-900/40 text-amber-200 hover:text-white text-[11px] font-semibold transition-colors cursor-pointer text-center"
                >
                  <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Leaderboard</span>
                </button>
              </div>

              {/* SECTION 1: STRONG TERMS & CONDITIONS */}
              <div className="rounded-xl border border-amber-600/40 bg-[#170f09]/90 overflow-hidden shadow">
                <button
                  onClick={() => toggleSection('terms')}
                  className="w-full p-3 flex items-center justify-between text-left hover:bg-amber-950/30 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-amber-500/20 text-amber-400 flex items-center justify-center">
                      <FileText className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-heading font-black tracking-wide text-white uppercase">
                      Strong Terms &amp; Conditions
                    </span>
                  </div>
                  {openSection === 'terms' ? (
                    <ChevronUp className="w-4 h-4 text-amber-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-amber-400/70" />
                  )}
                </button>

                {openSection === 'terms' && (
                  <div className="p-3 pt-0 border-t border-amber-900/30 space-y-2.5 text-[11px] text-amber-100/90 leading-relaxed animate-in fade-in duration-200">
                    <div className="p-2.5 rounded-lg bg-red-950/40 border border-red-500/40 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-red-300 block uppercase text-[10px] tracking-wider">
                          15 Minute Room Joining Window (Strict)
                        </span>
                        <span>
                          Match shuru hone se theek 15 minute pehle Room ID &amp; Password unlock hoga. Tamam players ko <b>15 minute ke andar room mein enter hona lazmi hai</b>. Late hone ya match miss hone par <b>fees 100% NON-REFUNDABLE</b> hogi.
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5 pl-1">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <span><b>Fair Play &amp; Anti-Cheat:</b> Emulators, iPads, triggers, hacks, config files, ya teaming sakht mana hai. Khilaf-warzi par UID permanent ban aur prize seize ho jayega.</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <span><b>Exact Seat Allocation:</b> Har player ko uski booked Team aur Seat number par hi baithna hoga. Ghalat slot par baithne par room se kick kar diya jayega.</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 2: PRIVACY & ACCOUNT POLICY */}
              <div className="rounded-xl border border-amber-800/40 bg-[#170f09]/90 overflow-hidden shadow">
                <button
                  onClick={() => toggleSection('privacy')}
                  className="w-full p-3 flex items-center justify-between text-left hover:bg-amber-950/30 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-amber-500/20 text-amber-400 flex items-center justify-center">
                      <ShieldCheck className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-heading font-black tracking-wide text-white uppercase">
                      Privacy &amp; Account Policy
                    </span>
                  </div>
                  {openSection === 'privacy' ? (
                    <ChevronUp className="w-4 h-4 text-amber-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-amber-400/70" />
                  )}
                </button>

                {openSection === 'privacy' && (
                  <div className="p-3 pt-0 border-t border-amber-900/30 space-y-2 text-[11px] text-amber-100/90 leading-relaxed animate-in fade-in duration-200">
                    <p>
                      Aapka PUBG UID aur 4-digit security PIN sirf aapke wallet balance aur seat reservations ki verification ke liye Firebase Realtime Database mein mehfooz rakha jata hai.
                    </p>
                    <p>
                      Hum kisi teesray idaray ko aapka data share nahi karte. Har booking cryptographic hash ke sath verify hoti hai.
                    </p>
                  </div>
                )}
              </div>

              {/* SECTION 3: OFFICIAL CONTACT & PAYMENT ACCOUNTS */}
              <div className="rounded-xl border border-amber-800/40 bg-[#170f09]/90 overflow-hidden shadow">
                <button
                  onClick={() => toggleSection('contact')}
                  className="w-full p-3 flex items-center justify-between text-left hover:bg-amber-950/30 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-amber-500/20 text-amber-400 flex items-center justify-center">
                      <Phone className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-heading font-black tracking-wide text-white uppercase">
                      Official Admin Contact &amp; Accounts
                    </span>
                  </div>
                  {openSection === 'contact' ? (
                    <ChevronUp className="w-4 h-4 text-amber-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-amber-400/70" />
                  )}
                </button>

                {openSection === 'contact' && (
                  <div className="p-3 pt-0 border-t border-amber-900/30 space-y-2.5 text-[11px] text-amber-100/90 leading-relaxed animate-in fade-in duration-200">
                    <div className="p-2.5 rounded-lg bg-[#0e0703] border border-amber-800/40 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-amber-400 uppercase font-mono">Easypaisa &amp; JazzCash</span>
                        <span className="text-emerald-400 text-[10px] font-bold">Muhammad Nadir</span>
                      </div>
                      <div className="text-sm font-black font-mono text-white">03052838367</div>
                    </div>

                    <a
                      href="https://wa.me/923052838367"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow"
                    >
                      <MessageCircle className="w-3.5 h-3.5 fill-current" />
                      <span>WhatsApp Support (03052838367)</span>
                    </a>
                  </div>
                )}
              </div>

              {/* SECTION 4: FREQUENTLY ASKED QUESTIONS (FAQ) */}
              <div className="rounded-xl border border-amber-800/40 bg-[#170f09]/90 overflow-hidden shadow">
                <button
                  onClick={() => toggleSection('faq')}
                  className="w-full p-3 flex items-center justify-between text-left hover:bg-amber-950/30 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-amber-500/20 text-amber-400 flex items-center justify-center">
                      <HelpCircle className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-heading font-black tracking-wide text-white uppercase">
                      FAQ &amp; How It Works
                    </span>
                  </div>
                  {openSection === 'faq' ? (
                    <ChevronUp className="w-4 h-4 text-amber-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-amber-400/70" />
                  )}
                </button>

                {openSection === 'faq' && (
                  <div className="p-3 pt-0 border-t border-amber-900/30 space-y-2 text-[11px] text-amber-100/90 leading-relaxed animate-in fade-in duration-200">
                    <div>
                      <p className="font-bold text-amber-300">1. Room ID aur Password kab milega?</p>
                      <p className="text-amber-200/70">Match time se theek 15 minute pehle 'My Bookings' tab aur ہوم اسکرین پر Room credentials unlock ho jayenge.</p>
                    </div>
                    <div>
                      <p className="font-bold text-amber-300">2. Balance kaisay add karein?</p>
                      <p className="text-amber-200/70">Recharge button dabayein, portal par payment verify karein, diamonds foran aapke account mein add ho jayenge.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 5. Footer & Discreet Admin Icon */}
        <div className="pt-3 border-t border-amber-950/50 flex items-center justify-between text-[11px] text-amber-300/60">
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
