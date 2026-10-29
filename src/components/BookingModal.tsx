import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Minus, 
  Plus, 
  AlertCircle, 
  Users,
  CheckCircle2,
  ArrowRight,
  Loader2,
  Trophy,
  Shield,
  Flame,
  Search,
  Crown
} from 'lucide-react';
import { Team, PubgProfileVerification } from '../types/tournament';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournamentId: string;
  teams: Team[];
  initialTeamNumber: number;
  initialSeatNumber: number;
  userBalance: number;
  savedPubgId?: string;
  savedPlayerName?: string;
  onConfirmBooking: (teamNumber: number, seatNumbers: number[], players: { pubgId: string; name: string; avatarUrl?: string }[]) => void;
  onOpenRecharge: () => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  onClose,
  teams,
  initialTeamNumber,
  initialSeatNumber,
  userBalance,
  savedPubgId,
  savedPlayerName,
  onConfirmBooking,
  onOpenRecharge
}) => {
  const [selectedTeamNumber, setSelectedTeamNumber] = useState(initialTeamNumber);
  const [seatCount, setSeatCount] = useState(1);
  const [playersData, setPlayersData] = useState<{ pubgId: string; name: string }[]>([
    {
      pubgId: savedPubgId || '',
      name: savedPlayerName || ''
    }
  ]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Verified PUBG Mobile profiles per player slot
  const [profiles, setProfiles] = useState<Record<number, {
    data?: PubgProfileVerification;
    loading: boolean;
    error?: string;
  }>>({});

  // Debounce timers for UID inputs
  const debounceTimers = useRef<Record<number, any>>({});

  // Find the selected team
  const currentTeam = teams.find(t => t.teamNumber === selectedTeamNumber) || teams[0];
  
  // Available seats in this team
  const availableSeats = currentTeam 
    ? currentTeam.seats.filter(s => s.status === 'AVAILABLE')
    : [];

  const maxSeatsAllowed = Math.min(4, Math.max(1, availableSeats.length));

  useEffect(() => {
    if (isOpen) {
      setSelectedTeamNumber(initialTeamNumber);
      setSeatCount(1);
      setPlayersData([
        {
          pubgId: savedPubgId || '',
          name: savedPlayerName || ''
        }
      ]);
      setProfiles({});
      setErrorMessage(null);
      if (savedPubgId) {
        fetchPubgProfile(0, savedPubgId);
      }
    }
    return () => {
      // Clear timers
      Object.values(debounceTimers.current).forEach(t => clearTimeout(t));
    };
  }, [isOpen, initialTeamNumber, initialSeatNumber, savedPubgId, savedPlayerName]);

  // Handle seat increment / decrement
  const handleSeatChange = (newCount: number) => {
    if (newCount < 1 || newCount > maxSeatsAllowed) return;
    setSeatCount(newCount);

    // Resize players data array
    setPlayersData(prev => {
      const copy = [...prev];
      if (newCount > copy.length) {
        while (copy.length < newCount) {
          copy.push({ pubgId: '', name: '' });
        }
      } else if (newCount < copy.length) {
        return copy.slice(0, newCount);
      }
      return copy;
    });
  };

  // Fetch PUBG Mobile Profile via API
  const fetchPubgProfile = async (index: number, uidToFetch: string) => {
    const clean = uidToFetch.trim();
    if (!clean) {
      setProfiles(prev => {
        const copy = { ...prev };
        delete copy[index];
        return copy;
      });
      return;
    }

    if (clean.length < 8) {
      setProfiles(prev => ({
        ...prev,
        [index]: { loading: false, error: 'PUBG UID must be 8 to 11 digits' }
      }));
      return;
    }

    setProfiles(prev => ({
      ...prev,
      [index]: { loading: true, error: undefined }
    }));

    try {
      const res = await fetch('/api/pubg/verify-uid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: clean })
      });

      if (!res.ok) {
        throw new Error('Failed to verify UID');
      }

      const data: PubgProfileVerification = await res.json();
      if (data && data.isValid) {
        setProfiles(prev => ({
          ...prev,
          [index]: { data, loading: false }
        }));

        // Auto-fill player IGN into name field (for index 0, preserve savedPlayerName if set)
        if (data.playerName) {
          setPlayersData(prev => {
            const copy = [...prev];
            if (copy[index]) {
              const keepName = (index === 0 && savedPlayerName) ? savedPlayerName : (data.playerName || copy[index].name);
              copy[index] = { ...copy[index], name: keepName };
            }
            return copy;
          });
        }
      } else {
        setProfiles(prev => ({
          ...prev,
          [index]: { loading: false }
        }));
      }
    } catch {
      // Suppress network error completely as requested (no error message banner)
      setProfiles(prev => ({
        ...prev,
        [index]: { loading: false }
      }));
    }
  };

  const handleUidChange = (index: number, val: string) => {
    updatePlayerField(index, 'pubgId', val);

    // Auto-fetch profile after debounce if user has entered 8 or more digits
    if (debounceTimers.current[index]) {
      clearTimeout(debounceTimers.current[index]);
    }

    const clean = val.trim();
    if (clean.length >= 8 && /^[0-9]+$/.test(clean)) {
      debounceTimers.current[index] = setTimeout(() => {
        fetchPubgProfile(index, clean);
      }, 450);
    } else if (clean.length === 0) {
      setProfiles(prev => {
        const copy = { ...prev };
        delete copy[index];
        return copy;
      });
    }
  };

  const updatePlayerField = (index: number, field: 'pubgId' | 'name', value: string) => {
    setPlayersData(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  // 150 Diamonds per seat
  const totalDiamonds = seatCount * 150;
  const hasSufficientBalance = userBalance >= totalDiamonds;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // 1. Check PUBG ID filled for all seats
    for (let i = 0; i < seatCount; i++) {
      if (!playersData[i].pubgId.trim()) {
        setErrorMessage(`Please enter PUBG ID for Player ${i + 1}.`);
        return;
      }
    }

    // 2. CHECK BALANCE
    if (!hasSufficientBalance) {
      setErrorMessage(`Insufficient Balance! You currently have ${userBalance} 💎, but reserving ${seatCount} seat(s) requires ${totalDiamonds} 💎 (Shortage: ${totalDiamonds - userBalance} 💎). Please recharge your account first.`);
      return;
    }

    // Pick the seat numbers to reserve
    const seatsToReserve = availableSeats.slice(0, seatCount).map(s => s.seatNumber);

    const playersWithAvatars = playersData.map((player, i) => ({
      pubgId: player.pubgId.trim(),
      name: player.name.trim() || profiles[i]?.data?.playerName || `Player_${player.pubgId.slice(-4)}`,
      avatarUrl: profiles[i]?.data?.avatarUrl || '/images/avatars/pubg_avatar_golden_1792656009701.jpg'
    }));

    onConfirmBooking(selectedTeamNumber, seatsToReserve, playersWithAvatars);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-xl bg-gradient-to-b from-[#0c162c] to-[#070d1a] border border-cyan-500/50 rounded-2xl shadow-[0_0_40px_rgba(0,240,255,0.25)] overflow-hidden my-auto max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-cyan-900/60 bg-[#091122]/90">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 font-bold font-mono text-sm">
              T{selectedTeamNumber}
            </div>
            <div>
              <h2 className="font-heading text-xl font-bold text-white tracking-wide">
                Join Team {selectedTeamNumber}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-950/70 border border-red-500/60 text-red-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Seats Counter */}
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Seats
            </span>

            {/* Minus - Count - Plus Controls */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleSeatChange(seatCount - 1)}
                disabled={seatCount <= 1}
                className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-cyan-950 text-cyan-400 hover:text-white border border-slate-700 hover:border-cyan-500/50 flex items-center justify-center disabled:opacity-40 disabled:pointer-events-none transition-all active:scale-95 cursor-pointer"
              >
                <Minus className="w-4 h-4" />
              </button>

              <span className="w-10 text-center font-heading text-2xl font-black text-white font-mono">
                {seatCount}
              </span>

              <button
                type="button"
                onClick={() => handleSeatChange(seatCount + 1)}
                disabled={seatCount >= maxSeatsAllowed}
                className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-cyan-950 text-cyan-400 hover:text-white border border-slate-700 hover:border-cyan-500/50 flex items-center justify-center disabled:opacity-40 disabled:pointer-events-none transition-all active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* DYNAMIC PUBG ID INPUT BOXES */}
          <div className="space-y-3">

            {playersData.map((player, idx) => {
              const playerProfile = profiles[idx];
              const isVerified = Boolean(playerProfile?.data?.isValid);

              return (
                <div 
                  key={idx}
                  className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2.5 hover:border-cyan-800/60 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold flex items-center gap-1.5 font-mono">
                      {idx === 0 ? (
                        <span className="flex items-center gap-1 text-amber-300 font-bold">
                          <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /> Captain (Player 1)
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-cyan-400">
                          <Users className="w-3.5 h-3.5" /> Player {idx + 1}
                        </span>
                      )}
                    </span>
                    <span className="text-[10px] text-slate-500 uppercase font-mono">
                      Seat #{availableSeats[idx]?.seatNumber ?? idx + 1}
                    </span>
                  </div>

                  {/* UID & Search Button Input */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="relative">
                      <input
                        type="text"
                        value={player.pubgId}
                        onChange={(e) => handleUidChange(idx, e.target.value)}
                        placeholder="Enter PUBG ID"
                        className="w-full pl-3 pr-16 py-2 rounded-lg bg-slate-950 border border-slate-700 focus:border-cyan-400 text-xs font-mono text-white placeholder-slate-500 outline-none"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => fetchPubgProfile(idx, player.pubgId)}
                        disabled={playerProfile?.loading || !player.pubgId.trim()}
                        className="absolute right-1 top-1 bottom-1 px-2.5 rounded bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-black font-bold text-[10px] flex items-center gap-1 transition-colors"
                      >
                        {playerProfile?.loading ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <>
                            <Search className="w-3 h-3" />
                            <span>Verify</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div>
                      <input
                        type="text"
                        value={player.name}
                        onChange={(e) => updatePlayerField(idx, 'name', e.target.value)}
                        placeholder={idx === 0 ? "Player 1 Username (IGN)" : "Player In-Game Name (IGN)"}
                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 focus:border-cyan-400 text-xs text-white placeholder-slate-500 outline-none"
                      />
                    </div>
                  </div>

                  {/* LOADING STATE */}
                  {playerProfile?.loading && (
                    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 text-xs animate-pulse">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400 shrink-0" />
                      <span>Fetching official PUBG Mobile profile for ID: <b>{player.pubgId}</b>...</span>
                    </div>
                  )}

                  {/* ERROR STATE (Strictly filter out network errors) */}
                  {playerProfile?.error && !playerProfile.loading && !playerProfile.error.toLowerCase().includes('network') && (
                    <div className="p-2.5 rounded-lg bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
                      <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      <span>{playerProfile.error}</span>
                    </div>
                  )}

                  {/* LIVE PUBG PROFILE CARD (Rendered inside Join section when verified) */}
                  {isVerified && playerProfile?.data && (
                    <div className="p-3 rounded-xl bg-gradient-to-r from-[#0d1c3a] via-[#09152b] to-[#14233f] border border-cyan-400/50 shadow-[0_0_15px_rgba(0,240,255,0.15)] relative overflow-hidden animate-fadeIn">
                      <div className="flex items-center justify-between pb-2 border-b border-cyan-900/60 mb-2">
                        <div className="flex items-center gap-2.5">
                          {/* Avatar Frame with Level */}
                          <div className="relative shrink-0">
                            <div className="w-11 h-11 rounded-lg bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-600 p-0.5 shadow-md">
                              <img
                                src={playerProfile.data.avatarUrl || '/images/avatars/pubg_avatar_golden_1792656009701.jpg'}
                                alt={playerProfile.data.playerName || 'PUBG Avatar'}
                                className="w-full h-full rounded-[6px] object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = '/images/avatars/pubg_avatar_golden_1792656009701.jpg';
                                }}
                              />
                            </div>
                            <span className="absolute -bottom-1 -right-1 px-1 py-0.2 rounded bg-cyan-400 text-slate-950 font-black text-[9px] font-mono leading-none shadow">
                              Lv.{playerProfile.data.level ?? 68}
                            </span>
                          </div>

                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-heading font-black text-amber-300 text-sm tracking-wide">
                                {playerProfile.data.playerName}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Verified PUBG Profile
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                              ID: <span className="text-cyan-300 font-semibold">{playerProfile.data.uid}</span> · <span className="text-slate-400">{playerProfile.data.serverRegion || 'Asia / Pakistan'}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Badges / Stats Bar */}
                      <div className="grid grid-cols-3 gap-1.5 text-center">
                        <div className="px-2 py-1 rounded-lg bg-slate-900/80 border border-slate-800">
                          <div className="text-[9px] text-slate-400 uppercase font-bold flex items-center justify-center gap-1">
                            <Trophy className="w-3 h-3 text-amber-400" /> Tier
                          </div>
                          <div className="text-[11px] font-bold text-amber-300 truncate mt-0.5">
                            {playerProfile.data.tier || 'Ace Dominator'}
                          </div>
                        </div>

                        <div className="px-2 py-1 rounded-lg bg-slate-900/80 border border-slate-800">
                          <div className="text-[9px] text-slate-400 uppercase font-bold flex items-center justify-center gap-1">
                            <Shield className="w-3 h-3 text-cyan-400" /> Clan
                          </div>
                          <div className="text-[11px] font-bold text-cyan-300 truncate mt-0.5">
                            {playerProfile.data.clan || 'PAK ESPORTS'}
                          </div>
                        </div>

                        <div className="px-2 py-1 rounded-lg bg-slate-900/80 border border-slate-800">
                          <div className="text-[9px] text-slate-400 uppercase font-bold flex items-center justify-center gap-1">
                            <Flame className="w-3 h-3 text-rose-400" /> Popularity
                          </div>
                          <div className="text-[11px] font-bold text-rose-300 truncate mt-0.5">
                            {playerProfile.data.popularity || '45.2K'}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>


          {/* Insufficient Balance Notice if low */}
          {!hasSufficientBalance && (
            <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/60 text-xs text-red-200 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>Need {totalDiamonds - userBalance} more diamonds!</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenRecharge();
                }}
                className="py-1 px-2.5 rounded-lg bg-red-500 text-black font-extrabold text-[11px] uppercase whitespace-nowrap hover:bg-red-400 transition-colors"
              >
                Recharge Now
              </button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              Cancel
            </button>

            {hasSufficientBalance ? (
              <button
                type="submit"
                className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] active:scale-95 flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Book Now ({totalDiamonds} 💎)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenRecharge();
                }}
                className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-extrabold text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(0,240,255,0.3)] active:scale-95 flex items-center gap-1.5"
              >
                <span>Please Recharge Account</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
