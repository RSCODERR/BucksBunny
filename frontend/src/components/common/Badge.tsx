import React from 'react';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}

const variantStyles: Record<BadgeVariant, string> = {
  success: 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60',
  warning: 'bg-amber-950/40 text-amber-300 border-amber-800/60',
  error: 'bg-rose-950/40 text-rose-300 border-rose-800/60',
  info: 'bg-slate-800/70 text-slate-300 border-slate-700',
  neutral: 'bg-neutral-900 text-neutral-300 border-neutral-800',
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  children,
  className = '',
  icon,
}) => {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-md border ${variantStyles[variant]} ${className}`}
    >
      {icon && <span className="w-3.5 h-3.5 flex items-center justify-center shrink-0">{icon}</span>}
      {children}
    </span>
  );
};
