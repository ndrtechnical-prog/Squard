import React, { useState, useEffect } from 'react';
import { 
  ChevronRight, 
  ChevronDown, 
  ChevronUp, 
  Calendar, 
  Clock, 
  Trophy, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  ArrowRight, 
  ExternalLink, 
  Share2, 
  Sparkles, 
  Users, 
  Flame, 
  BookOpen, 
  ArrowLeft,
  Check
} from 'lucide-react';
import { SeoLandingPageData, SEO_LANDING_PAGES } from '../data/seoLandingPages';
import { Tournament } from '../types/tournament';

interface SeoLandingPageProps {
  pageData: SeoLandingPageData;
  onNavigate: (path: string) => void;
  activeTournament?: Tournament | null;
  erangelTournament?: Tournament;
  livikTournament?: Tournament;
  tdmTournament?: Tournament;
  freeFireTournament?: Tournament;
  onSelectMatch?: (matchId: string) => void;
}

export const SeoLandingPage: React.FC<SeoLandingPageProps> = ({
  pageData,
  onNavigate,
  activeTournament,
  erangelTournament,
  livikTournament,
  tdmTournament,
  freeFireTournament,
  onSelectMatch
}) => {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Dynamically update page title, meta description, and canonical link
  useEffect(() => {
    document.title = pageData.title;
    
    // Update or insert meta description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', pageData.metaDescription);

    // Update canonical link
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', `https://squardwar.site${pageData.path}`);

    // Update or insert Google Search mobile thumbnail meta
    let thumbMeta = document.querySelector('meta[name="thumbnail"]');
    if (!thumbMeta) {
      thumbMeta = document.createElement('meta');
      thumbMeta.setAttribute('name', 'thumbnail');
      document.head.appendChild(thumbMeta);
    }
    thumbMeta.setAttribute('content', 'https://squardwar.site/images/erangel_squad_tournament.jpg');

    // Update or insert image_src link
    let imageSrcLink = document.querySelector('link[rel="image_src"]');
    if (!imageSrcLink) {
      imageSrcLink = document.createElement('link');
      imageSrcLink.setAttribute('rel', 'image_src');
      document.head.appendChild(imageSrcLink);
    }
    imageSrcLink.setAttribute('href', 'https://squardwar.site/images/erangel_squad_tournament.jpg');

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [pageData]);

  const toggleFaq = (idx: number) => {
    setOpenFaqIndex(prev => prev === idx ? null : idx);
  };

  const handleShare = () => {
    const fullUrl = `https://squardwar.site${pageData.path}`;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(fullUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  };

  // Determine relevant live tournament to showcase in widget
  const showcaseTournament = pageData.gameTarget === 'FREE_FIRE' 
    ? freeFireTournament 
    : (erangelTournament || activeTournament);

  // Generate valid Schema.org JSON-LD for this page
  const jsonLdPayload = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `https://squardwar.site${pageData.path}#webpage`,
        'url': `https://squardwar.site${pageData.path}`,
        'name': pageData.title,
        'description': pageData.metaDescription,
        'isPartOf': {
          '@type': 'WebSite',
          '@id': 'https://squardwar.site/#website',
          'name': 'SquardWar',
          'url': 'https://squardwar.site/'
        },
        'breadcrumb': {
          '@type': 'BreadcrumbList',
          'itemListElement': pageData.breadcrumbs.map((crumb, idx) => ({
            '@type': 'ListItem',
            'position': idx + 1,
            'name': crumb.name,
            'item': crumb.url
          }))
        },
        'primaryImageOfPage': {
          '@type': 'ImageObject',
          '@id': `https://squardwar.site${pageData.path}#primaryimage`,
          'url': 'https://squardwar.site/images/erangel_squad_tournament.jpg',
          'contentUrl': 'https://squardwar.site/images/erangel_squad_tournament.jpg',
          'width': 1200,
          'height': 675,
          'caption': `${pageData.title} – Erangel Squad Tournament Match`
        },
        'image': 'https://squardwar.site/images/erangel_squad_tournament.jpg',
        'inLanguage': 'en-US',
        'datePublished': pageData.publishedDate,
        'dateModified': pageData.modifiedDate
      },
      {
        '@type': 'FAQPage',
        '@id': `https://squardwar.site${pageData.path}#faq`,
        'mainEntity': pageData.faqs.map(faq => ({
          '@type': 'Question',
          'name': faq.question,
          'acceptedAnswer': {
            '@type': 'Answer',
            'text': faq.answer
          }
        }))
      },
      {
        '@type': 'SportsOrganization',
        '@id': 'https://squardwar.site/#organization',
        'name': 'SquardWar Esports',
        'url': 'https://squardwar.site/',
        'logo': 'https://squardwar.site/images/avatars/pubg_avatar_golden_1792656009701.jpg',
        'contactPoint': {
          '@type': 'ContactPoint',
          'telephone': '+923158812124',
          'contactType': 'customer support',
          'areaServed': ['PK', 'IN', 'BD', 'NP'],
          'availableLanguage': ['English', 'Urdu', 'Hindi']
        },
        'sameAs': [
          'https://youtube.com/@squardwar',
          'https://www.tiktok.com/@sqwardwar',
          'https://www.instagram.com/hightech.gadgets',
          'https://www.facebook.com/share/1ZQmpBtLDt/'
        ]
      }
    ]
  };

  return (
    <article className="max-w-5xl mx-auto px-3 sm:px-6 py-6 sm:py-10 text-slate-100 font-sans">
      {/* Inject Structured Data (Schema.org JSON-LD) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdPayload) }}
      />

      {/* 1. Breadcrumbs & Top Navigation */}
      <nav aria-label="Breadcrumb" className="mb-4 sm:mb-6 flex items-center justify-between gap-2 text-xs text-amber-300/80">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => onNavigate('/')}
            className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="font-semibold">Home</span>
          </button>
          <ChevronRight className="w-3 h-3 text-amber-500/50" />
          <span className="text-amber-400/60">Guides &amp; Tournaments</span>
          <ChevronRight className="w-3 h-3 text-amber-500/50" />
          <span className="text-amber-200 font-medium truncate max-w-[200px] sm:max-w-md">
            {pageData.breadcrumbs[1]?.name || pageData.h1}
          </span>
        </div>

        <button
          type="button"
          onClick={handleShare}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#1a110a] hover:bg-amber-950/60 border border-amber-800/40 text-amber-300 hover:text-white transition-colors cursor-pointer text-[11px]"
          title="Copy Link to Article"
        >
          {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
          <span>{copiedUrl ? 'Copied!' : 'Share'}</span>
        </button>
      </nav>

      {/* 2. Hero Header Section */}
      <header className="p-5 sm:p-8 rounded-3xl bg-gradient-to-br from-[#1b120a] via-[#140c06] to-[#0c0603] border-2 border-amber-500/40 shadow-2xl relative overflow-hidden mb-8">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 blur-3xl pointer-events-none -z-0" />
        
        <div className="relative z-10 space-y-3.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-full text-[11px] font-heading font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>{pageData.badge}</span>
            </span>

            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>2026 Competitive Edition</span>
            </span>

            <span className="text-xs text-amber-300/60 font-mono ml-auto hidden sm:inline">
              {pageData.readTime}
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-heading font-black tracking-tight text-white uppercase leading-tight">
            {pageData.h1}
          </h1>

          <p className="text-sm sm:text-base text-amber-100/80 max-w-3xl leading-relaxed">
            {pageData.subtitle}
          </p>

          <div className="pt-2 flex items-center gap-4 text-xs font-mono text-amber-400/60 border-t border-amber-950/60">
            <span>Published: {pageData.publishedDate}</span>
            <span>•</span>
            <span>Updated: {pageData.modifiedDate}</span>
            <span>•</span>
            <span className="text-emerald-400 font-bold">Verified Database Match</span>
          </div>
        </div>
      </header>

      {/* 3. Live Tournament CTA Widget (Actual Verified Database Match) */}
      {showcaseTournament && (
        <section aria-label="Live Tournament Registration" className="mb-8 p-4 sm:p-5 rounded-2xl bg-[#140b06] border-2 border-amber-500/50 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-black font-black shrink-0 shadow-lg">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-heading font-black uppercase tracking-wider text-amber-400">
                  Featured Live Tournament
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  {showcaseTournament.status === 'REGISTRATION_OPEN' ? 'Registration Open' : 'Active'}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-heading font-black uppercase text-white mt-0.5">
                {showcaseTournament.title}
              </h2>
              <div className="flex items-center gap-3 text-xs text-amber-200/70 font-mono mt-1">
                <span>Map: <strong className="text-amber-300">{showcaseTournament.mapName}</strong></span>
                <span>•</span>
                <span>Time: <strong className="text-amber-300">{showcaseTournament.matchTime} PKT</strong></span>
                <span>•</span>
                <span>Prize: <strong className="text-emerald-400 font-bold">{showcaseTournament.prizePoolTotal} PKR</strong></span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (onSelectMatch) {
                const matchKey = pageData.gameTarget === 'FREE_FIRE' 
                  ? 'FREE_FIRE' 
                  : (showcaseTournament.id === 'PUBG_TDM' ? 'TDM' : 'ERANGEL');
                onSelectMatch(matchKey);
              }
              onNavigate('/');
            }}
            className="w-full md:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-heading font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/30 transition-all active:scale-95 shrink-0"
          >
            <span>Reserve Slot on SquardWar</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </section>
      )}

      {/* 4. Main Article Content */}
      <div className="space-y-8 text-sm sm:text-base text-amber-100/90 leading-relaxed">
        {/* Overview Box */}
        <section className="p-4 sm:p-5 rounded-2xl bg-[#110804] border border-amber-900/40 shadow-md">
          <p className="leading-relaxed text-amber-100">
            {pageData.overview}
          </p>
        </section>

        {/* Dynamic Sections */}
        {pageData.sections.map((sec, sIdx) => (
          <section key={sIdx} className="space-y-3.5">
            <h2 className="text-xl sm:text-2xl font-heading font-black tracking-wide text-white uppercase border-b border-amber-950/60 pb-2">
              {sec.heading}
            </h2>

            {sec.paragraphs.map((p, pIdx) => (
              <p key={pIdx} className="text-amber-100/85">
                {p}
              </p>
            ))}

            {sec.bulletPoints && sec.bulletPoints.length > 0 && (
              <ul className="space-y-2 pt-1 pl-1">
                {sec.bulletPoints.map((bp, bIdx) => (
                  <li key={bIdx} className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-1" />
                    <span className="text-amber-100/90 text-sm sm:text-base">{bp}</span>
                  </li>
                ))}
              </ul>
            )}

            {sec.callout && (
              <div className={`p-4 rounded-xl border mt-3 flex items-start gap-3 ${
                sec.callout.type === 'warning' 
                  ? 'bg-red-950/40 border-red-500/40 text-red-200' 
                  : 'bg-amber-950/40 border-amber-500/40 text-amber-200'
              }`}>
                {sec.callout.type === 'warning' ? (
                  <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                ) : (
                  <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <h3 className="font-bold uppercase text-xs tracking-wider mb-0.5 text-white">
                    {sec.callout.title}
                  </h3>
                  <p className="text-xs sm:text-sm">
                    {sec.callout.text}
                  </p>
                </div>
              </div>
            )}
          </section>
        ))}

        {/* 5. FAQ Accordion (Generates Schema.org FAQPage Rich Snippets) */}
        <section className="pt-4 space-y-4">
          <div className="border-b border-amber-950/60 pb-2">
            <h2 className="text-xl sm:text-2xl font-heading font-black tracking-wide text-white uppercase flex items-center gap-2">
              <span>Frequently Asked Questions</span>
              <span className="text-amber-400 font-mono text-sm">({pageData.faqs.length})</span>
            </h2>
            <p className="text-xs sm:text-sm text-amber-200/60 mt-1">
              Common questions answered by our tournament directors and referee team.
            </p>
          </div>

          <div className="space-y-3">
            {pageData.faqs.map((faq, fIdx) => {
              const isOpen = openFaqIndex === fIdx;
              return (
                <div 
                  key={fIdx}
                  className="rounded-xl border border-amber-900/40 bg-[#120904] overflow-hidden shadow transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => toggleFaq(fIdx)}
                    className="w-full p-4 flex items-center justify-between text-left hover:bg-amber-950/30 transition-colors cursor-pointer"
                  >
                    <span className="font-heading font-bold text-sm sm:text-base text-white pr-4">
                      {faq.question}
                    </span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-amber-400 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-amber-400/70 shrink-0" />
                    )}
                  </button>

                  {isOpen && (
                    <div className="p-4 pt-0 border-t border-amber-950/40 text-xs sm:text-sm text-amber-100/80 leading-relaxed animate-in fade-in duration-200">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* 6. Related Internal Guides Navigation Grid */}
        <section className="pt-6 space-y-4 border-t border-amber-950/60">
          <div>
            <h2 className="text-lg sm:text-xl font-heading font-black tracking-wide text-white uppercase">
              Explore More Tournament Guides
            </h2>
            <p className="text-xs text-amber-200/60 mt-0.5">
              Deepen your competitive knowledge with official SquardWar esports guides.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {pageData.relatedSlugs.map((rSlug) => {
              const rPage = SEO_LANDING_PAGES[rSlug];
              if (!rPage) return null;
              return (
                <a
                  key={rSlug}
                  href={rPage.path}
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate(rPage.path);
                  }}
                  className="p-4 rounded-xl bg-[#130b05] hover:bg-[#1a0f08] border border-amber-900/40 hover:border-amber-500/50 transition-all flex flex-col justify-between group cursor-pointer shadow-md"
                >
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 block mb-1">
                      {rPage.badge}
                    </span>
                    <h3 className="font-heading font-black text-sm text-white group-hover:text-amber-300 transition-colors">
                      {rPage.h1}
                    </h3>
                    <p className="text-xs text-amber-200/60 mt-1 line-clamp-2">
                      {rPage.metaDescription}
                    </p>
                  </div>
                  <div className="mt-3 text-xs font-bold text-amber-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    <span>Read Guide &rarr;</span>
                  </div>
                </a>
              );
            })}
          </div>
        </section>

        {/* 7. Bottom Registration Callout */}
        <section className="p-6 rounded-2xl bg-gradient-to-r from-amber-600/20 via-amber-500/10 to-amber-600/20 border border-amber-500/50 text-center space-y-3 mt-8">
          <h2 className="text-xl font-heading font-black uppercase text-white tracking-wide">
            Ready to Battle on SquardWar?
          </h2>
          <p className="text-xs sm:text-sm text-amber-100/80 max-w-xl mx-auto">
            Choose your squad slot, receive custom room keys on time, and compete for verified daily cash prize pools.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('/')}
            className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-heading font-black text-xs uppercase tracking-wider cursor-pointer shadow-lg transition-transform active:scale-95 inline-flex items-center gap-2"
          >
            <Trophy className="w-4 h-4" />
            <span>Go to Tournament Match Hub</span>
          </button>
        </section>

        {/* 8. Independent Brand Authority & Trademark Disclaimer */}
        <footer className="pt-6 border-t border-amber-950/40 text-[11px] text-amber-300/50 leading-relaxed text-center space-y-2">
          <p>
            <strong>Official Platform Disclaimer:</strong> SquardWar (<strong>https://squardwar.site</strong>) is an independent competitive esports tournament platform providing automated seat reservation and room management for competitive mobile gamers.
          </p>
          <p>
            SquardWar is not affiliated with, endorsed by, or officially associated with PUBG Mobile, Krafton, Inc., Tencent Games, Level Infinite, or Garena Free Fire. All respective product names, registered trademarks, logos, and brands are property of their respective trademark holders.
          </p>
          <p className="font-mono text-[10px]">
            © 2026 SquardWar Esports. All rights reserved. Registered under SquardWar Tournament Systems.
          </p>
        </footer>
      </div>
    </article>
  );
};
