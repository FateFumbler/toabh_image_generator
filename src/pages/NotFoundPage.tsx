import { Home, ArrowLeft, Search, HelpCircle } from 'lucide-react';
import { clsx, type ClassValue } from '../utils/clsx';

function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function NotFoundPage() {
  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center">
      <div className="w-full max-w-2xl mx-auto text-center px-4">
        {/* 404 Illustration */}
        <div className="relative mb-8">
          <div className="text-[8rem] sm:text-[10rem] font-bold leading-none text-slate-100 select-none">
            404
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-xl shadow-indigo-500/25">
              <Search className="w-12 h-12 text-white" />
            </div>
          </div>
        </div>

        {/* Content */}
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
          Page Not Found
        </h1>
        <p className="text-lg text-slate-500 mb-8 max-w-md mx-auto">
          Sorry, we couldn't find the page you're looking for. It might have been moved, deleted, or never existed.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            href="/"
            className={cn(
              "inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl",
              "font-medium transition-all duration-200 hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-500/25",
              "w-full sm:w-auto justify-center"
            )}
          >
            <Home className="w-5 h-5" />
            Back to Dashboard
          </a>
          <button
            onClick={() => window.history.back()}
            className={cn(
              "inline-flex items-center gap-2 px-6 py-3 bg-white text-slate-700 rounded-xl",
              "font-medium border border-slate-200 transition-all duration-200",
              "hover:bg-slate-50 hover:border-slate-300",
              "w-full sm:w-auto justify-center"
            )}
          >
            <ArrowLeft className="w-5 h-5" />
            Go Back
          </button>
        </div>

        {/* Help Section */}
        <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-center gap-2 text-slate-500 dark:text-slate-400 mb-4">
            <HelpCircle className="w-5 h-5" />
            <span className="text-sm font-medium">Need help?</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
            <a href="/prompts" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium">
              Browse Prompts
            </a>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <a href="/gallery" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium">
              View Gallery
            </a>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <a href="/generate" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium">
              Generate Images
            </a>
          </div>
        </div>

        {/* Quick Links Grid */}
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Dashboard', href: '/', icon: '📊' },
            { label: 'Prompts', href: '/prompts', icon: '💬' },
            { label: 'Generate', href: '/generate', icon: '✨' },
            { label: 'Gallery', href: '/gallery', icon: '🖼️' },
          ].map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={cn(
                "p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-center",
                "transition-all duration-200 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-md"
              )}
            >
              <span className="text-2xl mb-2 block">{link.icon}</span>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{link.label}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
