import { NavLink } from 'react-router-dom';
import { 
  MessageSquare, 
  Images, 
  Sparkles, 
  Grid3X3, 
  Settings, 
  Wand2,
  X,
  ChevronLeft,
  ChevronRight,
  Folder
} from 'lucide-react';
import { useMobile } from '../../hooks/useMobile';
import { clsx, type ClassValue } from '../../utils/clsx';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const navItems = [
  { path: '/', icon: Grid3X3, label: 'Dashboard', exact: true },
  { path: '/prompts', icon: MessageSquare, label: 'Prompts' },
  { path: '/categories', icon: Folder, label: 'Categories' },
  { path: '/reference', icon: Images, label: 'Reference Sets' },
  { path: '/generate', icon: Sparkles, label: 'Generate' },
  { path: '/gallery', icon: Grid3X3, label: 'Results Gallery' },
  { path: '/prompt-generator', icon: Wand2, label: 'Prompt Generator' },
];

function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function Sidebar({ isOpen, onClose, isCollapsed, onToggleCollapse }: SidebarProps) {
  const isMobile = useMobile();

  const sidebarClasses = cn(
    'fixed inset-y-0 left-0 z-50 bg-slate-900 text-white transition-all duration-300 ease-in-out',
    'flex flex-col',
    isMobile && !isOpen && '-translate-x-full',
    isMobile && isOpen && 'translate-x-0 w-64',
    !isMobile && isCollapsed && 'w-16',
    !isMobile && !isCollapsed && 'w-64'
  );

  const overlayClasses = cn(
    'fixed inset-0 bg-black/50 z-40 transition-opacity duration-300',
    isMobile && isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
  );

  return (
    <>
      {/* Mobile overlay */}
      <div className={overlayClasses} onClick={onClose} />
      
      {/* Sidebar */}
      <aside className={sidebarClasses}>
        {/* Header */}
        <div className="flex items-center h-16 px-4 border-b border-slate-800">
          <div className={cn(
            "flex items-center justify-center transition-all duration-200",
            isCollapsed && !isMobile && "w-10"
          )}>
            {/* Logo - Leonardo.Ai style with white background circle */}
            <div className={cn(
              "flex items-center justify-center bg-white rounded-full shadow-md",
              isCollapsed && !isMobile ? "w-10 h-10" : "w-10 h-10"
            )}>
              <img 
                src="/logo.jpg" 
                alt="TOABH Logo" 
                className={cn(
                  "object-cover",
                  isCollapsed && !isMobile ? "w-6 h-6" : "w-8 h-8"
                )}
                style={{ borderRadius: '50%' }}
              />
            </div>
          </div>
          
          {isMobile ? (
            <button 
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={onToggleCollapse}
              className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors"
            >
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto scrollbar-hide">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.exact}
              onClick={() => isMobile && onClose()}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative",
                isActive 
                  ? "bg-indigo-600 text-white" 
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              )}
            >
              <item.icon className={cn(
                "w-5 h-5 flex-shrink-0",
                isCollapsed && !isMobile && "mx-auto"
              )} />
              <span className={cn(
                "text-sm font-medium whitespace-nowrap transition-all duration-200",
                isCollapsed && !isMobile && "opacity-0 w-0 overflow-hidden"
              )}>
                {item.label}
              </span>
              
              {/* Tooltip for collapsed state */}
              {isCollapsed && !isMobile && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded 
                                opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                  {item.label}
                </div>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800">
          <NavLink
            to="/settings"
            onClick={() => isMobile && onClose()}
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
              isActive 
                ? "bg-indigo-600 text-white" 
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            )}
          >
            <Settings className={cn(
              "w-5 h-5 flex-shrink-0",
              isCollapsed && !isMobile && "mx-auto"
            )} />
            <span className={cn(
              "text-sm font-medium whitespace-nowrap transition-all duration-200",
              isCollapsed && !isMobile && "opacity-0 w-0 overflow-hidden"
            )}>
              Settings
            </span>
          </NavLink>
        </div>
      </aside>
    </>
  );
}
