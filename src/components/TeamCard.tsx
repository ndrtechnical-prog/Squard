import React from 'react';
import { Users, Plus, CheckCircle2, Clock, Crown, Lock } from 'lucide-react';
import { Team, Seat, GameType } from '../types/tournament';

interface TeamCardProps {
  team: Team;
  onJoinSeat: (teamNumber: number, seatNumber: number) => void;
  activeGame?: GameType;
  isTdm?: boolean;
}

const DEFAULT_AVATAR = '/images/avatars/pubg_avatar_golden_1792656009701.jpg';

export const TeamCard: React.FC<TeamCardProps> = ({ team, onJoinSeat, activeGame, isTdm }) => {
  const approvedCount = team.seats.filter(s => s.status === 'APPROVED').length;
  const pendingCount = team.seats.filter(s => s.status === 'RESERVED_PENDING').length;
  const occupiedCount = approvedCount + pendingCount;
  const totalSeats = team.seats.length || 4;

  return (
    <div className="rounded-2xl bg-gradient-to-b from-[#0a1426] to-[#070e1c] border border-cyan-900/40 p-4 sm:p-5 shadow-lg hover:border-cyan-700/50 transition-all duration-300">
      {/* Team Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Users className="w-4 h-4" />
          </div>
          <h3 className="font-heading text-lg font-bold text-white tracking-wide">
            {team.name}
          </h3>
        </div>

        {/* Occupancy Indicator */}
        <div className="text-xs sm:text-sm font-mono font-bold text-slate-400 tabular-nums">
          <span className={occupiedCount === totalSeats ? 'text-amber-400' : 'text-slate-200'}>
            {occupiedCount}
          </span>
          <span className="text-slate-500"> / {totalSeats}</span>
        </div>
      </div>

      {/* Seats Row with Dynamic Duo (2) or Squad (4) Layout */}
      <div className={`grid ${totalSeats === 2 ? 'grid-cols-2 max-w-xs mx-auto' : 'grid-cols-4'} gap-2 sm:gap-3`}>
        {team.seats.map((seat: Seat) => {
          const isApproved = seat.status === 'APPROVED';
          const isPending = seat.status === 'RESERVED_PENDING';
          const isCaptain = !isTdm && (seat.seatNumber === 1 || seat.isCaptain || seat.role === 'captain');

          if (isApproved) {
            const avatarSrc = seat.avatarUrl || DEFAULT_AVATAR;

            return (
              <div
                key={seat.id}
                className="flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-xl bg-gradient-to-b from-cyan-950/50 to-slate-900/90 border border-cyan-400/80 shadow-[0_0_15px_rgba(0,240,255,0.25)] aspect-square relative group"
                title={`Seat ${seat.seatNumber}: ${seat.playerName || 'Player'} ${isCaptain ? '(Captain 👑)' : ''} (Approved)`}
              >
                {/* Golden Crown on Top Right Corner for Captain */}
                {isCaptain && (
                  <div
                    className="absolute -top-1.5 -right-1.5 z-20 w-5 h-5 rounded-full bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-300 flex items-center justify-center text-amber-950 border border-amber-200 shadow-[0_0_10px_rgba(245,158,11,0.85)]"
                    title="Squad Captain 👑"
                  >
                    <Crown className="w-3 h-3 fill-amber-950 stroke-amber-950 stroke-[2.2]" />
                  </div>
                )}

                {/* Real PUBG Player Profile Picture / Avatar */}
                <div className="relative mb-1">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full p-0.5 bg-gradient-to-tr from-amber-400 via-cyan-400 to-amber-500 shadow-md overflow-hidden relative">
                    <img
                      src={avatarSrc}
                      alt={seat.playerName || 'Player Profile Picture'}
                      className="w-full h-full object-cover rounded-full group-hover:scale-110 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = DEFAULT_AVATAR;
                      }}
                    />
                  </div>
                  {/* Verified badge */}
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center text-white border-2 border-slate-950 text-[9px] font-black shadow">
                    ✓
                  </div>
                </div>

                {/* Player Name / Status */}
                <div className="flex flex-col items-center justify-center max-w-full px-0.5">
                  <span className="text-[10px] sm:text-[11px] font-bold text-amber-300 truncate max-w-full leading-tight text-center">
                    {seat.playerName || 'Player'}
                  </span>
                  {isCaptain ? (
                    <span className="text-[8px] sm:text-[9px] font-mono text-amber-300 font-bold uppercase leading-none mt-0.5 flex items-center gap-0.5">
                      👑 CPT
                    </span>
                  ) : (
                    <span className="text-[8px] sm:text-[9px] font-mono text-cyan-300 uppercase leading-none mt-0.5">
                      S#{seat.seatNumber}
                    </span>
                  )}
                </div>

                {/* Tooltip on hover with Player Details */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-9 px-2.5 py-1 rounded-lg bg-black/95 text-[10px] text-cyan-300 font-mono pointer-events-none whitespace-nowrap z-30 border border-cyan-500/50 shadow-xl flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="font-bold text-white">{seat.playerName}</span>
                  {isCaptain && <span className="text-amber-400 font-bold">👑 Captain</span>}
                  {seat.playerUid && <span className="text-slate-400 font-normal">({seat.playerUid})</span>}
                </div>
              </div>
            );
          }

          if (isPending) {
            const avatarSrc = seat.avatarUrl || DEFAULT_AVATAR;

            return (
              <div
                key={seat.id}
                className="flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-xl bg-gradient-to-b from-amber-950/40 to-slate-900/90 border border-amber-500/70 shadow-[0_0_12px_rgba(245,158,11,0.25)] aspect-square relative group"
                title={`Seat ${seat.seatNumber}: ${seat.playerName || 'Player'} ${isCaptain ? '(Captain 👑)' : ''} (Pending Verification)`}
              >
                {/* Golden Crown on Top Right Corner for Captain */}
                {isCaptain && (
                  <div
                    className="absolute -top-1.5 -right-1.5 z-20 w-5 h-5 rounded-full bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-300 flex items-center justify-center text-amber-950 border border-amber-200 shadow-[0_0_10px_rgba(245,158,11,0.85)]"
                    title="Squad Captain 👑"
                  >
                    <Crown className="w-3 h-3 fill-amber-950 stroke-amber-950 stroke-[2.2]" />
                  </div>
                )}

                {/* Pending Avatar with spinning status indicator */}
                <div className="relative mb-1">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full p-0.5 bg-gradient-to-tr from-amber-500 via-amber-300 to-amber-600 shadow-md overflow-hidden relative">
                    <img
                      src={avatarSrc}
                      alt={seat.playerName || 'Pending Player'}
                      className="w-full h-full object-cover rounded-full opacity-80"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = DEFAULT_AVATAR;
                      }}
                    />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center text-black border-2 border-slate-950 shadow">
                    <Clock className="w-2.5 h-2.5 animate-spin-slow" />
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center max-w-full px-0.5">
                  <span className="text-[10px] sm:text-[11px] font-bold text-amber-400 truncate max-w-full leading-tight text-center">
                    {seat.playerName || 'Pending'}
                  </span>
                  {isCaptain ? (
                    <span className="text-[8px] sm:text-[9px] font-mono text-amber-300 font-bold uppercase leading-none mt-0.5 flex items-center gap-0.5">
                      👑 CPT
                    </span>
                  ) : (
                    <span className="text-[8px] sm:text-[9px] font-mono text-amber-200/80 uppercase leading-none mt-0.5">
                      S#{seat.seatNumber}
                    </span>
                  )}
                </div>
              </div>
            );
          }

          // Locked squad member slots (in Squad/Duo matches, slots 2+ are locked; captain slot 1 books the entire box)
          // In Team Death Match (TDM), every slot 1-4 is unlocked and can be joined individually for Free!
          const isSquadSlotLocked = isTdm ? false : (seat.seatNumber > 1);
          if (isSquadSlotLocked) {
            return (
              <div
                key={seat.id}
                className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-950/70 border border-slate-900 text-slate-600 aspect-square relative opacity-50 cursor-not-allowed select-none"
                title={`Slot ${seat.seatNumber} is locked. Captain slot (👑 Slot 1) books the entire 4-player squad box (600 💎).`}
              >
                <div className="w-8 h-8 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-center text-slate-600 mb-1">
                  <Lock className="w-4 h-4 text-slate-600" />
                </div>
                <span className="text-[10px] font-mono text-slate-600 uppercase">
                  Locked
                </span>
              </div>
            );
          }

          // Empty Seat (In TDM: free individual slot; In Erangel/Livik/FF: books entire box)
          return (
            <button
              key={seat.id}
              onClick={() => onJoinSeat(team.teamNumber, seat.seatNumber)}
              className={`flex flex-col items-center justify-center p-2 rounded-xl bg-slate-900/60 border ${
                isTdm 
                  ? 'border-emerald-500/40 hover:border-emerald-400 group hover:bg-emerald-950/20' 
                  : 'border-slate-800 hover:border-cyan-500/50 group'
              } text-slate-400 aspect-square shadow-inner transition-all duration-200 cursor-pointer seat-available-hover relative`}
              title={
                isTdm
                  ? `Click to join ${team.name} Slot ${seat.seatNumber} (Free Entry)`
                  : `Click to book Team ${team.teamNumber} ${totalSeats === 2 ? 'Duo Box (300 💎)' : 'Squad Box (600 💎)'}`
              }
            >
              {/* Golden Crown on Top Right Corner only for Duo/Squad Captain Seat */}
              {!isTdm && (
                <div
                  className="absolute -top-1 -right-1 z-20 w-4 h-4 rounded-full bg-amber-500/25 border border-amber-400/60 flex items-center justify-center text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.4)]"
                  title="Captain Slot 👑"
                >
                  <Crown className="w-2.5 h-2.5 fill-amber-400/80 stroke-amber-300" />
                </div>
              )}

              {/* Light sweep reflection on hover */}
              <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/0 via-cyan-400/5 to-cyan-400/0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-xl" />

              <div className={`w-8 h-8 rounded-lg ${
                isTdm
                  ? 'bg-emerald-950/60 group-hover:bg-emerald-500/25 border border-emerald-500/30 group-hover:border-emerald-400/60 text-emerald-400 group-hover:text-emerald-200'
                  : 'bg-slate-800/80 group-hover:bg-cyan-500/25 border border-transparent group-hover:border-cyan-400/60 text-slate-300 group-hover:text-cyan-200'
              } flex items-center justify-center transition-all duration-200 mb-1 group-hover:scale-110 shadow-sm`}>
                <Plus className={`w-5 h-5 group-hover:rotate-90 transition-transform duration-300 ease-out ${
                  isTdm ? 'text-emerald-400 group-hover:text-emerald-300' : 'text-slate-300 group-hover:text-cyan-300'
                }`} />
              </div>
              <span className={`text-[11px] font-bold ${
                isTdm 
                  ? 'text-emerald-400 group-hover:text-emerald-300' 
                  : 'text-slate-300 group-hover:text-cyan-300'
              } transition-colors uppercase tracking-wider`}>
                {isTdm ? '+ Free' : (totalSeats === 2 ? '👑 Duo' : '👑 Squad')}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
