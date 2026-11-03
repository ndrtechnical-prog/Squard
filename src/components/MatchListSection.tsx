import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Tournament, PubgMatchId, GameType } from '../types/tournament';
import { MATCH_IMAGES, formatMatchDisplayDateTime } from '../utils/storage';

interface MatchListSectionProps {
  activeGame: GameType;
  erangelTournament: Tournament;
  livikTournament: Tournament;
  tdmTournament: Tournament;
  freeFireTournament: Tournament;
  onSelectPubgMatch: (matchId: PubgMatchId) => void;
  onSelectFreeFire: () => void;
}

export const MatchListSection: React.FC<MatchListSectionProps> = ({
  activeGame,
  erangelTournament,
  livikTournament,
  tdmTournament,
  freeFireTournament,
  onSelectPubgMatch,
  onSelectFreeFire
}) => {
  // If user selected Free Fire in the header
  if (activeGame === 'FREE_FIRE') {
    const ffDate = formatMatchDisplayDateTime(freeFireTournament?.matchDate, freeFireTournament?.matchTime);

    return (
      <div className="w-full space-y-5 my-3 animate-in fade-in-50 duration-200">
        {/* Free Fire Clash Squad Card */}
        <div 
          onClick={onSelectFreeFire}
          className="group relative rounded-2xl overflow-hidden border border-orange-500/40 bg-[#120a05] shadow-[0_4px_25px_rgba(249,115,22,0.15)] hover:border-orange-400 transition-all duration-300 cursor-pointer"
        >
          {/* Card Poster Image - 100% Clear, No Text Overlays */}
          <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] max-h-[420px] overflow-hidden bg-black">
            <img 
              src={MATCH_IMAGES.FREE_FIRE} 
              alt="Free Fire Tournament Poster"
              className="w-full h-full object-cover object-center group-hover:scale-[1.02] transition-transform duration-500"
              loading="eager"
            />
          </div>

          {/* Sleek Slim Join Button Container with Top Right Date in text-[10px] */}
          <div className="p-2 sm:p-2.5 bg-[#0f0703] border-t border-orange-500/30">
            {ffDate && (
              <div className="flex items-center justify-end mb-1 pr-1">
                <span className="text-[10px] font-mono font-bold text-orange-300/90 tracking-tight">
                  {ffDate}
                </span>
              </div>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectFreeFire();
              }}
              className="w-full py-2 sm:py-2.5 px-4 rounded-xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 hover:from-orange-400 hover:to-amber-400 text-black font-heading font-black text-xs sm:text-sm uppercase tracking-wider shadow-md hover:shadow-[0_0_20px_rgba(249,115,22,0.45)] transition-all cursor-pointer active:scale-[0.99] flex items-center justify-center gap-1.5"
            >
              <span>Join Tournament</span>
              <ChevronRight className="w-4 h-4 stroke-[2.5] group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // PUBG MODE: The 3 Matches - Erangel, Livik, and Team Death Match
  const erangelDate = formatMatchDisplayDateTime(erangelTournament?.matchDate, erangelTournament?.matchTime);
  const livikDate = formatMatchDisplayDateTime(livikTournament?.matchDate, livikTournament?.matchTime);
  const tdmDate = formatMatchDisplayDateTime(tdmTournament?.matchDate, tdmTournament?.matchTime);

  return (
    <div className="w-full space-y-5 my-3 animate-in fade-in-50 duration-200">
      {/* =========================================================================
          MATCH 1: ERANGEL SQUAD MATCH
         ========================================================================= */}
      <div 
        onClick={() => onSelectPubgMatch('ERANGEL')}
        className="group relative rounded-2xl overflow-hidden border border-amber-500/40 bg-[#120b06] shadow-[0_4px_25px_rgba(245,158,11,0.15)] hover:border-amber-400 transition-all duration-300 cursor-pointer"
      >
        {/* Poster Image - 100% Clear, No Text Overlays */}
        <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] max-h-[420px] overflow-hidden bg-black">
          <img 
            src={MATCH_IMAGES.ERANGEL} 
            alt="Erangel Tournament Poster"
            className="w-full h-full object-cover object-center group-hover:scale-[1.02] transition-transform duration-500"
            loading="eager"
          />
        </div>

        {/* Sleek Slim Join Button Container with Top Right Date in text-[10px] */}
        <div className="p-2 sm:p-2.5 bg-[#0e0905] border-t border-amber-500/30">
          {erangelDate && (
            <div className="flex items-center justify-end mb-1 pr-1">
              <span className="text-[10px] font-mono font-bold text-amber-300/90 tracking-tight">
                {erangelDate}
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectPubgMatch('ERANGEL');
            }}
            className="w-full py-2 sm:py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-black font-heading font-black text-xs sm:text-sm uppercase tracking-wider shadow-md hover:shadow-[0_0_20px_rgba(245,158,11,0.45)] transition-all cursor-pointer active:scale-[0.99] flex items-center justify-center gap-1.5"
          >
            <span>Join Tournament</span>
            <ChevronRight className="w-4 h-4 stroke-[2.5] group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>

      {/* =========================================================================
          MATCH 2: LIVIK DUO MATCH
         ========================================================================= */}
      <div 
        onClick={() => onSelectPubgMatch('LIVIK')}
        className="group relative rounded-2xl overflow-hidden border border-cyan-500/40 bg-[#07131e] shadow-[0_4px_25px_rgba(6,182,212,0.15)] hover:border-cyan-400 transition-all duration-300 cursor-pointer"
      >
        {/* Poster Image - 100% Clear, No Text Overlays */}
        <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] max-h-[420px] overflow-hidden bg-black">
          <img 
            src={MATCH_IMAGES.LIVIK} 
            alt="Livik Tournament Poster"
            className="w-full h-full object-cover object-center group-hover:scale-[1.02] transition-transform duration-500"
            loading="eager"
          />
        </div>

        {/* Sleek Slim Join Button Container with Top Right Date in text-[10px] */}
        <div className="p-2 sm:p-2.5 bg-[#050e16] border-t border-cyan-500/30">
          {livikDate && (
            <div className="flex items-center justify-end mb-1 pr-1">
              <span className="text-[10px] font-mono font-bold text-cyan-300/90 tracking-tight">
                {livikDate}
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectPubgMatch('LIVIK');
            }}
            className="w-full py-2 sm:py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 via-teal-400 to-cyan-500 hover:from-cyan-400 hover:to-teal-300 text-black font-heading font-black text-xs sm:text-sm uppercase tracking-wider shadow-md hover:shadow-[0_0_20px_rgba(6,182,212,0.45)] transition-all cursor-pointer active:scale-[0.99] flex items-center justify-center gap-1.5"
          >
            <span>Join Tournament</span>
            <ChevronRight className="w-4 h-4 stroke-[2.5] group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>

      {/* =========================================================================
          MATCH 3: TEAM DEATH MATCH (TDM)
         ========================================================================= */}
      <div 
        onClick={() => onSelectPubgMatch('TDM')}
        className="group relative rounded-2xl overflow-hidden border border-red-500/40 bg-[#160a0a] shadow-[0_4px_25px_rgba(239,68,68,0.15)] hover:border-red-400 transition-all duration-300 cursor-pointer"
      >
        {/* Poster Image - 100% Clear, No Text Overlays */}
        <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] max-h-[420px] overflow-hidden bg-black">
          <img 
            src={MATCH_IMAGES.TDM} 
            alt="Team Death Match Tournament Poster"
            className="w-full h-full object-cover object-center group-hover:scale-[1.02] transition-transform duration-500"
            loading="eager"
          />
        </div>

        {/* Sleek Slim Join Button Container with Top Right Date in text-[10px] */}
        <div className="p-2 sm:p-2.5 bg-[#120606] border-t border-red-500/30">
          {tdmDate && (
            <div className="flex items-center justify-end mb-1 pr-1">
              <span className="text-[10px] font-mono font-bold text-red-300/90 tracking-tight">
                {tdmDate}
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectPubgMatch('TDM');
            }}
            className="w-full py-2 sm:py-2.5 px-4 rounded-xl bg-gradient-to-r from-red-600 via-amber-500 to-red-600 hover:from-red-500 hover:to-amber-400 text-white font-heading font-black text-xs sm:text-sm uppercase tracking-wider shadow-md hover:shadow-[0_0_20px_rgba(239,68,68,0.45)] transition-all cursor-pointer active:scale-[0.99] flex items-center justify-center gap-1.5"
          >
            <span>Join Tournament</span>
            <ChevronRight className="w-4 h-4 stroke-[2.5] group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};
