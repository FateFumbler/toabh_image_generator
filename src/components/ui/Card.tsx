import { clsx, type ClassValue } from '../../utils/clsx';

function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

// Main Card Component
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'bordered' | 'elevated' | 'ghost';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
}

export function Card({
  children,
  variant = 'default',
  padding = 'md',
  hover = false,
  className,
  ...props
}: CardProps) {
  const variants = {
    default: 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm',
    bordered: 'bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700',
    elevated: 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg',
    ghost: 'bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700',
  };

  const paddings = {
    none: '',
    sm: 'p-3',
    md: 'p-5',
    lg: 'p-8',
  };

  return (
    <div
      className={cn(
        'rounded-xl transition-all duration-200',
        variants[variant],
        paddings[padding],
        hover && 'hover:shadow-md hover:-translate-y-0.5 cursor-pointer',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// Card Header
export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}

export function CardHeader({
  title,
  subtitle,
  action,
  icon,
  children,
  className,
  ...props
}: CardHeaderProps) {
  return (
    <div
      className={cn(
        'flex items-start justify-between gap-4',
        className
      )}
      {...props}
    >
      <div className="flex items-start gap-3 min-w-0">
        {icon && (
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          {title && (
            <h3 className="font-semibold text-slate-900 dark:text-white truncate">{title}</h3>
          )}
          {subtitle && (
            <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{subtitle}</p>
          )}
          {children}
        </div>
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

// Card Content
export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  divider?: boolean;
}

export function CardContent({
  divider = false,
  className,
  children,
  ...props
}: CardContentProps) {
  return (
    <div
      className={cn(
        divider && 'pt-4 mt-4 border-t border-slate-100 dark:border-slate-700',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// Card Footer
export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: 'left' | 'center' | 'right' | 'between';
}

export function CardFooter({
  align = 'between',
  className,
  children,
  ...props
}: CardFooterProps) {
  const aligns = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
    between: 'justify-between',
  };

  return (
    <div
      className={cn(
        'flex items-center gap-3 pt-4 mt-4 border-t border-slate-100 dark:border-slate-700',
        aligns[align],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// Stats Card - Pre-configured for displaying statistics
export interface StatsCardProps {
  title: string;
  value: string | number;
  trend?: {
    value: string;
    positive?: boolean;
  };
  icon?: React.ReactNode;
  color?: 'blue' | 'green' | 'purple' | 'amber' | 'red';
  onClick?: () => void;
}

export function StatsCard({
  title,
  value,
  trend,
  icon,
  color = 'blue',
  onClick,
}: StatsCardProps) {
  const colors = {
    blue: {
      bg: 'bg-blue-50 dark:bg-blue-950',
      icon: 'text-blue-600 dark:text-blue-400',
      trend: 'text-blue-600 dark:text-blue-400',
    },
    green: {
      bg: 'bg-emerald-50 dark:bg-emerald-950',
      icon: 'text-emerald-600 dark:text-emerald-400',
      trend: 'text-emerald-600 dark:text-emerald-400',
    },
    purple: {
      bg: 'bg-violet-50 dark:bg-violet-950',
      icon: 'text-violet-600 dark:text-violet-400',
      trend: 'text-violet-600 dark:text-violet-400',
    },
    amber: {
      bg: 'bg-amber-50 dark:bg-amber-950',
      icon: 'text-amber-600 dark:text-amber-400',
      trend: 'text-amber-600 dark:text-amber-400',
    },
    red: {
      bg: 'bg-red-50 dark:bg-red-950',
      icon: 'text-red-600 dark:text-red-400',
      trend: 'text-red-600 dark:text-red-400',
    },
  };

  return (
    <Card
      variant="default"
      padding="md"
      hover={!!onClick}
      onClick={onClick}
      className={cn(onClick && 'cursor-pointer')}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{value}</p>
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              <svg
                className={cn(
                  'w-3.5 h-3.5',
                  trend.positive !== false ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400',
                  trend.positive !== false ? '' : 'rotate-180'
                )}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 10l7-7m0 0l7 7m-7-7v18"
                />
              </svg>
              <span
                className={cn(
                  'text-xs font-medium',
                  trend.positive !== false ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                )}
              >
                {trend.value}
              </span>
            </div>
          )}
        </div>
        {icon && (
          <div
            className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center',
              colors[color].bg
            )}
          >
            <span className={colors[color].icon}>{icon}</span>
          </div>
        )}
      </div>
    </Card>
  );
}

// Info Card - For displaying information with icon
export interface InfoCardProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  variant?: 'info' | 'success' | 'warning' | 'error';
}

export function InfoCard({
  title,
  description,
  icon,
  action,
  variant = 'info',
}: InfoCardProps) {
  const variants = {
    info: {
      bg: 'bg-blue-50 dark:bg-blue-950',
      border: 'border-blue-200 dark:border-blue-800',
      icon: 'text-blue-600 dark:text-blue-400',
      title: 'text-blue-900 dark:text-blue-100',
      description: 'text-blue-700 dark:text-blue-300',
    },
    success: {
      bg: 'bg-emerald-50 dark:bg-emerald-950',
      border: 'border-emerald-200 dark:border-emerald-800',
      icon: 'text-emerald-600 dark:text-emerald-400',
      title: 'text-emerald-900 dark:text-emerald-100',
      description: 'text-emerald-700 dark:text-emerald-300',
    },
    warning: {
      bg: 'bg-amber-50 dark:bg-amber-950',
      border: 'border-amber-200 dark:border-amber-800',
      icon: 'text-amber-600 dark:text-amber-400',
      title: 'text-amber-900 dark:text-amber-100',
      description: 'text-amber-700 dark:text-amber-300',
    },
    error: {
      bg: 'bg-red-50 dark:bg-red-950',
      border: 'border-red-200 dark:border-red-800',
      icon: 'text-red-600 dark:text-red-400',
      title: 'text-red-900 dark:text-red-100',
      description: 'text-red-700 dark:text-red-300',
    },
  };

  const style = variants[variant];

  return (
    <div
      className={cn(
        'rounded-xl border p-4 flex items-start gap-3',
        style.bg,
        style.border
      )}
    >
      {icon && <span className={cn('flex-shrink-0 mt-0.5', style.icon)}>{icon}</span>}
      <div className="flex-1 min-w-0">
        <h4 className={cn('font-medium', style.title)}>{title}</h4>
        <p className={cn('text-sm mt-0.5', style.description)}>{description}</p>
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

// Skeleton Card for loading states
export interface SkeletonCardProps {
  lines?: number;
  hasHeader?: boolean;
  hasFooter?: boolean;
}

export function SkeletonCard({
  lines = 2,
  hasHeader = true,
  hasFooter = false,
}: SkeletonCardProps) {
  return (
    <Card variant="default" padding="md">
      {hasHeader && (
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse" />
          <div className="flex-1">
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-1/3" />
            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-1/2 mt-2" />
          </div>
        </div>
      )}
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'h-3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse',
              i === lines - 1 ? 'w-2/3' : 'w-full'
            )}
          />
        ))}
      </div>
      {hasFooter && (
        <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 dark:border-slate-700">
          <div className="h-8 w-20 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
          <div className="h-8 w-20 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
        </div>
      )}
    </Card>
  );
}
