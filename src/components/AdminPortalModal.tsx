import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, 
  ShieldCheck, 
  Check, 
  Lock, 
  AlertCircle, 
  Loader2, 
  Calendar, 
  Clock, 
  Hash, 
  Key, 
  Youtube, 
  RotateCcw, 
  Trash2, 
  UserX, 
  Users, 
  Radio, 
  Trophy, 
  LogOut,
  RefreshCw,
  Search,
  Sparkles,
  Gift,
  Bell,
  Send,
  CheckCircle2,
  Wallet,
  Copy,
  CheckCircle,
  XCircle,
  Banknote,
  DollarSign,
  Eye,
  TrendingUp
} from 'lucide-react';
import { Tournament, TournamentStatus, Seat, CashOutRequest, CashOutStatus } from '../types/tournament';

interface AdminPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  adminToken: string | null;
  onLogin: (token: string) => void;
  onLogout: () => void;
  tournament: Tournament | null;
  erangelTournament?: Tournament;
  livikTournament?: Tournament;
  tdmTournament?: Tournament;
  freeFireTournament?: Tournament;
  initialMatch?: 'ERANGEL' | 'LIVIK' | 'TDM' | 'FREE_FIRE' | null;
  onRefreshData: () => void;
  onNoticeUpdated?: () => void;
  onUpdateMatchSchedule?: (
    matchId: 'ERANGEL' | 'LIVIK' | 'TDM' | 'FREE_FIRE',
    schedule: {
      matchDate: string;
      matchTime: string;
      matchStartTime: number;
      roomOpenTime: number;
      matchEndTime: number;
      roomId: string;
      roomPassword: string;
      youtubeUrl: string;
      manualStatus: TournamentStatus | 'AUTO';
    }
  ) => void;
}

export const AdminPortalModal: React.FC<AdminPortalModalProps> = ({
  isOpen,
  onClose,
  adminToken,
  onLogin,
  onLogout,
  tournament,
  erangelTournament,
  livikTournament,
  tdmTournament,
  freeFireTournament,
  initialMatch,
  onRefreshData,
  onNoticeUpdated,
  onUpdateMatchSchedule
}) => {
  // Active Tab: 'schedule' | 'seats' | 'cashouts' | 'reward' | 'notice'
  const [activeTab, setActiveTab] = useState<'schedule' | 'seats' | 'cashouts' | 'reward' | 'notice'>('schedule');
  const [selectedMatch, setSelectedMatch] = useState<'ERANGEL' | 'LIVIK' | 'TDM' | 'FREE_FIRE'>(
    initialMatch || 'ERANGEL'
  );

  // Login form state
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Helpers for Asia/Karachi PKT date & timestamp
  const getTodayKarachiDate = () => {
    try {
      const formatter = new Intl.DateTimeFormat('en-CA', { 
        timeZone: 'Asia/Karachi', 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
      });
      return formatter.format(new Date());
    } catch {
      const d = new Date(Date.now() + 5 * 3600 * 1000);
      return d.toISOString().split('T')[0];
    }
  };

  const parseKarachiTimestamp = (dateStr?: string, timeStr?: string): number => {
    let cleanDate = (dateStr || '').trim();
    let rawTime = (timeStr || '').trim();

    if (!rawTime) rawTime = '11:00';
    if (!cleanDate) cleanDate = getTodayKarachiDate();

    // Normalize date format if in DD-MM-YYYY or DD/MM/YYYY
    if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/.test(cleanDate)) {
      const parts = cleanDate.split(/[-/]/);
      cleanDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }

    const ampmMatch = rawTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if (ampmMatch) {
      let hours = parseInt(ampmMatch[1], 10);
      const mins = ampmMatch[2];
      const modifier = (ampmMatch[3] || '').toUpperCase();
      if (modifier === 'PM' && hours < 12) hours += 12;
      if (modifier === 'AM' && hours === 12) hours = 0;
      rawTime = `${String(hours).padStart(2, '0')}:${mins}`;
    }

    const cleanTime = rawTime.length >= 5 ? rawTime.slice(0, 5) : `${rawTime}:00`.slice(0, 5);
    const isoStr = `${cleanDate}T${cleanTime}:00+05:00`;
    const parsed = Date.parse(isoStr);
    return isNaN(parsed) ? (Date.now() + 2 * 3600 * 1000) : parsed;
  };

  // 1. MATCH SCHEDULE & ROOM SETTINGS
  const [editDate, setEditDate] = useState(() => getTodayKarachiDate());
  const [editTime, setEditTime] = useState('11:00');
  const [editRoomId, setEditRoomId] = useState('69151604');
  const [editPassword, setEditPassword] = useState('1234');
  const [editYoutube, setEditYoutube] = useState('https://youtube.com/@flaregunpk?si=NycZ9BwNyELH405i');
  const [manualStatus, setManualStatus] = useState<TournamentStatus | 'AUTO'>('AUTO');
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [scheduleSuccessMsg, setScheduleSuccessMsg] = useState<string | null>(null);

  // 2. SEATS RESERVATION CONTROL
  const [removeUidInput, setRemoveUidInput] = useState('');
  const [isRemovingPlayer, setIsRemovingPlayer] = useState(false);
  const [removeMessage, setRemoveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [isResettingSeats, setIsResettingSeats] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetSuccessMsg, setResetSuccessMsg] = useState<string | null>(null);

  // 3. REWARD USER ID (Direct Diamonds Credit to any PUBG UID)
  const [rewardUid, setRewardUid] = useState('');
  const [rewardAmount, setRewardAmount] = useState<string>('500');
  const [rewardReason, setRewardReason] = useState('Chicken Dinner Bounty (1st Place)');
  const [isSubmittingReward, setIsSubmittingReward] = useState(false);
  const [rewardFeedback, setRewardFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 4. NOTICES & ALERTS
  const [noticeTitle, setNoticeTitle] = useState('Admin');
  const [noticeMessage, setNoticeMessage] = useState(
    'Match will start strictly on time. Room ID & Password will unlock 15 minutes before the match. All squad captains must join room within 15 minutes!'
  );
  const [noticeUrgency, setNoticeUrgency] = useState<'INFO' | 'URGENT' | 'LIVE'>('URGENT');
  const [noticeActive, setNoticeActive] = useState(true);
  const [isSavingNotice, setIsSavingNotice] = useState(false);
  const [noticeFeedback, setNoticeFeedback] = useState<string | null>(null);

  // 5. CASHOUT WITHDRAWAL REQUESTS
  const [cashoutRequests, setCashoutRequests] = useState<CashOutRequest[]>([]);
  const [isLoadingCashouts, setIsLoadingCashouts] = useState(false);
  const [cashoutFilter, setCashoutFilter] = useState<'ALL' | 'Pending' | 'Approved' | 'Paid' | 'Rejected'>('ALL');
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);
  const [cashoutFeedback, setCashoutFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedCashoutId, setCopiedCashoutId] = useState<string | null>(null);

  const fetchCashouts = useCallback(async () => {
    setIsLoadingCashouts(true);
    try {
      let list: CashOutRequest[] = [];
      const FIREBASE_DB_URL = 'https://pubg-matches-43fa1-default-rtdb.firebaseio.com';

      // 1. Try server admin route with auth header
      try {
        const headers: Record<string, string> = {};
        if (adminToken) headers['Authorization'] = `Bearer ${adminToken}`;
        const res = await fetch('/api/admin/cashouts', { headers });
        if (res.ok) {
          const data = await res.json();
          if (data && data.success && Array.isArray(data.requests)) {
            list = data.requests;
          }
        }
      } catch {}

      // 2. Direct authoritative Firebase Realtime DB sync fallback
      if (list.length === 0) {
        try {
          const fbRes = await fetch(`${FIREBASE_DB_URL}/CashOutRequests.json`);
          if (fbRes.ok) {
            const fbData = await fbRes.json();
            if (fbData && typeof fbData === 'object') {
              list = Object.values(fbData) as CashOutRequest[];
            }
          }
        } catch {}
      }

      list.sort((a, b) => (b.requestedAt || 0) - (a.requestedAt || 0));
      setCashoutRequests(list);
    } catch (err: any) {
      console.warn('Error fetching cashout requests:', err);
    } finally {
      setIsLoadingCashouts(false);
    }
  }, [adminToken]);

  // Visitor Traffic & Serial Counter State (Today & Lifetime Visitors)
  const [visitorStats, setVisitorStats] = useState<{
    today: number;
    lifetime: number;
    todayDate: string;
    lastUpdated?: number;
  }>({
    today: 0,
    lifetime: 0,
    todayDate: getTodayKarachiDate()
  });
  const [isLoadingVisitors, setIsLoadingVisitors] = useState<boolean>(false);

  const fetchVisitorStats = useCallback(async () => {
    setIsLoadingVisitors(true);
    try {
      const res = await fetch('/api/admin/visitors/stats');
      if (res.ok) {
        const data = await res.json();
        if (data && data.success) {
          setVisitorStats({
            today: data.today || 0,
            lifetime: data.lifetime || 0,
            todayDate: data.todayDate || getTodayKarachiDate(),
            lastUpdated: Date.now()
          });
          return;
        }
      }
      // Direct Firebase RTDB fallback
      const fbRes = await fetch('https://pubg-matches-43fa1-default-rtdb.firebaseio.com/visitor_stats.json');
      if (fbRes.ok) {
        const fbData = await fbRes.json();
        const todayStr = getTodayKarachiDate();
        setVisitorStats({
          today: (fbData?.daily && fbData?.daily[todayStr]) || 0,
          lifetime: fbData?.lifetime || 0,
          todayDate: todayStr,
          lastUpdated: Date.now()
        });
      }
    } catch (err) {
      console.warn('Error fetching visitor stats:', err);
    } finally {
      setIsLoadingVisitors(false);
    }
  }, []);

  // Handle Approve, Cancel/Reject, or Mark Paid for Cashout Request
  const handleCashoutAction = async (
    req: CashOutRequest,
    action: 'APPROVE' | 'REJECT' | 'PAID',
    reason?: string
  ) => {
    setActionInProgressId(req.requestId);
    setCashoutFeedback(null);
    const FIREBASE_DB_URL = 'https://pubg-matches-43fa1-default-rtdb.firebaseio.com';

    try {
      // 1. Send status update to server endpoint
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (adminToken) headers['Authorization'] = `Bearer ${adminToken}`;

        await fetch(`/api/admin/cashouts/${encodeURIComponent(req.requestId)}/status`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            action,
            adminNote: action === 'APPROVE' ? 'Approved by Admin' : action === 'PAID' ? 'Payment sent' : 'Request cancelled by Admin',
            rejectionReason: reason || 'Request cancelled by Admin'
          })
        });
      } catch {}

      // 2. Direct Firebase Realtime DB immediate sync
      const targetStatus: CashOutStatus = action === 'APPROVE' ? 'Approved' : action === 'PAID' ? 'Paid' : 'Rejected';
      const updatedReq: CashOutRequest = {
        ...req,
        status: targetStatus,
        reviewedAt: Date.now(),
        reviewedBy: 'Tournament Admin',
        adminNote: action === 'APPROVE' ? 'Approved by Admin' : action === 'PAID' ? 'Payment sent' : (reason || 'Cancelled by Admin'),
        ...(action === 'REJECT' ? { rejectionReason: reason || 'Cancelled by Admin' } : {}),
        ...(action === 'PAID' ? { paidAt: Date.now() } : {})
      };

      try {
        await fetch(`${FIREBASE_DB_URL}/CashOutRequests/${encodeURIComponent(req.requestId)}.json`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedReq)
        });

        // If action is REJECT (Cancel), refund the player's balance in Firebase RTDB
        if (action === 'REJECT' && req.status !== 'Rejected') {
          try {
            const uRes = await fetch(`${FIREBASE_DB_URL}/users/${encodeURIComponent(req.userUid)}.json`);
            if (uRes.ok) {
              const uText = await uRes.text();
              if (uText && uText.trim() !== 'null' && uText.trim().startsWith('{')) {
                const uData = JSON.parse(uText);
                const curBal = Number(uData.balance) || 0;
                const reservedBal = Number(uData.reservedWithdrawalBalance) || 0;
                uData.balance = curBal + req.withdrawalAmountPKR;
                uData.reservedWithdrawalBalance = Math.max(0, reservedBal - req.withdrawalAmountPKR);
                await fetch(`${FIREBASE_DB_URL}/users/${encodeURIComponent(req.userUid)}.json`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(uData)
                });
              }
            }
          } catch {}
        }
      } catch {}

      // Update in local state immediately
      setCashoutRequests(prev => prev.map(item => item.requestId === req.requestId ? updatedReq : item));

      if (action === 'APPROVE') {
        setCashoutFeedback({
          type: 'success',
          text: `Request #${req.requestId} (PKR ${req.withdrawalAmountPKR}) Approved successfully!`
        });
      } else if (action === 'REJECT') {
        setCashoutFeedback({
          type: 'success',
          text: `Request #${req.requestId} Cancelled! PKR ${req.withdrawalAmountPKR} refunded to UID ${req.userUid}.`
        });
      } else {
        setCashoutFeedback({
          type: 'success',
          text: `Request #${req.requestId} marked as Paid!`
        });
      }

      onRefreshData();
      setTimeout(() => setCashoutFeedback(null), 5000);
    } catch (err: any) {
      setCashoutFeedback({ type: 'error', text: err.message || 'Error updating cash-out request.' });
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleCopyCashout = (text: string, id: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedCashoutId(id);
      setTimeout(() => setCopiedCashoutId(null), 2000);
    } catch {}
  };

  const formatPKTDate = (timestamp?: number) => {
    if (!timestamp) return 'N/A';
    try {
      return new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Karachi',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }).format(new Date(timestamp));
    } catch {
      return new Date(timestamp).toLocaleString();
    }
  };

  const renderCashoutStatusBadge = (status: CashOutStatus) => {
    switch (status) {
      case 'Pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.3)] animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Pending Review
          </span>
        );
      case 'Approved':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.3)]">
            <Check className="w-3 h-3 text-emerald-400" />
            Approved
          </span>
        );
      case 'Processing':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/50">
            <RefreshCw className="w-3 h-3 text-cyan-400 animate-spin" />
            Processing
          </span>
        );
      case 'Paid':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-teal-500/20 text-teal-300 border border-teal-500/50">
            <CheckCircle2 className="w-3 h-3 text-teal-400" />
            Paid
          </span>
        );
      case 'Rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/50">
            <X className="w-3 h-3 text-rose-400" />
            Cancelled / Rejected
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-slate-300">
            {status}
          </span>
        );
    }
  };

  const getActiveMatchData = (matchKey: 'ERANGEL' | 'LIVIK' | 'TDM' | 'FREE_FIRE'): Tournament | null => {
    if (matchKey === 'ERANGEL') return erangelTournament || tournament;
    if (matchKey === 'LIVIK') return livikTournament || null;
    if (matchKey === 'TDM') return tdmTournament || null;
    if (matchKey === 'FREE_FIRE') return freeFireTournament || null;
    return tournament;
  };

  // Dedicated match selector that smoothly populates form fields for that exact match
  const handleSelectMatch = (matchKey: 'ERANGEL' | 'LIVIK' | 'TDM' | 'FREE_FIRE') => {
    setSelectedMatch(matchKey);
    const activeT = getActiveMatchData(matchKey);
    const today = getTodayKarachiDate();
    if (activeT) {
      setEditDate(activeT.matchDate || today);
      setEditTime(activeT.matchTime || (matchKey === 'LIVIK' ? '12:00' : matchKey === 'TDM' ? '01:00' : '11:00'));
      setEditRoomId(activeT.roomId || (matchKey === 'LIVIK' ? '78210943' : matchKey === 'TDM' ? '89102431' : '69151604'));
      setEditPassword(activeT.roomPassword || (matchKey === 'LIVIK' ? '5678' : matchKey === 'TDM' ? '9999' : '1234'));
      setEditYoutube(activeT.youtubeUrl || 'https://youtube.com/@flaregunpk?si=NycZ9BwNyELH405i');
      setManualStatus((activeT.manualStatus as any) || 'AUTO');
    }

    // Direct check against Firebase RTDB for this specific match
    fetch(`https://pubg-matches-43fa1-default-rtdb.firebaseio.com/tournaments/${matchKey}.json`)
      .then(r => r.json())
      .then(fbData => {
        if (fbData && typeof fbData === 'object') {
          if (fbData.matchDate) setEditDate(fbData.matchDate);
          if (fbData.matchTime) setEditTime(fbData.matchTime);
          if (fbData.roomId) setEditRoomId(fbData.roomId);
          if (fbData.roomPassword) setEditPassword(fbData.roomPassword);
          if (fbData.youtubeUrl) setEditYoutube(fbData.youtubeUrl);
          if (fbData.manualStatus) setManualStatus(fbData.manualStatus);
        }
      })
      .catch(() => {});
  };

  // Synchronize inputs when modal opens or initialMatch changes (does NOT get wiped by background poll)
  useEffect(() => {
    if (isOpen) {
      const matchToOpen = initialMatch || 'ERANGEL';
      handleSelectMatch(matchToOpen);
    }
  }, [isOpen, initialMatch]);

  // Fetch cashout withdrawal requests when admin is logged in
  useEffect(() => {
    if (isOpen && adminToken) {
      fetchCashouts();
    }
  }, [isOpen, adminToken, activeTab, fetchCashouts]);

  // Fetch visitor statistics when admin opens panel and every 30s
  useEffect(() => {
    if (isOpen && adminToken) {
      fetchVisitorStats();
      const interval = setInterval(fetchVisitorStats, 30000);
      return () => clearInterval(interval);
    }
  }, [isOpen, adminToken, fetchVisitorStats]);

  // Load active notice on mount
  useEffect(() => {
    fetch('/api/notices')
      .then(r => r.text())
      .then(t => {
        if (t && t.trim().startsWith('{')) {
          const d = JSON.parse(t);
          if (d?.success && d?.notice) {
            if (d.notice.title) setNoticeTitle(d.notice.title);
            if (d.notice.message) setNoticeMessage(d.notice.message);
            if (d.notice.urgency) setNoticeUrgency(d.notice.urgency);
            if (typeof d.notice.active === 'boolean') setNoticeActive(d.notice.active);
          }
        }
      })
      .catch(() => {});
  }, []);

  if (!isOpen) return null;

  // Handle Admin Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);

    const cleanPass = password.trim();

    try {
      // 1. Authoritative password verification (Instant & always works offline and on custom domains)
      if (cleanPass === 'Ndr@77490869' || cleanPass === 'pubgadmin2026') {
        const token = 'pubg_adm_session_' + Date.now().toString(36);
        try {
          localStorage.setItem('pubg_admin_token', token);
        } catch {}
        onLogin(token);
        setPassword('');
        setIsLoggingIn(false);
        return;
      }

      // 2. Direct check against Firebase RTDB for any custom administrator password
      try {
        const fbRes = await fetch('https://pubg-matches-43fa1-default-rtdb.firebaseio.com/admin/password.json');
        if (fbRes.ok) {
          const text = await fbRes.text();
          if (text && text.trim() !== 'null') {
            const customPass = JSON.parse(text);
            if (customPass && String(customPass).trim() === cleanPass) {
              const token = 'pubg_adm_session_' + Date.now().toString(36);
              try {
                localStorage.setItem('pubg_admin_token', token);
              } catch {}
              onLogin(token);
              setPassword('');
              setIsLoggingIn(false);
              return;
            }
          }
        }
      } catch {}

      // 3. Fallback check against backend API if available
      try {
        const res = await fetch('/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: cleanPass })
        });

        const text = await res.text();
        if (text && text.trim().startsWith('{')) {
          const data = JSON.parse(text);
          if (res.ok && data.success && data.token) {
            try {
              localStorage.setItem('pubg_admin_token', data.token);
            } catch {}
            onLogin(data.token);
            setPassword('');
            setIsLoggingIn(false);
            return;
          }
        }
      } catch {}

      setLoginError('Incorrect password. Default: Ndr@77490869 or pubgadmin2026');
    } catch {
      setLoginError('Incorrect password. Please re-enter.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Save Schedule & Room Settings to Firebase RTDB
  const handleSaveSchedule = async (e?: React.FormEvent, overrideStatus?: TournamentStatus | 'AUTO') => {
    if (e) e.preventDefault();
    setIsSavingSchedule(true);
    setScheduleSuccessMsg(null);

    const targetStatus = overrideStatus !== undefined ? overrideStatus : (manualStatus || 'AUTO');
    const cleanDate = editDate.trim() || getTodayKarachiDate();
    const cleanTime = editTime.trim() || '11:00';
    const computedStartTime = parseKarachiTimestamp(cleanDate, cleanTime);

    const payload = {
      matchDate: cleanDate,
      matchTime: cleanTime,
      matchStartTime: computedStartTime,
      roomOpenTime: targetStatus === 'ROOM_OPEN' ? Date.now() : (computedStartTime - 15 * 60 * 1000),
      matchEndTime: computedStartTime + 60 * 60 * 1000,
      roomId: editRoomId.trim(),
      roomPassword: editPassword.trim(),
      youtubeUrl: editYoutube.trim(),
      manualStatus: targetStatus,
      updatedAt: Date.now()
    };

    try {
      const FIREBASE_DB_URL = 'https://pubg-matches-43fa1-default-rtdb.firebaseio.com';

      // 1. Direct authoritative write to Firebase RTDB for selected match
      await fetch(`${FIREBASE_DB_URL}/tournaments/${selectedMatch}.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(() => {});

      // If Erangel, also write to legacy /tournament/current.json for squardwar.site backward compatibility
      if (selectedMatch === 'ERANGEL') {
        await fetch(`${FIREBASE_DB_URL}/tournament/current.json`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).catch(() => {});
      }

      // 2. Also notify backend edge if available
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (adminToken) headers['Authorization'] = `Bearer ${adminToken}`;
        fetch('/api/admin/tournament/update', {
          method: 'POST',
          headers,
          body: JSON.stringify({ ...payload, matchId: selectedMatch })
        }).catch(() => {});
      } catch {}

      // 3. Immediately update local state & local storage
      if (onUpdateMatchSchedule) {
        onUpdateMatchSchedule(selectedMatch, payload as any);
      }

      const matchLabels: Record<string, string> = {
        ERANGEL: 'Erangel Squad',
        LIVIK: 'Livik Duo',
        TDM: 'Team Death Match (TDM)',
        FREE_FIRE: 'Free Fire Clash Squad'
      };

      const statusLabels: Record<string, string> = {
        ROOM_OPEN: 'ROOM OPEN (Credentials Ready & Unlocked)',
        MATCH_LIVE: 'MATCH LIVE',
        WAIT_FOR_RESULT: 'ENDED (Result Processing)',
        AUTO: 'AUTOMATIC CLOCK'
      };

      setScheduleSuccessMsg(`✅ ${matchLabels[selectedMatch] || selectedMatch}: ${statusLabels[targetStatus] || targetStatus} applied successfully! (Time: ${cleanTime} PKT)`);
      onRefreshData();
      setTimeout(() => setScheduleSuccessMsg(null), 4000);
    } catch {
      if (onUpdateMatchSchedule) {
        onUpdateMatchSchedule(selectedMatch, payload as any);
      }
      setScheduleSuccessMsg('Saved locally.');
      onRefreshData();
      setTimeout(() => setScheduleSuccessMsg(null), 3000);
    } finally {
      setIsSavingSchedule(false);
    }
  };

  // Quick 1-click apply for lifecycle buttons (Instantly activates Room Open, Live, or Auto)
  const handleQuickStatusApply = async (newStatus: TournamentStatus | 'AUTO') => {
    setManualStatus(newStatus);
    await handleSaveSchedule(undefined, newStatus);
  };

  // Reset All Seats (Opens Fresh Seats for New Match)
  const handleResetAllSeats = async () => {
    setIsResettingSeats(true);
    setResetSuccessMsg(null);

    try {
      let reset = false;
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (adminToken) headers['Authorization'] = `Bearer ${adminToken}`;

        const res = await fetch('/api/admin/seats/reset-all', {
          method: 'POST',
          headers,
          body: JSON.stringify({ tournamentId: tournament?.id || 'PUBG001' })
        });

        const text = await res.text();
        if (text && text.trim().startsWith('{')) {
          const data = JSON.parse(text);
          if (res.ok && data.success) {
            reset = true;
          }
        }
      } catch {}

      if (!reset) {
        await fetch('https://pubg-matches-43fa1-default-rtdb.firebaseio.com/SeatReservations/PUBG001.json', {
          method: 'DELETE'
        });
      }

      setResetSuccessMsg('All 100 seats reset! All slots are now empty and open for booking in Firebase.');
      setShowResetConfirm(false);
      onRefreshData();
      setTimeout(() => setResetSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Error connecting to server.');
    } finally {
      setIsResettingSeats(false);
    }
  };

  // Remove Single Player by PUBG ID
  const handleRemovePlayerByUid = async (uidToRemove?: string) => {
    const targetUid = (uidToRemove || removeUidInput).trim();
    if (!targetUid) {
      setRemoveMessage({ type: 'error', text: 'Please enter a PUBG ID (UID).' });
      return;
    }

    setIsRemovingPlayer(true);
    setRemoveMessage(null);

    try {
      let removed = false;
      let removedPlayerName = targetUid;

      // 1. Try backend API if available
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (adminToken) headers['Authorization'] = `Bearer ${adminToken}`;

        const res = await fetch('/api/admin/seats/remove-player', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            pubgUid: targetUid,
            tournamentId: tournament?.id || 'PUBG001'
          })
        });

        const text = await res.text();
        if (text && text.trim().startsWith('{')) {
          const data = JSON.parse(text);
          if (res.ok && data?.success) {
            removed = true;
          }
        }
      } catch {}

      // 2. Direct Authoritative Firebase RTDB Scan & Remove (Works on Cloudflare Pages static site)
      if (!removed) {
        const FIREBASE_DB_URL = 'https://pubg-matches-43fa1-default-rtdb.firebaseio.com';
        const res = await fetch(`${FIREBASE_DB_URL}/SeatReservations/PUBG001.json`);
        if (res.ok) {
          const text = await res.text();
          if (text && text.trim() !== 'null' && text.trim().startsWith('{')) {
            const reservations = JSON.parse(text);
            for (let t = 1; t <= 25; t++) {
              const teamKey = `TEAM${t}`;
              const team = reservations[teamKey];
              if (!team || !team.members) continue;

              let changed = false;
              for (const slot of ['1', '2', '3', '4'] as const) {
                const m = team.members[slot];
                if (m && (m.uid === targetUid || m.playerUid === targetUid)) {
                  removedPlayerName = m.playerName || targetUid;
                  team.members[slot] = null;
                  changed = true;
                }
              }

              if (changed) {
                let occupied = 0;
                for (const slot of ['1', '2', '3', '4'] as const) {
                  if (team.members[slot]) occupied++;
                }
                team.reservedSeats = occupied;
                team.captainUid = team.members['1'] ? team.members['1'].uid : null;

                await fetch(`${FIREBASE_DB_URL}/SeatReservations/PUBG001/${teamKey}.json`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(team)
                });
                removed = true;
              }
            }
          }
        }
      }

      if (removed) {
        setRemoveMessage({ type: 'success', text: `Player ${removedPlayerName} removed from seat successfully in Firebase!` });
        setRemoveUidInput('');
        onRefreshData();
        setTimeout(() => setRemoveMessage(null), 4000);
      } else {
        setRemoveMessage({ type: 'error', text: `Player UID ${targetUid} not found in any reserved seat.` });
      }
    } catch (err: any) {
      setRemoveMessage({ type: 'error', text: err.message || 'Error removing player from database.' });
    } finally {
      setIsRemovingPlayer(false);
    }
  };

  // 3. Add User Reward (Direct Diamonds Credit to any PUBG UID)
  const handleAddRewardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUid = rewardUid.trim();
    const numAmount = parseFloat(rewardAmount);

    if (!cleanUid) {
      setRewardFeedback({ type: 'error', text: 'Please enter PUBG UID.' });
      return;
    }
    if (isNaN(numAmount) || numAmount <= 0) {
      setRewardFeedback({ type: 'error', text: 'Enter a valid positive reward amount.' });
      return;
    }

    setIsSubmittingReward(true);
    setRewardFeedback(null);
    try {
      let credited = false;
      let finalBal = 0;
      let pName = cleanUid;

      // 1. Try edge/server API
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (adminToken) headers['Authorization'] = `Bearer ${adminToken}`;

        const res = await fetch('/api/admin/user/add-reward', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            pubgUid: cleanUid,
            amount: numAmount,
            reason: rewardReason.trim() || 'Tournament Reward'
          })
        });
        const text = await res.text();
        if (text && text.trim().startsWith('{')) {
          const data = JSON.parse(text);
          if (res.ok && data?.success) {
            credited = true;
            finalBal = data.newBalance;
            pName = data.playerName || cleanUid;
          }
        }
      } catch {}

      // 2. Direct Authoritative Firebase RTDB Balance Credit
      if (!credited) {
        const FIREBASE_DB_URL = 'https://pubg-matches-43fa1-default-rtdb.firebaseio.com';
        let userObj: any = null;
        try {
          const uRes = await fetch(`${FIREBASE_DB_URL}/users/${encodeURIComponent(cleanUid)}.json`);
          if (uRes.ok) {
            const uText = await uRes.text();
            if (uText && uText.trim() !== 'null' && uText.trim().startsWith('{')) {
              userObj = JSON.parse(uText);
            }
          }
        } catch {}

        const prevBal = (userObj && typeof userObj.balance === 'number') ? userObj.balance : 0;
        finalBal = prevBal + numAmount;
        pName = userObj?.playerName || cleanUid;

        const updatedUser = userObj ? {
          ...userObj,
          balance: finalBal,
          lastRewardAt: Date.now()
        } : {
          uid: cleanUid,
          pubgUid: cleanUid,
          playerName: `Player_${cleanUid.slice(-4)}`,
          balance: finalBal,
          createdAt: Date.now(),
          lastRewardAt: Date.now()
        };

        await fetch(`${FIREBASE_DB_URL}/users/${encodeURIComponent(cleanUid)}.json`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedUser)
        });

        credited = true;
      }

      setRewardFeedback({
        type: 'success',
        text: `Success! Added ${numAmount} 💎 Reward to ${pName}. New Balance: ${finalBal} 💎`
      });
      setRewardUid('');
      onRefreshData();
      setTimeout(() => setRewardFeedback(null), 5000);
    } catch (err: any) {
      setRewardFeedback({ type: 'error', text: err.message || 'Error communicating with database.' });
    } finally {
      setIsSubmittingReward(false);
    }
  };

  // 4. Update Global Notice (Broadcast to all users)
  const handleSaveNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noticeTitle.trim() || !noticeMessage.trim()) return;

    setIsSavingNotice(true);
    setNoticeFeedback(null);
    try {
      const noticePayload = {
        title: noticeTitle.trim(),
        message: noticeMessage.trim(),
        urgency: noticeUrgency,
        active: noticeActive,
        updatedAt: Date.now()
      };

      // 1. Direct Firebase RTDB Write (authoritative for static deployments & squardwar.site)
      await fetch('https://pubg-matches-43fa1-default-rtdb.firebaseio.com/notices/current.json', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(noticePayload)
      });

      // 2. Non-blocking Edge API broadcast
      fetch('/api/admin/notices/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(noticePayload)
      }).catch(() => {});

      setNoticeFeedback('Global Notice successfully updated & broadcast to all users!');
      if (onNoticeUpdated) onNoticeUpdated();
      setTimeout(() => setNoticeFeedback(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Error updating notice.');
    } finally {
      setIsSavingNotice(false);
    }
  };

  // Extract all occupied seats across 25 teams
  const occupiedSeatsList: { teamNumber: number; seatNumber: number; playerName: string; playerUid: string; isCaptain: boolean }[] = [];
  if (tournament?.teams) {
    for (const team of tournament.teams) {
      for (const seat of team.seats) {
        if (seat.status === 'APPROVED' || seat.status === 'RESERVED_PENDING') {
          occupiedSeatsList.push({
            teamNumber: team.teamNumber,
            seatNumber: seat.seatNumber,
            playerName: seat.playerName || 'Player',
            playerUid: seat.playerUid || '',
            isCaptain: seat.seatNumber === 1 || Boolean(seat.isCaptain)
          });
        }
      }
    }
  }

  const totalSeats = 100;
  const occupiedCount = occupiedSeatsList.length;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-2xl bg-gradient-to-b from-[#18110b] via-[#120b06] to-[#0a0603] border border-amber-500/60 rounded-2xl shadow-2xl text-slate-100 max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-amber-900/40 bg-[#140d07]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/60 flex items-center justify-center text-amber-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-heading text-lg font-black tracking-wide text-white uppercase flex items-center gap-2">
                <span>Admin Control Panel</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-mono border border-amber-500/40">
                  SECURE
                </span>
              </h2>
              <p className="text-[11px] text-amber-300/70">
                Match Countdown, Room Credentials &amp; Seat Reservations
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {adminToken && (
              <button
                onClick={onLogout}
                title="Logout Admin"
                className="px-2.5 py-1.5 rounded-lg bg-[#22160e] hover:bg-red-950/70 text-amber-200/80 hover:text-red-300 text-xs font-semibold border border-amber-800/40 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-[#22160e] hover:bg-[#2c1d13] text-amber-200/80 hover:text-white flex items-center justify-center border border-amber-800/40 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ADMIN AUTHENTICATION SCREEN IF NOT LOGGED IN */}
        {!adminToken ? (
          <div className="p-6 sm:p-8 max-w-md mx-auto w-full space-y-4">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/60 flex items-center justify-center text-amber-400 mx-auto mb-2">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="font-heading font-black text-lg text-white uppercase">
                Administrator Access
              </h3>
              <p className="text-xs text-amber-200/60">
                Please enter the administrator password to unlock tournament controls.
              </p>
            </div>

            {loginError && (
              <div className="p-3 rounded-xl bg-red-950/70 border border-red-500/60 text-red-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-amber-200/80 uppercase font-mono mb-1">
                  Admin Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter administrator password"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0d0704] border border-amber-700/50 text-white placeholder-amber-200/30 text-sm focus:outline-none focus:border-amber-400"
                  required
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={isLoggingIn || !password.trim()}
                className="w-full py-2.5 rounded-xl pubg-amber-glow-btn text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoggingIn ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <span>Unlock Admin Panel</span>
                )}
              </button>
            </form>
          </div>
        ) : (
          /* LOGGED IN ADMIN PANEL (2 CLEAN SECTIONS) */
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            {/* 0. WEBSITE VISITOR TRAFFIC & SERIAL COUNTER (Today & Lifetime Visitors) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#1f130a] via-[#170e07] to-[#120803] border-2 border-amber-500/60 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-32 bg-amber-500/10 blur-3xl pointer-events-none" />
              
              <div className="relative z-10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-amber-900/40">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 via-amber-500 to-amber-700 flex items-center justify-center text-black font-black shadow-lg shadow-amber-500/30">
                      <Eye className="w-5 h-5 text-black" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-heading font-black text-sm sm:text-base uppercase tracking-wide text-white">
                          Website Visitor Counter
                        </h3>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Live Serial Count
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-200/70 mt-0.5">
                        Home page par anay walay tamam users ka automated serial count (Backend &amp; Firebase RTDB synced)
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={fetchVisitorStats}
                    disabled={isLoadingVisitors}
                    className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#25180f] hover:bg-amber-950/80 border border-amber-600/50 hover:border-amber-400 text-xs font-bold text-amber-300 transition-all cursor-pointer shadow active:scale-95"
                    title="Refresh Live Visitor Stats"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isLoadingVisitors ? 'animate-spin' : ''}`} />
                    <span>Sync Counter</span>
                  </button>
                </div>

                {/* 2 Big Stat Metric Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-3.5">
                  {/* Metric 1: Today's Visitors */}
                  <div className="p-4 rounded-xl bg-[#0e0704]/90 border border-emerald-500/40 shadow-inner flex items-center justify-between relative group hover:border-emerald-400/70 transition-colors">
                    <div>
                      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-400 font-heading">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                        <span>Today Users (Aaj Ke)</span>
                      </div>
                      <div className="text-3xl sm:text-4xl font-black font-mono text-white tracking-tight mt-1 flex items-baseline gap-1.5">
                        <span className="text-emerald-400">{visitorStats.today}</span>
                        <span className="text-xs font-bold font-sans text-emerald-300/70">Users</span>
                      </div>
                      <div className="text-[10px] text-amber-300/60 font-mono mt-1">
                        Date: {visitorStats.todayDate} (PKT)
                      </div>
                    </div>

                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-md">
                      <TrendingUp className="w-6 h-6" />
                    </div>
                  </div>

                  {/* Metric 2: Lifetime Visitors */}
                  <div className="p-4 rounded-xl bg-[#0e0704]/90 border border-amber-500/50 shadow-inner flex items-center justify-between relative group hover:border-amber-400 transition-colors">
                    <div>
                      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-400 font-heading">
                        <Trophy className="w-3.5 h-3.5 text-amber-400" />
                        <span>Life Time Users (Total)</span>
                      </div>
                      <div className="text-3xl sm:text-4xl font-black font-mono text-white tracking-tight mt-1 flex items-baseline gap-1.5">
                        <span className="text-amber-400">{visitorStats.lifetime}</span>
                        <span className="text-xs font-bold font-sans text-amber-300/70">Total</span>
                      </div>
                      <div className="text-[10px] text-amber-300/60 font-mono mt-1">
                        All-time cumulative website visits
                      </div>
                    </div>

                    <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-300 shadow-md">
                      <Users className="w-6 h-6" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 5 Navigation Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 p-1 bg-[#100a06] border border-amber-900/40 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTab('schedule')}
                className={`py-2 px-2 rounded-lg text-xs font-bold uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'schedule'
                    ? 'bg-amber-500 text-black shadow font-black'
                    : 'text-amber-200/70 hover:text-white hover:bg-amber-950/30'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span className="truncate">Schedule</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('seats')}
                className={`py-2 px-2 rounded-lg text-xs font-bold uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'seats'
                    ? 'bg-amber-500 text-black shadow font-black'
                    : 'text-amber-200/70 hover:text-white hover:bg-amber-950/30'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span className="truncate">Seats ({occupiedCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('cashouts')}
                className={`py-2 px-2 rounded-lg text-xs font-bold uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer relative ${
                  activeTab === 'cashouts'
                    ? 'bg-amber-500 text-black shadow font-black'
                    : 'text-amber-200/70 hover:text-white hover:bg-amber-950/30'
                }`}
              >
                <Wallet className="w-3.5 h-3.5" />
                <span className="truncate">Cashouts</span>
                {cashoutRequests.filter(r => r.status === 'Pending').length > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black shrink-0 ${
                    activeTab === 'cashouts' ? 'bg-black text-amber-300' : 'bg-red-500 text-white animate-pulse'
                  }`}>
                    {cashoutRequests.filter(r => r.status === 'Pending').length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('reward')}
                className={`py-2 px-2 rounded-lg text-xs font-bold uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'reward'
                    ? 'bg-amber-500 text-black shadow font-black'
                    : 'text-amber-200/70 hover:text-white hover:bg-amber-950/30'
                }`}
              >
                <Gift className="w-3.5 h-3.5" />
                <span className="truncate">Reward UID</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('notice')}
                className={`py-2 px-2 rounded-lg text-xs font-bold uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'notice'
                    ? 'bg-amber-500 text-black shadow font-black'
                    : 'text-amber-200/70 hover:text-white hover:bg-amber-950/30'
                }`}
              >
                <Bell className="w-3.5 h-3.5" />
                <span className="truncate">Notices</span>
              </button>
            </div>

            {/* TAB 1: MATCH SCHEDULE, ROOM ID & COUNTDOWN (Shifted from Yellow Mark) */}
            {activeTab === 'schedule' && (
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-600/30 flex items-center justify-between text-xs text-amber-200">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Settings configured here update the hero countdown, room unlock window &amp; YouTube stream.</span>
                  </div>
                  <span className="font-mono text-amber-400 font-bold text-[11px] shrink-0">Asia/Karachi PKT</span>
                </div>

                {scheduleSuccessMsg && (
                  <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-500/60 text-emerald-200 text-xs flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{scheduleSuccessMsg}</span>
                  </div>
                )}

                {/* 1. SELECT MATCH TO CONFIGURE */}
                <div className="space-y-1.5 p-3 rounded-2xl bg-[#140c07] border border-amber-600/40">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-amber-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-amber-400" />
                      <span>Select Match to Configure:</span>
                    </label>
                    <span className="text-[10px] font-mono text-amber-400 font-bold bg-amber-950/80 px-2 py-0.5 rounded border border-amber-600/40">
                      {selectedMatch}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleSelectMatch('ERANGEL')}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        selectedMatch === 'ERANGEL'
                          ? 'bg-amber-500 text-black border-amber-400 shadow-md font-black ring-2 ring-amber-400/50'
                          : 'bg-[#1b1009] border-amber-900/40 text-amber-200/70 hover:text-white hover:bg-amber-950/40'
                      }`}
                    >
                      <div className="text-xs font-bold truncate">Erangel Squad</div>
                      <div className={`text-[10px] truncate ${selectedMatch === 'ERANGEL' ? 'text-black/80 font-mono font-bold' : 'text-amber-300/60 font-mono'}`}>
                        {erangelTournament?.matchTime || '11:00'} PKT
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectMatch('LIVIK')}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        selectedMatch === 'LIVIK'
                          ? 'bg-cyan-500 text-black border-cyan-400 shadow-md font-black ring-2 ring-cyan-400/50'
                          : 'bg-[#091522] border-cyan-900/40 text-cyan-200/70 hover:text-white hover:bg-cyan-950/40'
                      }`}
                    >
                      <div className="text-xs font-bold truncate">Livik Duo</div>
                      <div className={`text-[10px] truncate ${selectedMatch === 'LIVIK' ? 'text-black/80 font-mono font-bold' : 'text-cyan-300/60 font-mono'}`}>
                        {livikTournament?.matchTime || '12:00'} PKT
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectMatch('TDM')}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        selectedMatch === 'TDM'
                          ? 'bg-red-500 text-white border-red-400 shadow-md font-black ring-2 ring-red-400/50'
                          : 'bg-[#1b0b0b] border-red-900/40 text-red-200/70 hover:text-white hover:bg-red-950/40'
                      }`}
                    >
                      <div className="text-xs font-bold truncate">TDM (4v4)</div>
                      <div className={`text-[10px] truncate ${selectedMatch === 'TDM' ? 'text-white/90 font-mono font-bold' : 'text-red-300/60 font-mono'}`}>
                        {tdmTournament?.matchTime || '01:00'} PKT
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectMatch('FREE_FIRE')}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        selectedMatch === 'FREE_FIRE'
                          ? 'bg-orange-500 text-black border-orange-400 shadow-md font-black ring-2 ring-orange-400/50'
                          : 'bg-[#1b0e06] border-orange-900/40 text-orange-200/70 hover:text-white hover:bg-orange-950/40'
                      }`}
                    >
                      <div className="text-xs font-bold truncate">Free Fire</div>
                      <div className={`text-[10px] truncate ${selectedMatch === 'FREE_FIRE' ? 'text-black/80 font-mono font-bold' : 'text-orange-300/60 font-mono'}`}>
                        {freeFireTournament?.matchTime || '11:00'} PKT
                      </div>
                    </button>
                  </div>
                </div>

                {/* Quick Lifecycle Presets with Instant 1-Click Apply */}
                <div className="space-y-1.5 p-3 rounded-2xl bg-[#140c07] border border-amber-600/40">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-amber-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>{selectedMatch} Lifecycle (Click to Activate Instantly):</span>
                    </label>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                      manualStatus === 'ROOM_OPEN'
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-500 animate-pulse'
                        : manualStatus === 'MATCH_LIVE'
                          ? 'bg-red-950 text-red-300 border-red-500'
                          : 'bg-amber-950 text-amber-300 border-amber-600'
                    }`}>
                      Current: {manualStatus}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    <button
                      type="button"
                      disabled={isSavingSchedule}
                      onClick={() => handleQuickStatusApply('AUTO')}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        manualStatus === 'AUTO'
                          ? 'bg-amber-950/80 border-amber-500 text-white shadow ring-2 ring-amber-400/40'
                          : 'bg-[#18100a] border-amber-900/30 text-amber-200/60 hover:text-white hover:border-amber-700/50'
                      }`}
                    >
                      <div className="text-xs font-bold text-amber-300 flex items-center gap-1">
                        <RotateCcw className="w-3 h-3 text-amber-400" /> Auto
                      </div>
                      <div className="text-[10px] text-amber-200/50">Automatic Clock</div>
                    </button>

                    <button
                      type="button"
                      disabled={isSavingSchedule}
                      onClick={() => handleQuickStatusApply('ROOM_OPEN')}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        manualStatus === 'ROOM_OPEN'
                          ? 'bg-emerald-950/90 border-emerald-400 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)] ring-2 ring-emerald-400'
                          : 'bg-[#0f1f17] border-emerald-800/40 text-emerald-200/70 hover:text-white hover:border-emerald-500/70 hover:bg-emerald-950/50'
                      }`}
                    >
                      <div className="text-xs font-bold text-emerald-300 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-emerald-400 animate-spin" style={{ animationDuration: '6s' }} /> Room Open
                      </div>
                      <div className="text-[10px] text-emerald-300/80 font-bold">⚡ Click to Open</div>
                    </button>

                    <button
                      type="button"
                      disabled={isSavingSchedule}
                      onClick={() => handleQuickStatusApply('MATCH_LIVE')}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        manualStatus === 'MATCH_LIVE'
                          ? 'bg-red-950/80 border-red-500 text-white shadow ring-2 ring-red-400/40'
                          : 'bg-[#18100a] border-amber-900/30 text-amber-200/60 hover:text-white hover:border-amber-700/50'
                      }`}
                    >
                      <div className="text-xs font-bold text-red-300 flex items-center gap-1">
                        <Radio className="w-3 h-3 text-red-400" /> Match Live
                      </div>
                      <div className="text-[10px] text-red-200/50">Started + Stream</div>
                    </button>

                    <button
                      type="button"
                      disabled={isSavingSchedule}
                      onClick={() => handleQuickStatusApply('WAIT_FOR_RESULT')}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        manualStatus === 'WAIT_FOR_RESULT'
                          ? 'bg-amber-950/80 border-amber-500 text-white shadow ring-2 ring-amber-400/40'
                          : 'bg-[#18100a] border-amber-900/30 text-amber-200/60 hover:text-white hover:border-amber-700/50'
                      }`}
                    >
                      <div className="text-xs font-bold text-amber-300 flex items-center gap-1">
                        <Trophy className="w-3 h-3 text-amber-400" /> Ended
                      </div>
                      <div className="text-[10px] text-amber-200/50">Reward Processing</div>
                    </button>
                  </div>
                </div>

                {/* Form Inputs */}
                <form onSubmit={handleSaveSchedule} className="space-y-3.5 pt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-amber-300 uppercase font-mono block mb-1">
                        Match Date *
                      </label>
                      <input
                        type="date"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[#0d0704] border border-amber-700/50 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-amber-300 uppercase font-mono block mb-1">
                        Match Time (Asia/Karachi PKT) *
                      </label>
                      <input
                        type="time"
                        value={editTime}
                        onChange={(e) => setEditTime(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[#0d0704] border border-amber-700/50 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-amber-300 uppercase font-mono block mb-1">
                        Room ID *
                      </label>
                      <input
                        type="text"
                        value={editRoomId}
                        onChange={(e) => setEditRoomId(e.target.value)}
                        placeholder="e.g. 69151604"
                        className="w-full px-3 py-2 rounded-xl bg-[#0d0704] border border-amber-700/50 text-white font-mono text-sm focus:outline-none focus:border-amber-400"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-amber-300 uppercase font-mono block mb-1">
                        Room Password *
                      </label>
                      <input
                        type="text"
                        value={editPassword}
                        onChange={(e) => setEditPassword(e.target.value)}
                        placeholder="e.g. 1234"
                        className="w-full px-3 py-2 rounded-xl bg-[#0d0704] border border-amber-700/50 text-white font-mono text-sm focus:outline-none focus:border-amber-400"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-amber-300 uppercase font-mono block mb-1">
                      YouTube Live Stream URL *
                    </label>
                    <input
                      type="url"
                      value={editYoutube}
                      onChange={(e) => setEditYoutube(e.target.value)}
                      placeholder="https://youtube.com/@flaregunpk?si=NycZ9BwNyELH405i"
                      className="w-full px-3 py-2 rounded-xl bg-[#0d0704] border border-amber-700/50 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
                      required
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSavingSchedule}
                      className="w-full py-2.5 rounded-xl pubg-amber-glow-btn text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
                    >
                      {isSavingSchedule ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Saving to Firebase RTDB...</span>
                        </>
                      ) : (
                        <span>Apply &amp; Save to Firebase RTDB</span>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* TAB 2: SEATS RESERVATION CONTROL (Reset all seats & Remove single player) */}
            {activeTab === 'seats' && (
              <div className="space-y-5">
                {/* 1. RESET ALL SEATS (Open New Match) */}
                <div className="p-4 rounded-xl bg-[#1a0f07] border-2 border-red-500/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-heading font-black text-sm uppercase text-white tracking-wide flex items-center gap-2">
                        <Trash2 className="w-4 h-4 text-red-400" />
                        <span>Reset All Seats (Open New Match)</span>
                      </h4>
                      <p className="text-xs text-amber-200/70 mt-0.5">
                        Clears all 100 seats across all 25 teams in Firebase Realtime Database. All seats become open for new players.
                      </p>
                    </div>

                    <span className="px-2.5 py-1 rounded-md bg-black/60 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold">
                      {occupiedCount} / {totalSeats} Booked
                    </span>
                  </div>

                  {resetSuccessMsg && (
                    <div className="p-3 rounded-lg bg-emerald-950/70 border border-emerald-500/60 text-emerald-200 text-xs flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{resetSuccessMsg}</span>
                    </div>
                  )}

                  {!showResetConfirm ? (
                    <button
                      type="button"
                      onClick={() => setShowResetConfirm(true)}
                      className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-red-950/50"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Reset All Seats &amp; Open New Match</span>
                    </button>
                  ) : (
                    <div className="p-3 rounded-xl bg-red-950/90 border border-red-500 space-y-2.5 animate-in zoom-in-95 duration-150">
                      <div className="text-xs font-bold text-red-200 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                        <span>Are you sure? This will wipe all {occupiedCount} booked seats and make all 100 slots empty!</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleResetAllSeats}
                          disabled={isResettingSeats}
                          className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold uppercase cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                        >
                          {isResettingSeats ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                          <span>Yes, Reset Everything Now</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowResetConfirm(false)}
                          className="px-3 py-1.5 rounded-lg bg-[#22160d] hover:bg-[#2e1d11] text-amber-200/80 text-xs font-semibold cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. REMOVE SINGLE PLAYER BY PUBG ID (UID) */}
                <div className="p-4 rounded-xl bg-[#18110a] border border-amber-600/40 space-y-3">
                  <div className="space-y-0.5">
                    <h4 className="font-heading font-black text-sm uppercase text-white tracking-wide flex items-center gap-2">
                      <UserX className="w-4 h-4 text-amber-400" />
                      <span>Remove Single Player from Seat by PUBG ID</span>
                    </h4>
                    <p className="text-xs text-amber-200/70">
                      Enter any player's PUBG ID (UID) to cancel their seat reservation and free the slot immediately.
                    </p>
                  </div>

                  {removeMessage && (
                    <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                      removeMessage.type === 'success' 
                        ? 'bg-emerald-950/70 border-emerald-500/60 text-emerald-200' 
                        : 'bg-red-950/70 border-red-500/60 text-red-200'
                    }`}>
                      {removeMessage.type === 'success' ? (
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                      )}
                      <span>{removeMessage.text}</span>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={removeUidInput}
                      onChange={(e) => setRemoveUidInput(e.target.value.replace(/\s+/g, ''))}
                      placeholder="Enter Player PUBG ID (e.g. 51648922552)"
                      className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#0d0704] border border-amber-700/50 text-white font-mono text-xs sm:text-sm focus:outline-none focus:border-amber-400 placeholder-amber-200/30"
                    />

                    <button
                      type="button"
                      onClick={() => handleRemovePlayerByUid()}
                      disabled={isRemovingPlayer || !removeUidInput.trim()}
                      className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-heading font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 transition-colors shrink-0 shadow"
                    >
                      {isRemovingPlayer ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-black" />
                          <span>Removing...</span>
                        </>
                      ) : (
                        <>
                          <UserX className="w-4 h-4 text-black" />
                          <span>Remove Player</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* 3. LIST OF OCCUPIED SEATS (WITH 1-CLICK REMOVE) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-300 uppercase font-mono">
                      Currently Reserved Seats ({occupiedCount}):
                    </span>
                    <button
                      onClick={onRefreshData}
                      className="text-[11px] text-amber-400/80 hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" /> Refresh
                    </button>
                  </div>

                  {occupiedSeatsList.length === 0 ? (
                    <div className="p-6 rounded-xl bg-[#140d07] border border-amber-900/30 text-center text-xs text-amber-200/60 font-mono">
                      All 100 seats are currently empty and open for booking.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                      {occupiedSeatsList.map((seat, i) => (
                        <div
                          key={i}
                          className="p-2.5 rounded-xl bg-[#140d07] border border-amber-900/40 hover:border-amber-600/60 flex items-center justify-between text-xs transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono font-bold text-[10px]">
                              T{seat.teamNumber} S#{seat.seatNumber}
                            </span>
                            <div>
                              <div className="font-bold text-white leading-tight flex items-center gap-1">
                                <span>{seat.playerName}</span>
                                {seat.isCaptain && <span className="text-amber-400 text-[10px]">👑 Captain</span>}
                              </div>
                              <div className="text-[10px] text-amber-400/70 font-mono">
                                UID: {seat.playerUid}
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemovePlayerByUid(seat.playerUid)}
                            disabled={isRemovingPlayer}
                            className="p-1.5 rounded-lg bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-500/40 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                            title={`Remove ${seat.playerName} from Team ${seat.teamNumber} Seat ${seat.seatNumber}`}
                          >
                            <Trash2 className="w-3 h-3 text-red-400" />
                            <span>Remove</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: CASHOUT WITHDRAWAL REQUESTS (Approve / Cancel & Status Review) */}
            {activeTab === 'cashouts' && (
              <div className="space-y-4">
                {/* Feedback Toast */}
                {cashoutFeedback && (
                  <div
                    className={`p-3 sm:p-4 rounded-xl border flex items-center justify-between gap-3 text-xs font-semibold animate-in slide-in-from-top-2 ${
                      cashoutFeedback.type === 'success'
                        ? 'bg-emerald-950/90 border-emerald-500/70 text-emerald-200'
                        : 'bg-rose-950/90 border-rose-500/70 text-rose-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {cashoutFeedback.type === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      )}
                      <span>{cashoutFeedback.text}</span>
                    </div>
                    <button
                      onClick={() => setCashoutFeedback(null)}
                      className="text-slate-400 hover:text-white cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Header Information Card with Real-time Refresh */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-amber-950/40 via-[#160d07] to-amber-950/40 border border-amber-600/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
                      <Wallet className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-heading font-black text-white uppercase tracking-wider flex items-center gap-2">
                        <span>Cash-Out Requests Portal</span>
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-mono border border-amber-500/40">
                          {cashoutRequests.length} Total
                        </span>
                      </h4>
                      <p className="text-[11px] text-amber-200/70 mt-0.5 leading-relaxed">
                        EasyPaisa, JazzCash &amp; Bank withdrawal requests. Approve to verify, or Cancel to reject &amp; refund balance to player.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={fetchCashouts}
                    disabled={isLoadingCashouts}
                    className="w-full sm:w-auto px-3 py-1.5 rounded-lg bg-[#22160e] hover:bg-amber-950/80 text-amber-200 border border-amber-800/50 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isLoadingCashouts ? 'animate-spin' : ''}`} />
                    <span>{isLoadingCashouts ? 'Refreshing...' : 'Refresh List'}</span>
                  </button>
                </div>

                {/* Filter Pills */}
                <div className="flex flex-wrap gap-1.5 p-1 bg-[#100a06] border border-amber-900/30 rounded-xl text-xs">
                  {(['ALL', 'Pending', 'Approved', 'Paid', 'Rejected'] as const).map((filter) => {
                    const count = filter === 'ALL'
                      ? cashoutRequests.length
                      : cashoutRequests.filter(r => r.status === filter).length;
                    return (
                      <button
                        key={filter}
                        type="button"
                        onClick={() => setCashoutFilter(filter)}
                        className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          cashoutFilter === filter
                            ? 'bg-amber-500 text-black shadow font-black'
                            : 'text-amber-200/60 hover:text-white hover:bg-amber-950/30'
                        }`}
                      >
                        <span>{filter === 'ALL' ? 'All Requests' : filter}</span>
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                          cashoutFilter === filter ? 'bg-black/20 text-black' : 'bg-[#22160e] text-amber-300'
                        }`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Requests List */}
                {isLoadingCashouts && cashoutRequests.length === 0 ? (
                  <div className="text-center py-12 px-4 rounded-xl bg-[#140d07] border border-amber-900/30 space-y-2">
                    <Loader2 className="w-8 h-8 text-amber-400 animate-spin mx-auto" />
                    <p className="text-xs text-amber-200/70 font-mono">Loading cash-out requests...</p>
                  </div>
                ) : (
                  (() => {
                    const filtered = cashoutFilter === 'ALL'
                      ? cashoutRequests
                      : cashoutRequests.filter(r => r.status === cashoutFilter);

                    if (filtered.length === 0) {
                      return (
                        <div className="text-center py-10 px-4 rounded-xl bg-[#140d07] border border-amber-900/30 space-y-2">
                          <Wallet className="w-8 h-8 text-amber-500/30 mx-auto" />
                          <h5 className="text-xs font-bold uppercase tracking-wider text-amber-200">
                            No {cashoutFilter !== 'ALL' ? cashoutFilter : ''} Requests Found
                          </h5>
                          <p className="text-[11px] text-amber-200/50 max-w-sm mx-auto">
                            When players request a cash-out, it will automatically show here with payment details and Approve / Cancel actions.
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-3">
                        {filtered.map((req) => {
                          const isActing = actionInProgressId === req.requestId;
                          const isCopiedAcc = copiedCashoutId === `acc_${req.requestId}`;
                          const isCopiedUid = copiedCashoutId === `uid_${req.requestId}`;

                          return (
                            <div
                              key={req.requestId}
                              className={`p-4 rounded-xl bg-[#140d07] border transition-all space-y-3 shadow-lg ${
                                req.status === 'Pending'
                                  ? 'border-amber-500/60 shadow-amber-950/40'
                                  : req.status === 'Approved'
                                  ? 'border-emerald-500/40'
                                  : req.status === 'Paid'
                                  ? 'border-teal-500/30'
                                  : 'border-slate-800 opacity-80'
                              }`}
                            >
                              {/* Top Bar: ID, Date & Status */}
                              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-900/30 pb-2.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs font-black text-amber-300">
                                    #{req.requestId}
                                  </span>
                                  <span className="text-[11px] text-amber-200/50">·</span>
                                  <span className="text-[11px] text-amber-200/60 font-mono">
                                    {formatPKTDate(req.requestedAt)}
                                  </span>
                                </div>
                                <div>
                                  {renderCashoutStatusBadge(req.status)}
                                </div>
                              </div>

                              {/* Amount & Account Details Grid */}
                              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-center">
                                {/* Amount Callout (col-span-4) */}
                                <div className="sm:col-span-4 p-3 rounded-lg bg-black/40 border border-amber-900/40 text-center sm:text-left space-y-0.5">
                                  <span className="text-[10px] uppercase font-bold text-amber-300/70 tracking-wider block">
                                    Withdrawal Amount
                                  </span>
                                  <div className="text-2xl font-heading font-black text-amber-400 font-mono">
                                    PKR {req.withdrawalAmountPKR}
                                  </div>
                                  <div className="text-[10px] text-emerald-400/90 font-mono font-semibold flex items-center justify-center sm:justify-start gap-1">
                                    <span>Method:</span>
                                    <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold">
                                      {req.paymentMethod}
                                    </span>
                                  </div>
                                </div>

                                {/* Player & Account Credentials (col-span-8) */}
                                <div className="sm:col-span-8 space-y-2 text-xs">
                                  {/* Player UID & Name */}
                                  <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-lg bg-[#1a0f07] border border-amber-900/30">
                                    <div className="flex items-center gap-2">
                                      <span className="text-amber-200/60 text-[11px]">Player:</span>
                                      <span className="font-bold text-white">{req.playerName || 'Player'}</span>
                                      <span className="font-mono text-amber-300 text-[11px] font-semibold">
                                        (UID: {req.userUid})
                                      </span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleCopyCashout(req.userUid, `uid_${req.requestId}`)}
                                      className="px-2 py-0.5 rounded bg-[#2a170c] hover:bg-amber-950 text-amber-200 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                      title="Copy PUBG UID"
                                    >
                                      {isCopiedUid ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-amber-400" />}
                                      <span>{isCopiedUid ? 'Copied' : 'Copy UID'}</span>
                                    </button>
                                  </div>

                                  {/* Account Title & Full Unmasked Number */}
                                  <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-lg bg-[#1a0f07] border border-amber-900/30">
                                    <div className="space-y-0.5">
                                      <div className="flex items-center gap-2">
                                        <span className="text-amber-200/60 text-[11px]">Title:</span>
                                        <span className="font-bold text-white tracking-wide">{req.accountHolderName}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-amber-200/60 text-[11px]">Acc / Phone:</span>
                                        <span className="font-mono font-black text-amber-300 text-xs sm:text-sm tracking-wider">
                                          {req.accountNumber}
                                        </span>
                                        {req.bankName && req.paymentMethod === 'Other Bank Account' && (
                                          <span className="text-[10px] text-amber-200/70 font-mono">
                                            ({req.bankName})
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => handleCopyCashout(req.accountNumber, `acc_${req.requestId}`)}
                                      className="px-2.5 py-1 rounded bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-black text-xs font-black flex items-center gap-1 cursor-pointer transition-all shadow-sm active:scale-95 shrink-0"
                                      title="Copy Account / Mobile Number for Bank Transfer"
                                    >
                                      {isCopiedAcc ? <Check className="w-3.5 h-3.5 text-black" /> : <Copy className="w-3.5 h-3.5 text-black" />}
                                      <span>{isCopiedAcc ? 'Copied!' : 'Copy Number'}</span>
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {/* Rejection / Note display */}
                              {req.status === 'Rejected' && req.rejectionReason && (
                                <div className="p-2 rounded-lg bg-rose-950/40 border border-rose-800/40 text-rose-200 text-xs flex items-center gap-2">
                                  <X className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                  <span>Reason: {req.rejectionReason} (Amount has been refunded to player's balance)</span>
                                </div>
                              )}

                              {req.adminNote && req.status !== 'Rejected' && (
                                <div className="p-2 rounded-lg bg-amber-950/30 border border-amber-800/30 text-amber-200 text-xs flex items-center gap-2">
                                  <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                  <span>Admin Note: {req.adminNote}</span>
                                </div>
                              )}

                              {/* Action Buttons Row */}
                              <div className="pt-2 border-t border-amber-900/30 flex flex-wrap items-center gap-2">
                                {req.status === 'Pending' ? (
                                  <>
                                    {/* APPROVE BUTTON */}
                                    <button
                                      type="button"
                                      onClick={() => handleCashoutAction(req, 'APPROVE')}
                                      disabled={isActing}
                                      className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/60 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                                    >
                                      {isActing ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                      ) : (
                                        <Check className="w-3.5 h-3.5" />
                                      )}
                                      <span>Approve Request</span>
                                    </button>

                                    {/* CANCEL BUTTON */}
                                    <button
                                      type="button"
                                      onClick={() => handleCashoutAction(req, 'REJECT', 'Cancelled by Admin')}
                                      disabled={isActing}
                                      className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-rose-950 to-red-900 hover:from-rose-900 hover:to-red-800 text-rose-200 hover:text-white border border-rose-700/60 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                                    >
                                      {isActing ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                      ) : (
                                        <X className="w-3.5 h-3.5" />
                                      )}
                                      <span>Cancel (Refund)</span>
                                    </button>
                                  </>
                                ) : req.status === 'Approved' ? (
                                  <>
                                    {/* MARK AS PAID BUTTON */}
                                    <button
                                      type="button"
                                      onClick={() => handleCashoutAction(req, 'PAID')}
                                      disabled={isActing}
                                      className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                                    >
                                      {isActing ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                      ) : (
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                      )}
                                      <span>Mark as Paid (Cash Sent)</span>
                                    </button>

                                    {/* CANCEL & REFUND BUTTON */}
                                    <button
                                      type="button"
                                      onClick={() => handleCashoutAction(req, 'REJECT', 'Cancelled by Admin')}
                                      disabled={isActing}
                                      className="py-2 px-3 rounded-xl bg-[#22160e] hover:bg-rose-950/60 text-rose-300 hover:text-rose-200 border border-rose-800/40 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                                    >
                                      <RotateCcw className="w-3 h-3 text-rose-400" />
                                      <span>Cancel &amp; Refund</span>
                                    </button>
                                  </>
                                ) : req.status === 'Paid' ? (
                                  <div className="w-full py-1.5 px-3 rounded-lg bg-teal-950/40 border border-teal-500/30 text-teal-300 text-xs font-semibold flex items-center justify-center gap-1.5">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
                                    <span>Payment Completed &amp; Sent</span>
                                  </div>
                                ) : (
                                  <div className="w-full py-1.5 px-3 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center justify-center gap-1.5">
                                    <X className="w-3.5 h-3.5 text-rose-400" />
                                    <span>Cancelled &amp; PKR {req.withdrawalAmountPKR} Refunded to User Balance</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()
                )}
              </div>
            )}

            {/* TAB 3: REWARD USER ID (Direct Diamonds Credit to any PUBG UID) */}
            {activeTab === 'reward' && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-600/40 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 shrink-0">
                    <Gift className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase font-heading">
                      Credit Rewards / Diamonds to User ID
                    </h4>
                    <p className="text-[11px] text-amber-200/70 mt-0.5 leading-relaxed">
                      Enter any player's PUBG UID. The reward will immediately be added to their Firebase Realtime Database balance (<span className="font-mono">/users/&#123;uid&#125;/balance</span>) and logged to their transaction history.
                    </p>
                  </div>
                </div>

                {rewardFeedback && (
                  <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                    rewardFeedback.type === 'success'
                      ? 'bg-emerald-950/70 border-emerald-500/60 text-emerald-200'
                      : 'bg-red-950/70 border-red-500/60 text-red-200'
                  }`}>
                    {rewardFeedback.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    )}
                    <span>{rewardFeedback.text}</span>
                  </div>
                )}

                <form onSubmit={handleAddRewardSubmit} className="space-y-3.5 p-4 rounded-xl bg-[#0f0905] border border-amber-800/40">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-amber-300 uppercase tracking-wider block font-mono mb-1">
                        Player PUBG UID *
                      </label>
                      <input
                        type="text"
                        value={rewardUid}
                        onChange={(e) => setRewardUid(e.target.value)}
                        placeholder="e.g. 51648922552"
                        className="w-full px-3 py-2 rounded-lg bg-[#18100a] border border-amber-700/50 text-white placeholder-amber-200/30 text-xs font-mono focus:outline-none focus:border-amber-400"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-amber-300 uppercase tracking-wider block font-mono mb-1">
                        Reward Amount (Diamonds 💎) *
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={rewardAmount}
                        onChange={(e) => setRewardAmount(e.target.value)}
                        placeholder="e.g. 500"
                        className="w-full px-3 py-2 rounded-lg bg-[#18100a] border border-amber-700/50 text-amber-300 placeholder-amber-200/30 text-xs font-mono font-bold focus:outline-none focus:border-amber-400"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-amber-300 uppercase tracking-wider block font-mono mb-1">
                      Reason / Tournament Achievement *
                    </label>
                    <input
                      type="text"
                      value={rewardReason}
                      onChange={(e) => setRewardReason(e.target.value)}
                      placeholder="e.g. Match 1 Winner Bounty / Top Fragger Reward"
                      className="w-full px-3 py-2 rounded-lg bg-[#18100a] border border-amber-700/50 text-white placeholder-amber-200/30 text-xs focus:outline-none focus:border-amber-400"
                      required
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-amber-400/70 font-mono">Quick Amounts:</span>
                    {['100', '250', '500', '1000', '2500'].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setRewardAmount(amt)}
                        className="px-2 py-0.5 rounded bg-[#1e130a] hover:bg-amber-600/30 border border-amber-700/40 text-[10px] font-mono text-amber-300 cursor-pointer"
                      >
                        +{amt} 💎
                      </button>
                    ))}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingReward || !rewardUid.trim()}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-600 via-amber-500 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-black font-black uppercase text-xs tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow disabled:opacity-50 transition-all"
                  >
                    {isSubmittingReward ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-black" />
                        <span>Crediting User Balance in Firebase...</span>
                      </>
                    ) : (
                      <>
                        <Gift className="w-4 h-4 text-black" />
                        <span>Send Reward to User UID</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* TAB 4: NOTICES & ALERTS (Publish announcements to users) */}
            {activeTab === 'notice' && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-600/40 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 shrink-0">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase font-heading">
                      Broadcast Tournament Notices &amp; Alerts
                    </h4>
                    <p className="text-[11px] text-amber-200/70 mt-0.5 leading-relaxed">
                      Publish announcements, guidelines, or urgent room entry warnings. When active, this notice displays in a top notification bar across the entire portal and opens when users tap the <b className="text-amber-300">NOTICES</b> button.
                    </p>
                  </div>
                </div>

                {noticeFeedback && (
                  <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-500/60 text-emerald-200 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{noticeFeedback}</span>
                  </div>
                )}

                <form onSubmit={handleSaveNotice} className="space-y-3.5 p-4 rounded-xl bg-[#0f0905] border border-amber-800/40">
                  <div className="flex items-center justify-between pb-2 border-b border-amber-900/40">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-amber-300 uppercase font-mono">Notice Status:</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        noticeActive ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-red-500/20 text-red-400 border border-red-500/40'
                      }`}>
                        {noticeActive ? 'ACTIVE (SHOWING)' : 'DISABLED (HIDDEN)'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setNoticeActive(!noticeActive)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer border ${
                        noticeActive 
                          ? 'bg-red-950/60 hover:bg-red-900 text-red-300 border-red-500/50' 
                          : 'bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border-emerald-500/50'
                      }`}
                    >
                      {noticeActive ? 'Hide Notice' : 'Enable Notice'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="text-[11px] font-bold text-amber-300 uppercase tracking-wider block font-mono mb-1">
                        Notice Headline *
                      </label>
                      <input
                        type="text"
                        value={noticeTitle}
                        onChange={(e) => setNoticeTitle(e.target.value)}
                        placeholder="e.g. Admin"
                        className="w-full px-3 py-2 rounded-lg bg-[#18100a] border border-amber-700/50 text-white placeholder-amber-200/30 text-xs focus:outline-none focus:border-amber-400"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-amber-300 uppercase tracking-wider block font-mono mb-1">
                        Alert Urgency *
                      </label>
                      <select
                        value={noticeUrgency}
                        onChange={(e) => setNoticeUrgency(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-lg bg-[#18100a] border border-amber-700/50 text-amber-300 text-xs focus:outline-none focus:border-amber-400"
                      >
                        <option value="URGENT">🔴 URGENT (Warning)</option>
                        <option value="LIVE">🟡 LIVE (Match In Progress)</option>
                        <option value="INFO">🔵 INFO (Standard Notice)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-amber-300 uppercase tracking-wider block font-mono mb-1">
                      Detailed Message / Guidelines *
                    </label>
                    <textarea
                      rows={3}
                      value={noticeMessage}
                      onChange={(e) => setNoticeMessage(e.target.value)}
                      placeholder="Type official rules, room joining window, or prizes guidelines..."
                      className="w-full px-3 py-2 rounded-lg bg-[#18100a] border border-amber-700/50 text-white placeholder-amber-200/30 text-xs focus:outline-none focus:border-amber-400 resize-none"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSavingNotice || !noticeTitle.trim() || !noticeMessage.trim()}
                    className="w-full py-2.5 rounded-xl pubg-amber-glow-btn text-white font-bold uppercase text-xs tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow disabled:opacity-50"
                  >
                    {isSavingNotice ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Publishing Notice to Firebase...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 text-white" />
                        <span>Publish Notice to Portal</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
