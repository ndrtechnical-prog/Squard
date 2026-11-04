import React, { useState } from 'react';
import { 
  X, 
  Edit3, 
  ShieldCheck, 
  LogOut, 
  User, 
  RefreshCw 
} from 'lucide-react';
import { Tournament } from '../types/tournament';

interface DrawerMenuProps {
  isOpen: boolean;
  onClose: () => void;
  tournament: Tournament | null;
  savedPubgId?: string;
  savedPlayerName?: string;
  userBalance: number;
  onOpenResults: () => void;
  onOpenAdmin: () => void;
  onClearPubgId: () => void;
  onEditPubgId: () => void;
}

export const DrawerMenu: React.FC<DrawerMenuProps> = ({
  isOpen,
  onClose,
  tournament,
  savedPubgId,
  savedPlayerName,
  userBalance,
  onOpenResults,
  onOpenAdmin,
  onClearPubgId,
  onEditPubgId
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);

  const cleanUid = (savedPubgId || '').trim();

  if (!isOpen) return null;

  const handleSyncFirebase = async () => {
    setIsSyncing(true);
    setSyncSuccess(false);
    try {
      if (cleanUid) {
        await fetch(`https://pubg-matches-43fa1-default-rtdb.firebaseio.com/users/${encodeURIComponent(cleanUid)}.json`);
      }
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 2000);
    } catch {
      // Ignored
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-black/85 backdrop-blur-sm transition-opacity"
      />

      {/* Slide-out Drawer */}
      <div className="relative w-full max-w-sm sm:max-w-md bg-gradient-to-b from-[#18110b] via-[#120b06] to-[#0a0603] border-r border-amber-900/40 h-full p-4 sm:p-5 flex flex-col justify-between shadow-2xl z-10 overflow-y-auto selection:bg-amber-500 selection:text-black">
        <div className="space-y-4">
          {/* 1. Header */}
          <div className="flex items-center justify-between pb-3 border-b border-amber-950/50">
            <div className="flex items-center gap-2">
              <span className="font-heading text-xl font-bold tracking-wider text-white uppercase">
                SQUARD<span className="text-amber-400">WAR</span>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-[10px] font-mono text-amber-300">
                squardwar.site
              </span>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-[#22170f] text-amber-200/70 hover:text-white flex items-center justify-center border border-amber-800/40 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Player Profile & Account Card */}
          <div className="space-y-3.5 animate-in fade-in duration-150">
            {cleanUid ? (
              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#22160e] via-[#1a100a] to-[#120b06] border border-amber-500/50 space-y-3 shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-amber-600 via-amber-400 to-amber-700 p-0.5 shadow">
                      <div className="w-full h-full bg-[#18100a] rounded-[10px] flex items-center justify-center text-amber-300 font-black text-base">
                        {savedPlayerName ? savedPlayerName.charAt(0).toUpperCase() : 'P'}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-black text-white leading-tight flex items-center gap-1.5">
                        <span>{savedPlayerName || 'PUBG Player'}</span>
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      </div>
                      <div className="text-xs font-mono text-amber-300/80 mt-1">
                        UID: <span className="text-amber-200 font-bold">{cleanUid}</span>
                      </div>
                    </div>
                  </div>

                  {/* Balance Display */}
                  <div className="text-right">
                    <span className="text-[10px] uppercase tracking-wider text-amber-400/80 font-mono block">Balance</span>
                    <span className="text-base font-black font-mono text-amber-300 flex items-center justify-end gap-1">
                      {userBalance} 💎
                    </span>
                  </div>
                </div>

                {/* Profile Controls */}
                <div className="pt-3 border-t border-amber-900/40 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={handleSyncFirebase}
                    disabled={isSyncing}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#25180f] hover:bg-amber-950/60 border border-amber-800/40 text-xs font-bold text-amber-300 transition-colors cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{syncSuccess ? 'Synced!' : 'Sync Firebase'}</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={onEditPubgId}
                      className="px-2.5 py-1.5 rounded-lg bg-[#25180f] hover:bg-amber-950/60 border border-amber-800/40 text-amber-300 hover:text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                      title="Edit Profile"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={onClearPubgId}
                      className="p-1.5 rounded-lg bg-[#25180f] hover:bg-red-950/60 border border-amber-800/40 hover:border-red-500/60 text-amber-400/70 hover:text-red-300 transition-colors cursor-pointer"
                      title="Logout / Change UID"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-5 rounded-2xl bg-[#1a110a] border border-amber-800/40 text-center space-y-3">
                <User className="w-10 h-10 text-amber-400/50 mx-auto" />
                <div>
                  <p className="text-sm font-bold text-white">Player Profile</p>
                  <p className="text-xs text-amber-200/70 mt-1">
                    Koi UID save nahi hai. Apna gaming account set karein.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onEditPubgId}
                  className="px-4 py-2 rounded-xl bg-amber-500 text-black font-black text-xs uppercase tracking-wider cursor-pointer shadow hover:bg-amber-400 transition-colors"
                >
                  Set Gaming Profile &amp; PIN
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Footer & Discreet Admin Icon */}
        <div className="pt-3 mt-4 border-t border-amber-950/50 flex items-center justify-between text-[11px] text-amber-300/60">
          <span className="font-mono text-[10px] text-amber-400/50">Squard War © 2026</span>
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenAdmin();
            }}
            aria-label="Admin Portal"
            title="Admin Login"
            className="w-7 h-7 rounded-lg bg-[#150d07] hover:bg-amber-950/60 border border-amber-900/40 hover:border-amber-500/60 flex items-center justify-center text-amber-400/70 hover:text-amber-300 transition-colors cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
