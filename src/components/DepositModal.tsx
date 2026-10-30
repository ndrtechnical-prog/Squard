import React, { useState, useEffect } from 'react';
import { 
  X, 
  ExternalLink, 
  Copy, 
  Check, 
  RefreshCw, 
  ShieldCheck, 
  Sparkles, 
  CreditCard, 
  ArrowRight,
  User,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { OFFICIAL_PAYMENT_INFO } from '../utils/storage';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBalance: number;
  pubgUid?: string;
  playerName?: string;
  onBalanceUpdated?: (newBalance: number) => void;
}

export const DepositModal: React.FC<DepositModalProps> = ({
  isOpen,
  onClose,
  currentBalance,
  pubgUid = '',
  playerName = '',
  onBalanceUpdated
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(3);
  const [isRedirecting, setIsRedirecting] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);

  const cleanUid = (pubgUid || '').trim();
  const rechargePortalUrl = cleanUid
    ? `https://fabulous-donut-2c074a.netlify.app/?userId=${encodeURIComponent(cleanUid)}&uid=${encodeURIComponent(cleanUid)}&pubgId=${encodeURIComponent(cleanUid)}`
    : 'https://fabulous-donut-2c074a.netlify.app/';

  // Copy helper
  const copyText = (text: string, field: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2500);
  };

  // Auto copy UID when modal opens
  useEffect(() => {
    if (isOpen && cleanUid) {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(cleanUid).catch(() => {});
      }
    }
  }, [isOpen, cleanUid]);

  // Countdown & Fast Direct Redirect
  useEffect(() => {
    if (!isOpen) {
      setCountdown(1);
      setIsRedirecting(true);
      return;
    }

    if (!isRedirecting) return;

    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(prev => prev - 1);
      }, 600);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      // Trigger navigation
      try {
        window.location.href = rechargePortalUrl;
      } catch (err) {
        console.warn('Direct redirect restricted, fallback to link click:', err);
      }
    }
  }, [isOpen, countdown, isRedirecting, rechargePortalUrl]);

  // Manual Refresh Balance from Firebase
  const handleRefreshBalance = async () => {
    if (!cleanUid) return;
    setIsRefreshing(true);
    setRefreshMessage(null);
    try {
      let balance: number | null = null;
      try {
        const res = await fetch(`/api/user/balance?pubgUid=${encodeURIComponent(cleanUid)}`);
        if (res.ok) {
          const text = await res.text();
          if (text && text.trim().startsWith('{')) {
            const data = JSON.parse(text);
            if (data.success && typeof data.balance === 'number') {
              balance = data.balance;
            }
          }
        }
      } catch {}

      if (balance === null) {
        const fbRes = await fetch(`https://pubg-matches-43fa1-default-rtdb.firebaseio.com/users/${encodeURIComponent(cleanUid)}.json`);
        if (fbRes.ok) {
          const fbText = await fbRes.text();
          if (fbText && fbText.trim() !== 'null' && fbText.trim().startsWith('{')) {
            const u = JSON.parse(fbText);
            if (u && typeof u.balance === 'number') balance = u.balance;
          }
        }
      }

      if (balance !== null) {
        if (onBalanceUpdated) {
          onBalanceUpdated(balance);
        }
        setRefreshMessage(`Latest Balance: ${balance} 💎 (PKR ${balance})`);
      } else {
        setRefreshMessage('Could not find updated payment yet. If you just submitted, please allow 10-20 seconds for verification.');
      }
    } catch {
      setRefreshMessage('Network error checking balance.');
    } finally {
      setIsRefreshing(false);
      setTimeout(() => setRefreshMessage(null), 5000);
    }
  };

  if (!isOpen) return null;

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
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/60 flex items-center justify-center text-amber-400">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-heading text-base sm:text-lg font-black tracking-wide text-white uppercase">
                Recharge &amp; Payment Gateway
              </h2>
              <p className="text-[11px] text-amber-300/80">
                Official Verification Portal (fabulous-donut-2c074a.netlify.app)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#22160e] hover:bg-[#2c1d13] text-amber-200/80 hover:text-white flex items-center justify-center border border-amber-800/40 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto">
          {/* User PUBG UID Confirmation Card */}
          <div className="p-3.5 rounded-xl bg-[#0e0804] border border-amber-600/50 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <User className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] text-amber-400/80 uppercase font-mono font-bold leading-none">
                  Authenticated Player UID
                </div>
                <div className="text-sm font-black text-white font-mono mt-0.5">
                  {cleanUid || 'Unlinked User'}
                </div>
              </div>
            </div>

            {cleanUid && (
              <button
                type="button"
                onClick={() => copyText(cleanUid, 'uid')}
                className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all"
              >
                {copiedField === 'uid' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy UID</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Auto-Redirect Alert / Countdown */}
          {isRedirecting && countdown > 0 ? (
            <div className="p-3.5 rounded-xl bg-amber-950/50 border border-amber-500/50 text-xs text-amber-200 space-y-1.5 animate-pulse">
              <div className="flex items-center justify-between font-bold">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Redirecting to Verification Portal...</span>
                </span>
                <span className="font-mono text-amber-400 text-sm font-black">{countdown}s</span>
              </div>
              <p className="text-[11px] text-amber-300/70">
                Your PUBG ID is automatically attached to the portal URL. Payments verified there will credit directly to your wallet.
              </p>
            </div>
          ) : null}

          {/* Big Action Button to Open Payment Gateway */}
          <div className="space-y-2">
            <a
              href={rechargePortalUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsRedirecting(false)}
              className="w-full py-3.5 px-4 rounded-xl pubg-amber-glow-btn text-white text-xs sm:text-sm font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg hover:brightness-110 active:scale-[0.99] transition-all"
            >
              <span>Open Payment Verification Portal</span>
              <ExternalLink className="w-4 h-4 text-amber-200" />
            </a>
            <div className="flex items-center justify-between text-[11px] text-amber-400/80 px-1">
              <span>Domain: fabulous-donut-2c074a.netlify.app</span>
              {isRedirecting && (
                <button
                  type="button"
                  onClick={() => setIsRedirecting(false)}
                  className="underline hover:text-white cursor-pointer"
                >
                  Pause Auto-Redirect
                </button>
              )}
            </div>
          </div>

          {/* Official Account Information Matching Netlify Page */}
          <div className="p-4 rounded-xl bg-[#0c0703] border border-amber-900/50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-amber-300 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-amber-400" />
                <span>Destination Payment Account</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/50 text-emerald-300 font-semibold">
                Easypaisa &amp; JazzCash
              </span>
            </div>

            {/* Account Number */}
            <div className="p-2.5 rounded-lg bg-[#150d07] border border-amber-800/40 flex items-center justify-between">
              <div>
                <span className="text-[9px] text-amber-200/50 uppercase font-mono block">Mobile Account Number</span>
                <span className="text-lg font-black font-mono text-amber-400">
                  {OFFICIAL_PAYMENT_INFO.mobile}
                </span>
              </div>
              <button
                type="button"
                onClick={() => copyText(OFFICIAL_PAYMENT_INFO.mobile, 'mobile')}
                className="py-1 px-2.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                {copiedField === 'mobile' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            {/* Account Title */}
            <div className="p-2.5 rounded-lg bg-[#150d07] border border-amber-800/40 flex items-center justify-between">
              <div>
                <span className="text-[9px] text-amber-200/50 uppercase font-mono block">Account Title</span>
                <span className="text-sm font-bold text-white">
                  {OFFICIAL_PAYMENT_INFO.accountName}
                </span>
              </div>
              <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Verified Title</span>
              </span>
            </div>
          </div>

          {/* Balance Refresh Section */}
          <div className="p-3.5 rounded-xl bg-[#140d07] border border-amber-800/40 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-amber-200/80 font-semibold">Current PUBG Diamonds Balance:</span>
              <span className="text-sm font-black font-mono text-amber-400">{currentBalance} 💎</span>
            </div>

            {refreshMessage && (
              <div className="p-2 rounded-lg bg-emerald-950/80 border border-emerald-500/60 text-emerald-200 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{refreshMessage}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleRefreshBalance}
              disabled={isRefreshing || !cleanUid}
              className="w-full py-2 px-3 rounded-lg bg-[#22160d] hover:bg-[#2e1d11] text-amber-300 border border-amber-700/50 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
            >
              {isRefreshing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Checking Firebase Balance...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>I've Completed Payment &bull; Sync Balance</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
