import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../contexts/ToastContext';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const TOAST_CONFIG = {
  success: {
    icon: CheckCircle,
    color: 'emerald',
    iconColor: 'bg-emerald-100 text-emerald-600',
    border: 'border-emerald-100',
    bar: 'bg-emerald-500',
  },
  error: {
    icon: XCircle,
    color: 'rose',
    iconColor: 'bg-rose-100 text-rose-600',
    border: 'border-rose-100',
    bar: 'bg-rose-500',
  },
  warning: {
    icon: AlertTriangle,
    color: 'amber',
    iconColor: 'bg-amber-100 text-amber-600',
    border: 'border-amber-100',
    bar: 'bg-amber-500',
  },
  info: {
    icon: Info,
    color: 'sky',
    iconColor: 'bg-sky-100 text-sky-600',
    border: 'border-sky-100',
    bar: 'bg-sky-500',
  },
};

function ToastItem({ toast, onRemove }) {
  const config = TOAST_CONFIG[toast.type] || TOAST_CONFIG.info;
  const Icon = config.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, y: 10, transition: { duration: 0.2 } }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={(_, info) => {
        if (Math.abs(info.offset.x) > 100) onRemove(toast.id);
      }}
      className={`group relative flex items-center gap-3 p-4 pr-10 mb-2 bg-white/90 backdrop-blur-xl rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] border ${config.border} min-w-[320px] max-w-[400px] pointer-events-auto cursor-grab active:cursor-grabbing overflow-hidden`}
    >
      <div className={`flex-shrink-0 w-10 h-10 rounded-xl ${config.iconColor} flex items-center justify-center shadow-sm`}>
        <Icon size={20} strokeWidth={2.5} />
      </div>
      
      <div className="flex-1">
        <p className="text-slate-800 text-sm font-bold leading-tight">{toast.message}</p>
      </div>

      <button
        onClick={() => onRemove(toast.id)}
        className="absolute top-2 right-2 p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
      >
        <X size={16} strokeWidth={2.5} />
      </button>

      {/* Modern Progress Bar */}
      <motion.div
        initial={{ width: "100%" }}
        animate={{ width: "0%" }}
        transition={{ duration: toast.duration / 1000, ease: "linear" }}
        className={`absolute bottom-0 left-0 h-1 ${config.bar} opacity-60`}
      />
    </motion.div>
  );
}

export default function Toast() {
  const { toasts, removeToast } = useToast();

  return createPortal(
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999999] flex flex-col items-center pointer-events-none w-full px-4 max-h-screen overflow-hidden">
      <AnimatePresence mode="popLayout" initial={false}>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </AnimatePresence>
    </div>,
    document.body
  );
}

