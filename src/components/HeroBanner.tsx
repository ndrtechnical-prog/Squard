import React, { useState, useEffect, useRef } from 'react';
import { 
  Maximize2, 
  Copy, 
  Check, 
  Clock, 
  Key, 
  Hash, 
  Eye, 
  Play, 
  X,
  ShieldCheck,
  Youtube,
  ExternalLink,
  Radio,
  RotateCcw,
  Trophy,
  Calendar,
  Sparkles
} from 'lucide-react';
import { Tournament, TournamentStatus } from '../types/tournament';

interface HeroBannerProps {
  tournament: Tournament | null;
  onOpenLookup: () => void;
  onQuickJoin: () => void;
}

const CLOUDFLARE_TOURNAMENT_IMAGE = 'https://pub-f2dfd2610ba84b708d63b5ff463d0490.r2.dev/Images/file_0000000076e081f78464dd659a240b41.png';
const DEFAULT_YOUTUBE_STREAM_URL = 'https://youtube.com/@flaregunpk?si=NycZ9BwNyELH405i';

// Default Target: October 27, 2026 at 11:00 AM Asia/Karachi (UTC+5)
const DEFAULT_MATCH_DATE = '2026-10-27';
const DEFAULT_MATCH_TIME = '11:00';
const DEFAULT_ROOM_ID = '69151604';
const DEFAULT_PASSWORD = '1234';

// Helper: Calculate timestamp in Asia/Karachi (UTC+5)
function parseKarachiTimestamp(dateStr: string, timeStr: string): number {
  const cleanDate = (dateStr || DEFAULT_MATCH_DATE).trim();
  const rawTime = (timeStr || DEFAULT_MATCH_TIME).trim();
  const cleanTime = rawTime.length === 5 ? rawTime : `${rawTime}:00`.slice(0, 5);
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
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Authoritative server clock offset
  const serverOffsetRef = useRef<number>(0);
  useEffect(() => {
    if (tournament?.serverTime) {
      serverOffsetRef.current = tournament.serverTime - Date.now();
    }
  }, [tournament?.serverTime]);

  const getServerNow = () => Date.now() + serverOffsetRef.current;

  // Active match configuration (driven by Firebase database tournament record)
  const matchStartTime = tournament?.matchStartTime || parseKarachiTimestamp(
    tournament?.matchDate || DEFAULT_MATCH_DATE,
    tournament?.matchTime || DEFAULT_MATCH_TIME
  );

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

      // 2. 15-Minute Room Window Countdown
      const diffToRoomEnd = roomEndTime - now;
      const secLeft = Math.max(0, Math.floor(diffToRoomEnd / 1000));
      setRoomWindowSecondsLeft(secLeft);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [matchStartTime, roomEndTime]);

  // Determine Effective Phase
  // Priority: 1. server tournament.manualStatus override, 2. server tournament.status, 3. automatic time calculation
  const getEffectivePhase = (): 'BEFORE_MATCH' | 'ROOM_WINDOW' | 'MATCH_LIVE' | 'MATCH_ENDED' => {
    if (tournament?.manualStatus && tournament.manualStatus !== 'AUTO') {
      if (tournament.manualStatus === 'ROOM_OPEN') return 'ROOM_WINDOW';
      if (tournament.manualStatus === 'MATCH_LIVE') return 'MATCH_LIVE';
      if (tournament.manualStatus === 'WAIT_FOR_RESULT' || tournament.manualStatus === 'COMPLETED') return 'MATCH_ENDED';
      return 'BEFORE_MATCH';
    }

    if (tournament?.status === 'ROOM_OPEN') return 'ROOM_WINDOW';
    if (tournament?.status === 'MATCH_LIVE') return 'MATCH_LIVE';
    if (tournament?.status === 'WAIT_FOR_RESULT' || tournament?.status === 'COMPLETED') return 'MATCH_ENDED';

    // Automatic calculation from saved matchStartTime
    const now = getServerNow();
    if (now < matchStartTime) return 'BEFORE_MATCH';
    if (now >= matchStartTime && now < roomEndTime) return 'ROOM_WINDOW';
    if (now >= roomEndTime && now < matchEndTime) return 'MATCH_LIVE';
    return 'MATCH_ENDED';
  };

  const phase = getEffectivePhase();

  // Formatted 15-minute room window time
  const joinMin = Math.floor(roomWindowSecondsLeft / 60);
  const joinSec = roomWindowSecondsLeft % 60;

  // Active room credentials (from backend /api/tournament)
  const displayRoomId = tournament?.roomId || DEFAULT_ROOM_ID;
  const displayPassword = tournament?.roomPassword || DEFAULT_PASSWORD;
  const displayYoutubeUrl = tournament?.youtubeUrl || DEFAULT_YOUTUBE_STREAM_URL;

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

  return (
    <div className="w-full my-3">
      {/* Main Tournament Banner Container */}
      <div className="relative w-full rounded-2xl overflow-hidden border border-amber-600/40 shadow-[0_0_35px_rgba(217,119,6,0.25)] bg-[#100c08] group">
        
        {/* Top Action Buttons (Maximize View) */}
        <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
          <button
            onClick={() => setIsFullscreen(true)}
            title="View Full Poster"
            className="w-8 h-8 rounded-lg bg-black/80 hover:bg-amber-600 text-amber-200 hover:text-white border border-amber-600/50 backdrop-blur-md flex items-center justify-center transition-all cursor-pointer shadow-lg"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

        {/* Cloudflare R2 Tournament Poster Image with Bottom-to-Top Dark Shade */}
        <div className="relative w-full aspect-[16/10] sm:aspect-[21/10] md:aspect-[16/8] max-h-[480px] overflow-hidden bg-black flex items-center justify-center">
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#18120d] animate-pulse text-amber-400/60 text-xs font-mono">
              Loading Official Tournament Banner...
            </div>
          )}

          <img
            src={CLOUDFLARE_TOURNAMENT_IMAGE}
            alt="PUBG Mobile Tournament Official Poster"
            onLoad={() => setImageLoaded(true)}
            className={`w-full h-full object-cover sm:object-contain object-center transition-opacity duration-500 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          />

          {/* Bottom-to-Top Gradient Shade Overlay on Image */}
          <div className="absolute inset-x-0 bottom-0 h-48 sm:h-56 bg-gradient-to-t from-black via-black/95 to-transparent pointer-events-none" />

          {/* OVERLAY CONTENT (Positioned at bottom of photo over the dark shade) */}
          <div className="absolute inset-x-0 bottom-0 p-3 sm:p-5 z-10 flex flex-col gap-2.5">
            
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

            {/* =========================================================================
                FOUR DISTINCT LIFECYCLE PHASES:
                1) BEFORE MATCH: Scheduled date & countdown tiles, Room ID strictly hidden
                2) ROOM WINDOW (11:00 AM - 11:15 AM): Room ID & Password unlocked with Copy buttons & 15m countdown
                3) MATCH LIVE (11:15 AM - 12:00 PM): "MATCH HAS BEEN STARTED!" + YouTube Live Stream button
                4) MATCH ENDED (12:00 PM onwards): "MATCH ENDED — REWARD DISTRIBUTION IN PROGRESS"
               ========================================================================= */}

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

            {/* PHASE 2: 15-MINUTE ROOM ENTRY WINDOW (11:00 AM - 11:15 AM) */}
            {phase === 'ROOM_WINDOW' && (
              <div className="p-3 sm:p-3.5 rounded-xl bg-black/95 border-2 border-amber-500 shadow-[0_0_25px_rgba(245,158,11,0.5)] backdrop-blur-md animate-in zoom-in-95 duration-300">
                
                {/* 15-Minute Countdown Header Bar */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-amber-950/40 border border-amber-600/40 mb-2.5">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400 animate-spin" style={{ animationDuration: '6s' }} />
                    <span className="text-xs font-bold text-amber-200 uppercase tracking-wide">
                      15-Minute Room Joining Window
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 font-mono">
                    <span className="text-[10px] text-amber-300/80 uppercase">Closes In:</span>
                    <span className="px-2 py-0.5 rounded bg-black border border-amber-500/70 font-mono font-black text-amber-300 text-sm tracking-widest animate-pulse">
                      {String(joinMin).padStart(2, '0')}:{String(joinSec).padStart(2, '0')}
                    </span>
                  </div>
                </div>

                {/* Room ID and Password Boxes with Copy Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Room ID Box */}
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#1a120c] border border-amber-600/50">
                    <div className="flex items-center gap-2">
                      <Hash className="w-4 h-4 text-amber-400 shrink-0" />
                      <div>
                        <span className="text-[9px] text-amber-200/60 uppercase block leading-none font-semibold">
                          Room ID
                        </span>
                        <span className="font-mono text-base sm:text-lg font-black text-amber-300 tracking-wider">
                          {displayRoomId}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopy(displayRoomId, 'id')}
                      className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        copiedId
                          ? 'bg-emerald-600 text-white'
                          : 'bg-amber-500 hover:bg-amber-400 text-black shadow'
                      }`}
                    >
                      {copiedId ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Copied ✓</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Room ID</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Password Box */}
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#1a120c] border border-amber-600/50">
                    <div className="flex items-center gap-2">
                      <Key className="w-4 h-4 text-amber-400 shrink-0" />
                      <div>
                        <span className="text-[9px] text-amber-200/60 uppercase block leading-none font-semibold">
                          Password
                        </span>
                        <span className="font-mono text-base sm:text-lg font-black text-amber-300 tracking-wider">
                          {displayPassword}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopy(displayPassword, 'pass')}
                      className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        copiedPass
                          ? 'bg-emerald-600 text-white'
                          : 'bg-amber-500 hover:bg-amber-400 text-black shadow'
                      }`}
                    >
                      {copiedPass ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Copied ✓</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Password</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Subtext info */}
                <div className="flex items-center justify-between pt-2 mt-2 border-t border-amber-900/40 text-[10px] text-amber-200/70">
                  <span>Enter room in PUBG Mobile. Room closes automatically when 15 minutes expire.</span>
                </div>
              </div>
            )}

            {/* PHASE 3: MATCH LIVE STREAM (11:15 AM - 12:00 PM) */}
            {phase === 'MATCH_LIVE' && (
              <div className="p-3 sm:p-4 rounded-xl bg-gradient-to-r from-red-950/90 via-black to-red-950/90 border-2 border-red-500/80 shadow-[0_0_35px_rgba(239,68,68,0.55)] backdrop-blur-md animate-in zoom-in-95 duration-300">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-center sm:text-left">
                    <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                      <span className="w-2 h-2 rounded-full bg-red-500 -ml-3.5" />
                      <h4 className="font-heading text-base sm:text-lg md:text-xl font-black text-white tracking-wider uppercase">
                        MATCH HAS BEEN STARTED!
                      </h4>
                    </div>
                    <p className="text-[11px] sm:text-xs text-red-200/80">
                      15-minute room joining countdown ended. Room codes expired. Watch live match on YouTube!
                    </p>
                  </div>

                  {/* Admin-configured YouTube Live Stream Button */}
                  <a
                    href={displayYoutubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#ff0000] hover:bg-[#cc0000] text-white font-heading font-black text-xs sm:text-sm uppercase tracking-wider shadow-[0_0_20px_rgba(255,0,0,0.6)] hover:shadow-[0_0_30px_rgba(255,0,0,0.9)] transform hover:scale-105 active:scale-95 transition-all cursor-pointer shrink-0"
                  >
                    <Youtube className="w-5 h-5 fill-white text-white shrink-0" />
                    <span>Go to Live Stream</span>
                    <ExternalLink className="w-4 h-4 opacity-90" />
                  </a>
                </div>
              </div>
            )}

            {/* PHASE 4: 1-HOUR STATUS TRANSITION (12:00 PM ONWARDS) */}
            {phase === 'MATCH_ENDED' && (
              <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-r from-amber-950/90 via-black to-amber-950/90 border-2 border-amber-500/80 shadow-[0_0_35px_rgba(245,158,11,0.55)] backdrop-blur-md text-center sm:text-left animate-in zoom-in-95 duration-300">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-center sm:justify-start gap-2">
                      <Trophy className="w-5 h-5 text-amber-400 shrink-0 animate-bounce" />
                      <h4 className="font-heading text-base sm:text-lg md:text-xl font-black text-amber-300 tracking-wider uppercase">
                        MATCH ENDED — REWARD DISTRIBUTION IN PROGRESS
                      </h4>
                    </div>
                    <p className="text-xs text-amber-200/75">
                      The official match has concluded. Scores, kill counts, and prize distributions are currently being finalized by tournament officials.
                    </p>
                  </div>

                  <button
                    onClick={onOpenLookup}
                    className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs uppercase tracking-wider transition-all cursor-pointer shadow shrink-0"
                  >
                    Check My Reward Status
                  </button>
                </div>
              </div>
            )}
          </div>
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
              src={CLOUDFLARE_TOURNAMENT_IMAGE}
              alt="Tournament Poster Full"
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
