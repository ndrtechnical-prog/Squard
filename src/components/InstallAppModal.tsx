import React from 'react';
import { X, Download, Smartphone, CheckCircle, Sparkles } from 'lucide-react';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt: any;
  onInstallSuccess?: () => void;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({
  isOpen,
  onClose,
  deferredPrompt,
  onInstallSuccess
}) => {
  if (!isOpen) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        if (onInstallSuccess) onInstallSuccess();
        onClose();
      }
    } else {
      // Fallback if browser hasn't fired beforeinstallprompt yet
      alert('To install Squard War on your device, tap your browser menu (⋮) and select "Install App" or "Add to Home Screen".');
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-md bg-gradient-to-b from-[#18110b] via-[#120b06] to-[#0a0603] border-2 border-amber-500/70 rounded-2xl shadow-[0_0_50px_rgba(245,158,11,0.25)] text-slate-100 p-5 sm:p-6 overflow-hidden space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600" />

        {/* Top header */}
        <div className="flex items-center justify-between pb-3 border-b border-amber-900/40">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/30 border border-amber-500/60 flex items-center justify-center text-amber-400">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-black text-lg text-white uppercase tracking-wide">
                Install Squard War App
              </h3>
              <p className="text-[11px] text-amber-400/80 font-mono">
                Official Web App &bull; squardwar.site
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

        {/* App details card */}
        <div className="p-3.5 rounded-xl bg-[#0d0703] border border-amber-800/50 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 p-0.5 shadow shrink-0">
            <img 
              src="/images/avatars/pubg_avatar_golden_1792656009701.jpg" 
              alt="Squard War Icon" 
              className="w-full h-full rounded-[10px] object-cover" 
            />
          </div>
          <div>
            <div className="font-black text-sm text-white flex items-center gap-1.5 font-heading uppercase tracking-wide">
              <span>Squard War</span>
              <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 text-[9px] font-mono border border-amber-500/40">
                PWA
              </span>
            </div>
            <p className="text-xs text-amber-200/70 mt-0.5">
              Instant Squad Reservations &bull; Live Room ID Access &bull; Realtime Rewards
            </p>
          </div>
        </div>

        {/* Direct Install Button */}
        <div className="space-y-2 pt-2">
          <button
            onClick={handleInstallClick}
            className="w-full py-3.5 px-4 rounded-xl pubg-amber-glow-btn text-white text-xs sm:text-sm font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-95 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Install App Now</span>
          </button>
          <p className="text-[11px] text-center text-amber-400/70 font-medium">
            Installs instantly to your home screen like a native app.
          </p>
        </div>

        {/* Benefits list */}
        <div className="pt-3 border-t border-amber-900/40 grid grid-cols-2 gap-2 text-[10px] text-amber-200/80">
          <div className="flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>One-Tap Launch</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Smartphone className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>Fullscreen Experience</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Zero Storage Cost</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Instant Room Access</span>
          </div>
        </div>
      </div>
    </div>
  );
};
