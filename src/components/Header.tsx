import React from 'react';
import { Menu, Flame, Plus, ShieldCheck, User, Trophy, Download } from 'lucide-react';
import { GameType } from '../types/tournament';

interface HeaderProps {
  activeGame: GameType;
  userBalance: number;
  savedPubgId?: string;
  savedPlayerName?: string;
  onSelectGame: (game: GameType) => void;
  onOpenMenu: () => void;
  onOpenDeposit: () => void;
  onOpenAdmin: () => void;
  isAdminLoggedIn: boolean;
  onEditPubgId?: () => void;
  onOpenBookings?: () => void;
  onOpenInstallApp?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeGame,
  userBalance,
  savedPubgId,
  savedPlayerName,
  onSelectGame,
  onOpenMenu,
  onOpenDeposit,
  onOpenAdmin,
  isAdminLoggedIn,
  onEditPubgId,
  onOpenBookings,
  onOpenInstallApp
}) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-[#0d0906]/95 backdrop-blur-md border-b border-amber-900/30 px-3 sm:px-6 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Drawer Menu Icon */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onOpenMenu}
            aria-label="Open Navigation Menu"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#1a120c]/90 border border-amber-700/40 flex items-center justify-center text-amber-200/80 hover:text-white hover:border-amber-500 hover:bg-amber-950/40 transition-colors cursor-pointer shadow-sm active:scale-95"
          >
            <Menu className="w-5 h-5 text-amber-300" />
          </button>
        </div>

        {/* Center: Game Switcher (PUBG / Free Fire) */}
        <div className="flex items-center gap-1 p-1 bg-[#160f0a]/90 border border-amber-900/30 rounded-xl shadow-inner">
          <button
            onClick={() => onSelectGame('PUBG')}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-lg text-xs font-bold uppercase transition-all duration-200 cursor-pointer ${
              activeGame === 'PUBG'
                ? 'bg-gradient-to-r from-amber-600/30 to-amber-700/40 text-amber-300 border border-amber-500/80 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                : 'text-amber-200/60 hover:text-white hover:bg-amber-950/20 border border-transparent'
            }`}
          >
            <div className="w-3.5 h-3.5 rounded-sm bg-amber-500 flex items-center justify-center text-[8px] font-black text-black">
              P
            </div>
            <span>PUBG</span>
          </button>

          <button
            onClick={() => onSelectGame('FREE_FIRE')}
            className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer ${
              activeGame === 'FREE_FIRE'
                ? 'bg-gradient-to-r from-orange-500/20 to-red-600/30 text-orange-400 border border-orange-500/80 shadow-[0_0_12px_rgba(249,115,22,0.25)]'
                : 'text-amber-200/50 hover:text-white hover:bg-amber-950/20 border border-transparent'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            <span className="hidden sm:inline">Free Fire</span>
          </button>
        </div>

        {/* Right: Actions (Install App, My Bookings, Account, Diamond Balance) */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* 1. App Install Button (Requested by User) */}
          {onOpenInstallApp && (
            <button
              type="button"
              onClick={onOpenInstallApp}
              title="Install Squard War to Home Screen"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-amber-600/30 hover:from-amber-500/30 hover:to-amber-600/40 border border-amber-500/70 text-xs font-bold text-amber-300 transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <Download className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="hidden md:inline font-heading uppercase tracking-wide">Install App</span>
              <span className="md:hidden">App</span>
            </button>
          )}

          {/* 2. My Bookings Button */}
          {savedPubgId && (
            <button
              type="button"
              onClick={onOpenBookings}
              title="View My Booked Seats & Room Access"
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 rounded-xl text-xs font-bold text-amber-300 transition-colors cursor-pointer"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>My Bookings</span>
            </button>
          )}

          {/* 3. Player Username & ID Badge */}
          {savedPubgId ? (
            <button
              type="button"
              onClick={onEditPubgId}
              title="Click to view or edit account"
              className="hidden sm:flex items-center gap-2 px-2.5 py-1 bg-[#181009] hover:bg-[#23170e] border border-amber-600/40 hover:border-amber-400 rounded-xl text-xs text-amber-300 transition-colors cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <div className="flex flex-col text-left">
                <span className="text-[11px] font-bold text-amber-200 truncate max-w-[95px] leading-none">
                  {savedPlayerName || `Player_${savedPubgId.slice(-4)}`}
                </span>
                <span className="text-[9px] font-mono text-amber-400/70 leading-tight">UID: {savedPubgId}</span>
              </div>
            </button>
          ) : (
            <button
              type="button"
              onClick={onEditPubgId}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-amber-950/60 hover:bg-amber-900/60 border border-amber-500/50 rounded-xl text-xs font-bold text-amber-300 transition-colors cursor-pointer"
            >
              <User className="w-3.5 h-3.5 text-amber-400" />
              <span>Login</span>
            </button>
          )}

          {/* 4. Diamond Balance & Add Button */}
          <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1 bg-[#19110a]/90 border border-amber-700/40 rounded-xl shadow-inner">
            <svg 
              className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 filter drop-shadow-[0_0_6px_rgba(245,158,11,0.8)]" 
              viewBox="0 0 24 24" 
              fill="currentColor"
            >
              <polygon points="12 2 2 9 12 22 22 9" />
              <polygon points="12 2 12 22" fillOpacity="0.3" />
            </svg>
            <div className="flex flex-col text-right">
              <span className="text-[8px] sm:text-[9px] text-amber-200/60 uppercase tracking-wider font-medium leading-none">Balance</span>
              <span className="text-xs sm:text-sm font-bold text-amber-400 tabular-nums leading-tight font-mono">{userBalance} 💎</span>
            </div>
            <button
              onClick={onOpenDeposit}
              title="Add Balance / Recharge"
              className="ml-0.5 w-6 h-6 rounded-md bg-[#24170e] hover:bg-amber-600 text-amber-400 hover:text-white flex items-center justify-center transition-colors border border-amber-600/40 hover:border-amber-400 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
