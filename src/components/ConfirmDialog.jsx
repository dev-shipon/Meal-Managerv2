import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useConfirm } from '../contexts/ToastContext';
import { AlertTriangle, Trash2 } from 'lucide-react';

export default function ConfirmDialog() {
  const { dialog } = useConfirm();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (dialog) {
      const t = setTimeout(() => setVisible(true), 10);
      return () => clearTimeout(t);
    } else {
      setVisible(false);
    }
  }, [dialog]);

  if (!dialog) return null;

  return createPortal(
    <div
      className="fixed inset-0  flex items-center justify-center p-4"
      style={{ zIndex: 99999,
        transition: 'background 0.25s',
        background: visible ? 'rgba(15, 23, 42, 0.55)' : 'rgba(15, 23, 42, 0)',
        backdropFilter: visible ? 'blur(4px)' : 'none',
      }}
      onClick={dialog.onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 border border-slate-100"
        style={{
          transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          transform: visible ? 'translateY(0) scale(1)' : 'translateY(40px) scale(0.95)',
          opacity: visible ? 1 : 0,
        }}
      >
        {/* Icon */}
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 ${dialog.danger ? 'bg-rose-50' : 'bg-amber-50'}`}>
          {dialog.danger
            ? <Trash2 size={28} className="text-rose-500" strokeWidth={2} />
            : <AlertTriangle size={28} className="text-amber-500" strokeWidth={2} />
          }
        </div>

        {/* Title */}
        <h3 className="text-lg font-black text-slate-800 text-center mb-2">{dialog.title}</h3>

        {/* Message */}
        <p className="text-sm text-slate-500 font-medium text-center leading-relaxed mb-6">{dialog.message}</p>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={dialog.onCancel}
            className="flex-1 py-3 px-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 active:scale-95 transition-all"
          >
            {dialog.cancelText}
          </button>
          <button
            onClick={dialog.onConfirm}
            className={`flex-1 py-3 px-4 font-black rounded-2xl active:scale-95 transition-all shadow-lg text-white ${
              dialog.danger
                ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-200'
                : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
            }`}
          >
            {dialog.confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
