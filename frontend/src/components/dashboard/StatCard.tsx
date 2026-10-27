import React from 'react';
import type { LucideIcon } from 'lucide-react';

export interface StatCardProps {
  icon: LucideIcon | React.ReactNode;
  title?: string;
  label?: string;
  value: string;
  subtitle?: string;
  sub?: string;
  trend?: string;
  trendUp?: boolean;
  iconBg?: string;
  iconColor?: string;
}

export function StatCard({
  icon: IconOrElement,
  title,
  label,
  value,
  subtitle,
  sub,
  trend,
  trendUp = true,
  iconBg,
  iconColor,
}: StatCardProps) {
  const displayTitle = title ?? label ?? '';
  const displaySub = subtitle ?? sub;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-3">
      <div className="flex items-center justify-between">
        <div
          className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800"
          style={{ background: iconBg }}
        >
          {React.isValidElement(IconOrElement) ? (
            IconOrElement
          ) : typeof IconOrElement === 'function' ? (
            <IconOrElement size={20} style={{ color: iconColor }} />
          ) : null}
        </div>

        {trend && (
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              trendUp
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
            }`}
          >
            {trend}
          </span>
        )}
      </div>

      <div>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          {displayTitle}
        </p>
        <p className="text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">
          {value}
        </p>
        {displaySub && (
          <p className="text-xs text-slate-400 mt-1 font-medium">
            {displaySub}
          </p>
        )}
      </div>
    </div>
  );
}
