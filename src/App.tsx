import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { HeroBanner } from './components/HeroBanner';
import { SeatCounters } from './components/SeatCounters';
import { RoomAccessAlert } from './components/RoomAccessAlert';
import { TeamCard } from './components/TeamCard';
import { BookingModal } from './components/BookingModal';
import { BookingSuccessModal } from './components/BookingSuccessModal';
import { LookupModal } from './components/LookupModal';
import { AdminPortalModal } from './components/AdminPortalModal';
import { AdminOnScreenPanel } from './components/AdminOnScreenPanel';
import { ResultsModal } from './components/ResultsModal';
import { DepositModal } from './components/DepositModal';
import { DrawerMenu } from './components/DrawerMenu';
import { PinAuthModal } from './components/PinAuthModal';
import { TournamentFeaturesModal, FeatureTab } from './components/TournamentFeaturesModal';
import { NoticeBanner, NoticeData } from './components/NoticeBanner';
import { NoticesModal } from './components/NoticesModal';
import { InstallAppModal } from './components/InstallAppModal';
import { Tournament, GameType, PaymentAccount } from './types/tournament';
import { 
  loadStoredTournament, 
  saveStoredTournament, 
  loadUserBalance, 
  saveUserBalance,
  defaultPaymentAccounts,
  mergeTournamentWithFirebase
} from './utils/storage';
import { Sparkles } from 'lucide-react';

export default function App() {
  const [activeGame, setActiveGame] = useState<GameType>('PUBG');
  
  // Initialize with local stored tournament (25 teams + requested players) so it NEVER fails on render!
  const [tournament, setTournament] = useState<Tournament>(() => loadStoredTournament());
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

  const [isLookupOpen, setIsLookupOpen] = useState(false);
  const [lookupQuery, setLookupQuery] = useState('');

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

  // PWA Install State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);

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

  useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
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
    setIsLookupOpen(false);
    setIsAdminOpen(false);
    setIsDrawerOpen(false);
    setIsResultsOpen(false);
    setIsFeatureModalOpen(false);
    setIsPinModalOpen(false);
    setIsNoticesModalOpen(false);
    setIsInstallModalOpen(false);
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
      // 1. Direct authoritative live sync with Firebase Realtime Database
      const [fbTRes, fbRRes] = await Promise.all([
        fetch('https://pubg-matches-43fa1-default-rtdb.firebaseio.com/tournament/current.json'),
        fetch('https://pubg-matches-43fa1-default-rtdb.firebaseio.com/SeatReservations/PUBG001.json')
      ]);
      let fbTData: any = null;
      let fbRData: any = null;
      if (fbTRes.ok) {
        const tText = await fbTRes.text();
        if (tText && tText.trim() !== 'null' && tText.trim().startsWith('{')) {
          try { fbTData = JSON.parse(tText); } catch {}
        }
      }
      if (fbRRes.ok) {
        const rText = await fbRRes.text();
        if (rText && rText.trim() !== 'null' && rText.trim().startsWith('{')) {
          try { fbRData = JSON.parse(rText); } catch {}
        }
      }

      if (fbTData || fbRData) {
        setTournament(prev => {
          const merged = mergeTournamentWithFirebase(prev, fbTData, fbRData);
          saveStoredTournament(merged);
          return merged;
        });
      }

      // 2. Safe check against local edge route if available (non-blocking)
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
    const costDiamonds = seatNumbers.length * 150;
    const activeUid = (savedPubgId || players[0]?.pubgId || '').trim();

    // 1. Strict Client-Side Balance Guard
    if (userBalance < costDiamonds) {
      alert(`⚠️ Insufficient Balance!\n\nYou have ${userBalance} 💎, but this booking costs ${costDiamonds} 💎 (${seatNumbers.length} seat(s) × 150 💎).\nShortage: ${costDiamonds - userBalance} 💎.\n\nPlease recharge your account to continue.`);
      handleOpenDeposit(activeUid);
      return;
    }

    // 2. Prepare seats for batch reservation in SeatReservations structure
    const seatsToReserve = seatNumbers.map((sNum, idx) => {
      const player = players[idx] || { pubgId: '512999000', name: 'Player' };
      const assignedName = (idx === 0 && savedPlayerName)
        ? savedPlayerName
        : (player.name.trim() || `Player_${player.pubgId.slice(-4)}`);
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
        // A. Verify and deduct balance in Firebase RTDB
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

        // B. Fetch existing team reservation from Firebase RTDB
        const teamKey = `TEAM${teamNumber}`;
        let teamData: any = null;
        try {
          const teamRes = await fetch(`${FIREBASE_DB_URL}/SeatReservations/PUBG001/${teamKey}.json`);
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
            totalSeats: 4,
            reservedSeats: 0,
            members: { '1': null, '2': null, '3': null, '4': null }
          };
        }
        if (!teamData.members) {
          teamData.members = { '1': null, '2': null, '3': null, '4': null };
        }

        // Apply seats
        for (const s of seatsToReserve) {
          const sNum = Number(s.seatNumber);
          if (sNum < 1 || sNum > 4) continue;
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
        for (const k of ['1', '2', '3', '4']) {
          if (teamData.members[k] !== null && teamData.members[k] !== undefined) occupied++;
        }
        teamData.reservedSeats = occupied;
        if (teamData.members['1']) {
          teamData.captainUid = teamData.members['1'].uid;
        }

        // Write team reservation directly to Firebase RTDB
        await fetch(`${FIREBASE_DB_URL}/SeatReservations/PUBG001/${teamKey}.json`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(teamData)
        });

        // C. Record receipt in Firebase RTDB /bookings
        const bookingReceiptId = `BKG_PUBG001_T${teamNumber}_${Date.now()}`;
        await fetch(`${FIREBASE_DB_URL}/bookings/${bookingReceiptId}.json`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: bookingReceiptId,
            tournamentId: 'PUBG001',
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
              const player = players[seatIdx] || { pubgId: '512999000', name: 'Player' };
              const assignedName = (seatIdx === 0 && savedPlayerName)
                ? savedPlayerName
                : (player.name.trim() || `Player_${player.pubgId.slice(-4)}`);
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
      saveStoredTournament(updatedTournament);

      // Show success modal
      const bookingDetails = {
        id: `PUBG-BKG-${Date.now().toString().slice(-6)}`,
        teamNumber,
        seatNumbers,
        amountPkr: costDiamonds,
        transactionRef: `DIAMOND-DEDUCTION-${costDiamonds}💎`,
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
        onSelectGame={(g) => setActiveGame(g)}
        onOpenMenu={() => openWithHistory(() => setIsDrawerOpen(true))}
        onOpenDeposit={handleOpenDeposit}
        onOpenAdmin={() => openWithHistory(() => setIsAdminOpen(true))}
        isAdminLoggedIn={Boolean(adminToken)}
        onEditPubgId={handleEditPubgId}
        onOpenBookings={() => openWithHistory(() => setIsDrawerOpen(true))}
        onOpenInstallApp={() => openWithHistory(() => setIsInstallModalOpen(true))}
      />

      {/* Floating Welcome / Auth Notification */}
      {welcomeToast && (
        <div className="fixed top-16 right-3 sm:right-6 z-50 p-3 sm:p-4 rounded-xl pubg-room-glass border border-amber-500/60 shadow-2xl text-amber-200 text-xs flex items-center gap-2.5 animate-in slide-in-from-top-4 duration-300">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="font-semibold">{welcomeToast}</span>
        </div>
      )}

      {/* 2. MAIN VIEWPORT */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-6">
        {/* Free Fire Notice */}
        {activeGame === 'FREE_FIRE' && (
          <div className="mb-4 p-3 rounded-xl bg-orange-950/40 border border-orange-500/50 flex items-center justify-between text-xs text-orange-200">
            <span>Free Fire Clash Squad Tournament will open registration after PUBG Mobile Squad round concludes.</span>
            <button
              onClick={() => setActiveGame('PUBG')}
              className="font-bold underline text-amber-400 hover:text-white"
            >
              Switch to PUBG
            </button>
          </div>
        )}

        {/* HERO BANNER WITH TOURNAMENT POSTER */}
        <HeroBanner
          tournament={tournament}
          onOpenLookup={() => openWithHistory(() => setIsLookupOpen(true))}
          onQuickJoin={handleQuickJoin}
        />

        {/* ROOM CREDENTIALS / TIMELINE LIFECYCLE BAR */}
        <RoomAccessAlert
          tournament={tournament}
          onOpenLookup={() => openWithHistory(() => setIsLookupOpen(true))}
          onOpenResults={() => openWithHistory(() => setIsResultsOpen(true))}
        />

        {/* 3 ICON BUTTONS IN EASYPAISA STYLE (REWARD · NOTICES · REVIEWS) */}
        <SeatCounters
          onOpenReward={() => handleOpenFeature('REWARD')}
          onOpenNotices={() => openWithHistory(() => setIsNoticesModalOpen(true))}
          onOpenReviews={() => handleOpenFeature('REVIEWS')}
        />

        {/* 25 SQUADS & SEAT RESERVATION SECTION */}
        <div className="mt-4 mb-8">
          {/* Header row with Right-Side Reserved Seats Label */}
          <div className="flex items-center justify-end gap-2 mb-3 px-1">
            {/* RIGHT SIDE RESERVED COUNT LABEL */}
            <div className="flex items-center gap-2 bg-gradient-to-r from-slate-900/90 to-slate-800/90 border border-slate-700/80 rounded-full px-3.5 py-1 shadow-md">
              <span className="text-[11px] font-medium text-slate-400">Seats Reserved:</span>
              <span className="text-xs font-black font-heading tracking-wide text-amber-400">
                {reservedCount} <span className="text-slate-500 font-normal">/ {totalSeats}</span>
              </span>
            </div>
          </div>

          {/* 2-Column Grid of All 25 Teams */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {tournament.teams.map((team) => (
              <TeamCard
                key={team.id}
                team={team}
                onJoinSeat={handleJoinSeat}
              />
            ))}
          </div>
        </div>
      </main>

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
        onOpenLookup={(trx) => {
          setIsSuccessModalOpen(false);
          setRecentBooking(null);
          setLookupQuery(trx);
          openWithHistory(() => setIsLookupOpen(true));
        }}
      />

      {/* Lookup & Reveal Credentials Modal */}
      <LookupModal
        isOpen={isLookupOpen}
        onClose={() => {
          setIsLookupOpen(false);
          setLookupQuery('');
        }}
        initialQuery={lookupQuery}
      />

      {/* Admin Portal Modal */}
      <AdminPortalModal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        adminToken={adminToken}
        onLogin={handleAdminLogin}
        onLogout={handleAdminLogout}
        tournament={tournament}
        onRefreshData={fetchTournamentData}
        onNoticeUpdated={fetchActiveNotice}
      />

      {/* Results & Leaderboard Modal */}
      <ResultsModal
        isOpen={isResultsOpen}
        onClose={() => setIsResultsOpen(false)}
      />

      {/* Recharge Account Modal / Gateway (Redirects to https://fabulous-donut-2c074a.netlify.app/ with UID) */}
      <DepositModal
        isOpen={isDepositOpen}
        onClose={() => {
          setIsDepositOpen(false);
          refreshUserBalance();
        }}
        currentBalance={userBalance}
        pubgUid={savedPubgId}
        playerName={savedPlayerName}
        onBalanceUpdated={(newBal) => {
          setUserBalance(newBal);
          saveUserBalance(newBal);
        }}
      />

      {/* Drawer Menu */}
      <DrawerMenu
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        tournament={tournament}
        savedPubgId={savedPubgId}
        savedPlayerName={savedPlayerName}
        userBalance={userBalance}
        onOpenLookup={() => openWithHistory(() => setIsLookupOpen(true))}
        onOpenResults={() => openWithHistory(() => setIsResultsOpen(true))}
        onOpenAdmin={() => openWithHistory(() => setIsAdminOpen(true))}
        onClearPubgId={handleClearPubgId}
        onEditPubgId={handleEditPubgId}
        onOpenInstallApp={() => openWithHistory(() => setIsInstallModalOpen(true))}
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

      {/* Squard War PWA Install Modal */}
      <InstallAppModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
        deferredPrompt={deferredPrompt}
      />
    </div>
  );
}
