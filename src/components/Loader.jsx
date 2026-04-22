import React, { useEffect, useState } from 'react';
import './Loader.css';

/**
 * YouTube-style Skeleton Loading Component
 */
export function SmoothLoader({ show }) {
  const [visible, setVisible] = useState(show);

  useEffect(() => {
    if (!show) {
      const t = setTimeout(() => setVisible(false), 300);
      return () => clearTimeout(t);
    } else {
      setVisible(true);
    }
  }, [show]);

  if (!visible && !show) return null;

  return (
    <div className={`fixed inset-0 z-[200] flex flex-col transition-opacity duration-300 ${show ? 'opacity-100' : 'opacity-0'}`} style={{ backgroundColor: '#f8fafc' }}>
      {/* Skeleton Header */}
      <div className="flex justify-between items-center px-4 py-4 md:px-8 md:py-5 border-b" style={{ borderColor: '#e2e8f0' }}>
        <div className="flex flex-col gap-2">
          <div style={{ height: '24px', width: '150px', backgroundColor: '#e2e8f0', borderRadius: '8px', animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />
          <div style={{ height: '12px', width: '80px', backgroundColor: '#e2e8f0', borderRadius: '8px', animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />
        </div>
        <div className="flex gap-3">
          <div style={{ height: '32px', width: '80px', backgroundColor: '#e2e8f0', borderRadius: '9999px', animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />
          <div style={{ height: '32px', width: '32px', backgroundColor: '#e2e8f0', borderRadius: '9999px', animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite', display: 'block' }} className="hidden md:block" />
        </div>
      </div>

      {/* Skeleton Body */}
      <div className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8 space-y-6">
        {/* Profile/Stats Skeleton */}
        <div className="bg-white p-4 md:p-6 rounded-[2rem] border shadow-sm flex items-center justify-between gap-4" style={{ borderColor: '#f1f5f9' }}>
           <div className="flex items-center gap-3 w-1/2">
             <div style={{ width: '48px', height: '48px', borderRadius: '16px', backgroundColor: '#e2e8f0', animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite', flexShrink: 0 }} />
             <div className="space-y-2 flex-1">
               <div style={{ height: '16px', width: '75%', backgroundColor: '#e2e8f0', borderRadius: '6px', animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />
               <div style={{ height: '8px', width: '50%', backgroundColor: '#e2e8f0', borderRadius: '6px', animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />
             </div>
           </div>
           <div className="flex gap-2 w-1/2 justify-end">
             <div style={{ height: '40px', width: '48px', backgroundColor: '#e2e8f0', borderRadius: '12px', animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />
             <div style={{ height: '40px', width: '48px', backgroundColor: '#e2e8f0', borderRadius: '12px', animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />
           </div>
        </div>

        {/* Dashboard Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div style={{ height: '192px', backgroundColor: '#e2e8f0', borderRadius: '2rem', animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} className="md:col-span-1" />
          <div className="grid grid-cols-2 md:col-span-2 gap-4 h-full">
            <div style={{ height: '128px', backgroundColor: '#e2e8f0', borderRadius: '2rem', animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />
            <div style={{ height: '128px', backgroundColor: '#e2e8f0', borderRadius: '2rem', animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />
            <div style={{ height: '128px', backgroundColor: '#e2e8f0', borderRadius: '2rem', animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} className="col-span-2" />
          </div>
        </div>
      </div>

      {/* Mobile Footer Skeleton */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-200 px-2 flex justify-between items-center" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {[1,2,3,4,5].map(i => (
          <div key={i} className="flex flex-col items-center gap-1 flex-1">
            <div className="w-6 h-6 bg-slate-200 rounded-md animate-pulse" />
            <div className="w-8 h-2 bg-slate-200 rounded-sm animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

export const Loader = () => {
  return <SmoothLoader show={true} />;
};

export default Loader;
