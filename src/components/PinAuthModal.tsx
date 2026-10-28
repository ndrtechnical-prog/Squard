import React, { useState } from 'react';
import { 
  X, 
  Lock, 
  User, 
  Flame, 
  KeyRound, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  AlertCircle, 
  Loader2, 
  CheckCircle2,
  Sparkles
} from 'lucide-react';

interface PinAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason?: string;
  onAuthenticate: (pubgUid: string, playerName: string, pin: string) => Promise<{ success: boolean; error?: string }>;
  initialPubgId?: string;
  initialPlayerName?: string;
}

export const PinAuthModal: React.FC<PinAuthModalProps> = ({
  isOpen,
  onClose,
  reason,
  onAuthenticate,
  initialPubgId = '',
  initialPlayerName = ''
}) => {
  const [pubgId, setPubgId] = useState(initialPubgId);
  const [playerName, setPlayerName] = useState(initialPlayerName);
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUid = pubgId.trim();
    const cleanName = playerName.trim();
    const cleanPin = pin.trim();

    if (!cleanUid) {
      setError('PUBG ID is required.');
      return;
    }
    if (!cleanName) {
      setError('Player Name (IGN) is required.');
      return;
    }
    if (!cleanPin || cleanPin.length !== 4 || !/^\d{4}$/.test(cleanPin)) {
      setError('Please enter a 4-digit security PIN.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await onAuthenticate(cleanUid, cleanName, cleanPin);
      if (!res.success) {
        setError(res.error || 'Authentication failed. Please verify your PIN.');
      } else {
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Error authenticating with Firebase.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-gradient-to-b from-[#1c1209] via-[#140c06] to-[#0a0503] border border-amber-500/60 rounded-2xl shadow-2xl p-5 sm:p-6 text-white relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg bg-[#24170e] text-amber-200/70 hover:text-white border border-amber-800/40 hover:border-amber-500 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/60 flex items-center justify-center text-amber-400 shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-heading font-black text-lg text-amber-200 tracking-wide uppercase">
              Player Authentication
            </h3>
            <p className="text-xs text-amber-300/70">
              Required: PUBG ID, Name & 4-Digit Security PIN
            </p>
          </div>
        </div>

        {/* Reason banner (e.g. "Action Required: Please set your PUBG ID, Name and PIN first") */}
        {reason && (
          <div className="mb-4 p-3 rounded-xl bg-amber-950/60 border border-amber-500/50 flex items-center gap-2.5 text-xs text-amber-200">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-medium">{reason}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* 1. PUBG ID */}
          <div>
            <label className="block text-[11px] font-bold text-amber-300 uppercase font-mono mb-1">
              PUBG Mobile ID (UID) *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-amber-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={pubgId}
                onChange={(e) => setPubgId(e.target.value.replace(/\s+/g, ''))}
                placeholder="e.g. 512948101"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#0b0603] border border-amber-700/60 text-white placeholder-amber-200/30 text-sm font-mono tracking-wider focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 shadow-inner"
                required
                autoFocus
              />
            </div>
          </div>

          {/* 2. Player Name */}
          <div>
            <label className="block text-[11px] font-bold text-amber-300 uppercase font-mono mb-1">
              Player Name (IGN) *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-amber-400">
                <Flame className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="e.g. SHADOW_KILLER"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#0b0603] border border-amber-700/60 text-white placeholder-amber-200/30 text-sm font-semibold tracking-wide focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 shadow-inner"
                required
              />
            </div>
            <p className="text-[10px] text-amber-400/60 mt-1">
              This name will be automatically booked for Player 1 (Leader).
            </p>
          </div>

          {/* 3. 4-Digit Security PIN */}
          <div>
            <label className="block text-[11px] font-bold text-amber-300 uppercase font-mono mb-1 flex items-center justify-between">
              <span>4-Digit Security PIN *</span>
              <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Saved in Firebase
              </span>
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
                value={pin}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setPin(val);
                }}
                placeholder="4 Digits (e.g. 1234)"
                className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-[#0b0603] border border-amber-700/60 text-white placeholder-amber-200/30 text-base font-mono tracking-widest focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 shadow-inner"
                required
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-amber-400/60 hover:text-amber-300 cursor-pointer"
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-xl bg-red-950/70 border border-red-500/70 text-red-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading || !pubgId.trim() || !playerName.trim() || pin.trim().length !== 4}
              className="w-full py-3 rounded-xl pubg-amber-glow-btn text-white font-heading font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying PIN with Firebase...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-amber-300" />
                  <span>Confirm & Access Dashboard</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
