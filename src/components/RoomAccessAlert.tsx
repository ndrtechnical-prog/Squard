import React, { useState, useEffect } from 'react';
import { Copy, Check, KeyRound, AlertTriangle, Play, Trophy } from 'lucide-react';
import { Tournament } from '../types/tournament';

interface RoomAccessAlertProps {
  tournament: Tournament | null;
  onOpenLookup: () => void;
  onOpenResults: () => void;
}

export const RoomAccessAlert: React.FC<RoomAccessAlertProps> = ({
  tournament,
  onOpenLookup,
  onOpenResults
}) => {
  const [copiedId, setCopiedId] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);
  const [windowRemaining, setWindowRemaining] = useState<number>(0);

  useEffect(() => {
    if (!tournament) return;

    const tick = () => {
      const now = Date.now();
      // If room is open, calculate seconds until matchStartTime
      if (now >= tournament.roomOpenTime && now < tournament.matchStartTime) {
        setWindowRemaining(Math.max(0, Math.floor((tournament.matchStartTime - now) / 1000)));
      } else {
        setWindowRemaining(0);
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [tournament?.roomOpenTime, tournament?.matchStartTime]);

  if (!tournament) return null;

  const now = Date.now();
  const isRoomOpen = now >= tournament.roomOpenTime && now < tournament.matchStartTime;
  const isMatchLive = now >= tournament.matchStartTime && now < tournament.matchEndTime;
  const isWaitingResult = tournament.status === 'WAIT_FOR_RESULT' || (now >= tournament.matchEndTime && tournament.status !== 'COMPLETED');
  const isCompleted = tournament.status === 'COMPLETED';

  const formatMinSec = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleCopy = (text: string, type: 'id' | 'pass') => {
    navigator.clipboard.writeText(text);
    if (type === 'id') {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } else {
      setCopiedPass(true);
      setTimeout(() => setCopiedPass(false), 2000);
    }
  };

  return (
    <div className="w-full mb-6">
      {/* 1. ROOM ACCESS WINDOW ACTIVE (15 MINUTES) */}
      {isRoomOpen && (
        <div className="relative rounded-2xl bg-gradient-to-r from-cyan-950/80 via-slate-900/90 to-blue-950/80 border-2 border-cyan-400 p-4 sm:p-6 shadow-[0_0_30px_rgba(0,240,255,0.25)] animate-pulse-subtle">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/20 border border-cyan-400 flex items-center justify-center text-cyan-300">
                <KeyRound className="w-6 h-6 animate-spin-slow" />
              </div>
              <div>
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-black uppercase tracking-wider">
                  <span>ROOM CREDENTIALS UNLOCKED</span>
                  <span>·</span>
                  <span className="text-amber-300 font-mono tabular-nums">{formatMinSec(windowRemaining)} REMAINING</span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white mt-1">
                  15-Minute Game Lobby Access Window Active
                </h3>
                <p className="text-xs text-slate-300">
                  Approved participants can unlock Room ID and Password by verifying their booking reference.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={onOpenLookup}
                className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-extrabold text-sm uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(0,240,255,0.4)]"
              >
                Reveal My Room ID & Password
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. MATCH IN PROGRESS (1 HOUR TIMELINE) */}
      {isMatchLive && (
        <div className="rounded-2xl bg-gradient-to-r from-amber-950/70 to-slate-900 border border-amber-500/60 p-4 sm:p-5 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400 flex items-center justify-center text-amber-400">
              <Play className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="text-xs font-bold text-amber-400 uppercase tracking-widest">
                LIVE TOURNAMENT IN PROGRESS
              </div>
              <h4 className="text-base font-bold text-white">
                Match Started — Room Locked for 60 Minutes
              </h4>
            </div>
          </div>
          <div className="text-xs text-slate-400 text-center sm:text-right">
            Lobby is closed. Match ends at{' '}
            <span className="font-mono text-amber-300 font-bold">
              {new Date(tournament.matchEndTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      )}

      {/* 3. WAIT FOR RESULT */}
      {isWaitingResult && (
        <div className="rounded-2xl bg-gradient-to-r from-purple-950/70 to-slate-900 border border-purple-500/60 p-4 sm:p-5 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-400 flex items-center justify-center text-purple-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-purple-300 uppercase tracking-widest">
                MATCH CONCLUDED
              </div>
              <h4 className="text-base font-bold text-white">
                Waiting for Official Result Verification
              </h4>
            </div>
          </div>
          <div className="text-xs text-purple-200">
            Tournament administrators are reviewing replay kills and scorecards. Results will appear shortly.
          </div>
        </div>
      )}

      {/* 4. RESULTS PUBLISHED */}
      {isCompleted && (
        <div className="rounded-2xl bg-gradient-to-r from-emerald-950/80 to-slate-900 border border-emerald-500/60 p-4 sm:p-5 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-emerald-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-emerald-400 uppercase tracking-widest">
                OFFICIAL RESULTS PUBLISHED
              </div>
              <h4 className="text-base font-bold text-white">
                Winner & Prize Distribution Ready!
              </h4>
            </div>
          </div>
          <button
            onClick={onOpenResults}
            className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition-colors"
          >
            View Leaderboard & Prizes
          </button>
        </div>
      )}
    </div>
  );
};
