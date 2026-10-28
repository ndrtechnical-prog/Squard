import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, 
  ArrowLeft,
  Trophy, 
  Crown, 
  Star, 
  Medal, 
  Gift, 
  CheckCircle2, 
  Flame, 
  ShieldCheck, 
  MessageSquareHeart, 
  Send, 
  Coins,
  Sparkles,
  Users,
  Wallet,
  ArrowDownToLine,
  CreditCard,
  Building2,
  Clock,
  AlertTriangle,
  History,
  Check,
  ChevronRight,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { CashOutMethod, CashOutStatus, CashOutRequest, UserWalletData, RewardSettings } from '../types/tournament';

export type FeatureTab = 'REWARD' | 'TOP_PLAYER' | 'REVIEWS';

interface TournamentFeaturesModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: FeatureTab;
  savedPubgId?: string;
  savedPlayerName?: string;
  userBalance?: number;
  onRefreshUserBalance?: () => void;
  onOpenDeposit?: () => void;
}

interface ReviewItem {
  id: string;
  name: string;
  pubgId: string;
  rating: number;
  date: string;
  comment: string;
  verified: boolean;
}

const INITIAL_REVIEWS: ReviewItem[] = [
  {
    id: 'rev-1',
    name: '亗・NADIR_YT・亗',
    pubgId: '5675737714',
    rating: 5,
    date: 'Yesterday',
    comment: '15 minute room ID bilkul time per aayi, match bohot competitive tha. Winning amount 24 hours me Easypaisa per direct transfer ho gayi!',
    verified: true
  },
  {
    id: 'rev-2',
    name: 'BakkarGamer',
    pubgId: '512948104',
    rating: 5,
    date: '2 days ago',
    comment: 'Room entry system bohot clean hai, fake players nahi hotay aur admin support fast hai. Erangel map ping was 20ms.',
    verified: true
  },
  {
    id: 'rev-3',
    name: 'Aligamer2',
    pubgId: '520485201',
    rating: 5,
    date: '3 days ago',
    comment: 'Best tournament platform in Pakistan. 150 diamonds seat booking with Easypaisa & JazzCash is very fast & automated.',
    verified: true
  },
  {
    id: 'rev-4',
    name: 'kingofpubg',
    pubgId: '512948103',
    rating: 5,
    date: '4 days ago',
    comment: 'Anti-cheat strict rules aur slots distribution 100% fair. Next 25-squad tournament me bhi enter honge!',
    verified: true
  }
];

export const TournamentFeaturesModal: React.FC<TournamentFeaturesModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'REWARD',
  savedPubgId = '',
  savedPlayerName = '',
  userBalance = 0,
  onRefreshUserBalance,
  onOpenDeposit
}) => {
  const [activeTab, setActiveTab] = useState<FeatureTab>(initialTab);

  // Reward settings from backend/Firebase RTDB
  const [rewardSettings, setRewardSettings] = useState<RewardSettings>({
    perKillReward: 100,
    minWithdrawal: 100,
    estimatedProcessingTime: 'Estimated processing time: 3–4 days after approval.'
  });

  // User Wallet Data from backend/Firebase RTDB
  const [wallet, setWallet] = useState<UserWalletData>({
    uid: savedPubgId || '',
    pubgUid: savedPubgId || '',
    playerName: savedPlayerName || (savedPubgId ? `Player_${savedPubgId.slice(-4)}` : 'Guest Player'),
    diamondRewardBalance: userBalance,
    mainBalance: 0,
    totalBalance: userBalance,
    reservedBalance: 0,
    withdrawableBalancePKR: userBalance
  });
  const [isLoadingWallet, setIsLoadingWallet] = useState(false);

  // Cash-Out History
  const [cashOutHistory, setCashOutHistory] = useState<CashOutRequest[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Cash-Out Form state
  const [isCashOutOpen, setIsCashOutOpen] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<CashOutMethod>('EasyPaisa');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [bankName, setBankName] = useState('Allied Bank / Meezan / HBL');
  const [withdrawalAmount, setWithdrawalAmount] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Confirmation Dialog State
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Reviews State
  const [reviewsList, setReviewsList] = useState<ReviewItem[]>(() => {
    try {
      const stored = localStorage.getItem('pubg_community_reviews');
      if (stored) return JSON.parse(stored);
    } catch {
      // fallback
    }
    return INITIAL_REVIEWS;
  });

  const [reviewerName, setReviewerName] = useState('');
  const [reviewerPubgId, setReviewerPubgId] = useState('');
  const [reviewerRating, setReviewerRating] = useState(5);
  const [reviewerComment, setReviewerComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewSuccessMsg, setReviewSuccessMsg] = useState(false);

  // Fetch live reward settings
  const fetchRewardSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/reward/settings');
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          setRewardSettings(data.settings);
        }
      }
    } catch (e) {
      console.warn('Error fetching reward settings:', e);
    }
  }, []);

  // Fetch live user wallet from Firebase RTDB
  const fetchUserWallet = useCallback(async () => {
    if (!savedPubgId) return;
    setIsLoadingWallet(true);
    try {
      const res = await fetch(`/api/user/wallet?pubgUid=${encodeURIComponent(savedPubgId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.wallet) {
          setWallet(data.wallet);
        }
      }
    } catch (e) {
      console.warn('Error fetching wallet:', e);
    } finally {
      setIsLoadingWallet(false);
    }
  }, [savedPubgId]);

  // Fetch live cash-out history for this user
  const fetchCashOutHistory = useCallback(async () => {
    if (!savedPubgId) return;
    setIsLoadingHistory(true);
    try {
      const res = await fetch(`/api/cashout/my-history?pubgUid=${encodeURIComponent(savedPubgId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.requests)) {
          setCashOutHistory(data.requests);
        }
      }
    } catch (e) {
      console.warn('Error fetching cash-out history:', e);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [savedPubgId]);

  // Sync tab on prop change and load live data
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      fetchRewardSettings();
      fetchUserWallet();
      fetchCashOutHistory();
    }
  }, [isOpen, initialTab, fetchRewardSettings, fetchUserWallet, fetchCashOutHistory]);

  if (!isOpen) return null;

  // Mask account number for preview in confirmation
  const getMaskedAccountNumber = (acc: string) => {
    const clean = acc.trim();
    if (!clean) return '****';
    if (clean.length <= 6) return clean.slice(0, 2) + '****' + clean.slice(-2);
    return `${clean.slice(0, 4)}****${clean.slice(-3)}`;
  };

  // Validate form before opening confirmation modal
  const handleInitiateCashOut = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!savedPubgId) {
      setFormError('Please save or connect your PUBG ID on the home page first.');
      return;
    }

    if (!accountHolderName.trim()) {
      setFormError('Please enter the Account Holder Name exactly as registered.');
      return;
    }

    if (!accountNumber.trim()) {
      setFormError(`Please enter a valid ${selectedMethod} Account / Mobile number.`);
      return;
    }

    if (selectedMethod === 'Other Bank Account' && !bankName.trim()) {
      setFormError('Please enter your Bank Name.');
      return;
    }

    const amountNum = parseInt(withdrawalAmount, 10);
    if (isNaN(amountNum) || amountNum <= 0) {
      setFormError('Please enter a valid withdrawal amount in PKR.');
      return;
    }

    if (amountNum < rewardSettings.minWithdrawal) {
      setFormError(`Minimum withdrawal amount is PKR ${rewardSettings.minWithdrawal}.`);
      return;
    }

    if (amountNum > wallet.withdrawableBalancePKR) {
      setFormError(
        `Insufficient withdrawable balance. You requested PKR ${amountNum}, but only PKR ${wallet.withdrawableBalancePKR} is available.`
      );
      return;
    }

    // Open confirmation dialog
    setShowConfirmModal(true);
  };

  // Submit confirmed request to server
  const handleConfirmCashOut = async () => {
    setIsSubmitting(true);
    setFormError(null);

    try {
      const amountNum = parseInt(withdrawalAmount, 10);
      const res = await fetch('/api/cashout/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pubgUid: savedPubgId,
          paymentMethod: selectedMethod,
          accountHolderName: accountHolderName.trim(),
          accountNumber: accountNumber.trim(),
          bankName: selectedMethod === 'Other Bank Account' ? bankName.trim() : selectedMethod,
          withdrawalAmountPKR: amountNum
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setShowConfirmModal(false);
        setIsCashOutOpen(false);
        setWithdrawalAmount('');
        setAccountNumber('');
        setSuccessToast(`Cash-out request #${data.requestId} submitted! Amount has been deducted from your balance.`);
        setTimeout(() => setSuccessToast(null), 5000);

        if (typeof data.newBalance === 'number') {
          localStorage.setItem('pubg_user_diamonds_balance', data.newBalance.toString());
        }

        // Refresh live data
        await fetchUserWallet();
        await fetchCashOutHistory();
        if (onRefreshUserBalance) onRefreshUserBalance();
      } else {
        setShowConfirmModal(false);
        setFormError(data.error || 'Failed to submit cash-out request.');
      }
    } catch (err: any) {
      setShowConfirmModal(false);
      setFormError(err.message || 'Network error submitting request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Status Badge Helper
  const getStatusBadge = (status: CashOutStatus) => {
    switch (status) {
      case 'Pending':
        return (
          <span className="px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[10px] font-bold flex items-center gap-1 font-mono">
            <Clock className="w-3 h-3 animate-spin text-amber-400" />
            <span>Pending Review</span>
          </span>
        );
      case 'Approved':
        return (
          <span className="px-2.5 py-1 rounded-full bg-blue-500/15 border border-blue-500/40 text-blue-300 text-[10px] font-bold flex items-center gap-1 font-mono">
            <CheckCircle2 className="w-3 h-3 text-blue-400" />
            <span>Approved (Queued)</span>
          </span>
        );
      case 'Processing':
        return (
          <span className="px-2.5 py-1 rounded-full bg-purple-500/15 border border-purple-500/40 text-purple-300 text-[10px] font-bold flex items-center gap-1 font-mono">
            <RefreshCw className="w-3 h-3 animate-spin text-purple-400" />
            <span>Processing Payout</span>
          </span>
        );
      case 'Paid':
        return (
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-[10px] font-bold flex items-center gap-1 font-mono">
            <Check className="w-3 h-3 text-emerald-400" />
            <span>Paid / Dispatched</span>
          </span>
        );
      case 'Rejected':
        return (
          <span className="px-2.5 py-1 rounded-full bg-rose-500/15 border border-rose-500/40 text-rose-300 text-[10px] font-bold flex items-center gap-1 font-mono">
            <AlertTriangle className="w-3 h-3 text-rose-400" />
            <span>Rejected</span>
          </span>
        );
      default:
        return null;
    }
  };

  // Review submission
  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewerName.trim() || !reviewerComment.trim()) return;

    setIsSubmittingReview(true);
    setTimeout(() => {
      const newReview: ReviewItem = {
        id: `rev_${Date.now()}`,
        name: reviewerName.trim(),
        pubgId: reviewerPubgId.trim() || savedPubgId || '512948101',
        rating: reviewerRating,
        date: 'Just now',
        comment: reviewerComment.trim(),
        verified: true
      };

      const updated = [newReview, ...reviewsList];
      setReviewsList(updated);
      try {
        localStorage.setItem('pubg_community_reviews', JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to save review:', e);
      }

      setReviewerName('');
      setReviewerPubgId('');
      setReviewerComment('');
      setIsSubmittingReview(false);
      setReviewSuccessMsg(true);
      setTimeout(() => setReviewSuccessMsg(false), 3000);
    }, 400);
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-[#060b13] overflow-y-auto text-slate-100 flex flex-col min-h-screen animate-in fade-in duration-200"
    >
      {/* Full-width Sticky Top Navigation Header */}
      <header className="sticky top-0 z-40 bg-[#08101e]/95 backdrop-blur-md border-b border-slate-800 shadow-xl px-4 sm:px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          {/* Back to Tournament Button */}
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700/80 font-heading text-xs sm:text-sm font-black tracking-wider uppercase transition-all cursor-pointer group shadow-md"
          >
            <ArrowLeft className="w-4 h-4 text-amber-400 group-hover:-translate-x-1 transition-transform" />
            <span>Back to Tournament</span>
          </button>

          {/* Center Brand & Section Title */}
          <div className="flex items-center gap-2 sm:gap-3 text-center">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse hidden sm:inline-block" />
            <div>
              <h1 className="font-heading text-sm sm:text-base md:text-lg font-black uppercase text-white tracking-wider flex items-center justify-center gap-2">
                <span>PUBG ARENA</span>
                <span className="text-amber-400">·</span>
                <span className="text-slate-300">
                  {activeTab === 'REWARD' && 'REWARD & CASHOUT'}
                  {activeTab === 'TOP_PLAYER' && 'HALL OF FAME'}
                  {activeTab === 'REVIEWS' && 'COMMUNITY REVIEWS'}
                </span>
              </h1>
              <span className="text-[10px] text-amber-400/90 font-mono tracking-widest uppercase hidden sm:block">
                Official Tournament Ecosystem
              </span>
            </div>
          </div>

          {/* Right: Quick Balance & Close Icon */}
          <div className="flex items-center gap-2 sm:gap-3">
            {savedPubgId && (
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs shadow-inner">
                <span className="text-slate-400">Withdrawable:</span>
                <span className="text-emerald-400 font-black">PKR {wallet.withdrawableBalancePKR}</span>
              </div>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-800/80 hover:bg-rose-950/80 hover:border-rose-500/60 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer shadow-sm"
              title="Close Full Screen View"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Full-Screen Container */}
      <main className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 pb-28 flex-1">
        {/* Success Notification Banner */}
        {successToast && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-950/90 border border-emerald-500/60 text-emerald-200 text-xs sm:text-sm flex items-center gap-3 shadow-xl animate-in slide-in-from-top-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="font-semibold">{successToast}</span>
          </div>
        )}

        {/* 3 Full-Screen Navigation Tabs (Easypaisa Style Actions) */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-7 p-1.5 rounded-2xl bg-[#091220] border border-slate-800/80 shadow-lg">
          {/* REWARD Tab Button */}
          <button
            type="button"
            onClick={() => setActiveTab('REWARD')}
            className={`py-3 sm:py-3.5 px-3 sm:px-6 rounded-xl flex items-center justify-center gap-2 text-xs sm:text-sm font-heading font-black tracking-wider uppercase transition-all cursor-pointer ${
              activeTab === 'REWARD'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Trophy className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            <span>Reward</span>
          </button>

          {/* TOP PLAYER Tab Button */}
          <button
            type="button"
            onClick={() => setActiveTab('TOP_PLAYER')}
            className={`py-3 sm:py-3.5 px-3 sm:px-6 rounded-xl flex items-center justify-center gap-2 text-xs sm:text-sm font-heading font-black tracking-wider uppercase transition-all cursor-pointer ${
              activeTab === 'TOP_PLAYER'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-black shadow-lg shadow-amber-500/30 font-extrabold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Crown className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            <span>Top Player</span>
          </button>

          {/* REVIEWS Tab Button */}
          <button
            type="button"
            onClick={() => setActiveTab('REVIEWS')}
            className={`py-3 sm:py-3.5 px-3 sm:px-6 rounded-xl flex items-center justify-center gap-2 text-xs sm:text-sm font-heading font-black tracking-wider uppercase transition-all cursor-pointer ${
              activeTab === 'REVIEWS'
                ? 'bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-lg shadow-rose-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Star className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            <span>Reviews</span>
          </button>
        </div>

        {/* =========================================================================
            TAB 1: ENHANCED REWARD SECTION (PER KILL REWARD + WALLET + CASH OUT + HISTORY)
           ========================================================================= */}
        {activeTab === 'REWARD' && (
          <div className="space-y-4 animate-in fade-in-50 duration-200">

            {/* 1. TOP BANNER: PER KILL REWARD (PKR 100 per kill) */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-950/80 via-[#0d1829] to-red-950/80 border-2 border-amber-500/60 p-4 sm:p-5 shadow-[0_0_30px_rgba(245,158,11,0.25)] text-center">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center justify-center gap-2 mb-1">
                <Flame className="w-5 h-5 text-amber-400 animate-pulse" />
                <span className="font-heading text-xs sm:text-sm font-black tracking-widest text-amber-300 uppercase">
                  PER KILL REWARD
                </span>
                <Flame className="w-5 h-5 text-amber-400 animate-pulse" />
              </div>
              <div className="font-heading text-3xl sm:text-4xl font-black text-white tracking-wider my-1 drop-shadow-[0_2px_10px_rgba(245,158,11,0.4)]">
                PKR {rewardSettings.perKillReward}{' '}
                <span className="text-amber-400 text-base sm:text-lg font-bold">per kill</span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-300 max-w-md mx-auto">
                Official tournament kill bounties are verified and credited directly to your player wallet upon match conclusion.
              </p>
            </div>

            {/* 2-Column Responsive Layout on Desktop / Stacked on Mobile */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column (col-span-7): Wallet Card, Cash Out Action, and Payout Guarantee */}
              <div className="lg:col-span-7 space-y-6">
                {/* 2. AUTHENTICATED WALLET CARD */}
                <div className="rounded-3xl bg-gradient-to-b from-[#0c1626] to-[#070d18] border border-cyan-500/40 p-5 sm:p-6 shadow-2xl">
                  <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400 shadow-md">
                        <Wallet className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400 font-mono uppercase tracking-wider block">
                          Player Wallet (Firebase Live)
                        </span>
                        <span className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                          <span>{savedPubgId ? `UID: ${savedPubgId}` : 'No PUBG ID linked'}</span>
                          {savedPubgId && (
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {onOpenDeposit && (
                        <button
                          type="button"
                          onClick={onOpenDeposit}
                          className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-300 text-xs font-heading font-black uppercase tracking-wider transition-all"
                        >
                          + Deposit
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          fetchUserWallet();
                          fetchCashOutHistory();
                        }}
                        disabled={isLoadingWallet}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                        title="Refresh Wallet Balance"
                      >
                        <RefreshCw className={`w-4 h-4 ${isLoadingWallet ? 'animate-spin text-cyan-400' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {/* 3 Balance Stats */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4">
                    {/* 1. Diamond Reward Balance */}
                    <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-inner">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Diamond Reward Balance
                      </span>
                      <div className="font-heading text-lg sm:text-xl font-black text-amber-400 mt-1 font-mono flex items-center gap-1.5">
                        <span>{wallet.diamondRewardBalance}</span>
                        <span className="text-xs text-amber-300">💎</span>
                      </div>
                      <span className="text-[10px] text-slate-500">From kills &amp; prizes</span>
                    </div>

                    {/* 2. Main Wallet Balance */}
                    <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-inner">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Main Wallet Balance
                      </span>
                      <div className="font-heading text-lg sm:text-xl font-black text-cyan-300 mt-1 font-mono">
                        PKR {wallet.totalBalance}
                      </div>
                      <span className="text-[10px] text-slate-500">Account deposits/funds</span>
                    </div>

                    {/* 3. Total Withdrawable Balance (in PKR) */}
                    <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-950/70 to-slate-900 border border-emerald-500/60 shadow-md">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-emerald-300 uppercase tracking-wider block">
                          Total Withdrawable
                        </span>
                        {wallet.reservedBalance > 0 && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">
                            PKR {wallet.reservedBalance} locked
                          </span>
                        )}
                      </div>
                      <div className="font-heading text-xl sm:text-2xl font-black text-emerald-400 mt-1 font-mono">
                        PKR {wallet.withdrawableBalancePKR}
                      </div>
                      <span className="text-[10px] text-emerald-200/70">Eligible cash-out amount</span>
                    </div>
                  </div>

                  {/* CASH OUT PROMINENT BUTTON */}
                  {!isCashOutOpen ? (
                    <button
                      type="button"
                      onClick={() => {
                        setFormError(null);
                        setIsCashOutOpen(true);
                      }}
                      className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-black font-heading font-black text-sm uppercase tracking-wider shadow-[0_4px_25px_rgba(16,185,129,0.35)] hover:shadow-[0_6px_30px_rgba(16,185,129,0.55)] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <ArrowDownToLine className="w-5 h-5 stroke-[2.5]" />
                      <span>CASH OUT BALANCE</span>
                    </button>
                  ) : (
                    /* 3. CASH-OUT FORM (Embedded in Full Screen View) */
                    <div className="p-5 rounded-2xl bg-slate-950/95 border-2 border-emerald-500/50 space-y-4 animate-in fade-in-50 duration-200 shadow-xl">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <div className="flex items-center gap-2">
                          <ArrowDownToLine className="w-5 h-5 text-emerald-400" />
                          <h3 className="font-heading text-sm font-black text-white uppercase tracking-wider">
                            Request Cash Out
                          </h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setIsCashOutOpen(false);
                            setFormError(null);
                          }}
                          className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-900 border border-slate-800"
                        >
                          Close Form
                        </button>
                      </div>

                      {formError && (
                        <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/70 text-rose-200 text-xs flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                          <span>{formError}</span>
                        </div>
                      )}

                      {/* Payment Method Selector (EasyPaisa · JazzCash · Other Bank) */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-2">
                          Select Payment Method
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {/* 1. EasyPaisa */}
                          <button
                            type="button"
                            onClick={() => setSelectedMethod('EasyPaisa')}
                            className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                              selectedMethod === 'EasyPaisa'
                                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-md shadow-emerald-500/20 font-bold'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                            }`}
                          >
                            <div className="w-7 h-7 rounded-full bg-emerald-500/30 flex items-center justify-center font-black text-xs text-emerald-300">
                              EP
                            </div>
                            <span className="text-xs font-semibold">EasyPaisa</span>
                          </button>

                          {/* 2. JazzCash */}
                          <button
                            type="button"
                            onClick={() => setSelectedMethod('JazzCash')}
                            className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                              selectedMethod === 'JazzCash'
                                ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-md shadow-amber-500/20 font-bold'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                            }`}
                          >
                            <div className="w-7 h-7 rounded-full bg-amber-500/30 flex items-center justify-center font-black text-xs text-amber-300">
                              JC
                            </div>
                            <span className="text-xs font-semibold">JazzCash</span>
                          </button>

                          {/* 3. Other Bank Account */}
                          <button
                            type="button"
                            onClick={() => setSelectedMethod('Other Bank Account')}
                            className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                              selectedMethod === 'Other Bank Account'
                                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-md shadow-cyan-500/20 font-bold'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                            }`}
                          >
                            <Building2 className="w-6 h-6 text-cyan-400" />
                            <span className="text-xs font-semibold">Other Bank</span>
                          </button>
                        </div>
                      </div>

                      {/* Dynamic Cash-Out Form Fields */}
                      <form onSubmit={handleInitiateCashOut} className="space-y-3.5">
                        {/* Account Holder Name */}
                        <div>
                          <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                            Account Holder Name
                          </label>
                          <input
                            type="text"
                            value={accountHolderName}
                            onChange={(e) => setAccountHolderName(e.target.value)}
                            placeholder="e.g. Muhammad Nadir"
                            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-emerald-400 text-xs sm:text-sm text-white placeholder-slate-500 outline-none transition-colors"
                            required
                          />
                        </div>

                        {/* Method Specific Fields */}
                        {selectedMethod === 'Other Bank Account' && (
                          <div>
                            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                              Bank Name
                            </label>
                            <input
                              type="text"
                              value={bankName}
                              onChange={(e) => setBankName(e.target.value)}
                              placeholder="e.g. Meezan Bank, HBL, Allied Bank, UBL"
                              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-cyan-400 text-xs sm:text-sm text-white placeholder-slate-500 outline-none transition-colors"
                              required
                            />
                          </div>
                        )}

                        {/* Mobile / Account Number or IBAN */}
                        <div>
                          <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                            {selectedMethod === 'Other Bank Account' 
                              ? 'Account Number or IBAN' 
                              : `${selectedMethod} Mobile / Account Number`}
                          </label>
                          <input
                            type="text"
                            value={accountNumber}
                            onChange={(e) => setAccountNumber(e.target.value)}
                            placeholder={selectedMethod === 'Other Bank Account' ? 'e.g. PK36MEZN000123456789' : 'e.g. 03052838367'}
                            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-emerald-400 text-xs sm:text-sm text-white placeholder-slate-500 outline-none transition-colors font-mono"
                            required
                          />
                        </div>

                        {/* Withdrawal Amount in PKR */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                              Withdrawal Amount (PKR)
                            </label>
                            <span className="text-[10px] text-slate-400 font-mono">
                              Min: PKR {rewardSettings.minWithdrawal} · Max: PKR {wallet.withdrawableBalancePKR}
                            </span>
                          </div>
                          <div className="relative">
                            <input
                              type="number"
                              value={withdrawalAmount}
                              onChange={(e) => setWithdrawalAmount(e.target.value)}
                              placeholder={`Enter amount (min PKR ${rewardSettings.minWithdrawal})`}
                              min={rewardSettings.minWithdrawal}
                              max={wallet.withdrawableBalancePKR}
                              className="w-full pl-3.5 pr-16 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-emerald-400 text-xs sm:text-sm text-white placeholder-slate-500 outline-none transition-colors font-mono"
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setWithdrawalAmount(wallet.withdrawableBalancePKR.toString())}
                              className="absolute right-2 top-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-amber-400 font-mono transition-colors"
                            >
                              MAX
                            </button>
                          </div>
                        </div>

                        {/* Estimated processing notice */}
                        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2.5">
                          <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="text-slate-300 font-semibold block">{rewardSettings.estimatedProcessingTime}</span>
                            <span>Estimated processing times are estimates and subject to admin review and verified match logs.</span>
                          </div>
                        </div>

                        {/* Buttons: Submit Cash-Out Request & Cancel */}
                        <div className="flex items-center gap-3 pt-2">
                          <button
                            type="submit"
                            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-heading font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
                          >
                            Submit Cash-Out Request
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsCashOutOpen(false);
                              setFormError(null);
                            }}
                            className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>

                {/* Payout Guarantee Notice */}
                <div className="p-4 sm:p-5 rounded-3xl bg-emerald-950/40 border border-emerald-500/40 text-xs text-emerald-200 space-y-1.5 shadow-md">
                  <div className="flex items-center gap-2.5 font-bold text-emerald-300 text-sm">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    <span>Automated Payout Guarantee (Easypaisa &amp; JazzCash)</span>
                  </div>
                  <p className="text-xs text-emerald-200/80 leading-relaxed">
                    Match k 24 hour k andar rewards share honge. Jis PUBG ID se seat book hui thi, payment usi verified account per dispatch hogi. Players apna balance kisi bhi bank ya mobile wallet me withdraw karwa sakte hain.
                  </p>
                </div>
              </div>

              {/* Right Column (col-span-5): USER CASH-OUT HISTORY */}
              <div className="lg:col-span-5 space-y-6">
                <div className="rounded-3xl bg-[#0c1626]/90 border border-slate-800 p-5 sm:p-6 shadow-xl">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <History className="w-5 h-5 text-cyan-400" />
                      <h3 className="font-heading text-sm font-black text-white uppercase tracking-wider">
                        MY CASH-OUT HISTORY
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 font-mono">
                        {cashOutHistory.length} requests
                      </span>
                      <button
                        type="button"
                        onClick={fetchCashOutHistory}
                        disabled={isLoadingHistory}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                        title="Refresh History"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoadingHistory ? 'animate-spin text-cyan-400' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {isLoadingHistory ? (
                    <div className="py-10 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                      <span>Loading transaction records...</span>
                    </div>
                  ) : cashOutHistory.length === 0 ? (
                    <div className="py-10 text-center text-xs text-slate-500 space-y-2">
                      <Coins className="w-8 h-8 text-slate-600 mx-auto" />
                      <p>No cash-out requests submitted yet.</p>
                      <p className="text-[11px] text-slate-600">Your requested payouts will appear here in real-time.</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                      {cashOutHistory.map((item) => (
                        <div
                          key={item.requestId}
                          className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-colors shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono font-bold text-white">
                                  {item.requestId}
                                </span>
                                <span className="px-2 py-0.5 rounded-md bg-slate-800 text-[10px] text-slate-300 font-mono">
                                  {item.paymentMethod}
                                </span>
                              </div>
                              <span className="text-xs text-slate-400 font-mono block mt-1">
                                Account: {item.accountNumber} ({item.accountHolderName})
                              </span>
                            </div>

                            <div className="text-right">
                              <span className="font-heading text-sm font-black text-emerald-400 font-mono block">
                                PKR {item.withdrawalAmountPKR}
                              </span>
                              <div className="mt-1 flex justify-end">
                                {getStatusBadge(item.status)}
                              </div>
                            </div>
                          </div>

                          <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
                            <span>{new Date(item.requestedAt).toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })}</span>
                            <span>{item.estimatedProcessingTime}</span>
                          </div>

                          {/* Show rejection reason if rejected */}
                          {item.status === 'Rejected' && item.rejectionReason && (
                            <div className="mt-2 p-2.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-300 flex items-start gap-2">
                              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                              <span><strong>Rejection Reason:</strong> {item.rejectionReason}</span>
                            </div>
                          )}

                          {/* Admin Note if provided */}
                          {item.adminNote && (
                            <div className="mt-2 p-2 rounded-lg bg-slate-800/60 text-[11px] text-slate-400 font-mono">
                              <strong>Admin Note:</strong> {item.adminNote}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 2: TOP PLAYERS (HALL OF FAME)
           ========================================================================= */}
        {activeTab === 'TOP_PLAYER' && (
          <div className="space-y-6 animate-in fade-in-50 duration-200">
            {/* Header Banner */}
            <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-amber-950/60 via-slate-900 to-[#0c1626] border border-amber-500/40 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shadow-md">
                  <Crown className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-heading text-lg font-black uppercase text-white tracking-wider">
                    HALL OF FAME — ASIA REGION
                  </h3>
                  <p className="text-xs text-slate-300">
                    Official verified tournament contenders, highest fraggers, and champion clan records.
                  </p>
                </div>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold">
                ⭐ Season 2026 Rankings
              </div>
            </div>

            {/* Expansive 2-Column Grid of Top Players */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Player 1 */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#0c1626] border border-amber-500/50 flex items-center justify-between shadow-lg">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center font-black text-amber-400 font-mono text-base">
                    #1
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm sm:text-base">亗・NADIR_YT・亗</span>
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-bold">Ace Dominator ⭐ x5</span>
                    </div>
                    <span className="text-xs text-cyan-400 font-mono block mt-0.5">UID: 5675737714 · Clan: PAK ESPORTS</span>
                  </div>
                </div>
                <div className="text-right font-mono text-xs">
                  <span className="text-white font-bold block text-sm">18 Kills avg</span>
                  <span className="text-emerald-400 text-xs">48% Win Rate</span>
                </div>
              </div>

              {/* Player 2 */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#0c1626] border border-slate-700 flex items-center justify-between shadow-lg">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-slate-800 border border-slate-600 flex items-center justify-center font-black text-slate-300 font-mono text-base">
                    #2
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm sm:text-base">BakkarGamer</span>
                      <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 text-[10px] font-bold">Conqueror</span>
                    </div>
                    <span className="text-xs text-cyan-400 font-mono block mt-0.5">UID: 512948104 · Clan: PUNJAB LIONS</span>
                  </div>
                </div>
                <div className="text-right font-mono text-xs">
                  <span className="text-white font-bold block text-sm">14 Kills avg</span>
                  <span className="text-emerald-400 text-xs">35% Win Rate</span>
                </div>
              </div>

              {/* Player 3 */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#0c1626] border border-amber-800/50 flex items-center justify-between shadow-lg">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-amber-950/60 border border-amber-800/60 flex items-center justify-center font-black text-amber-500 font-mono text-base">
                    #3
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm sm:text-base">Aligamer2</span>
                      <span className="px-2 py-0.5 rounded-md bg-amber-800/20 text-amber-400 text-[10px] font-bold">Ace Master</span>
                    </div>
                    <span className="text-xs text-cyan-400 font-mono block mt-0.5">UID: 520485201 · Clan: SINDH SNIPERS</span>
                  </div>
                </div>
                <div className="text-right font-mono text-xs">
                  <span className="text-white font-bold block text-sm">11 Kills avg</span>
                  <span className="text-emerald-400 text-xs">31% Win Rate</span>
                </div>
              </div>

              {/* Player 4 */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#0c1626] border border-slate-800 flex items-center justify-between shadow-lg">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center font-black text-slate-400 font-mono text-base">
                    #4
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm sm:text-base">kingofpubg</span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-700/30 text-slate-300 text-[10px] font-bold">Ace</span>
                    </div>
                    <span className="text-xs text-cyan-400 font-mono block mt-0.5">UID: 512948103 · Clan: LAHORE QALANDARS</span>
                  </div>
                </div>
                <div className="text-right font-mono text-xs">
                  <span className="text-white font-bold block text-sm">9 Kills avg</span>
                  <span className="text-emerald-400 text-xs">26% Win Rate</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 3: REVIEWS & COMMUNITY RATINGS
           ========================================================================= */}
        {activeTab === 'REVIEWS' && (
          <div className="space-y-6 animate-in fade-in-50 duration-200">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column (col-span-5): Score Overview + Add Review Form */}
              <div className="lg:col-span-5 space-y-5">
                {/* Rating Overview Box */}
                <div className="p-5 rounded-3xl bg-gradient-to-r from-rose-950/60 via-slate-900 to-amber-950/60 border border-slate-800 space-y-2 shadow-lg">
                  <span className="text-xs font-black uppercase tracking-wider text-rose-300 block">
                    COMMUNITY SATISFACTION
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="font-heading text-4xl font-black text-white">4.9</span>
                    <div className="flex text-amber-400">
                      <Star className="w-5 h-5 fill-amber-400" />
                      <Star className="w-5 h-5 fill-amber-400" />
                      <Star className="w-5 h-5 fill-amber-400" />
                      <Star className="w-5 h-5 fill-amber-400" />
                      <Star className="w-5 h-5 fill-amber-400" />
                    </div>
                    <span className="text-xs text-slate-400 font-mono">(98+ Reviews)</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Verified tournament participants across Punjab, Sindh, KPK, Balochistan &amp; Islamabad.
                  </p>
                </div>

                {/* Success alert for new review */}
                {reviewSuccessMsg && (
                  <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-500/60 text-emerald-200 text-xs flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Review submitted! Thank you for supporting the competitive PUBG community.</span>
                  </div>
                )}

                {/* Add Review Form */}
                <form onSubmit={handleSubmitReview} className="p-5 rounded-3xl bg-[#0c1626] border border-slate-800 space-y-3.5 shadow-xl">
                  <span className="text-sm font-bold text-white flex items-center gap-2">
                    <MessageSquareHeart className="w-5 h-5 text-rose-400" />
                    <span>Leave a Community Review</span>
                  </span>

                  <div className="space-y-2.5">
                    <input
                      type="text"
                      placeholder="Your In-Game / Clan Name"
                      value={reviewerName}
                      onChange={(e) => setReviewerName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-amber-400 text-xs sm:text-sm text-white placeholder-slate-500 outline-none"
                      required
                    />
                    <input
                      type="text"
                      placeholder="PUBG Character UID (optional)"
                      value={reviewerPubgId}
                      onChange={(e) => setReviewerPubgId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-amber-400 text-xs sm:text-sm text-white placeholder-slate-500 outline-none font-mono"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400">Rating:</span>
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setReviewerRating(star)}
                          className="p-1 focus:outline-none cursor-pointer"
                        >
                          <Star
                            className={`w-5 h-5 ${
                              star <= reviewerRating
                                ? 'text-amber-400 fill-amber-400'
                                : 'text-slate-600'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <textarea
                    placeholder="Share your tournament experience (Room ID timing, fair play, payout speed)..."
                    value={reviewerComment}
                    onChange={(e) => setReviewerComment(e.target.value)}
                    rows={3}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-amber-400 text-xs sm:text-sm text-white placeholder-slate-500 outline-none resize-none"
                    required
                  />

                  <button
                    type="submit"
                    disabled={isSubmittingReview}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-extrabold text-xs uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isSubmittingReview ? 'Posting Review...' : 'Submit Review'}</span>
                  </button>
                </form>
              </div>

              {/* Right Column (col-span-7): Reviews List */}
              <div className="lg:col-span-7 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs text-slate-400">
                  <span>Verified Player Feedback</span>
                  <span className="font-mono">{reviewsList.length} reviews</span>
                </div>
                <div className="space-y-3 max-h-[650px] overflow-y-auto pr-1">
                  {reviewsList.map((rev) => (
                    <div
                      key={rev.id}
                      className="p-4 rounded-2xl bg-[#0c1626] border border-slate-800 space-y-2 shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white">{rev.name}</span>
                          {rev.verified && (
                            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                              ✓ Verified Player
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">{rev.date}</span>
                      </div>
                      <div className="flex text-amber-400">
                        {Array.from({ length: rev.rating }).map((_, i) => (
                          <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
                        ))}
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        "{rev.comment}"
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* =========================================================================
          CONFIRMATION MODAL DIALOG ("Confirm your cash-out request?")
         ========================================================================= */}
      {showConfirmModal && (
        <div 
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          onClick={() => setShowConfirmModal(false)}
        >
          <div 
            className="w-full max-w-md rounded-3xl bg-gradient-to-b from-[#111a2e] to-[#070b14] border-2 border-emerald-500 p-5 sm:p-6 shadow-[0_0_50px_rgba(16,185,129,0.3)] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 text-emerald-400 mb-3">
              <CheckCircle2 className="w-5 h-5" />
              <h3 className="font-heading text-base font-black uppercase text-white tracking-wider">
                Confirm your cash-out request?
              </h3>
            </div>

            <p className="text-xs text-slate-300 mb-4">
              Please verify your payout destination details. Once confirmed, this amount will be reserved from your available balance.
            </p>

            {/* Details table */}
            <div className="space-y-2.5 p-4 rounded-2xl bg-slate-950/90 border border-slate-800 text-xs mb-4">
              <div className="flex justify-between">
                <span className="text-slate-400">Payment Method:</span>
                <span className="font-bold text-white">{selectedMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Account Holder Name:</span>
                <span className="font-bold text-white">{accountHolderName}</span>
              </div>
              {selectedMethod === 'Other Bank Account' && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Bank Name:</span>
                  <span className="font-bold text-cyan-300">{bankName}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-400">Masked Account Number:</span>
                <span className="font-mono font-bold text-amber-300">
                  {getMaskedAccountNumber(accountNumber)}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-800">
                <span className="text-slate-400 font-bold">Withdrawal Amount:</span>
                <span className="font-heading font-black text-emerald-400 font-mono text-sm">
                  PKR {withdrawalAmount}
                </span>
              </div>
              <div className="flex justify-between pt-1 text-[11px]">
                <span className="text-slate-400">Processing Time:</span>
                <span className="text-amber-400">{rewardSettings.estimatedProcessingTime}</span>
              </div>
            </div>

            {/* Action Buttons: Confirm Request / Go Back */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmCashOut}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-heading font-black text-xs uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-emerald-500/20"
              >
                {isSubmitting ? 'Reserving Balance...' : 'Confirm Request'}
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setShowConfirmModal(false)}
                className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
