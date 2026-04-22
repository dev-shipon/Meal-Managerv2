import React, { createContext, useContext, useCallback, useState } from 'react';

const ToastContext = createContext(null);
const ConfirmContext = createContext(null);

let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info', duration = 3500) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type, duration }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration + 400); // extra for exit animation
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, toasts, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

// ---- Confirm Dialog Context ----
export function ConfirmDialogProvider({ children }) {
  const [dialog, setDialog] = useState(null);

  const showConfirm = useCallback((options) => {
    return new Promise((resolve) => {
      setDialog({
        title: options.title || 'নিশ্চিত করুন',
        message: options.message || 'আপনি কি নিশ্চিত?',
        confirmText: options.confirmText || 'হ্যাঁ',
        cancelText: options.cancelText || 'বাতিল',
        danger: options.danger ?? false,
        onConfirm: () => { setDialog(null); resolve(true); },
        onCancel: () => { setDialog(null); resolve(false); },
      });
    });
  }, []);

  return (
    <ConfirmContext.Provider value={{ showConfirm, dialog }}>
      {children}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmDialogProvider');
  return ctx;
}
