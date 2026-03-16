import { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  Edit2, 
  Trash2, 
  Copy,
  CheckSquare,
  Heart,
  X,
  ChevronDown,
  ChevronUp,
  FileText,
  Star
} from 'lucide-react';
import { clsx, type ClassValue } from '../../utils/clsx';
import * as api from '../../api/client';
import type { Prompt } from '../../types';

function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function FavoritesPage() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Selection state
  const [selectedPrompts, setSelectedPrompts] = useState<number[]>([]);

  // Load data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const promptsData = await api.getPrompts({
        favorites: true,
      });
      
      setPrompts(promptsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load prompts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter prompts by search query
  const filteredPrompts = prompts.filter(prompt => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      prompt.theme.toLowerCase().includes(query) ||
      prompt.prompt_text.toLowerCase().includes(query) ||
      (prompt.prompt_number || '').toLowerCase().includes(query)
    );
  });

  // Selection handlers
  const toggleSelection = (id: number) => {
    setSelectedPrompts(prev => 
      prev.includes(id) 
        ? prev.filter(p => p !== id)
        : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedPrompts.length === filteredPrompts.length) {
      setSelectedPrompts([]);
    } else {
      setSelectedPrompts(filteredPrompts.map(p => p.id));
    }
  };

  // Copy prompt
  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Toggle favorite
  const handleToggleFavorite = async (id: number) => {
    try {
      await api.toggleFavorite(id);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update favorite');
    }
  };

  // Delete prompt
  const handleDeletePrompt = async (id: number) => {
    try {
      await api.deletePrompt(id);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete prompt');
    }
  };

  // Bulk delete
  const handleBulkDelete = async () => {
    try {
      await Promise.all(selectedPrompts.map(id => api.deletePrompt(id)));
      setSelectedPrompts([]);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete prompts');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Favorites</h1>
          <p className="text-slate-500 mt-1">Your favorited prompts for quick access</p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
          <p className="text-sm text-red-700">{error}</p>
          <button
            onClick={loadData}
            className="text-sm text-red-600 hover:text-red-800 font-medium"
          >
            Retry
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search favorites..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg 
                         focus:outline-none focus:ring-2 focus:ring-indigo-500/20 
                         focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Prompts Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-left w-10">
                  <button 
                    onClick={toggleAll}
                    className="flex items-center justify-center w-5 h-5 rounded border 
                               border-slate-300 hover:border-indigo-500 transition-colors"
                  >
                    {selectedPrompts.length === filteredPrompts.length && filteredPrompts.length > 0 && (
                      <CheckSquare className="w-4 h-4 text-indigo-600" />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  #
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Theme
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Prompt
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Gender
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Fav
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    </div>
                  </td>
                </tr>
              ) : filteredPrompts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <Heart className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">
                      {searchQuery ? 'No favorites match your search' : 'No favorites yet'}
                    </p>
                    <p className="text-sm text-slate-400 mt-1">
                      {searchQuery ? 'Try adjusting your search' : 'Mark prompts as favorite to see them here'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredPrompts.map((prompt) => (
                  <tr 
                    key={prompt.id} 
                    className={cn(
                      "hover:bg-slate-50 transition-colors",
                      selectedPrompts.includes(prompt.id) && "bg-indigo-50/50"
                    )}
                  >
                    <td className="px-4 py-3">
                      <button 
                        onClick={() => toggleSelection(prompt.id)}
                        className="flex items-center justify-center w-5 h-5 rounded border 
                                   border-slate-300 hover:border-indigo-500 transition-colors"
                      >
                        {selectedPrompts.includes(prompt.id) && (
                          <CheckSquare className="w-4 h-4 text-indigo-600" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {prompt.prompt_number || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900 max-w-[200px] truncate">
                      {prompt.theme}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 max-w-[300px]">
                      <div className="line-clamp-2" title={prompt.prompt_text}>
                        {prompt.prompt_text}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 capitalize">
                      {prompt.gender}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {prompt.category}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleToggleFavorite(prompt.id)}
                        className="p-1 hover:bg-slate-100 rounded transition-colors"
                      >
                        <Heart className={cn(
                          "w-5 h-5",
                          prompt.is_favorite ? "text-amber-400 fill-amber-400" : "text-slate-300"
                        )} />
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleCopy(prompt.prompt_text)}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Copy prompt"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeletePrompt(prompt.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete prompt"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
