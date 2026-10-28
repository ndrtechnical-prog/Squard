import React from 'react';
import { X, Bell, AlertTriangle, ShieldCheck, Clock, CheckCircle2, Trophy, Share2, Sparkles, ExternalLink } from 'lucide-react';
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
  notice,
  onOpenRoomLookup
}) => {
  if (!isOpen) return null;

  const isUrgent = notice?.urgency === 'URGENT';
  const formattedDate = notice?.updatedAt 
    ? new Date(notice.updatedAt).toLocaleTimeString('en-PK', { timeZone: 'Asia/Karachi', hour: '2-digit', minute: '2-digit', hour12: true }) + ' (PKT)'
    : 'Live';

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-lg bg-gradient-to-b from-[#18110b] via-[#120b06] to-[#0a0603] border-2 border-amber-500/70 rounded-2xl shadow-[0_0_50px_rgba(245,158,11,0.25)] text-slate-100 max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-amber-900/40 bg-[#140d07]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/60 flex items-center justify-center text-amber-400">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-black text-lg text-white uppercase tracking-wide">
                Squard War Notices
              </h3>
              <p className="text-[11px] text-amber-300/80 font-mono">
                Official Rules, Room Alerts &bull; squardwar.site
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#22160d] text-amber-200/70 hover:text-white flex items-center justify-center border border-amber-800/40 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto">
          {/* Active Admin Notice Card */}
          {notice && notice.active ? (
            <div className={`p-4 rounded-xl border-2 space-y-2.5 shadow-lg ${
              isUrgent 
                ? 'bg-gradient-to-br from-red-950/70 to-amber-950/60 border-amber-500' 
                : 'bg-gradient-to-br from-[#1c1209] to-[#120b05] border-amber-600/60'
            }`}>
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-bold text-[10px] border border-amber-500/40 uppercase">
                  {notice.urgency || 'OFFICIAL ANNOUNCEMENT'}
                </span>
                <span className="text-[10px] text-amber-400 font-mono">
                  Updated: {formattedDate}
                </span>
              </div>

              <h4 className="font-heading font-black text-base text-white tracking-wide uppercase">
                {notice.title}
              </h4>

              <p className="text-xs sm:text-sm text-amber-100/90 leading-relaxed font-sans whitespace-pre-line">
                {notice.message}
              </p>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-[#120a05] border border-amber-800/40 text-center text-xs text-amber-200/70">
              No active urgent notices. Follow standard match timeline below.
            </div>
          )}

          {/* CRITICAL TOURNAMENT GUIDELINES (All Players Must Follow) */}
          <div className="space-y-2.5">
            <span className="text-xs font-black uppercase text-amber-300 font-heading tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>Mandatory Match Rules &amp; Instructions</span>
            </span>

            {/* Rule 1: 15-Minute Joining */}
            <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/40 space-y-1 text-xs">
              <div className="flex items-center gap-2 text-red-300 font-bold uppercase text-[11px] font-mono">
                <Clock className="w-3.5 h-3.5 text-red-400" />
                <span>15-Minute Room Entry Rule (Strict)</span>
              </div>
              <p className="text-[11px] text-amber-100/90 leading-relaxed">
                Match start se theek 15 minute pehle Room ID &amp; Password unlock hota hai. Sabhi squad players ko 15 minute ke andar custom room join karna lazmi hai. Late aane par seat forfeit ho jayegi.
              </p>
            </div>

            {/* Rule 2: Exact Seat Allocation */}
            <div className="p-3 rounded-xl bg-[#120b06] border border-amber-800/40 space-y-1 text-xs">
              <div className="flex items-center gap-2 text-amber-300 font-bold uppercase text-[11px] font-mono">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Strict Seat &amp; Squad Positioning</span>
              </div>
              <p className="text-[11px] text-amber-100/80 leading-relaxed">
                Aapne jo Squad Number (Team 1 - 25) aur Slot (1 - 4) reserve kiya hai, game custom room mein usi slot par baithna hai. Doosre squad ke slot par baithne wale ko kick kar diya jayega.
              </p>
            </div>

            {/* Rule 3: Anti-Cheat & Emulators */}
            <div className="p-3 rounded-xl bg-[#120b06] border border-amber-800/40 space-y-1 text-xs">
              <div className="flex items-center gap-2 text-amber-300 font-bold uppercase text-[11px] font-mono">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>Mobile Only &bull; Zero Tolerance for Hacks</span>
              </div>
              <p className="text-[11px] text-amber-100/80 leading-relaxed">
                Sirf mobile devices allow hain. Emulators, iPad view, config files, third-party crosshairs, ya illegal teaming sakht mana hai. Khilaf-warzi par UID permanent block hogi.
              </p>
            </div>

            {/* Rule 4: Prize Distribution */}
            <div className="p-3 rounded-xl bg-[#120b06] border border-amber-800/40 space-y-1 text-xs">
              <div className="flex items-center gap-2 text-amber-300 font-bold uppercase text-[11px] font-mono">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span>Instant Cashout within 24 Hours</span>
              </div>
              <p className="text-[11px] text-amber-100/80 leading-relaxed">
                Match result verify hone ke baad winning squad ko direct Easypaisa / JazzCash ke zariye prize money dispatch ki jati hai.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 border-t border-amber-900/40 bg-[#120a06] flex items-center justify-between text-xs">
          <span className="text-amber-400/80 font-mono text-[11px]">
            squardwar.site
          </span>
          <button
            type="button"
            onClick={onClose}
            className="py-1.5 px-4 rounded-xl pubg-amber-glow-btn text-white text-xs font-bold uppercase cursor-pointer"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
};
