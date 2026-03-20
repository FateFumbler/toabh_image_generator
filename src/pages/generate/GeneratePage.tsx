import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Play, 
  Square, 
  Settings2, 
  AlertCircle,
  Loader2,
  Sparkles,
  SlidersHorizontal,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Search,
  X
} from 'lucide-react';
import { clsx, type ClassValue } from '../../utils/clsx';
import { useSettings } from '../../hooks/useSettings';
import { useGenerationProgress } from '../../hooks/useGenerationProgress';
import * as api from '../../api/client';

function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

interface GenerationSettings {
  model: 'flux' | 'gemini' | 'leonardo';
  resolution: '1k' | '2k' | '4k';
  aspect_ratio: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
  model_name: string;
}

export function GeneratePage() {
  // Data state
  const [prompts, setPrompts] = useState<api.Prompt[]>([]);
  const [characters, setCharacters] = useState<api.Character[]>([]);
  const [loading, setLoading] = useState(true);

  // Use global generation progress context
  const { status: generationStatus, isPolling, startGeneration, stopGeneration } = useGenerationProgress();
  const isGenerating = generationStatus.is_generating;

  // Get default settings
  const { settings: defaultSettings, loaded: settingsLoaded } = useSettings();

  // Settings - use defaults from settings, but allow override
  const [settings, setSettings] = useState<GenerationSettings>({
    model: 'flux',
    resolution: '1k',
    aspect_ratio: '1:1',
    model_name: 'default_model',
  });

  // Apply default settings when loaded
  useEffect(() => {
    if (settingsLoaded) {
      setSettings(prev => ({
        ...prev,
        model: defaultSettings.defaultModel,
        resolution: defaultSettings.defaultResolution,
        aspect_ratio: defaultSettings.defaultAspectRatio,
      }));
    }
  }, [settingsLoaded, defaultSettings.defaultModel, defaultSettings.defaultResolution, defaultSettings.defaultAspectRatio]);

  // Selection state
  const [selectedPrompts, setSelectedPrompts] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // Load pre-selected prompts from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('toabh_selected_prompts');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setSelectedPrompts(new Set(parsed));
        }
      } catch (e) {
        console.error('Failed to parse saved prompts:', e);
      }
    }
  }, []);

  // Filter state
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  
  // Character dropdown state
  const [showCharacterDropdown, setShowCharacterDropdown] = useState(false);
  const [characterSearch, setCharacterSearch] = useState('');
  const characterDropdownRef = useRef<HTMLDivElement>(null);

  // Filter characters by search
  const filteredCharacters = characters.filter(char => 
    char.name.toLowerCase().includes(characterSearch.toLowerCase())
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (characterDropdownRef.current && !characterDropdownRef.current.contains(e.target as Node)) {
        setShowCharacterDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [promptsData, charactersData] = await Promise.all([
        api.getPrompts(),
        api.getCharacters(),
      ]);
      setPrompts(promptsData);
      setCharacters(charactersData);
      
      // Set default model_name to first character if available
      if (charactersData.length > 0 && settings.model_name === 'default_model') {
        setSettings(prev => ({ ...prev, model_name: charactersData[0].name }));
      }
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }, [settings.model_name]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter prompts
  const filteredPrompts = prompts.filter(prompt => {
    if (genderFilter !== 'all' && prompt.gender !== genderFilter) return false;
    if (categoryFilter !== 'all' && prompt.category !== categoryFilter) return false;
    return true;
  });

  // Get unique categories
  const categories = Array.from(new Set(prompts.map(p => p.category)));

  // Selection handlers
  const togglePromptSelection = (id: number) => {
    setSelectedPrompts(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedPrompts(new Set());
    } else {
      setSelectedPrompts(new Set(filteredPrompts.map(p => p.id)));
    }
    setSelectAll(!selectAll);
  };

  // Generation handlers - use global context
  const handleStartGeneration = async () => {
    if (selectedPrompts.size === 0) {
      alert('Please select at least one prompt');
      return;
    }

    try {
      const request: api.GenerationRequest = {
        prompt_ids: Array.from(selectedPrompts),
        model: settings.model,
        resolution: settings.resolution,
        aspect_ratio: settings.aspect_ratio,
        model_name: settings.model_name,
      };
      await startGeneration(request);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to start generation');
    }
  };

  const handleStopGeneration = async () => {
    try {
      await stopGeneration();
    } catch (err) {
      console.error('Failed to stop generation:', err);
    }
  };

  const progress = generationStatus 
    ? (generationStatus.total > 0 ? (generationStatus.completed / generationStatus.total) * 100 : 0)
    : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Generate Images</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Create images from your prompts using AI models</p>
        </div>
        <div className="flex items-center gap-2">
          {!isGenerating ? (
            <button
              onClick={handleStartGeneration}
              disabled={selectedPrompts.size === 0}
              className={cn(
                "inline-flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all",
                selectedPrompts.size === 0
                  ? "bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed"
                  : "bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:shadow-lg hover:shadow-indigo-500/25 dark:from-indigo-700 dark:to-violet-700"
              )}
            >
              <Play className="w-4 h-4" />
              Generate {selectedPrompts.size > 0 && `(${selectedPrompts.size})`}
            </button>
          ) : (
            <button
              onClick={handleStopGeneration}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-red-600 text-white 
                         rounded-lg hover:bg-red-700 transition-colors font-medium"
            >
              <Square className="w-4 h-4 fill-current" />
              Stop Generation
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Settings & Prompts */}
        <div className="lg:col-span-1 space-y-6">
          {/* Settings Card */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Settings2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Generation Settings</h2>
            </div>

            <div className="space-y-4">
              {/* Model Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Model
                </label>
                <select
                  value={settings.model}
                  onChange={(e) => setSettings({ ...settings, model: e.target.value as any })}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg 
                             focus:outline-none focus:ring-2 focus:ring-indigo-500/20 
                             focus:border-indigo-500 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  <option value="flux">FLUX 2 Pro</option>
                  <option value="gemini">Gemini</option>
                  <option value="leonardo">Leonardo AI</option>
                </select>
              </div>

              {/* Character/Model Selection - Searchable Dropdown */}
              <div ref={characterDropdownRef}>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Reference Character
                </label>
                <div className="relative">
                  {/* Dropdown trigger */}
                  <button
                    type="button"
                    onClick={() => setShowCharacterDropdown(!showCharacterDropdown)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg 
                               focus:outline-none focus:ring-2 focus:ring-indigo-500/20 
                               focus:border-indigo-500 text-sm text-left flex items-center justify-between bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  >
                    <span>
                      {settings.model_name === 'default_model' 
                        ? 'Default (No Reference)' 
                        : `${settings.model_name} (${characters.find(c => c.name === settings.model_name)?.image_count || 0} images)`}
                    </span>
                    <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                  </button>
                  
                  {/* Dropdown content */}
                  {showCharacterDropdown && (
                    <div className="absolute z-20 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-64 overflow-hidden">
                      {/* Search input */}
                      <div className="p-2 border-b border-slate-200 dark:border-slate-700">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                          <input
                            type="text"
                            placeholder="Search characters..."
                            value={characterSearch}
                            onChange={(e) => setCharacterSearch(e.target.value)}
                            className="w-full pl-9 pr-8 py-1.5 text-sm border border-slate-200 dark:border-slate-700 rounded-lg 
                                       focus:outline-none focus:ring-2 focus:ring-indigo-500/20 
                                       focus:border-indigo-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                            autoFocus
                          />
                          {characterSearch && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setCharacterSearch(''); }}
                              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                            >
                              <X className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                            </button>
                          )}
                        </div>
                      </div>
                      
                      {/* Options list */}
                      <div className="max-h-48 overflow-y-auto">
                        <button
                          type="button"
                          onClick={() => {
                            setSettings({ ...settings, model_name: 'default_model' });
                            setShowCharacterDropdown(false);
                            setCharacterSearch('');
                          }}
                          className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700 ${
                            settings.model_name === 'default_model' ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300' : ''
                          }`}
                        >
                          Default (No Reference)
                        </button>
                        {filteredCharacters.map(char => (
                          <button
                            key={char.id}
                            type="button"
                            onClick={() => {
                              setSettings({ ...settings, model_name: char.name });
                              setShowCharacterDropdown(false);
                              setCharacterSearch('');
                            }}
                            className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700 ${
                              settings.model_name === char.name ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300' : ''
                            }`}
                          >
                            {char.name} ({char.image_count} images)
                          </button>
                        ))}
                        {filteredCharacters.length === 0 && characterSearch && (
                          <div className="px-3 py-4 text-center text-sm text-slate-500 dark:text-slate-400">
                            No characters found
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                {characters.length === 0 && (
                  <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                    No characters found. <a href="/reference" className="underline">Create one</a> for consistent generation.
                  </p>
                )}
              </div>

              {/* Resolution */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Resolution
                </label>
                <select
                  value={settings.resolution}
                  onChange={(e) => setSettings({ ...settings, resolution: e.target.value as any })}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg 
                             focus:outline-none focus:ring-2 focus:ring-indigo-500/20 
                             focus:border-indigo-500 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  <option value="1k">1K (1024px)</option>
                  <option value="2k">2K (2048px)</option>
                  <option value="4k">4K (4096px)</option>
                </select>
              </div>

              {/* Aspect Ratio */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Aspect Ratio
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['1:1', '16:9', '9:16', '4:3', '3:4'] as const).map((ratio) => (
                    <button
                      key={ratio}
                      onClick={() => setSettings({ ...settings, aspect_ratio: ratio })}
                      className={cn(
                        "px-3 py-2 rounded-lg text-sm font-medium transition-all",
                        settings.aspect_ratio === ratio
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600"
                      )}
                    >
                      {ratio}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Progress Card */}
          {isGenerating && generationStatus && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 animate-fade-in">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400 animate-spin" />
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Generating...</h2>
                </div>
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  {generationStatus.completed} / {generationStatus.total}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mb-4">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 
                             transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* Current Prompt */}
              {generationStatus.current_prompt && (
                <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Current:</p>
                  <p className="text-sm text-slate-700 dark:text-slate-200 truncate">{generationStatus.current_prompt}</p>
                </div>
              )}

              {/* Errors */}
              {generationStatus.errors.length > 0 && (
                <div className="mt-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      {generationStatus.errors.length} error{generationStatus.errors.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <ul className="mt-2 text-xs text-red-600 dark:text-red-400 space-y-1">
                    {generationStatus.errors.slice(0, 3).map((error, idx) => (
                      <li key={idx} className="truncate">• {error}</li>
                    ))}
                    {generationStatus.errors.length > 3 && (
                      <li>...and {generationStatus.errors.length - 3} more</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column - Prompt Selection */}
        <div className="lg:col-span-2 space-y-6">
          {/* Filters & Selection */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleSelectAll}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                    selectAll
                      ? "bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300"
                      : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600"
                  )}
                >
                  <CheckSquare className="w-4 h-4" />
                  {selectAll ? 'Deselect All' : 'Select All'}
                </button>
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  {selectedPrompts.size} of {filteredPrompts.length} selected
                </span>
              </div>
              
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors",
                  showFilters
                    ? "bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                )}
              >
                <SlidersHorizontal className="w-4 h-4" />
                Filters
                {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {/* Filter Panel */}
            {showFilters && (
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Gender</label>
                  <select
                    value={genderFilter}
                    onChange={(e) => setGenderFilter(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm
                               focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500
                               bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  >
                    <option value="all">All Genders</option>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Category</label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm
                               focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500
                               bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  >
                    <option value="all">All Categories</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Prompts List */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="max-h-[600px] overflow-y-auto">
              {loading ? (
                <div className="p-12 text-center">
                  <Loader2 className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-spin mx-auto mb-2" />
                  <p className="text-slate-500 dark:text-slate-400">Loading prompts...</p>
                </div>
              ) : filteredPrompts.length === 0 ? (
                <div className="p-12 text-center">
                  <Sparkles className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-500 dark:text-slate-400">No prompts found</p>
                  <a href="/prompts" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 text-sm mt-1 inline-block">
                    Create some prompts first
                  </a>
                </div>
              ) : (
                <div className="divide-y divide-slate-200 dark:divide-slate-700">
                  {filteredPrompts.map((prompt) => (
                    <label
                      key={prompt.id}
                      className={cn(
                        "flex items-start gap-3 p-4 cursor-pointer transition-colors",
                        selectedPrompts.has(prompt.id)
                          ? "bg-indigo-50 dark:bg-indigo-950 border-l-4 border-indigo-500"
                          : "hover:bg-slate-50 dark:hover:bg-slate-700 border-l-4 border-transparent"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={selectedPrompts.has(prompt.id)}
                        onChange={() => togglePromptSelection(prompt.id)}
                        className="mt-1 w-4 h-4 text-indigo-600 dark:text-indigo-400 border-slate-300 dark:border-slate-600 rounded focus:ring-indigo-500 dark:focus:ring-indigo-400"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded">
                            {prompt.prompt_number}
                          </span>
                          <span className={cn(
                            "text-xs px-2 py-0.5 rounded capitalize",
                            prompt.gender === 'female'
                              ? "bg-pink-100 dark:bg-pink-900 text-pink-800 dark:text-pink-200"
                              : "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                          )}>
                            {prompt.gender}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">
                            {prompt.category}
                          </span>
                        </div>
                        <h3 className="font-medium text-slate-900 dark:text-white mt-1">{prompt.theme}</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5 line-clamp-2">{prompt.prompt_text}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Tips Card */}
          <div className="bg-gradient-to-r from-indigo-50 dark:from-indigo-950 to-violet-50 dark:to-violet-950 rounded-xl border border-indigo-100 dark:border-indigo-800 p-5">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h3 className="font-medium text-slate-900 dark:text-white">Generation Tips</h3>
                <ul className="mt-2 text-sm text-slate-600 dark:text-slate-300 space-y-1">
                  <li>• Use reference images for consistent character generation</li>
                  <li>• FLUX 2 Pro works best with detailed prompts</li>
                  <li>• Gemini supports up to 14 reference images per generation</li>
                  <li>• Leonardo AI offers unique styles and fast generation</li>
                  <li>• Higher resolutions take longer but produce better quality</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
