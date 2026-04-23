import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useConfirm } from '../contexts/ToastContext';
import { AlertTriangle, Trash2 } from 'lucide-react';

export default function ConfirmDialog() {
  const { dialog } = useConfirm();

  return createPortal(
    <AnimatePresence>
      {dialog && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={dialog.onCancel}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-[6px]"
          />

          {/* Dialog Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", damping: 25, stiffness: 400 }}
            className="relative bg-white rounded-[2.5rem] shadow-2xl max-w-sm w-full p-8 border border-white/20"
          >
            {/* Icon Decoration */}
            <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 ${dialog.danger ? 'bg-rose-50' : 'bg-amber-50'}`}>
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${dialog.danger ? 'bg-rose-100' : 'bg-amber-100'}`}>
                {dialog.danger
                  ? <Trash2 size={32} className="text-rose-600" strokeWidth={2.5} />
                  : <AlertTriangle size={32} className="text-amber-600" strokeWidth={2.5} />
                }
              </div>
            </div>

            {/* Content */}
            <h3 className="text-2xl font-black text-slate-800 text-center mb-3 leading-tight">{dialog.title}</h3>
            <p className="text-slate-500 font-medium text-center leading-relaxed mb-8 px-2">{dialog.message}</p>

            {/* Actions */}
            <div className="flex gap-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={dialog.onCancel}
                className="flex-1 py-4 px-6 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-colors"
              >
                {dialog.cancelText}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={dialog.onConfirm}
                className={`flex-1 py-4 px-6 font-black rounded-2xl shadow-xl shadow-slate-200 text-white transition-all ${
                  dialog.danger
                    ? 'bg-gradient-to-br from-rose-500 to-rose-600'
                    : 'bg-gradient-to-br from-indigo-500 to-indigo-600'
                }`}
              >
                {dialog.confirmText}
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
