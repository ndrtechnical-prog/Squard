import React, { useState } from 'react';
import { Bell, AlertTriangle, Sparkles, ChevronRight, X } from 'lucide-react';

export interface NoticeData {
  id: string;
  title: string;
  message: string;
  urgency: 'INFO' | 'URGENT' | 'LIVE';
  active: boolean;
  updatedAt: number;
}

interface NoticeBannerProps {
  notice: NoticeData | null;
  onOpenNoticeModal: () => void;
}

export const NoticeBanner: React.FC<NoticeBannerProps> = ({
  notice,
  onOpenNoticeModal
}) => {
  const [isDismissed, setIsDismissed] = useState(false);

  if (!notice || !notice.active || isDismissed) return null;

  const isUrgent = notice.urgency === 'URGENT';
  const isLive = notice.urgency === 'LIVE';

  return (
    <div className={`w-full my-2.5 rounded-xl border p-2.5 sm:p-3 shadow-lg transition-all flex items-center justify-between gap-3 ${
      isUrgent
        ? 'bg-gradient-to-r from-red-950/80 via-amber-950/70 to-red-950/80 border-amber-500/70 text-amber-100'
        : isLive
        ? 'bg-gradient-to-r from-emerald-950/80 via-teal-950/70 to-emerald-950/80 border-emerald-500/70 text-emerald-100'
        : 'bg-gradient-to-r from-[#121929]/90 via-[#0d1424]/90 to-[#121929]/90 border-cyan-500/50 text-cyan-100'
    }`}>
      {/* Notice Icon & Content */}
      <div 
        onClick={onOpenNoticeModal}
        className="flex items-center gap-2.5 flex-1 cursor-pointer min-w-0"
      >
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
          isUrgent
            ? 'bg-amber-500/20 border-amber-500 text-amber-400'
            : isLive
            ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
            : 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
        }`}>
          <Bell className="w-4 h-4 animate-bounce" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-black uppercase px-1.5 py-0.2 rounded font-mono border ${
              isUrgent ? 'bg-red-500/30 text-amber-300 border-amber-400/40' : 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
            }`}>
              {isUrgent ? 'URGENT NOTICE' : isLive ? 'MATCH LIVE' : 'ANNOUNCEMENT'}
            </span>
            <span className="text-xs font-bold text-white truncate font-heading uppercase tracking-wide">
              {notice.title}
            </span>
          </div>
          <p className="text-[11px] text-amber-200/80 truncate mt-0.5">
            {notice.message}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={onOpenNoticeModal}
          className="py-1 px-2.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
        >
          <span>Read</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => setIsDismissed(true)}
          className="p-1 rounded-lg text-amber-200/50 hover:text-white transition-colors cursor-pointer"
          title="Dismiss banner"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
