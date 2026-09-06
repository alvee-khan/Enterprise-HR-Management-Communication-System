import React from 'react';

export const StatsCard = ({ title, value, subtitle, icon: Icon, color = 'primary', change, changeType = 'positive' }) => {
  const colorMap = {
    primary: 'bg-primary-50 text-primary-600 dark:bg-primary-950/50 dark:text-primary-400 border-primary-100 dark:border-primary-800/30',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/30',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400 border-amber-100 dark:border-amber-800/30',
    violet: 'bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400 border-violet-100 dark:border-violet-800/30',
    rose: 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 border-rose-100 dark:border-rose-800/30',
    sky: 'bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400 border-sky-100 dark:border-sky-800/30',
  };

  const iconBgMap = {
    primary: 'bg-primary-500/10 text-primary-600 dark:text-primary-400',
    emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    violet: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
    rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    sky: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  };

  return (
    <div className="card p-5 hover:shadow-glow transition-all duration-300 relative overflow-hidden group">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {title}
          </p>
          <h4 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1.5 tracking-tight">
            {value}
          </h4>
          {subtitle && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {subtitle}
            </p>
          )}
          {change && (
            <div className="flex items-center gap-1.5 mt-2">
              <span className={`text-xs font-semibold ${changeType === 'positive' ? 'text-emerald-500' : 'text-rose-500'}`}>
                {change}
              </span>
              <span className="text-[11px] text-slate-400">vs last month</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl transition-transform duration-300 group-hover:scale-110 ${iconBgMap[color] || iconBgMap.primary}`}>
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>
    </div>
  );
};

export default StatsCard;
