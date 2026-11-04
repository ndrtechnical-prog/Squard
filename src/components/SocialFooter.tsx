import React, { useState } from 'react';
import { ExternalLink, X, Shield, FileText, HelpCircle, CheckCircle2, Phone, AlertTriangle, Sparkles, BookOpen } from 'lucide-react';

export interface SocialLinkItem {
  id: string;
  name: string;
  handle: string;
  url: string;
  description: string;
  colorScheme: {
    text: string;
    hoverText: string;
    border: string;
    bg: string;
  };
  icon: (props: { className?: string }) => React.JSX.Element;
}

// Pixel-perfect official brand icons
export const YouTubeIcon = ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

export const TikTokIcon = ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.82 4.47 6.3 6.3 0 0 0 1.86-4.47V8.84a8.16 8.16 0 0 0 4.91 1.64V7.03a4.79 4.79 0 0 1-1-.34z"/>
  </svg>
);

export const InstagramIcon = ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
  </svg>
);

export const FacebookIcon = ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

export const WhatsAppIcon = ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
  </svg>
);

export const SOCIAL_LINKS: SocialLinkItem[] = [
  {
    id: 'youtube',
    name: 'YouTube',
    handle: '@squardwar',
    url: 'https://youtube.com/@squardwar?si=xpS2n4o3ZI7m0W5C',
    description: 'Watch Match Highlights, Live Streams & Tutorials',
    colorScheme: {
      text: 'text-red-400',
      hoverText: 'hover:text-red-300',
      border: 'border-red-500/30',
      bg: 'bg-red-500/10'
    },
    icon: YouTubeIcon
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    handle: '@sqwardwar',
    url: 'https://www.tiktok.com/@sqwardwar?_r=1&_t=ZS-9B6kH4cR8J5',
    description: 'Daily Clutch Moments, Shorts & Highlights',
    colorScheme: {
      text: 'text-cyan-300',
      hoverText: 'hover:text-cyan-200',
      border: 'border-cyan-500/30',
      bg: 'bg-cyan-500/10'
    },
    icon: TikTokIcon
  },
  {
    id: 'instagram',
    name: 'Instagram',
    handle: '@hightech.gadgets',
    url: 'https://www.instagram.com/hightech.gadgets?cplk=cGUxNmNtdmU5aHNl',
    description: 'Tournament News, Winner Stories & Updates',
    colorScheme: {
      text: 'text-pink-400',
      hoverText: 'hover:text-pink-300',
      border: 'border-pink-500/30',
      bg: 'bg-pink-500/10'
    },
    icon: InstagramIcon
  },
  {
    id: 'facebook',
    name: 'Facebook',
    handle: 'Squard War Community',
    url: 'https://www.facebook.com/share/1ZQmpBtLDt/',
    description: 'Community Group, Match Schedules & Brackets',
    colorScheme: {
      text: 'text-blue-400',
      hoverText: 'hover:text-blue-300',
      border: 'border-blue-500/30',
      bg: 'bg-blue-500/10'
    },
    icon: FacebookIcon
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    handle: '03158812124',
    url: 'https://wa.me/923158812124',
    description: 'Official 24/7 Support, Booking & Queries',
    colorScheme: {
      text: 'text-emerald-400',
      hoverText: 'hover:text-emerald-300',
      border: 'border-emerald-500/30',
      bg: 'bg-emerald-500/10'
    },
    icon: WhatsAppIcon
  }
];

type PolicyTopic = 'privacy' | 'terms' | 'fairplay' | 'refund' | 'payment' | 'faq' | 'howto' | 'timing' | 'support' | 'about';

interface TopicDetail {
  id: PolicyTopic;
  title: string;
  badge: string;
  content: {
    heading: string;
    description: string;
    points: string[];
  };
}

const TOPIC_DETAILS: Record<PolicyTopic, TopicDetail> = {
  privacy: {
    id: 'privacy',
    title: 'Privacy Policy',
    badge: 'Security & Data Protection',
    content: {
      heading: 'Squard War Player Data & Privacy Assurance',
      description: 'Hum aapke personal data aur gaming UID ki mukammal hifazat karte hain. Kisi third-party ko data faraham nahi kia jata.',
      points: [
        'Aapka PUBG UID / Free Fire UID sirf tournament verification aur room slot approval k liye istemal hota hai.',
        'Deposit ya cashout k transaction screenshots aur phone numbers sirf admin billing check k liye mehfooz hain.',
        'Aapka account PIN password encrypted format me localStorage me save rehta hai takay koi doosra user aapki balance se slot book na kar sakay.',
        'Hum kisi player ka WhatsApp ya phone number public nahi karte.'
      ]
    }
  },
  terms: {
    id: 'terms',
    title: 'Terms of Service',
    badge: 'Tournament Rules & Agreements',
    content: {
      heading: 'Official Esports Tournament Terms',
      description: 'Har player aur squad ko tournament k usoolo ki pabandi lazmi karni hogi.',
      points: [
        'Har player ko match time se 15 minute pehle room me apne booked slot par baithna zaroori hai.',
        'Ghalat slot par baithnay wale player ko kick kia ja sakta hai jis k refund ki zimadari nahi hogi.',
        'Internet connection ya ping issue ki wajah se match disconnect hone par Squard War zimadar nahi hoga.',
        'Results match k 15 se 30 minute k andar official room summary aur kill counts k mutabiq announce hotay hain.'
      ]
    }
  },
  fairplay: {
    id: 'fairplay',
    title: 'Fair Play Rules',
    badge: 'Anti-Cheat & Strict Ban Policy',
    content: {
      heading: '100% Anti-Cheat & Strict Fair Play',
      description: 'Squard War kisi bhi kism k hacks, cheats, ya teaming ko zero tolerance policy k tehat deal karta hai.',
      points: [
        'Kisi bhi kism ka ESP, Magic Bullet, Aimbot, Config, ya third-party illegal tool istemal karne par direct permanent ban hoga.',
        'Custom room me kisi doosri team k sath Teaming karna strictly prohibited hai.',
        'Violators ka cash prize cancel kar dia jayega aur account ko black-list kar dia jayega.',
        'Hacker report karne k liye match k foran baad screen recording proof admin WhatsApp par bhejein.'
      ]
    }
  },
  refund: {
    id: 'refund',
    title: 'Refund Policy',
    badge: 'Instant Balance Protection',
    content: {
      heading: 'Fair & Transparent Refund Guarantee',
      description: 'Agar match kisi takneeki waja se na ho sake to aapka poora balance safe rehta hai.',
      points: [
        'Agar custom room technical issue ki waja se cancel ho jaye to tamam registered players ka entry balance 100% refund ho jata hai.',
        'Agar player match shuru hone se 30 minute pehle slot cancel karna chahe to admin support se rabta kar sakta hai.',
        'Server breakdown ya game crash ki soorat me match rematch karwaya jayega ya full refund dia jayega.'
      ]
    }
  },
  payment: {
    id: 'payment',
    title: 'Payment Policy',
    badge: 'Easypaisa & JazzCash Verified',
    content: {
      heading: 'Safe Deposits & Instant Cashouts',
      description: 'Easypaisa aur JazzCash k zariye safe transaction process.',
      points: [
        'Official deposit account: Muhammad Nadir (03158812124) Easypaisa & JazzCash.',
        'Deposit approval match shuru hone se pehle 5-10 minute me confirm kar di jati hai.',
        'Cashout winning amount Easypaisa / JazzCash account me transfer hoti hai jab admin portal se approved ho.'
      ]
    }
  },
  faq: {
    id: 'faq',
    title: 'FAQ',
    badge: 'Frequently Asked Questions',
    content: {
      heading: 'Aksar Poochay Janay Walay Sawalat',
      description: 'Aapke tamam ahem sawalat k fori jawabat.',
      points: [
        'Room ID aur Password kab milega? — Match start hone se theek 15 minute pehle portal par Room unlock hota hai.',
        'Balance kaisay add karein? — Top bar par (+) ya Balance par click karein aur transaction ID submit karein.',
        'Kya Team Deathmatch (TDM) free hai? — Jee haan! TDM entry free hai aur 1 UID sirf 1 martaba join kar sakti hai.',
        'Prize kaisay claim karein? — Match jeetnay k baad Results section check karein aur Cashout request submit karein.'
      ]
    }
  },
  howto: {
    id: 'howto',
    title: 'How to Join',
    badge: 'Step-by-Step Match Guide',
    content: {
      heading: 'Tournament Join Karne Ka Tareeqa',
      description: 'Sirf 3 asaan steps me tournament slot book karein:',
      points: [
        'Step 1: Apna Game (PUBG / Free Fire) aur Match Mode (Erangel, Livik, TDM) select karein.',
        'Step 2: Khali slot par click karein, apna UID aur Name darj karein aur confirm karein.',
        'Step 3: Match time se 15 minute pehle Room ID & Password copy kar k game me enter hon.'
      ]
    }
  },
  timing: {
    id: 'timing',
    title: 'Room Timings',
    badge: 'Live Match Schedules',
    content: {
      heading: 'Match & Room Countdown Schedule',
      description: 'Har match ka fixed schedule aur live clock chalta hai.',
      points: [
        'TDM 4v4: Rozana regular slots (Free Entry, Quick 10-Minute battles).',
        'Erangel Squad: Daily prime time match schedule (Full 100-player Battle Royale).',
        'Livik Squad: Fast action 52-player survival match.',
        'Free Fire Battle Royale: 48-player squad clash.'
      ]
    }
  },
  support: {
    id: 'support',
    title: '24/7 WhatsApp Support',
    badge: 'Instant Customer Care',
    content: {
      heading: 'Direct Admin Helpline & Support',
      description: 'Kisi bhi masle ya inquiry k liye official helpline par foran rabta karein:',
      points: [
        'Official WhatsApp Number: 03158812124',
        'Account Name: Muhammad Nadir (Squard War Official)',
        'Available Hours: 24/7 round the clock match assistance',
        'Deposit verification, room help, and winner claims fast-tracked.'
      ]
    }
  },
  about: {
    id: 'about',
    title: 'About Squard War',
    badge: 'Esports Platform Pakistan',
    content: {
      heading: 'Pakistan Ka No.1 Competitive Mobile Gaming Platform',
      description: 'Squard War esports gaming community ka premier hub hai jahan Pakistan k top mobile gamers PUBG Mobile aur Free Fire me compete karte hain.',
      points: [
        'Fair Play verified custom rooms with automated slot management.',
        'Transparent diamond balance, instant booking, and guaranteed cashouts.',
        'Active community on YouTube, TikTok, Instagram, Facebook, and WhatsApp.'
      ]
    }
  }
};

export const SocialFooter: React.FC = () => {
  const [activeModalTopic, setActiveModalTopic] = useState<PolicyTopic | null>(null);

  const openTopic = (topic: PolicyTopic, e: React.MouseEvent) => {
    e.preventDefault();
    setActiveModalTopic(topic);
  };

  const currentTopic = activeModalTopic ? TOPIC_DETAILS[activeModalTopic] : null;

  return (
    <>
      {/* Google Mobile-Style Minimal 3-Line Bottom Footer */}
      <footer className="w-full mt-6 bg-[#0f0b08] border-t border-[#251b14] text-[#9aa0a6] font-sans antialiased relative z-10 select-none">
        
        {/* Top Location Bar (Google Mobile "Pakistan" style) */}
        <div className="max-w-4xl mx-auto px-4 py-2.5 sm:py-3 border-b border-[#211710] flex items-center text-xs sm:text-[13px] text-amber-200/60 font-medium">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
            <span className="text-amber-100 font-semibold tracking-wide">Pakistan</span>
          </div>
        </div>

        {/* 3 Minimal Clean Lines Container */}
        <div className="max-w-4xl mx-auto px-3 py-3 space-y-2 text-center">
          
          {/* LINE 1: Official Social Media Links (YouTube, TikTok, Instagram, Facebook, WhatsApp) */}
          <div className="flex flex-wrap items-center justify-center gap-x-4 sm:gap-x-6 gap-y-1.5 text-[12px] sm:text-[13px]">
            {SOCIAL_LINKS.map((item) => {
              const Icon = item.icon;
              return (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`${item.name} (${item.handle}) - ${item.description}`}
                  className={`inline-flex items-center gap-1.5 py-0.5 text-amber-200/80 ${item.colorScheme.hoverText} transition-colors cursor-pointer group`}
                >
                  <Icon className={`w-3.5 h-3.5 ${item.colorScheme.text} group-hover:scale-110 transition-transform`} />
                  <span className="font-medium group-hover:underline underline-offset-4 decoration-amber-500/50">
                    {item.name}
                  </span>
                  {item.id === 'whatsapp' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                  )}
                </a>
              );
            })}
          </div>

          {/* LINE 2: Privacy Policy & Terms Line */}
          <div className="flex flex-wrap items-center justify-center gap-x-4 sm:gap-x-6 gap-y-1.5 text-[11.5px] sm:text-[12.5px] text-amber-200/65">
            <button
              type="button"
              onClick={(e) => openTopic('privacy', e)}
              className="hover:text-amber-100 hover:underline underline-offset-4 decoration-amber-500/40 transition-colors cursor-pointer"
            >
              Privacy Policy
            </button>
            <span className="text-amber-200/25">•</span>
            <button
              type="button"
              onClick={(e) => openTopic('terms', e)}
              className="hover:text-amber-100 hover:underline underline-offset-4 decoration-amber-500/40 transition-colors cursor-pointer"
            >
              Terms of Service
            </button>
            <span className="text-amber-200/25">•</span>
            <button
              type="button"
              onClick={(e) => openTopic('refund', e)}
              className="hover:text-amber-100 hover:underline underline-offset-4 decoration-amber-500/40 transition-colors cursor-pointer"
            >
              Refund Policy
            </button>
            <span className="text-amber-200/25">•</span>
            <button
              type="button"
              onClick={(e) => openTopic('payment', e)}
              className="hover:text-amber-100 hover:underline underline-offset-4 decoration-amber-500/40 transition-colors cursor-pointer"
            >
              Payment Policy
            </button>
          </div>

          {/* LINE 3: FAQ & About Line */}
          <div className="flex flex-wrap items-center justify-center gap-x-4 sm:gap-x-6 gap-y-1.5 text-[11.5px] sm:text-[12.5px] text-amber-200/65">
            <button
              type="button"
              onClick={(e) => openTopic('faq', e)}
              className="hover:text-amber-100 hover:underline underline-offset-4 decoration-amber-500/40 transition-colors cursor-pointer font-medium"
            >
              FAQ
            </button>
            <span className="text-amber-200/25">•</span>
            <button
              type="button"
              onClick={(e) => openTopic('about', e)}
              className="hover:text-amber-100 hover:underline underline-offset-4 decoration-amber-500/40 transition-colors cursor-pointer"
            >
              About Us
            </button>
          </div>

          {/* Copyright Minimal Footer Line */}
          <div className="pt-2 text-[10.5px] text-amber-300/40 font-mono flex items-center justify-center gap-2">
            <span>© 2026 Squard War Esports</span>
            <span>•</span>
            <span>All Rights Reserved</span>
          </div>
        </div>
      </footer>

      {/* Interactive Policy & FAQ Information Modal */}
      {currentTopic && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className="w-full max-w-lg bg-[#140c07] border border-amber-600/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-amber-900/40 flex items-center justify-between bg-gradient-to-r from-[#1c120a] to-[#120804]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
                  {currentTopic.id === 'privacy' && <Shield className="w-4 h-4" />}
                  {currentTopic.id === 'terms' && <FileText className="w-4 h-4" />}
                  {currentTopic.id === 'fairplay' && <AlertTriangle className="w-4 h-4 text-red-400" />}
                  {currentTopic.id === 'refund' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  {currentTopic.id === 'payment' && <Sparkles className="w-4 h-4 text-amber-400" />}
                  {currentTopic.id === 'faq' && <HelpCircle className="w-4 h-4 text-cyan-400" />}
                  {currentTopic.id === 'howto' && <BookOpen className="w-4 h-4 text-yellow-400" />}
                  {currentTopic.id === 'timing' && <Sparkles className="w-4 h-4 text-amber-400" />}
                  {currentTopic.id === 'support' && <Phone className="w-4 h-4 text-emerald-400" />}
                  {currentTopic.id === 'about' && <Sparkles className="w-4 h-4 text-amber-400" />}
                </div>
                <div>
                  <h3 className="font-heading font-black text-sm uppercase tracking-wide text-white">
                    {currentTopic.title}
                  </h3>
                  <p className="text-[10px] text-amber-300 font-mono">
                    {currentTopic.badge}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveModalTopic(null)}
                className="w-8 h-8 rounded-full bg-amber-950/40 hover:bg-amber-900/60 text-amber-300/80 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs text-amber-100/90 leading-relaxed">
              <div className="p-3 rounded-xl bg-[#0e0703] border border-amber-900/40">
                <h4 className="font-bold text-amber-300 mb-1 text-sm">
                  {currentTopic.content.heading}
                </h4>
                <p className="text-amber-200/70 text-[11.5px]">
                  {currentTopic.content.description}
                </p>
              </div>

              <div className="space-y-2">
                <div className="text-[10px] uppercase font-mono tracking-wider text-amber-400/80 font-bold">
                  Key Rules & Guidelines:
                </div>
                <div className="space-y-2">
                  {currentTopic.content.points.map((pt, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 p-2 rounded-lg bg-[#180e07]/60 border border-amber-950/60">
                      <span className="w-5 h-5 rounded-md bg-amber-500/20 text-amber-400 font-mono text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="text-[11.5px] text-amber-100/85">
                        {pt}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Direct WhatsApp Quick Contact in Modal */}
              <div className="pt-2 border-t border-amber-950/60 flex items-center justify-between gap-2">
                <div className="text-[11px] text-amber-300/70">
                  Direct WhatsApp: <strong className="text-emerald-400 font-mono">03158812124</strong>
                </div>
                <a
                  href="https://wa.me/923158812124"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer shadow"
                >
                  <WhatsAppIcon className="w-3.5 h-3.5" />
                  <span>Chat Admin</span>
                </a>
              </div>
            </div>

            {/* Modal Quick Switch Tabs (Topic Selector) */}
            <div className="px-4 py-2.5 bg-[#0a0503] border-t border-amber-950/60 flex items-center gap-2 overflow-x-auto text-[10.5px] font-medium no-scrollbar">
              {(['privacy', 'terms', 'refund', 'payment', 'faq', 'about'] as PolicyTopic[]).map((tid) => (
                <button
                  key={tid}
                  type="button"
                  onClick={() => setActiveModalTopic(tid)}
                  className={`px-2.5 py-1 rounded-md shrink-0 transition-colors cursor-pointer ${
                    activeModalTopic === tid
                      ? 'bg-amber-500 text-black font-bold'
                      : 'text-amber-300/70 hover:text-white hover:bg-amber-950/60'
                  }`}
                >
                  {TOPIC_DETAILS[tid].title}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Deprecated component kept as dummy export to avoid breaking imports
export const SocialBottomBar: React.FC = () => null;
