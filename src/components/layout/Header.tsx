import { useState, useEffect, useRef, useCallback } from 'react';
import { Menu, Bell, Search, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { clsx, type ClassValue } from '../../utils/clsx';
import { getGeneratedImages, getGenerationStatus } from '../../api/client';
import type { LogEntry, GeneratedImage, GenerationStatus } from '../../types';

interface HeaderProps {
  onMenuClick: () => void;
  isCollapsed: boolean;
}

function cn(...inputs: ClassValue[]) {
  return clsx(...inputs);
}

const STORAGE_KEY = 'toabh_notification_logs';

export function Header({ onMenuClick, isCollapsed }: HeaderProps) {
  const [logs, setLogs] = useState<LogEntry[]>(() => {
    // Load logs from localStorage on mount
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return [];
        }
      }
    }
    return [];
  });
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [previousImages, setPreviousImages] = useState<GeneratedImage[]>([]);
  const [previousErrors, setPreviousErrors] = useState<string[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Update unread count when logs change
  useEffect(() => {
    const count = logs.filter(log => !log.read).length;
    setUnreadCount(count);
    // Persist logs to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  }, [logs]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Add a log entry
  const addLog = useCallback((type: LogEntry['type'], message: string) => {
    const newLog: LogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      message,
      timestamp: Date.now(),
      read: false,
    };
    setLogs(prev => [newLog, ...prev].slice(0, 100)); // Keep last 100 logs
  }, []);

  // Clear all logs
  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  // Mark all as read when dropdown is opened
  const handleToggleDropdown = useCallback(() => {
    setIsOpen(prev => {
      const newIsOpen = !prev;
      if (newIsOpen) {
        // Mark all as read when opening
        setLogs(currentLogs =>
          currentLogs.map(log => ({ ...log, read: true }))
        );
      }
      return newIsOpen;
    });
  }, []);

  // Poll for updates every 5 seconds
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      try {
        // Poll for generated images
        const images: GeneratedImage[] = await getGeneratedImages();
        
        // Check for new images
        if (previousImages.length > 0) {
          const newImages = images.filter(
            img => !previousImages.some(prev => prev.id === img.id)
          );
          
          newImages.forEach(img => {
            const theme = img.prompt_theme || 'Unknown Theme';
            addLog('success', `Successfully generated image: ${theme}`);
          });
        }
        
        setPreviousImages(images);
      } catch (error) {
        // Silently handle errors to avoid spamming
      }

      try {
        // Poll for generation status errors
        const status: GenerationStatus = await getGenerationStatus();
        
        if (status.errors && status.errors.length > 0) {
          // Find new errors (not in previousErrors)
          const newErrors = status.errors.filter(
            error => !previousErrors.includes(error)
          );
          
          newErrors.forEach(error => {
            addLog('error', error);
          });
          
          setPreviousErrors(status.errors);
        }
      } catch (error) {
        // Silently handle errors
      }
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [previousImages, previousErrors, addLog]);

  // Format timestamp for display
  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <header className={cn(
      "h-16 bg-[var(--color-card)] border-b border-[var(--color-border)] flex items-center justify-between px-4 lg:px-6",
      "fixed top-0 right-0 left-0 z-30 transition-all duration-300",
      isCollapsed ? "lg:left-16" : "lg:left-64"
    )}>
      {/* Left side */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <Menu className="w-5 h-5 text-slate-600" />
        </button>
        

      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Notification Bell */}
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={handleToggleDropdown}
            className="relative p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <Bell className={cn(
              "w-5 h-5 transition-colors",
              isOpen ? "text-indigo-600 dark:text-indigo-400" : "text-slate-600 dark:text-slate-400"
            )} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 bg-red-500 rounded-full 
                             flex items-center justify-center text-[10px] font-medium text-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* Dropdown */}
          {isOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 
                          overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-50">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/80">
                <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">Notifications</h3>
                <div className="flex items-center gap-2">
                  {logs.length > 0 && (
                    <button
                      onClick={clearLogs}
                      className="text-xs text-slate-500 hover:text-red-600 transition-colors px-2 py-1 rounded 
                               hover:bg-red-50"
                    >
                      Clear
                    </button>
                  )}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1 hover:bg-slate-200 rounded transition-colors"
                  >
                    <X className="w-4 h-4 text-slate-500" />
                  </button>
                </div>
              </div>

              {/* Log List */}
              <div className="max-h-80 overflow-y-auto">
                {logs.length === 0 ? (
                  <div className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                    <Bell className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                    <p className="text-sm">No notifications yet</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-700">
                    {logs.map((log) => (
                      <div
                        key={log.id}
                        className={cn(
                          "flex items-start gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors",
                          !log.read && "bg-slate-50/50 dark:bg-slate-700/50"
                        )}
                      >
                        {log.type === 'success' ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "text-sm leading-relaxed",
                            log.type === 'success' ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"
                          )}>
                            {log.message}
                          </p>
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                            {formatTime(log.timestamp)}
                          </p>
                        </div>
                        {!log.read && (
                          <span className="w-2 h-2 bg-indigo-500 rounded-full flex-shrink-0 mt-2" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              {logs.length > 0 && (
                <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/80 text-center">
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    {logs.length} notification{logs.length !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
