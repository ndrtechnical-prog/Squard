import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Plus, 
  Check, 
  Loader2, 
  User, 
  Lock, 
  KeyRound, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  Edit3, 
  LogOut,
  Flame,
  Sparkles
} from 'lucide-react';

interface PubgIdSectionProps {
  savedPubgId: string;
  savedPlayerName: string;
  userBalance: number;
  onSaveProfileWithPin: (pubgId: string, playerName: string, pin: string) => Promise<{ success: boolean; error?: string }>;
  onOpenDeposit: () => void;
  isLoading?: boolean;
  isEditing?: boolean;
  onCancelEdit?: () => void;
  onLogout?: () => void;
  gateMessage?: string | null;
  onClearGateMessage?: () => void;
}

export const PubgIdSection: React.FC<PubgIdSectionProps> = ({
  savedPubgId,
  savedPlayerName,
  userBalance,
  onSaveProfileWithPin,
  onOpenDeposit,
  isLoading = false,
  isEditing = false,
  onCancelEdit,
  onLogout,
  gateMessage,
  onClearGateMessage
}) => {
  const [pubgIdInput, setPubgIdInput] = useState(savedPubgId || '');
  const [playerNameInput, setPlayerNameInput] = useState(savedPlayerName || '');
  const [pinInput, setPinInput] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState(false);

  // Sync inputs when saved values change
  useEffect(() => {
    setPubgIdInput(savedPubgId || '');
    setPlayerNameInput(savedPlayerName || '');
    setErrorMessage(null);
  }, [savedPubgId, savedPlayerName, isEditing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanUid = pubgIdInput.trim();
    const cleanName = playerNameInput.trim();
    const cleanPin = pinInput.trim();

    if (!cleanUid) {
      setErrorMessage('Please enter your PUBG ID.');
      return;
    }
    if (!cleanName) {
      setErrorMessage('Please enter your Player Name / Username (IGN).');
      return;
    }
    if (!cleanPin || cleanPin.length !== 4 || !/^\d{4}$/.test(cleanPin)) {
      setErrorMessage('Please enter a valid 4-digit security PIN (numbers only).');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await onSaveProfileWithPin(cleanUid, cleanName, cleanPin);
      if (result.success) {
        setSuccessToast(true);
        setPinInput('');
        if (onClearGateMessage) onClearGateMessage();
        setTimeout(() => setSuccessToast(false), 3000);
      } else {
        setErrorMessage(result.error || 'Authentication failed. Please verify your PIN.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error communicating with Firebase. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // If already logged in and not editing, render the sleek Authenticated Profile Card
  if (savedPubgId && !isEditing) {
    return (
      <div className="w-full my-4 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-[#1a120b] via-[#140e08] to-[#0d0804] border border-amber-500/50 shadow-[0_4px_25px_rgba(0,0,0,0.6)] animate-in fade-in duration-300">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Left: User Identity & Verified Badges */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-amber-600 via-yellow-500 to-amber-700 p-0.5 shadow-lg shadow-amber-950/60">
                <div className="w-full h-full bg-[#160e08] rounded-[10px] flex items-center justify-center text-amber-400 font-black text-lg">
                  {savedPlayerName ? savedPlayerName.charAt(0).toUpperCase() : 'P'}
                </div>
              </div>
              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#160e08]" title="PIN Protected & Active" />
            </div>

            <div className="flex flex-col text-left">
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-black text-amber-200 font-heading tracking-wide">
                  {savedPlayerName || `Player_${savedPubgId.slice(-4)}`}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/50 text-[10px] text-emerald-400 font-mono font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  PIN Protected
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono text-amber-400/80">
                <span>PUBG ID: <b className="text-amber-300">{savedPubgId}</b></span>
                <span className="text-slate-600">•</span>
                <span className="text-[11px] text-slate-400">Player 1 Auto-Assigned</span>
              </div>
            </div>
          </div>

          {/* Right: Diamond Balance, Recharge & Switch Account */}
          <div className="flex items-center justify-between sm:justify-end gap-2.5 pt-2 sm:pt-0 border-t border-amber-900/30 sm:border-t-0">
            {/* Balance Pill */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#23170e] border border-amber-500/60 shadow-inner">
              <svg 
                className="w-4 h-4 text-amber-400 filter drop-shadow-[0_0_6px_rgba(245,158,11,0.8)]" 
                viewBox="0 0 24 24" 
                fill="currentColor"
              >
                <polygon points="12 2 2 9 12 22 22 9" />
                <polygon points="12 2 12 22" fillOpacity="0.3" />
              </svg>
              <div className="flex flex-col text-right">
                <span className="text-[9px] text-amber-200/70 uppercase tracking-wider font-bold leading-none">Your Balance</span>
                <span className="text-xs sm:text-sm font-mono font-black text-amber-400 leading-tight">{userBalance} 💎</span>
              </div>
              <button
                type="button"
                onClick={onOpenDeposit}
                title="Recharge Diamonds"
                className="ml-1 w-6 h-6 rounded-md bg-amber-500 hover:bg-amber-400 text-black flex items-center justify-center transition-colors font-bold shadow cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Edit / Switch Account Button */}
            {onCancelEdit ? (
              <button
                type="button"
                onClick={onCancelEdit}
                className="px-2.5 py-1.5 rounded-xl bg-[#1b120a] hover:bg-[#25190e] border border-amber-800/40 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Edit3 className="w-3 h-3 text-amber-400" />
                <span>Switch / Edit</span>
              </button>
            ) : null}

            {/* Logout / Clear */}
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                title="Logout / Unlink Account"
                className="p-1.5 rounded-xl bg-[#1b120a] hover:bg-red-950/60 text-slate-400 hover:text-red-300 border border-amber-900/40 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Login / Registration Form with UID, Name, and 4-Digit PIN
  return (
    <div id="player-profile-section" className="w-full my-4 p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#1c1209] via-[#160d06] to-[#0e0703] border border-amber-500/60 shadow-[0_6px_28px_rgba(0,0,0,0.65)] animate-in fade-in slide-in-from-top-3 duration-300">
      {/* Gate / Attention Notice (if triggered by clicking Join Seat or Add Balance without auth) */}
      {gateMessage && (
        <div className="mb-3.5 p-3 rounded-xl bg-amber-950/70 border border-amber-500/80 flex items-start sm:items-center justify-between gap-2.5 text-xs text-amber-200 animate-pulse">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-semibold">{gateMessage}</span>
          </div>
          {onClearGateMessage && (
            <button
              type="button"
              onClick={onClearGateMessage}
              className="text-amber-400/80 hover:text-white text-xs font-bold underline shrink-0 cursor-pointer"
            >
              Dismiss
            </button>
          )}
        </div>
      )}

      {/* Section Header */}
      <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-amber-900/40">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/60 flex items-center justify-center text-amber-400">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-amber-200 font-heading">
              Player Authentication & PIN Security
            </h3>
            <p className="text-[11px] text-amber-200/60 leading-tight">
              Enter your PUBG ID, Name and 4-Digit Security PIN to access your account & balance.
            </p>
          </div>
        </div>
      </div>

      {/* Inputs Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* 1. PUBG ID (UID) */}
          <div className="relative">
            <label className="block text-[10px] font-bold text-amber-300 uppercase font-mono mb-1">
              PUBG ID (UID) *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-amber-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={pubgIdInput}
                onChange={(e) => setPubgIdInput(e.target.value.replace(/\s+/g, ''))}
                placeholder="e.g. 512948101"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#0b0603] border border-amber-700/50 text-white placeholder-amber-200/30 text-xs sm:text-sm font-mono tracking-wider focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 shadow-inner"
                required
              />
            </div>
          </div>

          {/* 2. Player Name (IGN) */}
          <div className="relative">
            <label className="block text-[10px] font-bold text-amber-300 uppercase font-mono mb-1">
              Player Name (IGN) *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-amber-400">
                <Flame className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={playerNameInput}
                onChange={(e) => setPlayerNameInput(e.target.value)}
                placeholder="e.g. SHADOW_KILLER"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#0b0603] border border-amber-700/50 text-white placeholder-amber-200/30 text-xs sm:text-sm tracking-wide focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 shadow-inner font-semibold"
                required
              />
            </div>
          </div>

          {/* 3. 4-Digit Security PIN */}
          <div className="relative">
            <label className="block text-[10px] font-bold text-amber-300 uppercase font-mono mb-1 flex items-center justify-between">
              <span>4-Digit PIN *</span>
              <span className="text-[9px] text-amber-400/60 lowercase">(saved in firebase)</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-amber-400">
                <KeyRound className="w-4 h-4" />
              </div>
              <input
                type={showPin ? 'text' : 'password'}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={pinInput}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setPinInput(val);
                }}
                placeholder="4 Digits (e.g. 1234)"
                className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-[#0b0603] border border-amber-700/50 text-white placeholder-amber-200/30 text-xs sm:text-sm font-mono tracking-widest focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 shadow-inner"
                required
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-amber-400/60 hover:text-amber-300 cursor-pointer"
                title={showPin ? 'Hide PIN' : 'Show PIN'}
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="p-2.5 rounded-xl bg-red-950/60 border border-red-500/60 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1">
          <div className="text-[11px] text-amber-200/60 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>First time? Your PIN will register your account in Firebase automatically.</span>
          </div>

          <div className="flex items-center gap-2">
            {isEditing && onCancelEdit && (
              <button
                type="button"
                onClick={onCancelEdit}
                className="px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-[#1a120c] hover:bg-[#25180f] text-amber-200/70 hover:text-white border border-amber-900/40 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            )}

            <button
              type="submit"
              disabled={
                !pubgIdInput.trim() || 
                !playerNameInput.trim() || 
                pinInput.trim().length !== 4 || 
                isSubmitting || 
                isLoading
              }
              className={`px-5 py-2.5 rounded-xl text-xs font-heading font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg ${
                successToast
                  ? 'bg-emerald-600 text-white border border-emerald-400 shadow-emerald-500/25'
                  : 'pubg-amber-glow-btn text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-amber-500/25'
              }`}
            >
              {isSubmitting || isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying PIN...</span>
                </>
              ) : successToast ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>Access Granted ✓</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-amber-300" />
                  <span>Verify & Access Account</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
