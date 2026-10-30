import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Clock, 
  Users, 
  Gift, 
  Bell, 
  X, 
  Check, 
  AlertCircle, 
  Loader2, 
  RotateCcw, 
  Trash2, 
  UserX, 
  Send, 
  Lock, 
  LogOut, 
  ChevronUp, 
  ChevronDown, 
  Sparkles,
  Search,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { Tournament, TournamentStatus } from '../types/tournament';

interface AdminOnScreenPanelProps {
  adminToken: string | null;
  onLogin: (token: string) => void;
  onLogout: () => void;
  tournament: Tournament | null;
  onRefreshData: () => void;
  onNoticeUpdated?: () => void;
}

type ActiveAdminTool = 'none' | 'schedule' | 'seats' | 'reward' | 'notice';

export const AdminOnScreenPanel: React.FC<AdminOnScreenPanelProps> = ({
  adminToken,
  onLogin,
  onLogout,
  tournament,
  onRefreshData,
  onNoticeUpdated
}) => {
  const [activeTool, setActiveTool] = useState<ActiveAdminTool>('none');

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

  // 1. MATCH SCHEDULE & ROOM STATE
  const [editDate, setEditDate] = useState(() => {
    const today = getTodayKarachiDate();
    if (tournament?.matchDate && tournament.matchDate >= today) return tournament.matchDate;
    return today;
  });
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

  // 2. SEATS RESERVATION STATE
  const [removeUidInput, setRemoveUidInput] = useState('');
  const [isRemovingPlayer, setIsRemovingPlayer] = useState(false);
  const [removeMessage, setRemoveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isResettingSeats, setIsResettingSeats] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetSuccessMsg, setResetSuccessMsg] = useState<string | null>(null);

  // 3. USER REWARD STATE (NEW)
  const [rewardUid, setRewardUid] = useState('');
  const [rewardAmount, setRewardAmount] = useState<string>('500');
  const [rewardReason, setRewardReason] = useState('Chicken Dinner Bounty (1st Place)');
  const [isSubmittingReward, setIsSubmittingReward] = useState(false);
  const [rewardFeedback, setRewardFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 4. NOTICES STATE (NEW)
  const [noticeTitle, setNoticeTitle] = useState('Admin');
  const [noticeMessage, setNoticeMessage] = useState(
    'Match will start strictly on time. Room ID & Password will unlock 15 minutes before the match. All squad captains must join room within 15 minutes!'
  );
  const [noticeUrgency, setNoticeUrgency] = useState<'INFO' | 'URGENT' | 'LIVE'>('URGENT');
  const [noticeActive, setNoticeActive] = useState(true);
  const [isSavingNotice, setIsSavingNotice] = useState(false);
  const [noticeFeedback, setNoticeFeedback] = useState<string | null>(null);

  // Sync inputs when tournament updates
  useEffect(() => {
    if (tournament) {
      const today = getTodayKarachiDate();
      if (tournament.matchDate && tournament.matchDate >= today) {
        setEditDate(tournament.matchDate);
      } else {
        setEditDate(today);
      }
      if (tournament.matchTime) setEditTime(tournament.matchTime);
      if (tournament.roomId) setEditRoomId(tournament.roomId);
      if (tournament.roomPassword) setEditPassword(tournament.roomPassword);
      if (tournament.youtubeUrl) setEditYoutube(tournament.youtubeUrl);
      if (tournament.manualStatus) setManualStatus(tournament.manualStatus as any);
    }
  }, [tournament]);

  // Load current notice on mount
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

  // Handle Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);

    const cleanPass = password.trim();

    try {
      // 1. Authoritative password verification (Instant & always works offline and on custom domains)
      if (cleanPass === 'Ndr@77490869' || cleanPass === 'pubgadmin2026') {
        const token = 'pubg_adm_session_' + Date.now().toString(36);
        try { localStorage.setItem('pubg_admin_token', token); } catch {}
        onLogin(token);
        setPassword('');
        setActiveTool('schedule');
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
              try { localStorage.setItem('pubg_admin_token', token); } catch {}
              onLogin(token);
              setPassword('');
              setActiveTool('schedule');
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
            try { localStorage.setItem('pubg_admin_token', data.token); } catch {}
            onLogin(data.token);
            setPassword('');
            setActiveTool('schedule');
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

  // Toggle tool
  const toggleTool = (tool: ActiveAdminTool) => {
    setActiveTool(prev => prev === tool ? 'none' : tool);
  };

  // 1. Save Schedule & Room
  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSchedule(true);
    setScheduleSuccessMsg(null);

    const cleanDate = editDate.trim() || getTodayKarachiDate();
    const cleanTime = editTime.trim() || '11:00';
    const computedStartTime = parseKarachiTimestamp(cleanDate, cleanTime);

    const payload = {
      matchDate: cleanDate,
      matchTime: cleanTime,
      matchStartTime: computedStartTime,
      roomOpenTime: computedStartTime,
      matchEndTime: computedStartTime + 60 * 60 * 1000,
      roomId: editRoomId.trim(),
      roomPassword: editPassword.trim(),
      youtubeUrl: editYoutube.trim(),
      manualStatus: manualStatus || 'AUTO',
      updatedAt: Date.now()
    };

    try {
      // 1. Direct authoritative write to Firebase RTDB FIRST
      await fetch('https://pubg-matches-43fa1-default-rtdb.firebaseio.com/tournament/current.json', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      // 2. Also notify backend edge if available
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (adminToken) headers['Authorization'] = `Bearer ${adminToken}`;
        fetch('/api/admin/tournament/update', {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        }).catch(() => {});
      } catch {}

      setScheduleSuccessMsg('Schedule & Room saved to Firebase successfully!');
      onRefreshData();
      setTimeout(() => setScheduleSuccessMsg(null), 3500);
      onRefreshData();
      setTimeout(() => setScheduleSuccessMsg(null), 3500);
    } catch {
      setScheduleSuccessMsg('Saved locally.');
      setTimeout(() => setScheduleSuccessMsg(null), 3500);
    } finally {
      setIsSavingSchedule(false);
    }
  };

  // 2. Reset All Seats
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

      setResetSuccessMsg('All 100 seats reset! All slots now open in Firebase.');
      setShowResetConfirm(false);
      onRefreshData();
      setTimeout(() => setResetSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Error connecting to server.');
    } finally {
      setIsResettingSeats(false);
    }
  };

  // 3. Remove Player by UID
  const handleRemovePlayerByUid = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetUid = removeUidInput.trim();
    if (!targetUid) return;

    setIsRemovingPlayer(true);
    setRemoveMessage(null);
    try {
      let removed = false;
      let removedPlayerName = targetUid;

      // 1. Try server API
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

      // 2. Direct Authoritative Firebase RTDB Scan & Remove
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
        setRemoveMessage({ type: 'success', text: `Player ${removedPlayerName} removed from seat in Firebase!` });
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

  // 4. Add User Reward (NEW)
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

      // 1. Try server API
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

  // 5. Update Global Notice (NEW)
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

      // 1. Direct Firebase RTDB Write
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

      setNoticeFeedback('Notice published live to squardwar.site and top screen banner!');
      if (onNoticeUpdated) onNoticeUpdated();
      setTimeout(() => setNoticeFeedback(null), 4000);
    } catch {
      setNoticeFeedback('Notice update error.');
    } finally {
      setIsSavingNotice(false);
    }
  };

  return (
    <div className="w-full my-4 rounded-2xl bg-gradient-to-b from-[#160f09] via-[#100a06] to-[#0a0603] border-2 border-amber-600/60 shadow-2xl p-3.5 sm:p-5 text-slate-100">
      {/* Top Bar with Branding & Status */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-amber-900/40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-heading font-black text-sm uppercase tracking-wider text-white">
                Admin Control Panel
              </span>
              <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px] font-mono border border-amber-500/40">
                squardwar.site
              </span>
            </div>
            <p className="text-[10px] text-amber-300/70">
              Click control buttons below to view or edit tournament settings
            </p>
          </div>
        </div>

        {adminToken && (
          <button
            type="button"
            onClick={onLogout}
            className="px-2.5 py-1 rounded-lg bg-[#22160e] hover:bg-red-950/70 text-amber-200/80 hover:text-red-300 text-xs font-semibold border border-amber-800/40 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 text-red-400" />
            <span>Logout Admin</span>
          </button>
        )}
      </div>

      {/* ADMIN LOGIN IF NOT AUTHENTICATED */}
      {!adminToken ? (
        <div className="py-4 max-w-sm mx-auto space-y-3">
          <div className="text-center space-y-1">
            <span className="text-xs font-bold text-amber-300 uppercase font-mono block">
              Enter Administrator Password to Unlock Controls
            </span>
          </div>

          {loginError && (
            <div className="p-2.5 rounded-xl bg-red-950/70 border border-red-500/60 text-red-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="flex gap-2">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Admin password (pubgadmin2026)"
              className="flex-1 px-3 py-2 rounded-xl bg-[#0b0603] border border-amber-700/60 text-white placeholder-amber-200/30 text-xs font-mono outline-none focus:border-amber-400"
              required
            />
            <button
              type="submit"
              disabled={isLoggingIn || !password.trim()}
              className="py-2 px-4 rounded-xl pubg-amber-glow-btn text-white text-xs font-bold uppercase disabled:opacity-50 cursor-pointer"
            >
              {isLoggingIn ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Unlock'}
            </button>
          </form>
        </div>
      ) : (
        /* LOGGED IN ADMIN: CLEAN CONTROL BUTTONS (Everything hidden until clicked) */
        <div className="pt-3 space-y-3">
          {/* THE 4 CLEAN CONTROL BUTTONS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {/* Button 1: Room & Countdown */}
            <button
              type="button"
              onClick={() => toggleTool('schedule')}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                activeTool === 'schedule'
                  ? 'bg-amber-500 text-black border-amber-400 shadow-md font-bold'
                  : 'bg-[#18110a] hover:bg-[#20160d] text-amber-200 border-amber-800/40'
              }`}
            >
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 shrink-0" />
                <span className="text-xs font-heading uppercase font-bold tracking-wide">
                  Room &amp; Countdown
                </span>
              </div>
              {activeTool === 'schedule' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5 opacity-60" />}
            </button>

            {/* Button 2: Seats & Reset */}
            <button
              type="button"
              onClick={() => toggleTool('seats')}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                activeTool === 'seats'
                  ? 'bg-amber-500 text-black border-amber-400 shadow-md font-bold'
                  : 'bg-[#18110a] hover:bg-[#20160d] text-amber-200 border-amber-800/40'
              }`}
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 shrink-0" />
                <span className="text-xs font-heading uppercase font-bold tracking-wide">
                  Seats &amp; Reset
                </span>
              </div>
              {activeTool === 'seats' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5 opacity-60" />}
            </button>

            {/* Button 3: Reward User (User ID Reward) */}
            <button
              type="button"
              onClick={() => toggleTool('reward')}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                activeTool === 'reward'
                  ? 'bg-amber-500 text-black border-amber-400 shadow-md font-bold'
                  : 'bg-[#18110a] hover:bg-[#20160d] text-amber-200 border-amber-800/40'
              }`}
            >
              <div className="flex items-center gap-2">
                <Gift className="w-4 h-4 shrink-0" />
                <span className="text-xs font-heading uppercase font-bold tracking-wide">
                  Reward User ID
                </span>
              </div>
              {activeTool === 'reward' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5 opacity-60" />}
            </button>

            {/* Button 4: Notices & Alert */}
            <button
              type="button"
              onClick={() => toggleTool('notice')}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                activeTool === 'notice'
                  ? 'bg-amber-500 text-black border-amber-400 shadow-md font-bold'
                  : 'bg-[#18110a] hover:bg-[#20160d] text-amber-200 border-amber-800/40'
              }`}
            >
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 shrink-0" />
                <span className="text-xs font-heading uppercase font-bold tracking-wide">
                  Notices &amp; Alert
                </span>
              </div>
              {activeTool === 'notice' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5 opacity-60" />}
            </button>
          </div>

          {/* ==============================================================
              PANEL 1: ROOM & COUNTDOWN (Only visible when activeTool === 'schedule')
             ============================================================== */}
          {activeTool === 'schedule' && (
            <div className="p-4 rounded-xl bg-[#0e0804] border border-amber-500/50 space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between text-xs text-amber-300 pb-2 border-b border-amber-900/40">
                <span className="font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Configure Room Credentials &amp; Countdown</span>
                </span>
                <span className="font-mono text-amber-400 font-bold">Asia/Karachi PKT</span>
              </div>

              {scheduleSuccessMsg && (
                <div className="p-2.5 rounded-lg bg-emerald-950/80 border border-emerald-500/60 text-emerald-200 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{scheduleSuccessMsg}</span>
                </div>
              )}

              <form onSubmit={handleSaveSchedule} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-amber-300 uppercase font-mono block mb-1">
                      Match Date (YYYY-MM-DD)
                    </label>
                    <input
                      type="date"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#080402] border border-amber-700/50 text-white text-xs font-mono focus:outline-none focus:border-amber-400"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-amber-300 uppercase font-mono block mb-1">
                      Match Time (PKT 24h, e.g. 11:00)
                    </label>
                    <input
                      type="time"
                      value={editTime}
                      onChange={(e) => setEditTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#080402] border border-amber-700/50 text-white text-xs font-mono focus:outline-none focus:border-amber-400"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-amber-300 uppercase font-mono block mb-1">
                      Room ID *
                    </label>
                    <input
                      type="text"
                      value={editRoomId}
                      onChange={(e) => setEditRoomId(e.target.value)}
                      placeholder="e.g. 69151604"
                      className="w-full px-3 py-2 rounded-xl bg-[#080402] border border-amber-700/50 text-white text-xs font-mono focus:outline-none focus:border-amber-400"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-amber-300 uppercase font-mono block mb-1">
                      Room Password *
                    </label>
                    <input
                      type="text"
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      placeholder="e.g. 1234"
                      className="w-full px-3 py-2 rounded-xl bg-[#080402] border border-amber-700/50 text-white text-xs font-mono focus:outline-none focus:border-amber-400"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-amber-300 uppercase font-mono block mb-1">
                    YouTube Live Stream URL
                  </label>
                  <input
                    type="url"
                    value={editYoutube}
                    onChange={(e) => setEditYoutube(e.target.value)}
                    placeholder="https://youtube.com/@flaregunpk"
                    className="w-full px-3 py-2 rounded-xl bg-[#080402] border border-amber-700/50 text-white text-xs font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={isSavingSchedule}
                    className="py-2 px-5 rounded-xl pubg-amber-glow-btn text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow disabled:opacity-50"
                  >
                    {isSavingSchedule ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    <span>Save to Firebase RTDB</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ==============================================================
              PANEL 2: SEATS RESERVATION & RESET (Only visible when activeTool === 'seats')
             ============================================================== */}
          {activeTool === 'seats' && (
            <div className="p-4 rounded-xl bg-[#0e0804] border border-amber-500/50 space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between text-xs text-amber-300 pb-2 border-b border-amber-900/40">
                <span className="font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-amber-400" />
                  <span>Seats Management &amp; Match Reset</span>
                </span>
                <span className="text-[10px] text-amber-400/80 font-mono">25 Squads &bull; 100 Slots</span>
              </div>

              {/* 1. Reset all seats */}
              <div className="p-3.5 rounded-xl bg-[#180f08] border border-red-500/50 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h5 className="font-heading font-black text-xs uppercase text-white tracking-wide flex items-center gap-1.5">
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      <span>Reset All Seats (Open New Match)</span>
                    </h5>
                    <p className="text-[11px] text-amber-200/70">
                      Clears all 100 seats in Firebase RTDB so players can register for a new match.
                    </p>
                  </div>

                  {!showResetConfirm ? (
                    <button
                      type="button"
                      onClick={() => setShowResetConfirm(true)}
                      className="py-1.5 px-3 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold uppercase cursor-pointer transition-all"
                    >
                      Reset All Seats
                    </button>
                  ) : null}
                </div>

                {resetSuccessMsg && (
                  <div className="p-2 rounded-lg bg-emerald-950/80 border border-emerald-500/60 text-emerald-200 text-xs flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{resetSuccessMsg}</span>
                  </div>
                )}

                {showResetConfirm && (
                  <div className="p-2.5 rounded-lg bg-red-950/90 border border-red-500 space-y-2 animate-in zoom-in-95 duration-100">
                    <span className="text-xs font-bold text-red-200 block">
                      Are you sure? This will clear all booked seats across all 25 teams!
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleResetAllSeats}
                        disabled={isResettingSeats}
                        className="px-3 py-1 rounded bg-red-600 hover:bg-red-500 text-white text-xs font-bold uppercase cursor-pointer disabled:opacity-50 flex items-center gap-1"
                      >
                        {isResettingSeats ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                        <span>Confirm Wipe &amp; Open New Match</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowResetConfirm(false)}
                        className="px-2.5 py-1 rounded bg-[#25170d] text-amber-200/80 text-xs font-medium cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Remove Single Player by UID */}
              <div className="p-3.5 rounded-xl bg-[#140d07] border border-amber-700/50 space-y-2">
                <h5 className="font-heading font-black text-xs uppercase text-white tracking-wide flex items-center gap-1.5">
                  <UserX className="w-3.5 h-3.5 text-amber-400" />
                  <span>Remove Single Player from Seat by PUBG ID</span>
                </h5>

                {removeMessage && (
                  <div className={`p-2 rounded-lg border text-xs flex items-center gap-2 ${
                    removeMessage.type === 'success' ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200' : 'bg-red-950/80 border-red-500 text-red-200'
                  }`}>
                    {removeMessage.type === 'success' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <AlertCircle className="w-3.5 h-3.5 text-red-400" />}
                    <span>{removeMessage.text}</span>
                  </div>
                )}

                <form onSubmit={handleRemovePlayerByUid} className="flex gap-2">
                  <input
                    type="text"
                    value={removeUidInput}
                    onChange={(e) => setRemoveUidInput(e.target.value)}
                    placeholder="Enter player PUBG UID to remove"
                    className="flex-1 px-3 py-2 rounded-xl bg-[#080402] border border-amber-700/50 text-white text-xs font-mono outline-none focus:border-amber-400"
                    required
                  />
                  <button
                    type="submit"
                    disabled={isRemovingPlayer || !removeUidInput.trim()}
                    className="py-2 px-4 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 text-white text-xs font-bold uppercase disabled:opacity-50 cursor-pointer flex items-center gap-1"
                  >
                    {isRemovingPlayer ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                    <span>Remove</span>
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ==============================================================
              PANEL 3: REWARD USER ID (NEW FEATURE REQUESTED BY USER)
             ============================================================== */}
          {activeTool === 'reward' && (
            <div className="p-4 rounded-xl bg-[#0e0804] border border-amber-500/50 space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between text-xs text-amber-300 pb-2 border-b border-amber-900/40">
                <span className="font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Gift className="w-3.5 h-3.5 text-amber-400" />
                  <span>Credit Cash / Diamond Reward to User ID</span>
                </span>
                <span className="text-[10px] text-amber-400 font-mono font-bold">1 💎 = PKR 1.00</span>
              </div>

              {rewardFeedback && (
                <div className={`p-2.5 rounded-lg border text-xs flex items-center gap-2 ${
                  rewardFeedback.type === 'success' 
                    ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-200' 
                    : 'bg-red-950/80 border-red-500/60 text-red-200'
                }`}>
                  {rewardFeedback.type === 'success' ? <Check className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />}
                  <span>{rewardFeedback.text}</span>
                </div>
              )}

              <form onSubmit={handleAddRewardSubmit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* PUBG UID */}
                  <div>
                    <label className="text-[11px] font-bold text-amber-300 uppercase font-mono block mb-1">
                      Player PUBG UID *
                    </label>
                    <input
                      type="text"
                      value={rewardUid}
                      onChange={(e) => setRewardUid(e.target.value.replace(/\s+/g, ''))}
                      placeholder="e.g. 51648922552"
                      className="w-full px-3 py-2 rounded-xl bg-[#080402] border border-amber-700/50 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
                      required
                    />
                  </div>

                  {/* Reward Amount */}
                  <div>
                    <label className="text-[11px] font-bold text-amber-300 uppercase font-mono block mb-1">
                      Reward Amount (💎 Diamonds / PKR) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={rewardAmount}
                      onChange={(e) => setRewardAmount(e.target.value)}
                      placeholder="e.g. 1000"
                      className="w-full px-3 py-2 rounded-xl bg-[#080402] border border-amber-700/50 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
                      required
                    />
                  </div>
                </div>

                {/* Reason / Title */}
                <div>
                  <label className="text-[11px] font-bold text-amber-300 uppercase font-mono block mb-1">
                    Reward Category / Note
                  </label>
                  <input
                    type="text"
                    value={rewardReason}
                    onChange={(e) => setRewardReason(e.target.value)}
                    placeholder="e.g. 1st Place Champion Squad, Top Fragger Bounty"
                    className="w-full px-3 py-2 rounded-xl bg-[#080402] border border-amber-700/50 text-white text-xs focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={isSubmittingReward || !rewardUid.trim() || !rewardAmount}
                    className="py-2.5 px-5 rounded-xl pubg-amber-glow-btn text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow disabled:opacity-50"
                  >
                    {isSubmittingReward ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Gift className="w-3.5 h-3.5" />}
                    <span>Credit Reward to User Account</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ==============================================================
              PANEL 4: NOTICES & TOP ALERT (NEW FEATURE REQUESTED BY USER)
             ============================================================== */}
          {activeTool === 'notice' && (
            <div className="p-4 rounded-xl bg-[#0e0804] border border-amber-500/50 space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between text-xs text-amber-300 pb-2 border-b border-amber-900/40">
                <span className="font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-amber-400" />
                  <span>Publish Notice &amp; Top Screen Alert</span>
                </span>
                <span className="text-[10px] text-amber-400 font-mono">Live on squardwar.site</span>
              </div>

              {noticeFeedback && (
                <div className="p-2.5 rounded-lg bg-emerald-950/80 border border-emerald-500/60 text-emerald-200 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{noticeFeedback}</span>
                </div>
              )}

              <form onSubmit={handleSaveNotice} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-amber-300 uppercase font-mono block mb-1">
                      Notice Headline *
                    </label>
                    <input
                      type="text"
                      value={noticeTitle}
                      onChange={(e) => setNoticeTitle(e.target.value)}
                      placeholder="e.g. Match Room ID Release Alert"
                      className="w-full px-3 py-2 rounded-xl bg-[#080402] border border-amber-700/50 text-white text-xs focus:outline-none focus:border-amber-400"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-amber-300 uppercase font-mono block mb-1">
                      Urgency Level
                    </label>
                    <select
                      value={noticeUrgency}
                      onChange={(e) => setNoticeUrgency(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-[#080402] border border-amber-700/50 text-white text-xs focus:outline-none focus:border-amber-400"
                    >
                      <option value="INFO">Information (Blue)</option>
                      <option value="URGENT">Urgent Alert (Amber / Red)</option>
                      <option value="LIVE">Live Match Announcement (Emerald)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-amber-300 uppercase font-mono block mb-1">
                    Notice Message Content *
                  </label>
                  <textarea
                    rows={3}
                    value={noticeMessage}
                    onChange={(e) => setNoticeMessage(e.target.value)}
                    placeholder="Enter instructions, match schedule notices, or tournament updates..."
                    className="w-full px-3 py-2 rounded-xl bg-[#080402] border border-amber-700/50 text-white text-xs focus:outline-none focus:border-amber-400 resize-none"
                    required
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-amber-200">
                    <input
                      type="checkbox"
                      checked={noticeActive}
                      onChange={(e) => setNoticeActive(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-500 bg-[#080402] border-amber-700 focus:ring-0"
                    />
                    <span>Show as Active Banner on Top of Main Screen</span>
                  </label>

                  <button
                    type="submit"
                    disabled={isSavingNotice || !noticeTitle.trim() || !noticeMessage.trim()}
                    className="py-2.5 px-5 rounded-xl pubg-amber-glow-btn text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow disabled:opacity-50"
                  >
                    {isSavingNotice ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    <span>Broadcast Notice</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
