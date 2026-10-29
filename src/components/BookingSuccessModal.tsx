import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Copy, 
  Check, 
  X 
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
