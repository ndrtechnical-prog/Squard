import React, { useState, useEffect } from 'react';
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
  CheckCircle2
} from 'lucide-react';
import { Tournament, TournamentStatus, Seat } from '../types/tournament';

interface AdminPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  adminToken: string | null;
  onLogin: (token: string) => void;
  onLogout: () => void;
  tournament: Tournament | null;
  onRefreshData: () => void;
  onNoticeUpdated?: () => void;
}

export const AdminPortalModal: React.FC<AdminPortalModalProps> = ({
  isOpen,
  onClose,
  adminToken,
  onLogin,
  onLogout,
  tournament,
  onRefreshData,
  onNoticeUpdated
}) => {
  // Active Tab: 'schedule' | 'seats' | 'reward' | 'notice'
  const [activeTab, setActiveTab] = useState<'schedule' | 'seats' | 'reward' | 'notice'>('schedule');

  // Login form state
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // 1. MATCH SCHEDULE & ROOM SETTINGS (Shifted from Yellow mark)
  const [editDate, setEditDate] = useState(tournament?.matchDate || '2026-10-27');
  const [editTime, setEditTime] = useState(tournament?.matchTime || '11:00');
  const [editRoomId, setEditRoomId] = useState(tournament?.roomId || '69151604');
  const [editPassword, setEditPassword] = useState(tournament?.roomPassword || '1234');
  const [editYoutube, setEditYoutube] = useState(
    tournament?.youtubeUrl || 'https://youtube.com/@flaregunpk?si=NycZ9BwNyELH405i'
  );
  const [manualStatus, setManualStatus] = useState<TournamentStatus | 'AUTO'>(
    (tournament?.manualStatus as any) || 'AUTO'
  );
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
  const [noticeTitle, setNoticeTitle] = useState('Official Match & Room Joining Notice');
  const [noticeMessage, setNoticeMessage] = useState(
    'Match will start strictly on time. Room ID & Password will unlock 15 minutes before the match. All squad captains must join room within 15 minutes!'
  );
  const [noticeUrgency, setNoticeUrgency] = useState<'INFO' | 'URGENT' | 'LIVE'>('URGENT');
  const [noticeActive, setNoticeActive] = useState(true);
  const [isSavingNotice, setIsSavingNotice] = useState(false);
  const [noticeFeedback, setNoticeFeedback] = useState<string | null>(null);

  // Synchronize inputs when tournament updates
  useEffect(() => {
    if (tournament) {
      if (tournament.matchDate) setEditDate(tournament.matchDate);
      if (tournament.matchTime) setEditTime(tournament.matchTime);
      if (tournament.roomId) setEditRoomId(tournament.roomId);
      if (tournament.roomPassword) setEditPassword(tournament.roomPassword);
      if (tournament.youtubeUrl) setEditYoutube(tournament.youtubeUrl);
      if (tournament.manualStatus) setManualStatus(tournament.manualStatus as any);
    }
  }, [tournament]);

  // Load active notice on mount
  useEffect(() => {
    fetch('/api/notices')
      .then(r => r.json())
      .then(d => {
        if (d?.success && d?.notice) {
          if (d.notice.title) setNoticeTitle(d.notice.title);
          if (d.notice.message) setNoticeMessage(d.notice.message);
          if (d.notice.urgency) setNoticeUrgency(d.notice.urgency);
          if (typeof d.notice.active === 'boolean') setNoticeActive(d.notice.active);
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

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password.trim() })
      });
      const data = await res.json();

      if (res.ok && data.success && data.token) {
        onLogin(data.token);
        setPassword('');
      } else {
        setLoginError(data.error || 'Incorrect admin password.');
      }
    } catch {
      setLoginError('Error connecting to authentication server.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Save Schedule & Room Settings to Firebase RTDB
  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSchedule(true);
    setScheduleSuccessMsg(null);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (adminToken) headers['Authorization'] = `Bearer ${adminToken}`;

      const res = await fetch('/api/admin/tournament/update', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          matchDate: editDate.trim(),
          matchTime: editTime.trim(),
          roomId: editRoomId.trim(),
          roomPassword: editPassword.trim(),
          youtubeUrl: editYoutube.trim(),
          manualStatus
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setScheduleSuccessMsg('Match schedule, Room ID & countdown saved to Firebase successfully!');
        onRefreshData();
        setTimeout(() => setScheduleSuccessMsg(null), 3000);
      } else {
        setScheduleSuccessMsg(data.error || 'Saved locally.');
        onRefreshData();
        setTimeout(() => setScheduleSuccessMsg(null), 3000);
      }
    } catch {
      setScheduleSuccessMsg('Saved locally.');
      onRefreshData();
      setTimeout(() => setScheduleSuccessMsg(null), 3000);
    } finally {
      setIsSavingSchedule(false);
    }
  };

  // Reset All Seats (Opens Fresh Seats for New Match)
  const handleResetAllSeats = async () => {
    setIsResettingSeats(true);
    setResetSuccessMsg(null);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (adminToken) headers['Authorization'] = `Bearer ${adminToken}`;

      const res = await fetch('/api/admin/seats/reset-all', {
        method: 'POST',
        headers,
        body: JSON.stringify({ tournamentId: tournament?.id || 'PUBG001' })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setResetSuccessMsg('All 100 seats reset! All slots are now empty and open for booking in Firebase.');
        setShowResetConfirm(false);
        onRefreshData();
        setTimeout(() => setResetSuccessMsg(null), 4000);
      } else {
        alert(data.error || 'Failed to reset seats.');
      }
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

      const data = await res.json();
      if (res.ok && data.success) {
        setRemoveMessage({ type: 'success', text: data.message });
        setRemoveUidInput('');
        onRefreshData();
        setTimeout(() => setRemoveMessage(null), 4000);
      } else {
        setRemoveMessage({ type: 'error', text: data.error || 'Player not found in any seat.' });
      }
    } catch (err: any) {
      setRemoveMessage({ type: 'error', text: err.message || 'Server error removing player.' });
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
      const data = await res.json();
      if (res.ok && data.success) {
        setRewardFeedback({
          type: 'success',
          text: `Success! Added ${numAmount} 💎 Reward to ${data.playerName || cleanUid}. New Balance: ${data.newBalance} 💎`
        });
        setRewardUid('');
        onRefreshData();
        setTimeout(() => setRewardFeedback(null), 5000);
      } else {
        setRewardFeedback({ type: 'error', text: data.error || 'Failed to credit reward.' });
      }
    } catch (err: any) {
      setRewardFeedback({ type: 'error', text: err.message || 'Error communicating with server.' });
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
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (adminToken) headers['Authorization'] = `Bearer ${adminToken}`;

      const res = await fetch('/api/admin/notices/update', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: noticeTitle.trim(),
          message: noticeMessage.trim(),
          urgency: noticeUrgency,
          active: noticeActive
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setNoticeFeedback('Global Notice successfully updated & broadcast to all users!');
        if (onNoticeUpdated) onNoticeUpdated();
        setTimeout(() => setNoticeFeedback(null), 4000);
      } else {
        alert(data.error || 'Failed to update notice.');
      }
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
            {/* 4 Navigation Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-[#100a06] border border-amber-900/40 rounded-xl">
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

                {/* Quick Lifecycle Presets */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-amber-300 uppercase tracking-wider block font-mono">
                    Match Lifecycle Mode:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => setManualStatus('AUTO')}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        manualStatus === 'AUTO'
                          ? 'bg-amber-950/80 border-amber-500 text-white shadow'
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
                      onClick={() => setManualStatus('ROOM_OPEN')}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        manualStatus === 'ROOM_OPEN'
                          ? 'bg-emerald-950/80 border-emerald-500 text-white shadow'
                          : 'bg-[#18100a] border-amber-900/30 text-amber-200/60 hover:text-white hover:border-amber-700/50'
                      }`}
                    >
                      <div className="text-xs font-bold text-emerald-300 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-emerald-400" /> Room Open
                      </div>
                      <div className="text-[10px] text-emerald-200/50">15-Min Window</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setManualStatus('MATCH_LIVE')}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        manualStatus === 'MATCH_LIVE'
                          ? 'bg-red-950/80 border-red-500 text-white shadow'
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
                      onClick={() => setManualStatus('WAIT_FOR_RESULT')}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        manualStatus === 'WAIT_FOR_RESULT'
                          ? 'bg-amber-950/80 border-amber-500 text-white shadow'
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
                        placeholder="e.g. Official Match & Room Joining Rules"
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
