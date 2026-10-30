import React from 'react';
import { X, Bell } from 'lucide-react';
import { NoticeData } from './NoticeBanner';

interface NoticesModalProps {
  isOpen: boolean;
  onClose: () => void;
  notice: NoticeData | null;
  onOpenRoomLookup?: () => void;
}

export const NoticesModal: React.FC<NoticesModalProps> = ({
  isOpen,
  onClose,
  notice
}) => {
  if (!isOpen) return null;

  const isUrgent = notice?.urgency === 'URGENT';

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-md bg-gradient-to-b from-[#18110b] via-[#120b06] to-[#0a0603] border border-amber-500/60 rounded-2xl shadow-2xl text-slate-100 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-amber-900/40 bg-[#140d07]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/60 flex items-center justify-center text-amber-400">
              <Bell className="w-4 h-4" />
            </div>
            <h3 className="font-heading font-black text-lg text-white uppercase tracking-wide">
              Official Notice
            </h3>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#22160d] text-amber-200/70 hover:text-white flex items-center justify-center border border-amber-800/40 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 sm:p-6 space-y-4">
          {notice && notice.active ? (
            <div className={`p-4 rounded-xl border space-y-2 shadow-lg ${
              isUrgent 
                ? 'bg-gradient-to-br from-red-950/70 to-amber-950/60 border-amber-500/80' 
                : 'bg-gradient-to-br from-[#1c1209] to-[#120b05] border-amber-600/50'
            }`}>
              <h4 className="font-heading font-black text-base text-white tracking-wide uppercase">
                {notice.title}
              </h4>

              <p className="text-sm text-amber-100/90 leading-relaxed font-sans whitespace-pre-line">
                {notice.message}
              </p>
            </div>
          ) : (
            <div className="p-6 rounded-xl bg-[#120a05] border border-amber-800/30 text-center text-xs text-amber-200/60">
              No active announcements at this time.
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 border-t border-amber-900/40 bg-[#120a06] flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-6 rounded-xl pubg-amber-glow-btn text-white text-xs font-bold uppercase cursor-pointer"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};
