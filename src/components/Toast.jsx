import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useToast } from '../contexts/ToastContext';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const TOAST_CONFIG = {
  success: {
    icon: CheckCircle,
    bg: 'bg-emerald-500',
    border: 'border-emerald-400',
    bar: 'bg-emerald-300',
    text: 'text-white',
    shadow: 'shadow-emerald-200',
  },
  error: {
    icon: XCircle,
    bg: 'bg-red-500',
    border: 'border-red-400',
    bar: 'bg-red-300',
    text: 'text-white',
    shadow: 'shadow-red-200',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-amber-500',
    border: 'border-amber-400',
    bar: 'bg-amber-300',
    text: 'text-white',
    shadow: 'shadow-amber-200',
  },
  info: {
    icon: Info,
    bg: 'bg-blue-500',
    border: 'border-blue-400',
    bar: 'bg-blue-300',
    text: 'text-white',
    shadow: 'shadow-blue-200',
  },
};

function ToastItem({ toast, onRemove }) {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const config = TOAST_CONFIG[toast.type] || TOAST_CONFIG.info;
  const Icon = config.icon;

  useEffect(() => {
    const showTimer = setTimeout(() => setVisible(true), 10);
    const hideTimer = setTimeout(() => {
      setLeaving(true);
      setTimeout(() => onRemove(toast.id), 350);
    }, toast.duration);
    return () => { clearTimeout(showTimer); clearTimeout(hideTimer); };
  }, []);

  const handleClose = () => {
    setLeaving(true);
    setTimeout(() => onRemove(toast.id), 350);
  };

  return (
    <div
      style={{
        transition: 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
        transform: visible && !leaving ? 'translateY(0) scale(1)' : 'translateY(-20px) scale(0.93)',
        opacity: visible && !leaving ? 1 : 0,
        pointerEvents: leaving ? 'none' : 'auto',
      }}
      className={`relative flex items-start gap-3 px-4 py-3 rounded-2xl shadow-xl ${config.shadow} ${config.bg} ${config.text} border ${config.border} min-w-[260px] max-w-[340px] overflow-hidden`}
      role="alert"
    >
      <Icon size={20} className="flex-shrink-0 mt-0.5" strokeWidth={2.5} />
      <span className="flex-1 text-sm font-semibold leading-snug pr-1">{toast.message}</span>
      <button
        onClick={handleClose}
        className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity mt-0.5"
        aria-label="বন্ধ করুন"
      >
        <X size={16} strokeWidth={2.5} />
      </button>
      {/* Progress bar */}
      <div
        className={`absolute bottom-0 left-0 h-1 ${config.bar} rounded-full`}
        style={{
          animation: `toast-progress ${toast.duration}ms linear forwards`,
        }}
      />
      <style>{`
        @keyframes toast-progress {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}

export default function Toast() {
  const { toasts, removeToast } = useToast();

  if (!toasts.length) return null;

  return createPortal(
    <div
      className="fixed left-1/2 flex flex-col items-center gap-3 w-full px-4"
      style={{ top: '24px', transform: 'translateX(-50%)', pointerEvents: 'none', zIndex: 999999 }}
    >
      {toasts.map((toast) => (
        <div key={toast.id} style={{ pointerEvents: 'auto' }}>
          <ToastItem toast={toast} onRemove={removeToast} />
        </div>
      ))}
    </div>,
    document.body
  );
}
