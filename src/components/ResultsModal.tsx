import React, { useState, useEffect } from 'react';
import { Trophy, Medal, X, Crown, Flame, Target } from 'lucide-react';
import { MatchResult } from '../types/tournament';

interface ResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ResultsModal: React.FC<ResultsModalProps> = ({ isOpen, onClose }) => {
  const [results, setResults] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchResults();
    }
  }, [isOpen]);

  const fetchResults = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/results');
      const data = await res.json();
      setResults(data.results || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const winner = results.find(r => r.rank === 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-[#0c162b] to-[#070e1c] border border-cyan-500/50 rounded-2xl p-5 sm:p-6 shadow-[0_0_40px_rgba(0,240,255,0.2)] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-cyan-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-heading text-xl font-bold text-white tracking-wide">
                Tournament Leaderboard & Results
              </h2>
              <p className="text-xs text-cyan-300">
                Official standings and prize money distribution
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Winner Banner if available */}
        {winner && (
          <div className="my-4 p-4 rounded-xl bg-gradient-to-r from-amber-950/80 via-slate-900 to-amber-950/80 border-2 border-amber-400/80 text-center relative overflow-hidden shadow-[0_0_25px_rgba(245,158,11,0.25)]">
            <Crown className="w-8 h-8 text-amber-400 mx-auto mb-1 animate-bounce" />
            <span className="text-[10px] font-black tracking-widest text-amber-300 uppercase">
              CHAMPION WINNER CHICKEN DINNER
            </span>
            <h3 className="font-heading text-2xl font-black text-white mt-0.5">
              {winner.teamName}
            </h3>
            <div className="flex items-center justify-center gap-4 mt-2 text-xs font-mono">
              <span className="text-slate-300">
                Kills: <strong className="text-white">{winner.kills}</strong>
              </span>
              <span className="text-slate-300">
                Points: <strong className="text-white">{winner.totalPoints}</strong>
              </span>
              <span className="text-amber-400 font-bold bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-400/50">
                Prize: PKR {winner.prizePkr}
              </span>
            </div>
          </div>
        )}

        {/* Standings Table */}
        <div className="mt-4 space-y-2">
          {results.length > 0 ? (
            results.map((res) => (
              <div
                key={res.id}
                className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                  res.rank === 1
                    ? 'bg-amber-950/30 border-amber-500/60'
                    : res.rank === 2
                      ? 'bg-slate-900/80 border-slate-700'
                      : res.rank === 3
                        ? 'bg-slate-900/80 border-amber-800/40'
                        : 'bg-slate-950/60 border-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black font-mono text-sm ${
                    res.rank === 1
                      ? 'bg-amber-400 text-black'
                      : res.rank === 2
                        ? 'bg-slate-300 text-black'
                        : res.rank === 3
                          ? 'bg-amber-700 text-white'
                          : 'bg-slate-800 text-slate-400'
                  }`}>
                    {res.rank}
                  </div>

                  <div>
                    <div className="font-bold text-white text-sm">{res.teamName}</div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2">
                      <span className="flex items-center gap-1">
                        <Flame className="w-3 h-3 text-orange-400" /> {res.kills} Kills
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Target className="w-3 h-3 text-cyan-400" /> {res.placementPoints} Place Pts
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-mono font-bold text-white text-sm">
                    {res.totalPoints} PTS
                  </div>
                  {res.prizePkr > 0 && (
                    <div className="font-mono text-xs font-bold text-amber-400">
                      PKR {res.prizePkr}
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-10 text-slate-400 text-xs">
              Match is currently ongoing. Official results will be published once all squad replays are audited.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
