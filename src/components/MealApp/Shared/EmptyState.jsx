import React from 'react';

const EmptyState = ({ icon: Icon, title, subtitle, color = 'indigo', action }) => {
  const cm = {
    indigo: { bg: 'bg-indigo-50', text: 'text-indigo-500', border: 'border-indigo-200', sub: 'text-indigo-300' },
    rose: { bg: 'bg-rose-50', text: 'text-rose-500', border: 'border-rose-200', sub: 'text-rose-300' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-500', border: 'border-emerald-200', sub: 'text-emerald-300' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-500', border: 'border-amber-200', sub: 'text-amber-300' },
    slate: { bg: 'bg-slate-50', text: 'text-slate-400', border: 'border-slate-200', sub: 'text-slate-300' },
  };
  const c = cm[color] || cm.indigo;
  return (
    <div className={`flex flex-col items-center justify-center py-14 px-6 rounded-3xl border-2 border-dashed ${c.border} ${c.bg}`}>
      <div className={`w-16 h-16 rounded-2xl ${c.bg} border ${c.border} flex items-center justify-center mb-4 shadow-sm ${c.text} transform transition-transform hover:scale-110 duration-300`}>
        {Icon && <Icon size={32} strokeWidth={1.5} />}
      </div>
      <p className={`font-black text-base ${c.text} mb-1 text-center`}>{title}</p>
      {subtitle && <p className={`text-xs font-medium text-center max-w-[200px] md:max-w-[300px] ${c.sub}`}>{subtitle}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
};

export default EmptyState;
