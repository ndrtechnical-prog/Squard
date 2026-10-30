import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Maximize2, 
  Copy, 
  Check, 
  Clock, 
  Key, 
  Hash, 
  Play, 
  X,
  Youtube,
  ExternalLink,
  Radio,
  Trophy,
  Calendar,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Flame,
  BellRing
} from 'lucide-react';
import { Tournament, TournamentStatus } from '../types/tournament';

interface HeroBannerProps {
  tournament: Tournament | null;
  onOpenLookup: () => void;
  onQuickJoin: () => void;
}

export interface BannerSlide {
  id: string;
  imageUrl: string;
  alt: string;
  isComingSoon?: boolean;
}

const BANNER_SLIDES: BannerSlide[] = [
  {
    id: 'active_championship',
    imageUrl: 'https://pub-f2dfd2610ba84b708d63b5ff463d0490.r2.dev/Images/file_00000000afa4820a999d77e1bf565969.png',
    alt: 'PUBG Mobile Tournament Active Poster',
    isComingSoon: false
  },
  {
    id: 'coming_soon_championship',
    imageUrl: 'https://pub-f2dfd2610ba84b708d63b5ff463d0490.r2.dev/Images/file_00000000560881f4be40c9c8b3189a56.png',
    alt: 'PUBG Mobile Upcoming Tournament',
    isComingSoon: true
  }
];

const DEFAULT_YOUTUBE_STREAM_URL = 'https://youtube.com/@flaregunpk?si=NycZ9BwNyELH405i';

export function getTodayKarachiDate(): string {
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
}

const DEFAULT_MATCH_TIME = '11:00';
const DEFAULT_ROOM_ID = '69151604';
const DEFAULT_PASSWORD = '1234';

// Helper: Calculate timestamp in Asia/Karachi (UTC+5)
export function parseKarachiTimestamp(dateStr?: string, timeStr?: string): number {
  let cleanDate = (dateStr || '').trim();
  let rawTime = (timeStr || '').trim();

  if (!rawTime) rawTime = DEFAULT_MATCH_TIME;
  if (!cleanDate) cleanDate = getTodayKarachiDate();

  // Support 12-hour AM/PM formats e.g. "11:00 PM", "2:30 am", "04:15 pm"
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
}

// Helper: Format date & time in Asia/Karachi timezone
function formatKarachiDateTime(timestamp: number): string {
  try {
    return new Intl.DateTimeFormat('en-PK', {
      timeZone: 'Asia/Karachi',
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(new Date(timestamp)) + ' (PKT)';
  } catch {
    return new Date(timestamp).toLocaleString() + ' (PKT)';
  }
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  tournament,
  onOpenLookup,
  onQuickJoin
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [imagesLoaded, setImagesLoaded] = useState<Record<number, boolean>>({});
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Authoritative server clock offset
  const serverOffsetRef = useRef<number>(0);
  useEffect(() => {
    if (tournament?.serverTime) {
      serverOffsetRef.current = tournament.serverTime - Date.now();
    }
  }, [tournament?.serverTime]);

  const getServerNow = () => Date.now() + serverOffsetRef.current;

  // Active match configuration (recalculates dynamically whenever tournament matchDate or matchTime updates)
  const matchStartTime = (tournament?.matchDate && tournament?.matchTime)
    ? parseKarachiTimestamp(tournament.matchDate, tournament.matchTime)
    : (typeof tournament?.matchStartTime === 'number' && tournament.matchStartTime > 0
        ? tournament.matchStartTime
        : parseKarachiTimestamp(getTodayKarachiDate(), DEFAULT_MATCH_TIME));

  const roomEndTime = matchStartTime + 15 * 60 * 1000; // +15 mins (11:15 AM)
  const matchEndTime = matchStartTime + 60 * 60 * 1000; // +60 mins / 1 Hour (12:00 PM)

  // Time remaining state
  const [countdownState, setCountdownState] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isMatchTimeReached: false
  });

  // 15-minute room window remaining seconds
  const [roomWindowSecondsLeft, setRoomWindowSecondsLeft] = useState<number>(15 * 60);

  // Copy feedback
  const [copiedId, setCopiedId] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);

  // Auto-swipe carousel timer (5 seconds)
  useEffect(() => {
    if (isPaused) return;

    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % BANNER_SLIDES.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [isPaused]);

  const handlePrevSlide = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCurrentSlide((prev) => (prev === 0 ? BANNER_SLIDES.length - 1 : prev - 1));
  }, []);

  const handleNextSlide = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCurrentSlide((prev) => (prev + 1) % BANNER_SLIDES.length);
  }, []);

  // Master Clock & Phase Calculation
  useEffect(() => {
    const tick = () => {
      const now = getServerNow();

      // 1. Before Match Countdown
      const diffToStart = matchStartTime - now;
      if (diffToStart <= 0) {
        setCountdownState({ days: 0, hours: 0, minutes: 0, seconds: 0, isMatchTimeReached: true });
      } else {
        const days = Math.floor(diffToStart / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diffToStart % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diffToStart % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diffToStart % (1000 * 60)) / 1000);
        setCountdownState({ days, hours, minutes, seconds, isMatchTimeReached: false });
      }

      // 2. 15-Minute Room Window Timer
      const diffToEndWindow = roomEndTime - now;
      if (diffToEndWindow > 0 && diffToStart <= 0) {
        setRoomWindowSecondsLeft(Math.floor(diffToEndWindow / 1000));
      } else {
        setRoomWindowSecondsLeft(0);
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [matchStartTime, roomEndTime]);

  // Determine current lifecycle phase
  type MatchPhase = 'BEFORE_MATCH' | 'ROOM_WINDOW' | 'MATCH_LIVE' | 'MATCH_ENDED';

  const getPhase = (): MatchPhase => {
    if (tournament?.manualStatus === 'LIVE') return 'MATCH_LIVE';
    if (tournament?.manualStatus === 'COMPLETED') return 'MATCH_ENDED';

    const now = getServerNow();
    if (now < matchStartTime) return 'BEFORE_MATCH';
    if (now >= matchStartTime && now < roomEndTime) return 'ROOM_WINDOW';
    if (now >= roomEndTime && now < matchEndTime) return 'MATCH_LIVE';
    return 'MATCH_ENDED';
  };

  const phase = getPhase();

  // Active credentials
  const activeRoomId = (tournament?.roomId || DEFAULT_ROOM_ID).trim();
  const activePassword = (tournament?.roomPassword || DEFAULT_PASSWORD).trim();
  const liveStreamUrl = (tournament?.youtubeUrl || DEFAULT_YOUTUBE_STREAM_URL).trim();

  // Formatted room window countdown (MM:SS)
  const joinMin = Math.floor(roomWindowSecondsLeft / 60);
  const joinSec = roomWindowSecondsLeft % 60;

  // Copy helper
  const handleCopy = (text: string, type: 'id' | 'pass') => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
    if (type === 'id') {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } else {
      setCopiedPass(true);
      setTimeout(() => setCopiedPass(false), 2000);
    }
  };

  const activeSlideData = BANNER_SLIDES[currentSlide];

  return (
    <div className="w-full my-3">
      {/* Main Tournament Banner Container */}
      <div 
        className="relative w-full rounded-2xl overflow-hidden border border-amber-600/40 shadow-[0_0_35px_rgba(217,119,6,0.25)] bg-[#100c08] group"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        
        {/* Top Floating Controls (Slide Indicator + Maximize View) */}
        <div className="absolute top-3 right-3 z-30 flex items-center gap-2">
          {/* Slide Indicator Badge */}
          <div className="px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-md border border-amber-500/40 text-[10px] font-mono font-bold text-amber-300">
            {currentSlide + 1} / {BANNER_SLIDES.length}
          </div>

          <button
            onClick={() => setIsFullscreen(true)}
            title="View Full Poster"
            className="w-8 h-8 rounded-lg bg-black/80 hover:bg-amber-600 text-amber-200 hover:text-white border border-amber-600/50 backdrop-blur-md flex items-center justify-center transition-all cursor-pointer shadow-lg"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

        {/* Carousel Prev/Next Buttons */}
        <button
          onClick={handlePrevSlide}
          aria-label="Previous Slide"
          className="absolute left-2.5 top-1/2 -translate-y-1/2 z-30 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-black/75 hover:bg-amber-600/90 text-amber-200 hover:text-white border border-amber-500/40 backdrop-blur-md flex items-center justify-center transition-all cursor-pointer opacity-80 group-hover:opacity-100 shadow-xl active:scale-95"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <button
          onClick={handleNextSlide}
          aria-label="Next Slide"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 z-30 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-black/75 hover:bg-amber-600/90 text-amber-200 hover:text-white border border-amber-500/40 backdrop-blur-md flex items-center justify-center transition-all cursor-pointer opacity-80 group-hover:opacity-100 shadow-xl active:scale-95"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Cloudflare R2 Tournament Poster Images Carousel */}
        <div className="relative w-full aspect-[16/10] sm:aspect-[21/10] md:aspect-[16/8] max-h-[480px] overflow-hidden bg-black flex items-center justify-center">
          {BANNER_SLIDES.map((slide, index) => {
            const isLoaded = imagesLoaded[index];
            const isActive = currentSlide === index;

            return (
              <div
                key={slide.id}
                className={`absolute inset-0 transition-opacity duration-700 ease-in-out flex items-center justify-center ${
                  isActive ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'
                }`}
              >
                {!isLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center bg-[#18120d] animate-pulse text-amber-400/60 text-xs font-mono">
                    Loading Tournament Poster...
                  </div>
                )}

                <img
                  src={slide.imageUrl}
                  alt={slide.alt}
                  onLoad={() => setImagesLoaded(prev => ({ ...prev, [index]: true }))}
                  className={`w-full h-full object-cover sm:object-contain object-center transition-opacity duration-500 ${
                    isLoaded ? 'opacity-100' : 'opacity-0'
                  }`}
                />

                {/* Bottom-to-Top Gradient Shade Overlay on Image */}
                <div className="absolute inset-x-0 bottom-0 h-48 sm:h-56 bg-gradient-to-t from-black via-black/95 to-transparent pointer-events-none" />

                {/* SLIDE 2: COMING SOON BADGE / BUTTON OVERLAY */}
                {slide.isComingSoon && isActive && (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-4 bg-black/35 backdrop-blur-[1px]">
                    <div className="flex flex-col items-center text-center space-y-3 animate-in zoom-in-95 duration-300">
                      
                      {/* Pulsing Glow Ring */}
                      <div className="relative group/btn">
                        <div className="absolute -inset-1 bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-700 rounded-2xl blur opacity-75 group-hover/btn:opacity-100 animate-pulse transition duration-500" />
                        
                        {/* Prominent Coming Soon Button */}
                        <div className="relative px-6 sm:px-9 py-3 sm:py-4 rounded-xl bg-gradient-to-r from-[#2a1708] via-[#1a0e05] to-[#2a1708] border-2 border-amber-400/90 text-white shadow-[0_0_35px_rgba(245,158,11,0.6)] flex items-center gap-2.5 select-none">
                          <Flame className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400 animate-bounce" />
                          <span className="font-heading font-black text-lg sm:text-2xl tracking-widest uppercase text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-white to-amber-300 drop-shadow-[0_2px_10px_rgba(245,158,11,0.9)]">
                            Coming Soon
                          </span>
                          <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300 animate-spin" style={{ animationDuration: '4s' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* OVERLAY CONTENT (Active Match Countdown / Room Info - Shown on Slide 0) */}
          {currentSlide === 0 && (
            <div className="absolute inset-x-0 bottom-0 p-3 sm:p-5 z-20 flex flex-col gap-2.5 pointer-events-auto">
              
              {/* Header Line: Label / Status + Asia/Karachi Time Indicator */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {phase === 'MATCH_ENDED' ? (
                    <>
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                      <span className="w-2 h-2 rounded-full bg-amber-400 -ml-3.5" />
                      <span className="font-heading text-sm sm:text-base md:text-lg font-black tracking-wider uppercase text-amber-300 drop-shadow-[0_2px_8px_rgba(245,158,11,0.8)]">
                        Match Status
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/50 text-[10px] font-black uppercase text-amber-300 tracking-wider">
                        CONCLUDED
                      </span>
                    </>
                  ) : phase === 'MATCH_LIVE' ? (
                    <>
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                      <span className="w-2 h-2 rounded-full bg-red-500 -ml-3.5" />
                      <span className="font-heading text-sm sm:text-base md:text-lg font-black tracking-wider uppercase text-red-400 drop-shadow-[0_2px_8px_rgba(239,68,68,0.8)]">
                        Match Live Stream
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-red-600/90 text-[10px] font-black uppercase text-white tracking-widest animate-pulse">
                        LIVE
                      </span>
                    </>
                  ) : phase === 'ROOM_WINDOW' ? (
                    <>
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                      <span className="w-2 h-2 rounded-full bg-emerald-400 -ml-3.5" />
                      <span className="font-heading text-sm sm:text-base md:text-lg font-black tracking-wider uppercase text-emerald-300 drop-shadow-[0_2px_8px_rgba(16,185,129,0.8)]">
                        Room Access Window
                      </span>
                      <span className="text-[10px] sm:text-xs font-mono text-emerald-300/80 hidden sm:inline">
                        (15 Minutes to Join)
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                      <span className="w-2 h-2 rounded-full bg-amber-400 -ml-3.5" />
                      <span className="font-heading text-sm sm:text-base md:text-lg font-black tracking-wider uppercase text-amber-300 drop-shadow-[0_2px_8px_rgba(245,158,11,0.8)]">
                        Room ID Count Down
                      </span>
                      <span className="text-[10px] sm:text-xs font-mono text-amber-200/80 hidden sm:inline">
                        ({formatKarachiDateTime(matchStartTime)})
                      </span>
                    </>
                  )}
                </div>

                {/* Status Badge */}
                <div className="flex items-center gap-2">
                  {phase === 'MATCH_ENDED' ? (
                    <span className="px-2.5 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/60 text-amber-300 text-[11px] font-bold flex items-center gap-1.5 shadow">
                      <Trophy className="w-3.5 h-3.5 text-amber-400" />
                      <span>Reward Processing</span>
                    </span>
                  ) : phase === 'MATCH_LIVE' ? (
                    <span className="px-2.5 py-0.5 rounded-md bg-red-600/30 border border-red-500/80 text-red-200 text-[11px] font-bold flex items-center gap-1.5 shadow">
                      <Radio className="w-3.5 h-3.5 text-red-400 animate-pulse" />
                      <span>Match In Progress</span>
                    </span>
                  ) : phase === 'ROOM_WINDOW' ? (
                    <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-950/70 border border-emerald-500/60 text-emerald-300 text-[11px] font-bold shadow">
                      <Clock className="w-3.5 h-3.5 text-emerald-400 animate-spin" style={{ animationDuration: '6s' }} />
                      <span>Closes In: {String(joinMin).padStart(2, '0')}:{String(joinSec).padStart(2, '0')}</span>
                    </div>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/50 text-amber-300 text-[10px] font-semibold flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-amber-400" />
                      <span>Asia/Karachi PKT</span>
                    </span>
                  )}
                </div>
              </div>

              {/* PHASE 1: BEFORE MATCH TIME (COUNTDOWN TILES) */}
              {phase === 'BEFORE_MATCH' && (
                <div className="grid grid-cols-4 gap-2 sm:gap-3 max-w-xl">
                  {/* Days */}
                  <div className="p-2 sm:p-2.5 rounded-xl bg-black/85 border border-amber-500/40 backdrop-blur-md text-center shadow-lg">
                    <div className="font-heading text-lg sm:text-2xl md:text-3xl font-black text-amber-400 font-mono tracking-wider tabular-nums leading-none">
                      {String(countdownState.days).padStart(2, '0')}
                    </div>
                    <div className="text-[9px] sm:text-[10px] text-amber-200/70 uppercase font-semibold mt-1">
                      Days
                    </div>
                  </div>

                  {/* Hours */}
                  <div className="p-2 sm:p-2.5 rounded-xl bg-black/85 border border-amber-500/40 backdrop-blur-md text-center shadow-lg">
                    <div className="font-heading text-lg sm:text-2xl md:text-3xl font-black text-amber-400 font-mono tracking-wider tabular-nums leading-none">
                      {String(countdownState.hours).padStart(2, '0')}
                    </div>
                    <div className="text-[9px] sm:text-[10px] text-amber-200/70 uppercase font-semibold mt-1">
                      Hours
                    </div>
                  </div>

                  {/* Minutes */}
                  <div className="p-2 sm:p-2.5 rounded-xl bg-black/85 border border-amber-500/40 backdrop-blur-md text-center shadow-lg">
                    <div className="font-heading text-lg sm:text-2xl md:text-3xl font-black text-amber-400 font-mono tracking-wider tabular-nums leading-none">
                      {String(countdownState.minutes).padStart(2, '0')}
                    </div>
                    <div className="text-[9px] sm:text-[10px] text-amber-200/70 uppercase font-semibold mt-1">
                      Minutes
                    </div>
                  </div>

                  {/* Seconds */}
                  <div className="p-2 sm:p-2.5 rounded-xl bg-black/85 border border-amber-500/40 backdrop-blur-md text-center shadow-lg animate-pulse">
                    <div className="font-heading text-lg sm:text-2xl md:text-3xl font-black text-amber-400 font-mono tracking-wider tabular-nums leading-none">
                      {String(countdownState.seconds).padStart(2, '0')}
                    </div>
                    <div className="text-[9px] sm:text-[10px] text-amber-200/70 uppercase font-semibold mt-1">
                      Seconds
                    </div>
                  </div>
                </div>
              )}

              {/* PHASE 2: 15-MINUTE ROOM ACCESS WINDOW */}
              {phase === 'ROOM_WINDOW' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 animate-in zoom-in-95 duration-200">
                  {/* Room ID Box */}
                  <div className="p-3 rounded-xl bg-black/90 border-2 border-emerald-500/80 shadow-[0_0_25px_rgba(16,185,129,0.4)] backdrop-blur-md flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shrink-0">
                        <Hash className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[10px] text-emerald-300 uppercase font-mono block tracking-wider">
                          Official Room ID
                        </span>
                        <span className="font-mono text-xl sm:text-2xl font-black text-white tracking-widest select-all">
                          {activeRoomId}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopy(activeRoomId, 'id')}
                      className="py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer shadow"
                    >
                      {copiedId ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
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

                  {/* Room Password Box */}
                  <div className="p-3 rounded-xl bg-black/90 border-2 border-emerald-500/80 shadow-[0_0_25px_rgba(16,185,129,0.4)] backdrop-blur-md flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shrink-0">
                        <Key className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[10px] text-emerald-300 uppercase font-mono block tracking-wider">
                          Password
                        </span>
                        <span className="font-mono text-xl sm:text-2xl font-black text-white tracking-widest select-all">
                          {activePassword}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopy(activePassword, 'pass')}
                      className="py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer shadow"
                    >
                      {copiedPass ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
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
                </div>
              )}

              {/* PHASE 3: MATCH HAS STARTED (11:15 AM - 12:00 PM) */}
              {phase === 'MATCH_LIVE' && (
                <div className="p-3.5 sm:p-4 rounded-xl bg-black/90 border-2 border-red-500/80 shadow-[0_0_30px_rgba(239,68,68,0.5)] backdrop-blur-md animate-in zoom-in-95 duration-200">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-3 text-center sm:text-left">
                      <div className="w-10 h-10 rounded-xl bg-red-600/30 border border-red-500 flex items-center justify-center text-red-400 shrink-0">
                        <Play className="w-5 h-5 fill-red-400" />
                      </div>
                      <div>
                        <h4 className="font-heading text-lg sm:text-xl font-black text-white tracking-wider uppercase">
                          MATCH HAS BEEN STARTED!
                        </h4>
                        <p className="text-xs text-red-200/80">
                          Custom room doors are closed. Watch the live match broadcast on YouTube!
                        </p>
                      </div>
                    </div>

                    <a
                      href={liveStreamUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full sm:w-auto py-2.5 px-5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(239,68,68,0.6)] cursor-pointer transition-all shrink-0 active:scale-95"
                    >
                      <Youtube className="w-5 h-5 fill-white text-white shrink-0" />
                      <span>Go to Live Stream</span>
                      <ExternalLink className="w-4 h-4 opacity-90" />
                    </a>
                  </div>
                </div>
              )}

              {/* PHASE 4: MATCH ENDED (Clean Header only - boilerplate label & reward status button removed as requested) */}
              {phase === 'MATCH_ENDED' && (
                <div className="p-3 sm:p-4 rounded-xl bg-gradient-to-r from-amber-950/90 via-black to-amber-950/90 border-2 border-amber-500/80 shadow-[0_0_25px_rgba(245,158,11,0.4)] backdrop-blur-md text-center sm:text-left animate-in zoom-in-95 duration-300">
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <Trophy className="w-5 h-5 text-amber-400 shrink-0" />
                    <h4 className="font-heading text-sm sm:text-base md:text-lg font-black text-amber-300 tracking-wider uppercase">
                      MATCH ENDED — REWARD DISTRIBUTION IN PROGRESS
                    </h4>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Carousel Bottom Dot Indicators */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full border border-amber-500/30">
          {BANNER_SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentSlide(i);
              }}
              className={`h-2 rounded-full transition-all cursor-pointer ${
                currentSlide === i 
                  ? 'w-6 bg-gradient-to-r from-amber-400 to-amber-600' 
                  : 'w-2 bg-amber-200/40 hover:bg-amber-200/70'
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Fullscreen Modal View if user clicks expand */}
      {isFullscreen && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-3 sm:p-6"
          onClick={() => setIsFullscreen(false)}
        >
          <div className="relative max-w-5xl max-h-[92vh] w-full flex items-center justify-center">
            <img
              src={activeSlideData.imageUrl}
              alt={activeSlideData.alt}
              className="max-w-full max-h-[90vh] object-contain rounded-xl border border-amber-500/40 shadow-2xl"
            />
            <button
              onClick={() => setIsFullscreen(false)}
              className="absolute top-2 right-2 px-3 py-1.5 rounded-lg bg-black/80 border border-amber-500/60 text-white text-xs font-bold cursor-pointer"
            >
              Close ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
