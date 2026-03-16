import { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Images, 
  Sparkles, 
  Grid3X3,
  Clock,
  Activity,
  Wand2
} from 'lucide-react';
import { clsx, type ClassValue } from '../utils/clsx';
import * as api from '../api/client';
import type { DashboardStats } from '../types';

function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await api.getStats();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  const statsCards = [
    { 
      title: 'Total Prompts', 
      value: stats?.total_prompts || 0, 
      icon: MessageSquare, 
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
      link: '/prompts'
    },
    { 
      title: 'Reference Images', 
      value: stats?.total_reference_images || 0, 
      icon: Images, 
      color: 'from-emerald-500 to-emerald-600',
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-600',
      link: '/reference'
    },
    { 
      title: 'Generated Images', 
      value: stats?.total_generated || 0, 
      icon: Sparkles, 
      color: 'from-violet-500 to-violet-600',
      bgColor: 'bg-violet-50',
      textColor: 'text-violet-600',
      link: '/gallery'
    },
    { 
      title: 'Gallery Items', 
      value: stats?.total_generated || 0, 
      icon: Grid3X3, 
      color: 'from-amber-500 to-amber-600',
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-600',
      link: '/gallery'
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 mt-1">Welcome back to TOABH Dashboard</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium",
            error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
          )}>
            <Activity className="w-4 h-4" />
            {error ? 'Connection Error' : 'System Online'}
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((card, index) => (
          <a
            key={card.title}
            href={card.link}
            className={cn(
              "bg-white rounded-xl p-5 border border-slate-200 shadow-sm",
              "hover:shadow-md transition-shadow duration-200 block"
            )}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex items-start justify-between">
              <div className={cn(
                "p-3 rounded-lg bg-gradient-to-br",
                card.color
              )}>
                <card.icon className="w-5 h-5 text-white" />
              </div>
              {loading && (
                <div className={cn("animate-pulse w-8 h-4 rounded", card.bgColor)} />
              )}
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold text-slate-900">
                {loading ? '-' : card.value.toLocaleString()}
              </p>
              <p className="text-sm text-slate-500 mt-0.5">{card.title}</p>
            </div>
          </a>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <QuickActionButton
              icon={MessageSquare}
              label="Manage Prompts"
              description="Create, edit, and organize prompts"
              to="/prompts"
              color="blue"
            />
            <QuickActionButton
              icon={Sparkles}
              label="Generate Images"
              description="Start image generation batch"
              to="/generate"
              color="violet"
            />
            <QuickActionButton
              icon={Images}
              label="Upload References"
              description="Add reference image sets"
              to="/reference"
              color="emerald"
            />
            <QuickActionButton
              icon={Wand2}
              label="Prompt Generator"
              description="AI-powered prompt generation"
              to="/prompt-generator"
              color="rose"
            />
            <QuickActionButton
              icon={Grid3X3}
              label="View Gallery"
              description="Browse generated results"
              to="/gallery"
              color="amber"
            />
            <QuickActionButton
              icon={Activity}
              label="System Status"
              description="Check generation progress"
              to="/generate"
              color="cyan"
            />
          </div>
        </div>

        {/* System Info */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">System Status</h2>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>
          
          {error ? (
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <p className="text-sm text-red-700">{error}</p>
              <button
                onClick={loadStats}
                className="mt-2 text-sm text-red-600 hover:text-red-800 font-medium"
              >
                Retry
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <StatusItem 
                label="Backend Connection" 
                status={!loading ? 'connected' : 'loading'} 
              />
              <StatusItem 
                label="Image Generation" 
                status="ready" 
              />
              <StatusItem 
                label="Database" 
                status={!loading ? 'connected' : 'loading'} 
              />
              <StatusItem 
                label="API Status" 
                status={!loading ? 'healthy' : 'loading'} 
              />
            </div>
          )}
          
          <div className="mt-6 pt-4 border-t border-slate-200">
            <p className="text-xs text-slate-500">
              Last updated: {new Date().toLocaleTimeString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface QuickActionButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  to: string;
  color: 'blue' | 'violet' | 'emerald' | 'amber' | 'rose' | 'cyan';
}

function QuickActionButton({ icon: Icon, label, description, to, color }: QuickActionButtonProps) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700',
    violet: 'from-violet-500 to-violet-600 hover:from-violet-600 hover:to-violet-700',
    emerald: 'from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700',
    amber: 'from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700',
    rose: 'from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700',
    cyan: 'from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700',
  };

  return (
    <a
      href={to}
      className={cn(
        "flex items-start gap-3 p-4 rounded-lg bg-gradient-to-br text-white",
        "transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5",
        colorClasses[color]
      )}
    >
      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <div>
        <p className="font-semibold text-sm">{label}</p>
        <p className="text-xs text-white/80 mt-0.5">{description}</p>
      </div>
    </a>
  );
}

interface StatusItemProps {
  label: string;
  status: 'connected' | 'ready' | 'healthy' | 'loading' | 'error';
}

function StatusItem({ label, status }: StatusItemProps) {
  const statusConfig = {
    connected: { color: 'bg-emerald-500', text: 'Connected' },
    ready: { color: 'bg-emerald-500', text: 'Ready' },
    healthy: { color: 'bg-emerald-500', text: 'Healthy' },
    loading: { color: 'bg-amber-400 animate-pulse', text: 'Checking...' },
    error: { color: 'bg-red-500', text: 'Error' },
  };

  const config = statusConfig[status];

  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-slate-600">{label}</span>
      <div className="flex items-center gap-2">
        <div className={cn("w-2 h-2 rounded-full", config.color)} />
        <span className="text-sm text-slate-500">{config.text}</span>
      </div>
    </div>
  );
}
