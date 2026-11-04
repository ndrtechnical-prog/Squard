import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { HeroBanner } from './components/HeroBanner';
import { SeatCounters } from './components/SeatCounters';
import { RoomAccessAlert } from './components/RoomAccessAlert';
import { TeamCard } from './components/TeamCard';
import { MatchListSection } from './components/MatchListSection';
import { BookingModal } from './components/BookingModal';
import { BookingSuccessModal } from './components/BookingSuccessModal';
import { AdminPortalModal } from './components/AdminPortalModal';
import { AdminOnScreenPanel } from './components/AdminOnScreenPanel';
import { ResultsModal } from './components/ResultsModal';
import { DrawerMenu } from './components/DrawerMenu';
import { PinAuthModal } from './components/PinAuthModal';
import { TournamentFeaturesModal, FeatureTab } from './components/TournamentFeaturesModal';
import { NoticeBanner, NoticeData } from './components/NoticeBanner';
import { NoticesModal } from './components/NoticesModal';
import { SocialFooter } from './components/SocialFooter';
import { Tournament, TournamentStatus, GameType, PaymentAccount, PubgMatchId } from './types/tournament';
import { 
  loadStoredTournament, 
  saveStoredTournament, 
  loadUserBalance, 
  saveUserBalance,
  defaultPaymentAccounts,
  mergeTournamentWithFirebase,
  getInitialErangelTournament,
  getInitialLivikTournament,
  getInitialTdmTournament,
  getInitialFreeFireTournament,
  MATCH_IMAGES
} from './utils/storage';
import { Sparkles, ArrowLeft } from 'lucide-react';

export default function App() {
  const [activeGame, setActiveGame] = useState<GameType>('PUBG');
  const [selectedMatch, setSelectedMatch] = useState<PubgMatchId | 'FREE_FIRE' | null>(null);
  
  // Independent tournament states for each match
  const [erangelTournament, setErangelTournament] = useState<Tournament>(() => {
    try {
      const s = localStorage.getItem('pubg_tournament_erangel_v1') || localStorage.getItem('pubg_arena_tournament_v2');
      if (s) {
        const p = JSON.parse(s);
        if (p?.teams?.length >= 25) return p;
      }
    } catch {}
    return getInitialErangelTournament();
  });

  const [livikTournament, setLivikTournament] = useState<Tournament>(() => {
    try {
      const s = localStorage.getItem('pubg_tournament_livik_v1');
      if (s) {
        const p = JSON.parse(s);
        if (p?.teams?.length >= 30) return p;
      }
    } catch {}
    return getInitialLivikTournament();
  });

  const [tdmTournament, setTdmTournament] = useState<Tournament>(() => {
    try {
      const s = localStorage.getItem('pubg_tournament_tdm_v1');
      if (s) {
        const p = JSON.parse(s);
        if (p?.teams?.length >= 2) return p;
      }
    } catch {}
    return getInitialTdmTournament();
  });

  const [freeFireTournament, setFreeFireTournament] = useState<Tournament>(() => {
    const saved = localStorage.getItem('pubg_arena_freefire_tournament_v1');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return getInitialFreeFireTournament();
  });

  // Current active tournament depending on selected match or game mode
  const tournament = (activeGame === 'FREE_FIRE' || selectedMatch === 'FREE_FIRE')
    ? freeFireTournament
    : (selectedMatch === 'LIVIK' 
        ? livikTournament 
        : (selectedMatch === 'TDM' ? tdmTournament : erangelTournament));

  const setTournament = (update: Tournament | ((prev: Tournament) => Tournament)) => {
    const newT = typeof update === 'function' ? update(tournament) : update;
    if (activeGame === 'FREE_FIRE' || selectedMatch === 'FREE_FIRE') {
      setFreeFireTournament(newT);
      localStorage.setItem('pubg_arena_freefire_tournament_v1', JSON.stringify(newT));
    } else if (selectedMatch === 'LIVIK') {
      setLivikTournament(newT);
      localStorage.setItem('pubg_tournament_livik_v1', JSON.stringify(newT));
    } else if (selectedMatch === 'TDM') {
      setTdmTournament(newT);
      localStorage.setItem('pubg_tournament_tdm_v1', JSON.stringify(newT));
    } else {
      setErangelTournament(newT);
      localStorage.setItem('pubg_tournament_erangel_v1', JSON.stringify(newT));
      saveStoredTournament(newT);
    }
  };

  useEffect(() => {
    try {
      localStorage.setItem('pubg_tournament_erangel_v1', JSON.stringify(erangelTournament));
      localStorage.setItem('pubg_tournament_livik_v1', JSON.stringify(livikTournament));
      localStorage.setItem('pubg_tournament_tdm_v1', JSON.stringify(tdmTournament));
      localStorage.setItem('pubg_arena_freefire_tournament_v1', JSON.stringify(freeFireTournament));
    } catch {}
  }, [erangelTournament, livikTournament, tdmTournament, freeFireTournament]);

  const [userBalance, setUserBalance] = useState<number>(() => loadUserBalance());
  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccount[]>(defaultPaymentAccounts);

  // Authenticated Player Profile (stored in localStorage & verified in Firebase Realtime Database)
  const [savedPubgId, setSavedPubgId] = useState<string>(() => {
    return localStorage.getItem('pubg_saved_uid') || '';
  });
  const [savedPlayerName, setSavedPlayerName] = useState<string>(() => {
    return localStorage.getItem('pubg_saved_name') || '';
  });
  const [savedPin, setSavedPin] = useState<string>(() => {
    return localStorage.getItem('pubg_saved_pin') || '';
  });

  const [isEditingPubgId, setIsEditingPubgId] = useState(false);
  const [welcomeToast, setWelcomeToast] = useState<string | null>(null);

  // PIN Auth Modal & Action Gating State
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinModalReason, setPinModalReason] = useState<string>('');
  const [gateMessage, setGateMessage] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<
    | { type: 'BOOKING'; teamNumber: number; seatNumber: number }
    | { type: 'DEPOSIT' }
    | null
  >(null);

  // Modals state
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [bookingTeam, setBookingTeam] = useState(1);
  const [bookingSeat, setBookingSeat] = useState(1);

  const [recentBooking, setRecentBooking] = useState<any>(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [adminToken, setAdminToken] = useState<string | null>(() => {
    return localStorage.getItem('pubg_admin_token');
  });

  const [isResultsOpen, setIsResultsOpen] = useState(false);
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Easypaisa style feature modal (REWARD, TOP PLAYER, REVIEWS)
  const [isFeatureModalOpen, setIsFeatureModalOpen] = useState(false);
  const [featureModalTab, setFeatureModalTab] = useState<FeatureTab>('REWARD');

  // Global Notice State (squardwar.site)
  const [activeNotice, setActiveNotice] = useState<NoticeData | null>(null);
  const [isNoticesModalOpen, setIsNoticesModalOpen] = useState(false);

  const fetchActiveNotice = useCallback(async () => {
    try {
      const res = await fetch('/api/notices');
      const text = await res.text();
      if (text && text.trim().startsWith('{')) {
        const data = JSON.parse(text);
        if (data?.success && data?.notice) {
          setActiveNotice(data.notice);
          return;
        }
      }
      const fbRes = await fetch('https://pubg-matches-43fa1-default-rtdb.firebaseio.com/Notice.json');
      if (fbRes.ok) {
        const fbText = await fbRes.text();
        if (fbText && fbText.trim() !== 'null' && fbText.trim().startsWith('{')) {
          setActiveNotice(JSON.parse(fbText));
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchActiveNotice();
  }, [fetchActiveNotice]);

  // Serial Visitor Counter: Tracks each visitor landing on the website home screen
  useEffect(() => {
    try {
      const alreadyTracked = sessionStorage.getItem('sw_visit_counted');
      if (!alreadyTracked) {
        sessionStorage.setItem('sw_visit_counted', 'true');
        fetch('/api/visitors/track', { method: 'POST' }).catch(() => {
          // Fallback direct Firebase RTDB sync
          const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' }).format(new Date());
          fetch('https://pubg-matches-43fa1-default-rtdb.firebaseio.com/visitor_stats.json')
            .then(res => res.json())
            .then(data => {
              const currentLifetime = ((data && typeof data.lifetime === 'number') ? data.lifetime : 100) + 1;
              const currentToday = (((data && data.daily && data.daily[today])) || 0) + 1;
              fetch('https://pubg-matches-43fa1-default-rtdb.firebaseio.com/visitor_stats/lifetime.json', {
                method: 'PUT',
                body: JSON.stringify(currentLifetime)
              }).catch(() => {});
              fetch(`https://pubg-matches-43fa1-default-rtdb.firebaseio.com/visitor_stats/daily/${today}.json`, {
                method: 'PUT',
                body: JSON.stringify(currentToday)
              }).catch(() => {});
            }).catch(() => {});
        });
      }
    } catch {}
  }, []);

  // Open modal with history push so Back button cleanly closes it
  const openWithHistory = useCallback((openFn: () => void) => {
    try {
      window.history.pushState({ modalOpen: true }, '');
    } catch {
      // Ignore if history restrictions apply
    }
    openFn();
  }, []);

  // Sync PUBG ID and load/save balance with Firebase Realtime Database
  const syncPubgId = useCallback(async (uid: string, name?: string, pin?: string) => {
    const cleanUid = uid.trim();
    if (!cleanUid) return;
    try {
      let data: any = null;
      try {
        const res = await fetch('/api/user/sync-pubg-id', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            pubgUid: cleanUid, 
            playerName: name || undefined, 
            pin: pin || undefined 
          })
        });
        if (res.ok) {
          const text = await res.text();
          if (text && text.trim().startsWith('{')) {
            data = JSON.parse(text);
          }
        }
      } catch {}

      if (!data || !data.success) {
        const fbRes = await fetch(`https://pubg-matches-43fa1-default-rtdb.firebaseio.com/users/${encodeURIComponent(cleanUid)}.json`);
        if (fbRes.ok) {
          const fbText = await fbRes.text();
          if (fbText && fbText.trim() !== 'null' && fbText.trim().startsWith('{')) {
            data = { success: true, user: JSON.parse(fbText) };
          }
        }
      }

      if (data && data.success && data.user) {
        setSavedPubgId(cleanUid);
        localStorage.setItem('pubg_saved_uid', cleanUid);
        if (data.user.playerName) {
          setSavedPlayerName(data.user.playerName);
          localStorage.setItem('pubg_saved_name', data.user.playerName);
        }
        if (typeof data.user.balance === 'number') {
          setUserBalance(data.user.balance);
          saveUserBalance(data.user.balance);
        }
      }
    } catch (err) {
      console.warn('Sync error:', err);
    }
  }, []);

  // Fetch Firebase balance on mount if saved PUBG ID exists
  useEffect(() => {
    const storedUid = localStorage.getItem('pubg_saved_uid');
    const storedName = localStorage.getItem('pubg_saved_name');
    const storedPin = localStorage.getItem('pubg_saved_pin');
    if (storedUid) {
      syncPubgId(storedUid, storedName || undefined, storedPin || undefined);
    }
  }, [syncPubgId]);

  // Dedicated fast user balance refresh from Firebase RTDB (so returning from reward section updates immediately!)
  const refreshUserBalance = useCallback(async (explicitUid?: string) => {
    const targetUid = (explicitUid || savedPubgId || '').trim();
    if (!targetUid) return;

    try {
      let balanceFetched: number | null = null;
      try {
        const res = await fetch(`/api/user/balance?pubgUid=${encodeURIComponent(targetUid)}&t=${Date.now()}`);
        if (res.ok) {
          const text = await res.text();
          if (text && text.trim().startsWith('{')) {
            const data = JSON.parse(text);
            if (data.success && typeof data.balance === 'number') {
              balanceFetched = data.balance;
            }
          }
        }
      } catch {}

      if (balanceFetched === null) {
        const fbRes = await fetch(`https://pubg-matches-43fa1-default-rtdb.firebaseio.com/users/${encodeURIComponent(targetUid)}.json`);
        if (fbRes.ok) {
          const fbText = await fbRes.text();
          if (fbText && fbText.trim() !== 'null' && fbText.trim().startsWith('{')) {
            const fbUser = JSON.parse(fbText);
            if (fbUser && typeof fbUser.balance === 'number') {
              balanceFetched = fbUser.balance;
            }
          }
        }
      }

      if (balanceFetched !== null) {
        setUserBalance(balanceFetched);
        saveUserBalance(balanceFetched);
      }
    } catch (err) {
      console.warn('Error refreshing user balance:', err);
    }
  }, [savedPubgId]);

  // Real-time Balance Sync: auto-refresh when player returns from external payment portal
  useEffect(() => {
    const handleWindowFocus = () => {
      try {
        const activeUid = localStorage.getItem('pubg_saved_uid');
        if (activeUid) {
          refreshUserBalance(activeUid);
        }
      } catch {}
    };

    window.addEventListener('focus', handleWindowFocus);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        handleWindowFocus();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [refreshUserBalance]);

  // Primary PIN-protected Profile Authentication Handler
  const handleSaveProfileWithPin = async (uid: string, name: string, pin: string) => {
    const cleanUid = uid.trim();
    const cleanName = name.trim();
    const cleanPin = pin.trim();

    try {
      const FIREBASE_DB_URL = 'https://pubg-matches-43fa1-default-rtdb.firebaseio.com';
      let fbUser: any = null;

      // 1. Direct Authoritative Firebase RTDB Read
      try {
        const fbRes = await fetch(`${FIREBASE_DB_URL}/users/${encodeURIComponent(cleanUid)}.json`);
        if (fbRes.ok) {
          const fbText = await fbRes.text();
          if (fbText && fbText.trim() !== 'null' && fbText.trim().startsWith('{')) {
            try { fbUser = JSON.parse(fbText); } catch {}
          }
        }
      } catch (fbErr) {
        console.warn('Firebase RTDB read warning:', fbErr);
      }

      // Check or register user
      if (fbUser) {
        if (fbUser.pin && fbUser.pin.trim() !== '') {
          if (fbUser.pin !== cleanPin) {
            return { success: false, error: 'Incorrect 4-digit PIN! Please enter the correct PIN for this PUBG ID.' };
          }
        } else {
          fbUser.pin = cleanPin;
          fbUser.password = cleanPin;
        }

        if (cleanName) {
          fbUser.playerName = cleanName;
        }
        fbUser.lastLogin = Date.now();

        await fetch(`${FIREBASE_DB_URL}/users/${encodeURIComponent(cleanUid)}.json`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fbUser)
        });
      } else {
        fbUser = {
          uid: cleanUid,
          pubgUid: cleanUid,
          playerName: cleanName || `Player_${cleanUid.slice(-4)}`,
          pin: cleanPin,
          password: cleanPin,
          balance: 0,
          createdAt: Date.now(),
          lastLogin: Date.now()
        };

        await fetch(`${FIREBASE_DB_URL}/users/${encodeURIComponent(cleanUid)}.json`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fbUser)
        });
      }

      // Non-blocking sync to backend endpoint
      fetch('/api/user/pin-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pubgUid: cleanUid, playerName: cleanName, pin: cleanPin })
      }).catch(() => {});

      const activeName = fbUser.playerName || cleanName;
      setSavedPubgId(cleanUid);
      setSavedPlayerName(activeName);
      setSavedPin(cleanPin);

      try {
        localStorage.setItem('pubg_saved_uid', cleanUid);
        localStorage.setItem('pubg_saved_name', activeName);
        localStorage.setItem('pubg_saved_pin', cleanPin);
      } catch {}

      setIsEditingPubgId(false);
      setIsPinModalOpen(false);
      setGateMessage(null);

      if (typeof fbUser.balance === 'number') {
        setUserBalance(fbUser.balance);
        saveUserBalance(fbUser.balance);
      }

      setWelcomeToast(`Access Granted! Welcome ${activeName}. Balance: ${fbUser.balance || 0} 💎`);
      setTimeout(() => setWelcomeToast(null), 3500);

      // Execute queued action if user clicked a button before authenticating
      if (pendingAction) {
        const action = pendingAction;
        setPendingAction(null);
        if (action.type === 'BOOKING') {
          setBookingTeam(action.teamNumber);
          setBookingSeat(action.seatNumber);
          openWithHistory(() => setIsBookingOpen(true));
        } else if (action.type === 'DEPOSIT') {
          handleOpenDeposit(cleanUid);
        }
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Error connecting to database.' };
    }
  };

  const handleEditPubgId = () => {
    setPinModalReason(savedPubgId ? 'Edit your PUBG ID, Name or 4-digit PIN' : 'Enter your PUBG ID, Name and 4-Digit Security PIN to access your account.');
    openWithHistory(() => setIsPinModalOpen(true));
  };

  const handleClearPubgId = () => {
    setSavedPubgId('');
    setSavedPlayerName('');
    setSavedPin('');
    localStorage.removeItem('pubg_saved_uid');
    localStorage.removeItem('pubg_saved_name');
    localStorage.removeItem('pubg_saved_pin');
    setWelcomeToast('Logged out. Account unlinked successfully.');
    setTimeout(() => setWelcomeToast(null), 2500);
  };

  // Close all open modal windows
  const closeAllModals = useCallback(() => {
    setIsBookingOpen(false);
    setIsSuccessModalOpen(false);
    setRecentBooking(null);
    setIsDepositOpen(false);
    setIsAdminOpen(false);
    setIsDrawerOpen(false);
    setIsResultsOpen(false);
    setIsFeatureModalOpen(false);
    setIsPinModalOpen(false);
    setIsNoticesModalOpen(false);
  }, []);

  // Hardware Back Button (Android / Browser) & ESC Key Support
  useEffect(() => {
    const handlePopState = () => {
      closeAllModals();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeAllModals();
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeAllModals]);

  // Primary live sync with Firebase RTDB (Immediate, ultra-fast, works across all domains)
  const fetchTournamentData = useCallback(async () => {
    try {
      // 1. Direct authoritative live sync with Firebase Realtime Database for each match
      const [fbTRes, fbErangelRes, fbLivikRes, fbTdmRes, fbFfRes] = await Promise.all([
        fetch('https://pubg-matches-43fa1-default-rtdb.firebaseio.com/tournament/current.json'),
        fetch('https://pubg-matches-43fa1-default-rtdb.firebaseio.com/SeatReservations/PUBG001.json'),
        fetch('https://pubg-matches-43fa1-default-rtdb.firebaseio.com/SeatReservations/LIVIK.json'),
        fetch('https://pubg-matches-43fa1-default-rtdb.firebaseio.com/SeatReservations/TDM.json'),
        fetch('https://pubg-matches-43fa1-default-rtdb.firebaseio.com/SeatReservations/FREE_FIRE.json')
      ]);
      let fbTData: any = null;
      let fbErangelData: any = null;
      let fbLivikData: any = null;
      let fbTdmData: any = null;
      let fbFfData: any = null;

      if (fbTRes.ok) {
        const text = await fbTRes.text();
        if (text && text.trim().startsWith('{')) {
          try { fbTData = JSON.parse(text); } catch {}
        }
      }
      if (fbErangelRes.ok) {
        const text = await fbErangelRes.text();
        if (text && text.trim().startsWith('{')) {
          try { fbErangelData = JSON.parse(text); } catch {}
        }
      }
      if (fbLivikRes.ok) {
        const text = await fbLivikRes.text();
        if (text && text.trim().startsWith('{')) {
          try { fbLivikData = JSON.parse(text); } catch {}
        }
      }
      if (fbTdmRes.ok) {
        const text = await fbTdmRes.text();
        if (text && text.trim().startsWith('{')) {
          try { fbTdmData = JSON.parse(text); } catch {}
        }
      }
      if (fbFfRes.ok) {
        const text = await fbFfRes.text();
        if (text && text.trim().startsWith('{')) {
          try { fbFfData = JSON.parse(text); } catch {}
        }
      }

      if (fbTData || fbErangelData) {
        setErangelTournament(prev => {
          const merged = mergeTournamentWithFirebase(prev, fbTData, fbErangelData);
          localStorage.setItem('pubg_tournament_erangel_v1', JSON.stringify(merged));
          saveStoredTournament(merged);
          return merged;
        });
      }

      if (fbLivikData) {
        setLivikTournament(prev => {
          const merged = mergeTournamentWithFirebase(prev, null, fbLivikData);
          localStorage.setItem('pubg_tournament_livik_v1', JSON.stringify(merged));
          return merged;
        });
      }

      if (fbTdmData) {
        setTdmTournament(prev => {
          const merged = mergeTournamentWithFirebase(prev, null, fbTdmData);
          localStorage.setItem('pubg_tournament_tdm_v1', JSON.stringify(merged));
          return merged;
        });
      }

      if (fbFfData) {
        setFreeFireTournament(prev => {
          const merged = mergeTournamentWithFirebase(prev, null, fbFfData);
          localStorage.setItem('pubg_arena_freefire_tournament_v1', JSON.stringify(merged));
          return merged;
        });
      }

      // 2. Sync all match schedules from Firebase RTDB (/tournaments.json)
      try {
        const matchesRes = await fetch('https://pubg-matches-43fa1-default-rtdb.firebaseio.com/tournaments.json');
        if (matchesRes.ok) {
          const mText = await matchesRes.text();
          if (mText && mText.trim() !== 'null' && mText.trim().startsWith('{')) {
            const mData = JSON.parse(mText);
            if (mData.ERANGEL) {
              setErangelTournament(prev => {
                const u = { ...prev, ...mData.ERANGEL };
                localStorage.setItem('pubg_tournament_erangel_v1', JSON.stringify(u));
                return u;
              });
            }
            if (mData.LIVIK) {
              setLivikTournament(prev => {
                const u = { ...prev, ...mData.LIVIK };
                localStorage.setItem('pubg_tournament_livik_v1', JSON.stringify(u));
                return u;
              });
            }
            if (mData.TDM) {
              setTdmTournament(prev => {
                const u = { ...prev, ...mData.TDM };
                localStorage.setItem('pubg_tournament_tdm_v1', JSON.stringify(u));
                return u;
              });
            }
            if (mData.FREE_FIRE) {
              setFreeFireTournament(prev => {
                const u = { ...prev, ...mData.FREE_FIRE };
                localStorage.setItem('pubg_arena_freefire_tournament_v1', JSON.stringify(u));
                return u;
              });
            }
          }
        }
      } catch {}

      // 3. Safe check against local edge route if available (non-blocking)
      fetch('/api/tournament')
        .then(res => res.text())
        .then(text => {
          if (text && text.trim().startsWith('{')) {
            const data = JSON.parse(text);
            if (data?.paymentAccounts && data.paymentAccounts.length > 0) {
              setPaymentAccounts(data.paymentAccounts);
            }
          }
        })
        .catch(() => {});
    } catch (err) {
      console.warn('Firebase sync warning:', err);
    }
  }, []);

  const handleUpdateMatchSchedule = useCallback((
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
  ) => {
    if (matchId === 'ERANGEL') {
      setErangelTournament(prev => {
        const updated = { ...prev, ...schedule };
        localStorage.setItem('pubg_tournament_erangel_v1', JSON.stringify(updated));
        saveStoredTournament(updated);
        return updated;
      });
    } else if (matchId === 'LIVIK') {
      setLivikTournament(prev => {
        const updated = { ...prev, ...schedule };
        localStorage.setItem('pubg_tournament_livik_v1', JSON.stringify(updated));
        return updated;
      });
    } else if (matchId === 'TDM') {
      setTdmTournament(prev => {
        const updated = { ...prev, ...schedule };
        localStorage.setItem('pubg_tournament_tdm_v1', JSON.stringify(updated));
        return updated;
      });
    } else if (matchId === 'FREE_FIRE') {
      setFreeFireTournament(prev => {
        const updated = { ...prev, ...schedule };
        localStorage.setItem('pubg_arena_freefire_tournament_v1', JSON.stringify(updated));
        return updated;
      });
    }
  }, []);

  useEffect(() => {
    fetchTournamentData();
    const interval = setInterval(fetchTournamentData, 15000);
    return () => clearInterval(interval);
  }, [fetchTournamentData]);


  // Polling user balance if logged in
  useEffect(() => {
    if (savedPubgId) {
      refreshUserBalance(savedPubgId);
      const balInterval = setInterval(() => refreshUserBalance(savedPubgId), 8000);
      return () => clearInterval(balInterval);
    }
  }, [savedPubgId, refreshUserBalance]);

  // When reward / features modal closes, immediately update balance on home page!
  useEffect(() => {
    if (!isFeatureModalOpen && savedPubgId) {
      refreshUserBalance(savedPubgId);
    }
  }, [isFeatureModalOpen, savedPubgId, refreshUserBalance]);

  // When user switches back to browser tab / app window, refresh balance immediately
  useEffect(() => {
    const handleFocus = () => {
      if (savedPubgId) refreshUserBalance(savedPubgId);
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [savedPubgId, refreshUserBalance]);

  // Handle Joining a Seat (Gated behind PUBG ID, Name & 4-Digit PIN)
  const handleJoinSeat = (teamNumber: number, seatNumber: number) => {
    if (!savedPubgId || !savedPlayerName || !savedPin) {
      setPendingAction({ type: 'BOOKING', teamNumber, seatNumber });
      setGateMessage(`🔒 Account Setup Required: Please enter your PUBG ID, Name and 4-Digit Security PIN before booking Team ${teamNumber} Seat ${seatNumber}!`);
      setPinModalReason(`Please enter your PUBG ID, Name & 4-digit PIN to join Team ${teamNumber} Seat ${seatNumber}.`);
      openWithHistory(() => setIsPinModalOpen(true));
      return;
    }

    // Strict duplicate check for Team Death Match (TDM):
    // "Team death match ki entry free rakho eik person sirf eik bar join hoske matlab Same uid se again join na how"
    if (selectedMatch === 'TDM') {
      const isAlreadyRegistered = tdmTournament.teams.some(t =>
        t.seats?.some(s =>
          (s.status === 'APPROVED' || s.status === 'RESERVED_PENDING') &&
          s.playerUid &&
          s.playerUid.trim().toLowerCase() === savedPubgId.trim().toLowerCase()
        )
      );
      if (isAlreadyRegistered) {
        alert(`⚠️ Duplicate Entry Blocked:\n\nYeh PUBG UID (${savedPubgId}) pehle se hi Team Death Match me registered hai!\n\nRules: Team Death Match me eik person / UID sirf eik hi baar join ho sakta hai.`);
        return;
      }
    }

    setBookingTeam(teamNumber);
    setBookingSeat(seatNumber);
    openWithHistory(() => setIsBookingOpen(true));
  };

  // Quick join: picks first available seat (Gated behind PUBG ID, Name & 4-Digit PIN)
  const handleQuickJoin = () => {
    let targetTeam = 2;
    let targetSeat = 3;

    if (tournament) {
      for (const team of tournament.teams) {
        const emptySeat = team.seats.find(s => s.status === 'AVAILABLE');
        if (emptySeat) {
          targetTeam = team.teamNumber;
          targetSeat = emptySeat.seatNumber;
          break;
        }
      }
    }

    if (!savedPubgId || !savedPlayerName || !savedPin) {
      setPendingAction({ type: 'BOOKING', teamNumber: targetTeam, seatNumber: targetSeat });
      setGateMessage('🔒 Account Setup Required: Please enter your PUBG ID, Name and 4-Digit Security PIN before booking a seat!');
      setPinModalReason('Please set your PUBG ID, Name & 4-Digit PIN to quickly reserve your seat.');
      openWithHistory(() => setIsPinModalOpen(true));
      return;
    }

    // Strict duplicate check for Team Death Match (TDM)
    if (selectedMatch === 'TDM' && savedPubgId) {
      const isAlreadyRegistered = tdmTournament.teams.some(t =>
        t.seats?.some(s =>
          (s.status === 'APPROVED' || s.status === 'RESERVED_PENDING') &&
          s.playerUid &&
          s.playerUid.trim().toLowerCase() === savedPubgId.trim().toLowerCase()
        )
      );
      if (isAlreadyRegistered) {
        alert(`⚠️ Duplicate Entry Blocked:\n\nYeh PUBG UID (${savedPubgId}) pehle se hi Team Death Match me registered hai!\n\nRules: Team Death Match me eik person / UID sirf eik hi baar join ho sakta hai.`);
        return;
      }
    }

    handleJoinSeat(targetTeam, targetSeat);
  };

  // Handle Opening Deposit / Payment (Gated behind PUBG ID, Name & 4-Digit PIN)
  const handleOpenDeposit = (explicitUid?: unknown) => {
    const rawUid = (typeof explicitUid === 'string' && explicitUid.trim()) 
      ? explicitUid.trim() 
      : (savedPubgId || '').trim();
    const activeUid = rawUid;
    if (!activeUid || !savedPlayerName || !savedPin) {
      setPendingAction({ type: 'DEPOSIT' });
      setGateMessage('🔒 Account Setup Required: Please enter your PUBG ID, Name and 4-Digit Security PIN before recharging!');
      setPinModalReason('Please set your PUBG ID, Name & 4-Digit PIN first so recharges are credited to your account.');
      openWithHistory(() => setIsPinModalOpen(true));
      return;
    }

    // Auto-copy UID to clipboard for seamless user experience
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(activeUid).catch(() => {});
    }

    // Direct redirect URL with player UID attached in parameters
    const directUrl = `https://fabulous-donut-2c074a.netlify.app/?userId=${encodeURIComponent(activeUid)}&uid=${encodeURIComponent(activeUid)}&pubgId=${encodeURIComponent(activeUid)}`;

    // Execute direct redirection immediately
    try {
      window.location.href = directUrl;
    } catch (err) {
      console.warn('Direct navigation handled by fallback:', err);
    }

    openWithHistory(() => setIsDepositOpen(true));
  };

  // Confirm booking with diamonds
  // Player 1 is automatically booked under the authenticated username and PUBG ID!
  const handleConfirmDiamondBooking = async (
    teamNumber: number,
    seatNumbers: number[],
    players: { pubgId: string; name: string; avatarUrl?: string }[]
  ) => {
    const isFreeFireMatch = (activeGame === 'FREE_FIRE' || selectedMatch === 'FREE_FIRE');
    const isLivikMatch = selectedMatch === 'LIVIK';
    const isTdmMatch = selectedMatch === 'TDM';
    const matchResNode = isFreeFireMatch ? 'FREE_FIRE' : (isLivikMatch ? 'LIVIK' : (isTdmMatch ? 'TDM' : 'PUBG001'));
    const teamMaxSeats = isLivikMatch ? 2 : 4;
    const validSlots = isLivikMatch ? ['1', '2'] : ['1', '2', '3', '4'];
    const costDiamonds = isTdmMatch ? 0 : (seatNumbers.length * 150);
    const activeUid = (savedPubgId || players[0]?.pubgId || '').trim();

    // Strict single-entry & duplicate check for Team Death Match (TDM):
    // "Team death match ki entry free rakho eik person sirf eik bar join hoske matlab Same uid se again join na how"
    if (isTdmMatch) {
      const isAlreadyRegistered = tournament.teams.some(t =>
        t.seats.some(s =>
          (s.status === 'APPROVED' || s.status === 'RESERVED_PENDING') &&
          s.playerUid &&
          s.playerUid.trim().toLowerCase() === activeUid.toLowerCase()
        )
      );
      if (isAlreadyRegistered) {
        alert(`⚠️ Duplicate Entry Blocked:\n\nYeh PUBG UID (${activeUid}) pehle se hi Team Death Match me registered hai!\n\nRules: Team Death Match me eik person / UID sirf eik hi baar join ho sakta hai.`);
        return;
      }
    }

    // 1. Strict Client-Side Balance Guard (only if match is paid)
    if (costDiamonds > 0 && userBalance < costDiamonds) {
      alert(`⚠️ Insufficient Balance!\n\nYou have ${userBalance} 💎, but this booking costs ${costDiamonds} 💎 (${seatNumbers.length} seat(s) × 150 💎).\nShortage: ${costDiamonds - userBalance} 💎.\n\nPlease recharge your account to continue.`);
      handleOpenDeposit(activeUid);
      return;
    }

    // 2. Prepare seats for batch reservation in SeatReservations structure
    const seatsToReserve = seatNumbers.map((sNum, idx) => {
      const player = players[idx] || players[0] || { pubgId: '512999000', name: 'Player' };
      const assignedName = (idx === 0 && savedPlayerName)
        ? savedPlayerName
        : (player.name?.trim() || `Player_${player.pubgId.slice(-4)}`);
      const assignedUid = (idx === 0 && savedPubgId)
        ? savedPubgId
        : player.pubgId.trim();

      return {
        seatNumber: sNum,
        uid: assignedUid,
        playerName: assignedName,
        joinedAt: Date.now()
      };
    });

    try {
      const FIREBASE_DB_URL = 'https://pubg-matches-43fa1-default-rtdb.firebaseio.com';
      let serverConfirmed = false;
      let confirmedBalance = Math.max(0, userBalance - costDiamonds);

      // 1. Try local/edge API endpoint if available (server mode)
      try {
        const res = await fetch('/api/seat-reservations/batch-reserve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tournamentId: tournament.id || 'PUBG001',
            teamNumber,
            bookerUid: activeUid,
            costDiamonds,
            clientBalance: userBalance,
            seats: seatsToReserve
          })
        });

        const text = await res.text();
        if (text && text.trim().startsWith('{')) {
          const data = JSON.parse(text);
          if (res.ok && data?.success) {
            serverConfirmed = true;
            if (typeof data.newBalance === 'number') {
              confirmedBalance = data.newBalance;
            }
          } else if (data?.error && !data.error.includes('Cannot POST')) {
            alert(`⚠️ Booking Failed:\n\n${data.error}`);
            if (typeof data?.currentBalance === 'number') {
              setUserBalance(data.currentBalance);
              saveUserBalance(data.currentBalance);
            }
            return;
          }
        }
      } catch {}

      // 2. Direct Authoritative Firebase RTDB Write (Ensures 100% success on Cloudflare Pages & domain squardwar.site)
      if (!serverConfirmed) {
        // A. Verify and deduct balance in Firebase RTDB (only if paid match)
        if (costDiamonds > 0) {
          let fbUser: any = null;
          try {
            const fbUserRes = await fetch(`${FIREBASE_DB_URL}/users/${encodeURIComponent(activeUid)}.json`);
            if (fbUserRes.ok) {
              const fbUserText = await fbUserRes.text();
              if (fbUserText && fbUserText.trim() !== 'null' && fbUserText.trim().startsWith('{')) {
                fbUser = JSON.parse(fbUserText);
              }
            }
          } catch {}

          const fbBal = (fbUser && typeof fbUser.balance === 'number') ? fbUser.balance : userBalance;
          if (fbBal < costDiamonds) {
            alert(`⚠️ Insufficient Balance in Firebase!\n\nYou have ${fbBal} 💎, but this booking costs ${costDiamonds} 💎.\nPlease recharge your account to continue.`);
            setUserBalance(fbBal);
            saveUserBalance(fbBal);
            handleOpenDeposit(activeUid);
            return;
          }

          const newBal = Math.max(0, fbBal - costDiamonds);
          confirmedBalance = newBal;

          // Save updated user balance to Firebase RTDB
          const updatedUserObj = fbUser ? { ...fbUser, balance: newBal } : {
            uid: activeUid,
            pubgUid: activeUid,
            playerName: savedPlayerName || players[0]?.name || 'Player',
            balance: newBal,
            updatedAt: Date.now()
          };

          await fetch(`${FIREBASE_DB_URL}/users/${encodeURIComponent(activeUid)}.json`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedUserObj)
          });
        } else {
          // Free Entry (Team Death Match)
          confirmedBalance = userBalance;
        }

        // B. Fetch existing team reservation from Firebase RTDB for this specific match
        const teamKey = `TEAM${teamNumber}`;
        let teamData: any = null;
        try {
          const teamRes = await fetch(`${FIREBASE_DB_URL}/SeatReservations/${matchResNode}/${teamKey}.json`);
          if (teamRes.ok) {
            const teamText = await teamRes.text();
            if (teamText && teamText.trim() !== 'null' && teamText.trim().startsWith('{')) {
              teamData = JSON.parse(teamText);
            }
          }
        } catch {}

        if (!teamData) {
          teamData = {
            teamId: teamKey,
            captainUid: null,
            totalSeats: teamMaxSeats,
            reservedSeats: 0,
            members: isLivikMatch ? { '1': null, '2': null } : { '1': null, '2': null, '3': null, '4': null }
          };
        }
        if (!teamData.members) {
          teamData.members = isLivikMatch ? { '1': null, '2': null } : { '1': null, '2': null, '3': null, '4': null };
        }

        // Apply seats
        for (const s of seatsToReserve) {
          const sNum = Number(s.seatNumber);
          if (sNum < 1 || sNum > teamMaxSeats) continue;
          const slotKey = String(sNum);
          const isFirstPlayer = sNum === 1;

          teamData.members[slotKey] = {
            uid: s.uid,
            playerName: s.playerName,
            role: isFirstPlayer ? 'captain' : 'member',
            status: 'reserved',
            joinedAt: s.joinedAt || Date.now()
          };
        }

        let occupied = 0;
        for (const k of validSlots) {
          if (teamData.members[k] !== null && teamData.members[k] !== undefined) occupied++;
        }
        teamData.reservedSeats = occupied;
        if (teamData.members['1']) {
          teamData.captainUid = teamData.members['1'].uid;
        }

        // Write team reservation directly to Firebase RTDB for this match
        await fetch(`${FIREBASE_DB_URL}/SeatReservations/${matchResNode}/${teamKey}.json`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(teamData)
        });

        // Also update PUBG001 if this was Erangel for backwards compatibility
        if (!isFreeFireMatch && !isLivikMatch && !isTdmMatch) {
          fetch(`${FIREBASE_DB_URL}/SeatReservations/PUBG001/${teamKey}.json`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(teamData)
          }).catch(() => {});
        }

        // C. Record receipt in Firebase RTDB /bookings
        const bookingReceiptId = `BKG_${matchResNode}_T${teamNumber}_${Date.now()}`;
        await fetch(`${FIREBASE_DB_URL}/bookings/${bookingReceiptId}.json`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: bookingReceiptId,
            tournamentId: matchResNode,
            teamNumber,
            seats: seatsToReserve,
            bookerUid: activeUid,
            amountPaid: costDiamonds,
            status: 'APPROVED',
            createdAt: Date.now()
          })
        }).catch(() => {});
      }

      setUserBalance(confirmedBalance);
      saveUserBalance(confirmedBalance);

      // Update seats in tournament state
      const updatedTournament: Tournament = {
        ...tournament,
        teams: tournament.teams.map((t) => {
          if (t.teamNumber !== teamNumber) return t;

          let newCaptainUid = t.captainUid;

          const updatedSeats = t.seats.map((seat) => {
            const seatIdx = seatNumbers.indexOf(seat.seatNumber);
            const isFirstSeat = seat.seatNumber === 1;

            if (seatIdx !== -1) {
              const player = players[seatIdx] || players[0] || { pubgId: '512999000', name: 'Player' };
              const assignedName = (seatIdx === 0 && savedPlayerName)
                ? savedPlayerName
                : (player.name?.trim() || `Player_${player.pubgId.slice(-4)}`);
              const assignedUid = (seatIdx === 0 && savedPubgId)
                ? savedPubgId
                : player.pubgId.trim();

              if (isFirstSeat) {
                newCaptainUid = assignedUid;
              }

              return {
                ...seat,
                status: 'APPROVED' as const,
                playerName: assignedName,
                playerUid: assignedUid,
                role: isFirstSeat ? ('captain' as const) : ('member' as const),
                isCaptain: isFirstSeat,
                avatarUrl: player.avatarUrl || '/images/avatars/pubg_avatar_golden_1792656009701.jpg',
                bookingId: `bkg_dm_${Date.now()}`
              };
            }

            return {
              ...seat,
              role: isFirstSeat ? ('captain' as const) : ('member' as const),
              isCaptain: isFirstSeat
            };
          });

          return { 
            ...t, 
            captainUid: newCaptainUid,
            seats: updatedSeats 
          };
        })
      };

      setTournament(updatedTournament);
      if (!isFreeFireMatch && !isLivikMatch && !isTdmMatch) {
        saveStoredTournament(updatedTournament);
      }

      // Show success modal
      const bookingDetails = {
        id: isTdmMatch ? `TDM-BKG-${Date.now().toString().slice(-6)}` : `PUBG-BKG-${Date.now().toString().slice(-6)}`,
        teamNumber,
        seatNumbers,
        amountPkr: isTdmMatch ? 0 : costDiamonds,
        transactionRef: isTdmMatch ? 'FREE ENTRY (0 💎)' : `DIAMOND-DEDUCTION-${costDiamonds}💎`,
        status: 'APPROVED',
        remainingBalance: confirmedBalance
      };

      setRecentBooking(bookingDetails);
      openWithHistory(() => setIsSuccessModalOpen(true));

      // Trigger background sync
      refreshUserBalance(activeUid);
    } catch (err: any) {
      alert(`⚠️ Network Error: ${err.message || 'Failed to connect to tournament server.'}`);
    }
  };

  // Add / Recharge Balance
  const handleAddBalance = (amount: number) => {
    const newBal = userBalance + amount;
    setUserBalance(newBal);
    saveUserBalance(newBal);

    // Sync recharged balance to Firebase RTDB
    if (savedPubgId) {
      fetch('/api/user/update-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pubgUid: savedPubgId, amount, action: 'add' })
      }).catch(() => {});
    }
  };

  // Admin login handler
  const handleAdminLogin = (token: string) => {
    setAdminToken(token);
    try {
      localStorage.setItem('pubg_admin_token', token);
    } catch {}
  };

  const handleAdminLogout = () => {
    setAdminToken(null);
    localStorage.removeItem('pubg_admin_token');
  };

  // Feature modal (Easypaisa style)
  const handleOpenFeature = (tab: FeatureTab) => {
    setFeatureModalTab(tab);
    openWithHistory(() => setIsFeatureModalOpen(true));
  };

  const totalSeats = tournament?.teams?.reduce((acc, t) => acc + (t.seats?.length || 4), 0) || 100;
  const reservedCount = tournament?.teams?.reduce((acc, t) => {
    return acc + (t.seats?.filter(s => s.status === 'APPROVED' || s.status === 'RESERVED_PENDING').length || 0);
  }, 0) || 0;

  return (
    <div className="min-h-screen bg-[#060a12] text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-black">
      {/* 1. TOP NAVIGATION BAR */}
      <Header
        activeGame={activeGame}
        userBalance={userBalance}
        savedPubgId={savedPubgId}
        savedPlayerName={savedPlayerName}
        onSelectGame={(g) => {
          setActiveGame(g);
          setSelectedMatch(null);
        }}
        onOpenMenu={() => openWithHistory(() => setIsDrawerOpen(true))}
        onOpenDeposit={handleOpenDeposit}
        onOpenAdmin={() => openWithHistory(() => setIsAdminOpen(true))}
        isAdminLoggedIn={Boolean(adminToken)}
        onEditPubgId={handleEditPubgId}
      />

      {/* Floating Welcome / Auth Notification */}
      {welcomeToast && (
        <div className="fixed top-16 right-3 sm:right-6 z-50 p-3 sm:p-4 rounded-xl pubg-room-glass border border-amber-500/60 shadow-2xl text-amber-200 text-xs flex items-center gap-2.5 animate-in slide-in-from-top-4 duration-300">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="font-semibold">{welcomeToast}</span>
        </div>
      )}

      {/* 2. MAIN VIEWPORT */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-6 pb-6 sm:pb-8">
        {/* 3 ICON BUTTONS IN EASYPAISA STYLE:
            PUBG: REWARD · NOTICES · REVIEWS
            FREE FIRE: REWARD · CASHOUT · REVIEWS */}
        <SeatCounters
          activeGame={activeGame}
          onOpenReward={() => handleOpenFeature('REWARD')}
          onOpenCashout={() => handleOpenFeature('CASHOUT')}
          onOpenNotices={() => openWithHistory(() => setIsNoticesModalOpen(true))}
          onOpenReviews={() => handleOpenFeature('REVIEWS')}
        />

        {/* =========================================================================
            SCREEN 1: MATCH SELECTION HUB (Images + Full Join Buttons)
            Shown by default when no match is opened yet
           ========================================================================= */}
        {!selectedMatch ? (
          <MatchListSection
            activeGame={activeGame}
            erangelTournament={erangelTournament}
            livikTournament={livikTournament}
            tdmTournament={tdmTournament}
            freeFireTournament={freeFireTournament}
            onSelectPubgMatch={(matchId) => {
              setSelectedMatch(matchId);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onSelectFreeFire={() => {
              setSelectedMatch('FREE_FIRE');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        ) : (
          /* =========================================================================
              SCREEN 2: DEDICATED SEAT RESERVATION VIEW FOR SELECTED MATCH
             ========================================================================= */
          <div className="space-y-4 animate-in fade-in-50 duration-200">
            {/* Top Navigation: Back to Matches Button */}
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => setSelectedMatch(null)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-amber-600/30 hover:from-amber-500/30 hover:to-amber-600/40 text-amber-300 font-heading font-black text-xs uppercase tracking-wider border border-amber-500/50 transition-all cursor-pointer shadow active:scale-95"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Matches</span>
              </button>
            </div>

            {/* HERO BANNER WITH SELECTED MATCH POSTER & COUNTDOWN */}
            <HeroBanner
              tournament={tournament}
              activeGame={activeGame}
              customBannerImage={
                selectedMatch === 'ERANGEL' 
                  ? MATCH_IMAGES.ERANGEL 
                  : selectedMatch === 'LIVIK' 
                    ? MATCH_IMAGES.LIVIK 
                    : selectedMatch === 'TDM' 
                      ? MATCH_IMAGES.TDM 
                      : (activeGame === 'FREE_FIRE' ? MATCH_IMAGES.FREE_FIRE : undefined)
              }
              onQuickJoin={handleQuickJoin}
            />

            {/* ROOM CREDENTIALS / TIMELINE LIFECYCLE BAR */}
            <RoomAccessAlert
              tournament={tournament}
              onOpenResults={() => openWithHistory(() => setIsResultsOpen(true))}
            />

            {/* SEAT RESERVATION SECTION FOR ACTIVE MATCH */}
            <div className="mt-4 mb-8">

              {/* Grid of Teams */}
              <div className={`grid ${selectedMatch === 'TDM' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 lg:grid-cols-2'} gap-4`}>
                {tournament.teams.map((team) => (
                  <TeamCard
                    key={team.id}
                    team={team}
                    onJoinSeat={handleJoinSeat}
                    activeGame={activeGame}
                    isTdm={selectedMatch === 'TDM'}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 3. FOOTER (Google-style Minimal 3-Line Section) */}
      <SocialFooter />

      {/* 4. MODALS */}
      {/* Simple Seat Booking Modal with [-] 1 [+] and dynamic PUBG ID boxes */}
      <BookingModal
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        tournamentId={tournament.id}
        teams={tournament.teams}
        initialTeamNumber={bookingTeam}
        initialSeatNumber={bookingSeat}
        userBalance={userBalance}
        savedPubgId={savedPubgId}
        savedPlayerName={savedPlayerName}
        activeGame={activeGame}
        isTdm={selectedMatch === 'TDM'}
        onConfirmBooking={handleConfirmDiamondBooking}
        onOpenRecharge={handleOpenDeposit}
      />

      {/* Success Modal */}
      <BookingSuccessModal
        isOpen={isSuccessModalOpen}
        booking={recentBooking}
        onClose={() => {
          setIsSuccessModalOpen(false);
          setRecentBooking(null);
        }}
      />

      {/* Admin Portal Modal */}
      <AdminPortalModal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        adminToken={adminToken}
        onLogin={handleAdminLogin}
        onLogout={handleAdminLogout}
        tournament={tournament}
        erangelTournament={erangelTournament}
        livikTournament={livikTournament}
        tdmTournament={tdmTournament}
        freeFireTournament={freeFireTournament}
        initialMatch={selectedMatch || (activeGame === 'FREE_FIRE' ? 'FREE_FIRE' : 'ERANGEL')}
        onRefreshData={fetchTournamentData}
        onNoticeUpdated={fetchActiveNotice}
        onUpdateMatchSchedule={handleUpdateMatchSchedule}
      />

      {/* Results & Leaderboard Modal */}
      <ResultsModal
        isOpen={isResultsOpen}
        onClose={() => setIsResultsOpen(false)}
      />

      {/* Drawer Menu */}
      <DrawerMenu
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        tournament={tournament}
        savedPubgId={savedPubgId}
        savedPlayerName={savedPlayerName}
        userBalance={userBalance}
        onOpenResults={() => openWithHistory(() => setIsResultsOpen(true))}
        onOpenAdmin={() => openWithHistory(() => setIsAdminOpen(true))}
        onClearPubgId={handleClearPubgId}
        onEditPubgId={handleEditPubgId}
      />

      {/* Easypaisa-style features modal (REWARD, NOTICES, REVIEWS) */}
      <TournamentFeaturesModal
        isOpen={isFeatureModalOpen}
        onClose={() => {
          setIsFeatureModalOpen(false);
          refreshUserBalance();
        }}
        initialTab={featureModalTab}
        savedPubgId={savedPubgId}
        savedPlayerName={savedPlayerName}
        userBalance={userBalance}
        onRefreshUserBalance={() => refreshUserBalance()}
        onOpenDeposit={handleOpenDeposit}
        totalReservedSeats={reservedCount}
        activeGame={activeGame}
        erangelTournament={erangelTournament}
        livikTournament={livikTournament}
        tdmTournament={tdmTournament}
        freeFireTournament={freeFireTournament}
      />

      {/* PIN Authentication & Profile Modal (Prompts for PUBG ID, Name & 4-Digit PIN when required) */}
      <PinAuthModal
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
        reason={pinModalReason}
        onAuthenticate={handleSaveProfileWithPin}
        initialPubgId={savedPubgId}
        initialPlayerName={savedPlayerName}
      />

      {/* Notices & Official Guidelines Modal */}
      <NoticesModal
        isOpen={isNoticesModalOpen}
        onClose={() => setIsNoticesModalOpen(false)}
        notice={activeNotice}
      />
    </div>
  );
}
