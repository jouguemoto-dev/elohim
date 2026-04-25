import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning';
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirmar Exclusão",
  cancelLabel = "Cancelar",
  variant = 'danger'
}: ConfirmModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-zinc-900 border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden p-8 text-center"
          >
            <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-2xl border ${
              variant === 'danger' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
            }`}>
              <AlertTriangle size={40} />
            </div>

            <h3 className="text-xl font-black text-white mb-3 tracking-tight uppercase">{title}</h3>
            <p className="text-xs text-zinc-500 mb-10 leading-relaxed uppercase tracking-widest font-bold font-mono">
              {message}
            </p>

            <div className="flex flex-col gap-3">
              <button 
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-2xl active:scale-95 ${
                  variant === 'danger' ? 'bg-red-500 text-white hover:bg-red-600 shadow-red-500/20' : 'bg-amber-500 text-white hover:bg-amber-600 shadow-amber-500/20'
                }`}
              >
                {confirmLabel}
              </button>
              <button 
                onClick={onClose}
                className="w-full py-4 bg-white/5 text-zinc-500 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-white/10 hover:text-white transition-all"
              >
                {cancelLabel}
              </button>
            </div>

            <button 
              onClick={onClose}
              className="absolute top-6 right-6 p-2 text-zinc-700 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
