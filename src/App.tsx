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
  defaultPaymentAccounts 
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
      const data = await res.json();
      if (data?.success && data?.notice) {
        setActiveNotice(data.notice);
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
        const data = await res.json();
        if (data.success && data.user) {
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

  // Real-time Balance Sync: auto-refresh when player returns from external payment portal
  useEffect(() => {
    const handleWindowFocus = () => {
      const activeUid = localStorage.getItem('pubg_saved_uid');
      if (activeUid) {
        fetch(`/api/user/balance?pubgUid=${encodeURIComponent(activeUid)}`)
          .then(res => res.json())
          .then(data => {
            if (data?.success && typeof data.balance === 'number') {
              setUserBalance(data.balance);
              saveUserBalance(data.balance);
            }
          })
          .catch(() => {});
      }
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
  }, []);

  // Primary PIN-protected Profile Authentication Handler
  const handleSaveProfileWithPin = async (uid: string, name: string, pin: string) => {
    const cleanUid = uid.trim();
    const cleanName = name.trim();
    const cleanPin = pin.trim();

    try {
      const res = await fetch('/api/user/pin-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pubgUid: cleanUid, playerName: cleanName, pin: cleanPin })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Authentication failed. Please verify your PIN.' };
      }

      const activeName = data.user?.playerName || cleanName;
      setSavedPubgId(cleanUid);
      setSavedPlayerName(activeName);
      setSavedPin(cleanPin);

      localStorage.setItem('pubg_saved_uid', cleanUid);
      localStorage.setItem('pubg_saved_name', activeName);
      localStorage.setItem('pubg_saved_pin', cleanPin);

      setIsEditingPubgId(false);
      setIsPinModalOpen(false);
      setGateMessage(null);

      if (typeof data.user?.balance === 'number') {
        setUserBalance(data.user.balance);
        saveUserBalance(data.user.balance);
      }

      setWelcomeToast(`Access Granted! Welcome ${activeName}. Balance: ${data.user?.balance || 0} 💎`);
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
      return { success: false, error: err.message || 'Network error connecting to Firebase.' };
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

  // Safe background sync with backend API (with graceful fallback to stored state)
  const fetchTournamentData = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const res = await fetch('/api/tournament', { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data.tournament && Array.isArray(data.tournament.teams) && data.tournament.teams.length >= 25) {
          setTournament(data.tournament);
          saveStoredTournament(data.tournament);
        }
        if (data.paymentAccounts && data.paymentAccounts.length > 0) {
          setPaymentAccounts(data.paymentAccounts);
        }
      }
    } catch {
      // Graceful fallback to local stored tournament
    }
  }, []);

  useEffect(() => {
    fetchTournamentData();
    const interval = setInterval(fetchTournamentData, 15000);
    return () => clearInterval(interval);
  }, [fetchTournamentData]);

  // Dedicated fast user balance refresh from Firebase RTDB (so returning from reward section updates immediately!)
  const refreshUserBalance = useCallback(async (explicitUid?: string) => {
    const targetUid = (explicitUid || savedPubgId || '').trim();
    if (!targetUid) return;

    try {
      const res = await fetch(`/api/user/balance?pubgUid=${encodeURIComponent(targetUid)}&t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && typeof data.balance === 'number') {
          setUserBalance(data.balance);
          saveUserBalance(data.balance);
        }
      }
    } catch (err) {
      console.warn('Error refreshing user balance:', err);
    }
  }, [savedPubgId]);

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
      // 3. Server-Side Atomic Balance Check and Deduction in Firebase RTDB
      const res = await fetch('/api/seat-reservations/batch-reserve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tournamentId: tournament.id || 'PUBG001',
          teamNumber,
          bookerUid: activeUid,
          costDiamonds,
          seats: seatsToReserve
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        alert(`⚠️ Booking Failed:\n\n${data.error || 'Insufficient balance or booking error.'}`);
        if (typeof data.currentBalance === 'number') {
          setUserBalance(data.currentBalance);
          saveUserBalance(data.currentBalance);
        }
        handleOpenDeposit(activeUid);
        return;
      }

      // Confirmed new balance from server
      const confirmedBalance = (typeof data.newBalance === 'number') 
        ? data.newBalance 
        : Math.max(0, userBalance - costDiamonds);

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
    localStorage.getItem('pubg_admin_token');
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
        {/* TOP NOTICE BANNER (take users use follow kree Oper notifications nazar aae) */}
        <NoticeBanner
          notice={activeNotice}
          onOpenNoticeModal={() => openWithHistory(() => setIsNoticesModalOpen(true))}
        />

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

        {/* SQUARD WAR BRAND TITLE BAR (Positioned where user marked green, fixing top bar cut-off) */}
        <div className="mb-3.5 flex items-center justify-between p-2.5 sm:p-3 rounded-2xl bg-gradient-to-r from-[#170e08]/95 via-[#21140c]/95 to-[#170e08]/95 border border-amber-600/40 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-600 via-amber-400 to-amber-700 p-0.5 shadow-md flex items-center justify-center">
              <span className="text-black font-black font-heading text-sm">S</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-heading text-lg sm:text-xl font-black tracking-wider text-white uppercase leading-none">
                  SQUARD<span className="text-amber-400">WAR</span>
                </h1>
                <span className="px-1.5 py-0.2 rounded bg-amber-500/20 border border-amber-500/40 text-[9px] font-mono text-amber-300 font-bold uppercase">
                  Official
                </span>
              </div>
              <span className="text-[10px] text-amber-300/70 font-mono tracking-widest block mt-0.5">
                squardwar.site
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] text-amber-400/90 font-mono bg-black/40 px-2.5 py-1 rounded-xl border border-amber-800/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="hidden sm:inline">LIVE TOURNAMENT SLOTS</span>
            <span className="sm:hidden">LIVE SLOTS</span>
          </div>
        </div>

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
          <div className="flex items-center justify-between gap-2 mb-3 px-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-200 font-heading">
                Squad Registrations
              </h2>
            </div>
            
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
