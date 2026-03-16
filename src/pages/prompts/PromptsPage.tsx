import { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
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
import type { Prompt, Category } from '../../types';

function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function PromptsPage() {
  // Data state
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Selection state
  const [selectedPrompts, setSelectedPrompts] = useState<number[]>([]);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkAddModal, setShowBulkAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);

  // Load data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [promptsData, categoriesData] = await Promise.all([
        api.getPrompts({
          gender: genderFilter,
          category: categoryFilter,
          favorites: favoritesOnly,
        }),
        api.getCategories(),
      ]);
      
      setPrompts(promptsData);
      setCategories(categoriesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load prompts');
    } finally {
      setLoading(false);
    }
  }, [genderFilter, categoryFilter, favoritesOnly]);

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

  // CRUD handlers
  const handleCreatePrompt = async (data: { theme: string; prompt_text: string; gender: string; category: string }) => {
    try {
      await api.addPrompt(data);
      setShowAddModal(false);
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create prompt');
    }
  };

  const handleUpdatePrompt = async (id: number, data: Partial<Prompt>) => {
    try {
      await api.updatePrompt(id, data);
      setShowEditModal(false);
      setEditingPrompt(null);
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update prompt');
    }
  };

  const handleDeletePrompt = async (id: number) => {
    try {
      await api.deletePrompt(id);
      setShowDeleteConfirm(null);
      setSelectedPrompts(prev => prev.filter(p => p !== id));
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete prompt');
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedPrompts.length) return;
    try {
      await api.bulkDeletePrompts(selectedPrompts);
      setSelectedPrompts([]);
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete prompts');
    }
  };

  const handleToggleFavorite = async (prompt: Prompt) => {
    try {
      await api.updatePrompt(prompt.id, { favorite: !prompt.favorite });
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update favorite');
    }
  };

  const handleCopyPrompt = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Prompts</h1>
          <p className="text-slate-500 mt-1">Manage and organize your image generation prompts</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowBulkAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 
                       rounded-lg hover:bg-slate-50 transition-colors font-medium text-slate-700"
          >
            <FileText className="w-4 h-4" />
            Bulk Add
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white 
                       rounded-lg hover:bg-indigo-700 transition-colors font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Prompt
          </button>
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

      {/* Category Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => setCategoryFilter('all')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
              categoryFilter === 'all'
                ? "bg-indigo-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.name)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
                categoryFilter === cat.name
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Gender Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-700 mr-2">Gender:</span>
          <button
            onClick={() => setGenderFilter('all')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              genderFilter === 'all'
                ? "bg-indigo-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            All
          </button>
          <button
            onClick={() => setGenderFilter('female')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              genderFilter === 'female'
                ? "bg-indigo-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            Female
          </button>
          <button
            onClick={() => setGenderFilter('male')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              genderFilter === 'male'
                ? "bg-indigo-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            Male
          </button>
          
          {/* Search and other controls */}
          <div className="relative flex-1 ml-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search prompts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg 
                         focus:outline-none focus:ring-2 focus:ring-indigo-500/20 
                         focus:border-indigo-500"
            />
          </div>
          
          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors",
              showFilters
                ? "border-indigo-500 text-indigo-600 bg-indigo-50"
                : "border-slate-200 hover:bg-slate-50 text-slate-700"
            )}
          >
            <Filter className="w-4 h-4" />
            Filters
            {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {/* Bulk Actions */}
          {selectedPrompts.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">
                {selectedPrompts.length} selected
              </span>
              <button
                onClick={handleBulkDelete}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete selected"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Gender</label>
              <select
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="all">All Genders</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="all">All Categories</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={favoritesOnly}
                  onChange={(e) => setFavoritesOnly(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                />
                <span className="text-sm text-slate-700">Favorites only</span>
                <Star className={cn("w-4 h-4", favoritesOnly ? "text-amber-400 fill-amber-400" : "text-slate-400")} />
              </label>
            </div>
          </div>
        )}
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
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                      Loading prompts...
                    </div>
                  </td>
                </tr>
              ) : filteredPrompts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                      <Search className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-900">No prompts found</h3>
                    <p className="text-slate-500 mt-1">
                      {searchQuery ? 'Try adjusting your search or filters' : 'Get started by creating a new prompt'}
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
                    <td className="px-4 py-4">
                      <button 
                        onClick={() => toggleSelection(prompt.id)}
                        className={cn(
                          "flex items-center justify-center w-5 h-5 rounded border transition-colors",
                          selectedPrompts.includes(prompt.id)
                            ? "bg-indigo-600 border-indigo-600"
                            : "border-slate-300 hover:border-indigo-500"
                        )}
                      >
                        {selectedPrompts.includes(prompt.id) && (
                          <CheckSquare className="w-3.5 h-3.5 text-white" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-900 font-medium">
                      {prompt.prompt_number}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-900 font-medium">
                      {prompt.theme}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600 max-w-md">
                      <p className="truncate" title={prompt.prompt_text}>
                        {prompt.prompt_text}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-900">
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize",
                        prompt.gender === 'female' 
                          ? "bg-pink-100 text-pink-800" 
                          : "bg-blue-100 text-blue-800"
                      )}>
                        {prompt.gender}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600">
                      {prompt.category}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <button
                        onClick={() => handleToggleFavorite(prompt)}
                        className="p-1 hover:bg-slate-100 rounded transition-colors"
                      >
                        <Heart 
                          className={cn(
                            "w-4 h-4 transition-colors",
                            prompt.favorite 
                              ? "text-red-500 fill-red-500" 
                              : "text-slate-400 hover:text-red-400"
                          )} 
                        />
                      </button>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          onClick={() => handleCopyPrompt(prompt.prompt_text)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 
                                     hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Copy prompt"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => {
                            setEditingPrompt(prompt);
                            setShowEditModal(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 
                                     hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Edit prompt"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => setShowDeleteConfirm(prompt.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 
                                     hover:bg-red-50 rounded-lg transition-colors"
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

      {/* Add Prompt Modal */}
      {showAddModal && (
        <PromptModal
          categories={categories}
          onClose={() => setShowAddModal(false)}
          onSubmit={handleCreatePrompt}
          title="Add New Prompt"
        />
      )}

      {/* Bulk Add Modal */}
      {showBulkAddModal && (
        <BulkAddModal
          categories={categories}
          onClose={() => setShowBulkAddModal(false)}
          onSuccess={loadData}
        />
      )}

      {/* Edit Prompt Modal */}
      {showEditModal && editingPrompt && (
        <PromptModal
          categories={categories}
          prompt={editingPrompt}
          onClose={() => {
            setShowEditModal(false);
            setEditingPrompt(null);
          }}
          onSubmit={(data) => handleUpdatePrompt(editingPrompt.id, data)}
          title="Edit Prompt"
        />
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Delete Prompt</h3>
            <p className="text-slate-600 mb-4">
              Are you sure you want to delete this prompt? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeletePrompt(showDeleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Prompt Modal Component
interface PromptFormData {
  theme: string;
  prompt_text: string;
  gender: string;
  category: string;
}

interface PromptModalProps {
  categories: Category[];
  prompt?: Prompt;
  onClose: () => void;
  onSubmit: (data: PromptFormData) => void;
  title: string;
}

function PromptModal({ categories, prompt, onClose, onSubmit, title }: PromptModalProps) {
  const [formData, setFormData] = useState<PromptFormData>({
    theme: prompt?.theme || '',
    prompt_text: prompt?.prompt_text || '',
    gender: prompt?.gender || 'female',
    category: prompt?.category || (categories[0]?.name ?? 'Polaroids'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Theme</label>
            <input
              type="text"
              required
              value={formData.theme}
              onChange={(e) => setFormData({ ...formData, theme: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg 
                         focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              placeholder="e.g., Sunset Glow"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Prompt Text</label>
            <textarea
              required
              rows={4}
              value={formData.prompt_text}
              onChange={(e) => setFormData({ ...formData, prompt_text: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg 
                         focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-y"
              placeholder="Enter your prompt description..."
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Gender</label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg 
                           focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="female">Female</option>
                <option value="male">Male</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg 
                           focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                {categories.map(cat => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              {prompt ? 'Save Changes' : 'Create Prompt'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Bulk Add Modal Component
interface BulkAddModalProps {
  categories: Category[];
  onClose: () => void;
  onSuccess: () => void;
}

function BulkAddModal({ categories, onClose, onSuccess }: BulkAddModalProps) {
  const [text, setText] = useState('');
  const [gender, setGender] = useState('female');
  const [category, setCategory] = useState(categories[0]?.name ?? 'Polaroids');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    
    try {
      setLoading(true);
      await api.bulkAddPrompts({ text, gender, category });
      onSuccess();
      onClose();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add prompts');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Bulk Add Prompts</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-700">
              Enter one prompt per line. Format: <code className="bg-blue-100 px-1 py-0.5 rounded">Theme: Description</code> or just the description.
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Prompts</label>
            <textarea
              required
              rows={10}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono text-sm
                         focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-y"
              placeholder="Theme: Sunset Glow - Warm golden hour lighting...&#10;Theme: Urban Night - Neon city reflections..."
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg 
                           focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="female">Female</option>
                <option value="male">Male</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg 
                           focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                {categories.map(cat => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 
                         transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                         flex items-center gap-2"
            >
              {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Add Prompts
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
