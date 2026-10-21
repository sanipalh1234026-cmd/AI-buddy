import React from 'react';
import {
  X,
  ShieldCheck,
  Lock,
  AlertTriangle,
  HeartPulse,
  Scale,
  KeyRound,
  CheckCircle,
} from 'lucide-react';

interface SafetyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SafetyModal: React.FC<SafetyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-lg w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Safety & Privacy Shield</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">How AI Buddy protects you and your data</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs text-gray-700 dark:text-gray-300">
          {/* Section 1: PII Protection */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40 space-y-2">
            <div className="flex items-center gap-2 font-bold text-emerald-800 dark:text-emerald-400 text-sm">
              <Lock className="w-4 h-4" />
              <span>Personal Information Protection</span>
            </div>
            <p className="leading-relaxed">
              AI Buddy includes real-time client & server scanning for sensitive identifiers:
            </p>
            <ul className="space-y-1 list-disc list-inside text-emerald-900 dark:text-emerald-200 pl-1">
              <li>Credit and debit card numbers</li>
              <li>Government IDs and Social Security Numbers (SSN)</li>
              <li>Passwords and private credentials</li>
              <li>API secret keys and authorization tokens</li>
            </ul>
          </div>

          {/* Section 2: Important Disclaimers */}
          <div className="space-y-3">
            <h3 className="font-bold text-gray-900 dark:text-white uppercase tracking-wider text-[11px]">
              Critical Advisory Warnings
            </h3>

            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60 flex items-start gap-3">
              <HeartPulse className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-gray-900 dark:text-white block">Medical Disclaimer</span>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed mt-0.5">
                  AI Buddy does not dispense medical diagnoses, prescriptions, or emergency healthcare treatments. Always consult a qualified medical professional for health inquiries.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60 flex items-start gap-3">
              <Scale className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-gray-900 dark:text-white block">Legal Disclaimer</span>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed mt-0.5">
                  Information provided by AI Buddy is intended solely for educational, exploratory, and informational purposes, not professional legal counsel or formal binding representation.
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Content Ethics */}
          <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/50 dark:border-indigo-900/30 space-y-1.5">
            <span className="font-bold text-indigo-900 dark:text-indigo-300 block">
              Responsible AI Principles
            </span>
            <p className="text-[11px] text-indigo-800 dark:text-indigo-200 leading-relaxed">
              AI Buddy adheres strictly to high safety standards. Malicious attempts to generate hate speech, self-harm instructions, malware, or cyber exploits are strictly prohibited and actively prevented.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition cursor-pointer"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
};
