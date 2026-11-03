import React, { useState, useEffect } from 'react';
import { 
  X, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight, 
  Crown 
} from 'lucide-react';
import { Team, GameType } from '../types/tournament';

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
  activeGame?: GameType;
  isTdm?: boolean;
  onConfirmBooking: (teamNumber: number, seatNumbers: number[], players: { pubgId: string; name: string; avatarUrl?: string }[]) => void;
  onOpenRecharge: () => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  onClose,
  tournamentId,
  teams,
  initialTeamNumber,
  initialSeatNumber,
  userBalance,
  savedPubgId,
  savedPlayerName,
  activeGame,
  isTdm,
  onConfirmBooking,
  onOpenRecharge
}) => {
  const [selectedTeamNumber, setSelectedTeamNumber] = useState(initialTeamNumber);
  const [playersData, setPlayersData] = useState<{ pubgId: string; name: string }[]>([
    {
      pubgId: savedPubgId || '',
      name: savedPlayerName || ''
    }
  ]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedTeamNumber(initialTeamNumber);
      setPlayersData([
        {
          pubgId: savedPubgId || '',
          name: savedPlayerName || ''
        }
      ]);
      setErrorMessage(null);
    }
  }, [isOpen, initialTeamNumber, initialSeatNumber, savedPubgId, savedPlayerName]);

  const updatePlayerField = (index: number, field: 'pubgId' | 'name', value: string) => {
    setPlayersData(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const currentTeam = teams.find(t => t.teamNumber === selectedTeamNumber) || teams[0];
  const isTdmMatch = Boolean(isTdm || tournamentId === 'PUBG_TDM' || teams.length === 2);
  const isDuo = !isTdmMatch && currentTeam?.seats?.length === 2;
  const totalDiamonds = isTdmMatch ? 0 : (isDuo ? 300 : 600);
  const hasSufficientBalance = isTdmMatch ? true : (userBalance >= totalDiamonds);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const captainUid = playersData[0]?.pubgId.trim();
    if (!captainUid) {
      setErrorMessage(`Please enter ${isTdmMatch ? 'your' : 'Captain'} ${activeGame === 'FREE_FIRE' ? 'Free Fire ID / UID' : 'PUBG ID'}.`);
      return;
    }

    // STRICT SINGLE-ENTRY & DUPLICATE UID ENFORCEMENT FOR TEAM DEATH MATCH (TDM)
    // "Team death match ki entry free rakho eik person sirf eik bar join hoske matlab Same uid se again join na how"
    if (isTdmMatch) {
      const isAlreadyRegistered = teams.some(t =>
        t.seats?.some(s =>
          (s.status === 'APPROVED' || s.status === 'RESERVED_PENDING') &&
          s.playerUid &&
          s.playerUid.trim().toLowerCase() === captainUid.toLowerCase()
        )
      );

      if (isAlreadyRegistered) {
        setErrorMessage(`⚠️ Duplicate Entry Blocked: Yeh PUBG UID (${captainUid}) pehle se hi Team Death Match me registered hai! Eik person / UID sirf eik baar hi join ho sakta hai.`);
        return;
      }
    }

    // CHECK BALANCE (only for paid matches)
    if (!isTdmMatch && !hasSufficientBalance) {
      setErrorMessage(`Insufficient Balance! You currently have ${userBalance} 💎, but booking requires ${totalDiamonds} 💎 (Shortage: ${totalDiamonds - userBalance} 💎). Please recharge your account first.`);
      return;
    }

    // In TDM, only the single clicked seat is reserved! In Duo, [1, 2]. In Squad, [1, 2, 3, 4]
    const seatsToReserve = isTdmMatch ? [initialSeatNumber || 1] : (isDuo ? [1, 2] : [1, 2, 3, 4]);

    const playerName = playersData[0]?.name.trim() || `${isTdmMatch ? 'Player' : 'Captain'}_${captainUid.slice(-4)}`;
    const playersList = [
      {
        pubgId: captainUid,
        name: playerName,
        avatarUrl: '/images/avatars/pubg_avatar_golden_1792656009701.jpg'
      }
    ];

    onConfirmBooking(selectedTeamNumber, seatsToReserve, playersList);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-xl bg-gradient-to-b from-[#0c162c] to-[#070e1a] border border-cyan-500/50 rounded-2xl shadow-[0_0_40px_rgba(0,240,255,0.25)] overflow-hidden my-auto max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-cyan-900/60 bg-[#091122]/90">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl ${isTdmMatch ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'bg-amber-500/20 border-amber-500/50 text-amber-400'} border flex items-center justify-center font-bold font-mono text-sm`}>
              {isTdmMatch ? `S${initialSeatNumber || 1}` : `T${selectedTeamNumber}`}
            </div>
            <div>
              <h2 className="font-heading text-xl font-bold text-white tracking-wide">
                {isTdmMatch 
                  ? `Join ${currentTeam?.name || `Team ${selectedTeamNumber}`} (Slot ${initialSeatNumber || 1})` 
                  : `Book ${isDuo ? 'Duo' : 'Squad'} Box - Team ${selectedTeamNumber}`}
              </h2>
              <p className={`text-[11px] font-mono ${isTdmMatch ? 'text-emerald-300' : 'text-amber-300'}`}>
                {isTdmMatch 
                  ? 'Team Death Match • 100% Free Entry • 1 Slot Per Person' 
                  : (isDuo ? 'Livik Duo Match • 2 Slots Reserved (300 💎)' : `${activeGame === 'FREE_FIRE' ? 'Free Fire Clash Squad' : 'PUBG Mobile Squad'} • 4 Slots Reserved (600 💎)`)}
              </p>
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

          {/* SQUAD / DUO / TDM SUMMARY NOTICE */}
          {isTdmMatch ? (
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-500/15 via-slate-900/80 to-teal-500/15 border border-emerald-500/50 text-xs text-emerald-200 space-y-1">
              <div className="flex items-center justify-between font-bold">
                <span className="flex items-center gap-1.5 text-white">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Team Death Match (TDM 4v4)</span>
                </span>
                <span className="text-emerald-400 font-mono font-black text-sm uppercase px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/60">
                  Free Entry (0 💎)
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                ⚡ <span className="font-bold text-amber-300">Strict Rule:</span> Eik person sirf eik baar join ho sakta hai (Same UID se again join nahi ho sakta). Winner Team Cash: <span className="text-emerald-300 font-bold">PKR 1,000</span>!
              </p>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-500/15 via-slate-900/80 to-cyan-500/15 border border-amber-500/40 text-xs text-amber-200 space-y-1">
              <div className="flex items-center justify-between font-bold">
                <span className="flex items-center gap-1.5 text-white">
                  <Crown className="w-4 h-4 text-amber-400" />
                  <span>Entire {isDuo ? 'Duo Box (2 Slots)' : 'Squad Box (4 Slots)'} Booking</span>
                </span>
                <span className="text-amber-400 font-mono font-black text-sm">{totalDiamonds} 💎</span>
              </div>
              <p className="text-[11px] text-slate-300">
                {isDuo 
                  ? 'Booking reserves both 2 duo seats (Seat 1 Captain + Seat 2 Partner). Enter your Captain details below:'
                  : 'Booking reserves all 4 squad seats (Seat 1 Captain + Seats 2, 3, 4). Enter your Captain details below:'}
              </p>
            </div>
          )}

          {/* CAPTAIN / PLAYER INPUT BOX */}
          <div className="space-y-3">
            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2.5 hover:border-cyan-800/60 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold flex items-center gap-1.5 font-mono">
                  {isTdmMatch ? (
                    <span className="flex items-center gap-1 text-emerald-300 font-bold">
                      👤 Player Slot #{initialSeatNumber || 1}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-amber-300 font-bold">
                      <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /> Captain (Slot 1)
                    </span>
                  )}
                </span>
                <span className={`text-[10px] uppercase font-mono ${isTdmMatch ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {isTdmMatch ? '1 Slot (Free Entry)' : (isDuo ? 'Both 2 Slots' : 'All 4 Slots')}
                </span>
              </div>

              {/* UID & Name Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <input
                    type="text"
                    value={playersData[0]?.pubgId || ''}
                    onChange={(e) => updatePlayerField(0, 'pubgId', e.target.value)}
                    placeholder={activeGame === 'FREE_FIRE' ? "Enter Free Fire ID / UID" : "Enter PUBG ID"}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 focus:border-cyan-400 text-xs font-mono text-white placeholder-slate-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <input
                    type="text"
                    value={playersData[0]?.name || ''}
                    onChange={(e) => updatePlayerField(0, 'name', e.target.value)}
                    placeholder={isTdmMatch ? "Player In-Game Name (IGN)" : "Captain In-Game Name (IGN)"}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 focus:border-cyan-400 text-xs text-white placeholder-slate-500 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Insufficient Balance Notice if low (only for non-TDM matches) */}
          {!isTdmMatch && !hasSufficientBalance && (
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
              className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>

            {isTdmMatch ? (
              <button
                type="submit"
                className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-extrabold text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(16,185,129,0.4)] active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Join TDM (Free Entry)</span>
              </button>
            ) : hasSufficientBalance ? (
              <button
                type="submit"
                className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{activeGame === 'FREE_FIRE' ? `Book Squad Box (${totalDiamonds} 💎)` : `Book Now (${totalDiamonds} 💎)`}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenRecharge();
                }}
                className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-extrabold text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(0,240,255,0.3)] active:scale-95 flex items-center gap-1.5 cursor-pointer"
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
