import React from 'react';

type StatusType = 'online' | 'offline' | 'loading' | 'warning';

interface StatusIndicatorProps {
  status: StatusType;
  label?: string;
  className?: string;
}

const statusColors: Record<StatusType, string> = {
  online: 'bg-emerald-500',
  offline: 'bg-rose-500',
  loading: 'bg-amber-500 animate-pulse',
  warning: 'bg-amber-500',
};

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  label,
  className = '',
}) => {
  const dotColor = statusColors[status];

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <span className={`inline-block h-2 w-2 rounded-full ${dotColor}`} />
      {label && <span className="text-xs font-medium text-neutral-300">{label}</span>}
    </div>
  );
};
