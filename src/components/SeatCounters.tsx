import React from 'react';
import { Trophy, Bell, Star } from 'lucide-react';

interface SeatCountersProps {
  onOpenReward: () => void;
  onOpenNotices: () => void;
  onOpenReviews: () => void;
}

export const SeatCounters: React.FC<SeatCountersProps> = ({
  onOpenReward,
  onOpenNotices,
  onOpenReviews
}) => {
  return (
    <div className="w-full my-4">
      {/* 3 ICON BUTTONS IN EASYPAISA STYLE (REWARD · NOTICES · REVIEWS) */}
      <div className="relative rounded-2xl bg-gradient-to-r from-[#0a1220]/90 via-[#070d18]/95 to-[#0a1220]/90 border border-slate-800/80 p-3.5 sm:p-4 shadow-xl backdrop-blur-md">
        <div className="grid grid-cols-3 gap-2 sm:gap-6 max-w-md mx-auto">
          
          {/* 1. REWARD BUTTON */}
          <button
            type="button"
            onClick={onOpenReward}
            className="group flex flex-col items-center justify-center gap-2 p-2 rounded-2xl hover:bg-slate-800/40 active:scale-95 transition-all duration-200 cursor-pointer"
          >
            <div className="relative w-13 h-13 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-emerald-400 via-teal-500 to-emerald-700 flex items-center justify-center shadow-[0_6px_20px_rgba(16,185,129,0.35)] group-hover:shadow-[0_8px_25px_rgba(16,185,129,0.55)] group-hover:-translate-y-1 transition-all duration-200 border border-emerald-300/40">
              <Trophy className="w-6 h-6 sm:w-8 sm:h-8 text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.4)]" />
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-400 border border-black animate-pulse" />
            </div>
            
            <span className="font-heading font-black text-[11px] sm:text-xs text-slate-100 group-hover:text-emerald-300 tracking-wider uppercase transition-colors text-center">
              REWARD
            </span>
          </button>

          {/* 2. NOTICES BUTTON (Replaced Top Player as requested) */}
          <button
            type="button"
            onClick={onOpenNotices}
            className="group flex flex-col items-center justify-center gap-2 p-2 rounded-2xl hover:bg-slate-800/40 active:scale-95 transition-all duration-200 cursor-pointer"
          >
            <div className="relative w-13 h-13 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-orange-600 flex items-center justify-center shadow-[0_6px_20px_rgba(245,158,11,0.35)] group-hover:shadow-[0_8px_25px_rgba(245,158,11,0.55)] group-hover:-translate-y-1 transition-all duration-200 border border-amber-200/40">
              <Bell className="w-6 h-6 sm:w-8 sm:h-8 text-black drop-shadow-[0_2px_6px_rgba(0,0,0,0.2)]" />
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 border border-black animate-ping" />
            </div>

            <span className="font-heading font-black text-[11px] sm:text-xs text-slate-100 group-hover:text-amber-300 tracking-wider uppercase transition-colors text-center">
              NOTICES
            </span>
          </button>

          {/* 3. REVIEWS BUTTON */}
          <button
            type="button"
            onClick={onOpenReviews}
            className="group flex flex-col items-center justify-center gap-2 p-2 rounded-2xl hover:bg-slate-800/40 active:scale-95 transition-all duration-200 cursor-pointer"
          >
            <div className="relative w-13 h-13 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-rose-500 via-pink-500 to-amber-500 flex items-center justify-center shadow-[0_6px_20px_rgba(244,63,94,0.35)] group-hover:shadow-[0_8px_25px_rgba(244,63,94,0.55)] group-hover:-translate-y-1 transition-all duration-200 border border-rose-300/40">
              <Star className="w-6 h-6 sm:w-8 sm:h-8 text-white fill-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.3)]" />
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border border-black animate-pulse" />
            </div>

            <span className="font-heading font-black text-[11px] sm:text-xs text-slate-100 group-hover:text-rose-300 tracking-wider uppercase transition-colors text-center">
              REVIEWS
            </span>
          </button>

        </div>
      </div>
    </div>
  );
};
