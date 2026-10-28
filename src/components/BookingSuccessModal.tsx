import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Copy, 
  Check, 
  X, 
  ShieldAlert, 
  Clock, 
  Coins, 
  Flame, 
  AlertTriangle 
} from 'lucide-react';

interface BookingSuccessModalProps {
  isOpen: boolean;
  booking: any;
  onClose: () => void;
  onOpenLookup: (query: string) => void;
}

export const BookingSuccessModal: React.FC<BookingSuccessModalProps> = ({
  isOpen,
  booking,
  onClose,
  onOpenLookup
}) => {
  const [copiedId, setCopiedId] = useState(false);
  const [copiedTrx, setCopiedTrx] = useState(false);

  if (!isOpen || !booking) return null;

  const copy = (text: string, type: 'id' | 'trx') => {
    navigator.clipboard.writeText(text);
    if (type === 'id') {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } else {
      setCopiedTrx(true);
      setTimeout(() => setCopiedTrx(false), 2000);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-lg bg-gradient-to-b from-[#0a172f] to-[#070e1c] border border-cyan-500/60 rounded-2xl p-5 sm:p-6 shadow-[0_0_50px_rgba(0,240,255,0.25)] text-center my-auto max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close 'X' Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Success Icon */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-400 flex items-center justify-center text-emerald-400 mx-auto mb-3 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <h3 className="font-heading text-2xl font-black text-white uppercase tracking-wide">
          BOOKING SUBMITTED SUCCESSFULLY!
        </h3>
        <p className="text-xs text-cyan-200/90 mt-0.5">
          Your seat(s) in Team {booking.teamNumber} have been confirmed and reserved.
        </p>

        {/* Reservation Details Card */}
        <div className="my-4 p-4 rounded-xl bg-slate-900/90 border border-emerald-500/50 text-left space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Status:</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold font-mono border border-emerald-500/40">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              SEAT RESERVED / CONFIRMED
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Team &amp; Seats:</span>
            <span className="font-bold text-white font-mono">
              Team {booking.teamNumber} · Seat(s) {booking.seatNumbers ? booking.seatNumbers.join(', ') : 'Confirmed'}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Transaction ID:</span>
            <div className="flex items-center gap-1">
              <span className="font-mono text-cyan-300 font-bold">{booking.transactionRef}</span>
              <button
                type="button"
                onClick={() => copy(booking.transactionRef, 'trx')}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                title="Copy Transaction ID"
              >
                {copiedTrx ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Booking Reference:</span>
            <div className="flex items-center gap-1">
              <span className="font-mono text-slate-300 text-[11px] truncate max-w-[160px]">
                {booking.id}
              </span>
              <button
                type="button"
                onClick={() => copy(booking.id, 'id')}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                title="Copy Reference"
              >
                {copiedId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </div>
        </div>

        {/* OFFICIAL TOURNAMENT RULES (As requested by user) */}
        <div className="text-left bg-gradient-to-br from-amber-950/40 via-slate-900 to-black/60 p-4 rounded-xl border border-amber-500/60 mb-5 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-400">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Important Match Rules &amp; Prize Distribution</span>
          </div>

          <div className="space-y-2 text-xs text-slate-200">
            {/* Rule 1 */}
            <div className="flex items-start gap-2.5 p-2 rounded-lg bg-black/40 border border-slate-800">
              <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 font-bold font-mono text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                1
              </span>
              <div className="font-medium text-slate-200">
                <strong className="text-amber-300">Payment Non-Refundable:</strong> Kisi bhi surat me seat cancel ya refund nahi hogi.
              </div>
            </div>

            {/* Rule 2 */}
            <div className="flex items-start gap-2.5 p-2 rounded-lg bg-black/40 border border-slate-800">
              <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold font-mono text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                2
              </span>
              <div className="font-medium text-slate-200">
                <strong className="text-cyan-300">15-Min Room Window:</strong> Room sirf 15 minute tak khula rahega. Sab ko 15 minute ke andar game lobby join karna lazmi hoga, 15 minute baad match start ho jayega.
              </div>
            </div>

            {/* Rule 3 */}
            <div className="flex items-start gap-2.5 p-2 rounded-lg bg-black/40 border border-slate-800">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold font-mono text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                3
              </span>
              <div className="font-medium text-slate-200">
                <strong className="text-emerald-300">Per Kill 100 Diamonds Reward:</strong> Room ke end hote hi payment <span className="text-amber-400 font-bold font-mono">1 Kill = 100 Diamonds</span> aapke account me direct transfer ho jayenge.
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer border border-slate-700 hover:border-slate-600 active:scale-95 shadow-md"
          >
            DONE
          </button>
          <button
            type="button"
            onClick={() => onOpenLookup(booking.transactionRef || booking.id)}
            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer active:scale-95 shadow-[0_0_15px_rgba(0,240,255,0.3)]"
          >
            TRACK STATUS
          </button>
        </div>
      </div>
    </div>
  );
};
