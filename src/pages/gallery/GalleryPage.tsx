import { useState, useEffect, useCallback } from 'react';
import { 
  Grid3X3, 
  List, 
  Download, 
  Trash2, 
  Search,
  Filter,
  Image as ImageIcon,
  User,
  Tag,
  CheckSquare,
  Eye,
  Edit3,
  X,
  Loader2,
  RefreshCw,
  Check,
  AlertCircle,
  Package,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Wand2
} from 'lucide-react';
import { clsx, type ClassValue } from '../../utils/clsx';
import { useGenerationProgress } from '../../hooks/useGenerationProgress';
import * as api from '../../api/client';

function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function GalleryPage() {
  // Data state
  const [images, setImages] = useState<api.GeneratedImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedImages, setSelectedImages] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Filter state
  const [characterFilter, setCharacterFilter] = useState<string>('all');
  const [modelFilter, setModelFilter] = useState<string>('all');
  const [genderFilter, setGenderFilter] = useState<string>('all');

  // Modal states
  const [previewImage, setPreviewImage] = useState<api.GeneratedImage | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingImage, setEditingImage] = useState<api.GeneratedImage | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<'single' | 'bulk' | null>(null);

  // Edit queue state
  const [editQueue, setEditQueue] = useState<api.EditTask[]>([]);
  const [pollingEditStatus, setPollingEditStatus] = useState(false);
  
  // Generation progress - global state
  const { status: generationStatus } = useGenerationProgress();
  
  // Load dismissed edits from localStorage
  const [dismissedEdits, setDismissedEdits] = useState<Set<number>>(() => {
    try {
      const stored = localStorage.getItem('toabh_dismissed_edits');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });
  
  // Group state
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Load data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getGeneratedImages();
      setImages(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load images');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Get unique characters and models for filters
  const characters = Array.from(new Set(images.map(img => img.character_name).filter(Boolean)));
  const models = Array.from(new Set(images.map(img => img.model_used)));

  // Filter images
  const filteredImages = images.filter(image => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        image.prompt_theme?.toLowerCase().includes(query) ||
        image.character_name?.toLowerCase().includes(query) ||
        image.prompt_number?.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }
    if (characterFilter !== 'all' && image.character_name !== characterFilter) return false;
    if (modelFilter !== 'all' && image.model_used !== modelFilter) return false;
    if (genderFilter !== 'all' && image.prompt_gender?.toLowerCase() !== genderFilter) return false;
    return true;
  });

  // Selection handlers
  const toggleSelection = (id: number) => {
    setSelectedImages(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedImages.size === filteredImages.length) {
      setSelectedImages(new Set());
    } else {
      setSelectedImages(new Set(filteredImages.map(img => img.id)));
    }
  };

  // Dismiss edit task - saves to localStorage
  const dismissEditTask = (taskId: number) => {
    const updated = new Set(dismissedEdits).add(taskId);
    setDismissedEdits(updated);
    localStorage.setItem('toabh_dismissed_edits', JSON.stringify([...updated]));
  };
  
  const clearAllDismissed = () => {
    setDismissedEdits(new Set());
    localStorage.setItem('toabh_dismissed_edits', '[]');
  };

  // Group images by character
  const groupedImages = filteredImages.reduce((acc, image) => {
    const key = image.character_name || 'Ungrouped';
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(image);
    return acc;
  }, {} as Record<string, api.GeneratedImage[]>);
  
  const toggleGroup = (groupKey: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      return next;
    });
  };
  
  const expandAllGroups = () => {
    setExpandedGroups(new Set(Object.keys(groupedImages)));
  };
  
  const collapseAllGroups = () => {
    setExpandedGroups(new Set());
  };

  // Download all images in a group as a ZIP
  const handleDownloadAllGroup = async (groupKey: string) => {
    const groupImages = groupedImages[groupKey];
    const imageIds = groupImages.map(img => img.id);
    
    try {
      const blob = await api.bulkDownloadImages(imageIds);
      const filename = `${groupKey.replace(/[^a-z0-9]/gi, '_')}_images.zip`;
      downloadBlob(blob, filename);
    } catch (err) {
      console.error(`Failed to download group:`, err);
      alert(err instanceof Error ? err.message : 'Failed to download images');
    }
  };

  // Action handlers
  const handleDownload = async (image: api.GeneratedImage) => {
    try {
      const blob = await api.downloadImage(image.id);
      const filename = `${image.prompt_number}_${image.character_name || 'ungrouped'}.png`;
      downloadBlob(blob, filename);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to download image');
    }
  };

  const handleBulkDownload = async () => {
    if (selectedImages.size === 0) return;
    
    try {
      const blob = await api.bulkDownloadImages(Array.from(selectedImages));
      downloadBlob(blob, 'selected_images.zip');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to download images');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      // Check if we're deleting the currently previewed image
      const wasPreviewing = previewImage?.id === id;
      
      await api.deleteGeneratedImage(id);
      setShowDeleteConfirm(null);
      setSelectedImages(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      
      // Close preview if we deleted the previewed image
      if (wasPreviewing) {
        setPreviewImage(null);
      }
      
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete image');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedImages.size === 0) return;
    
    try {
      await api.bulkDeleteGeneratedImages(Array.from(selectedImages));
      setShowDeleteConfirm(null);
      setSelectedImages(new Set());
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete images');
    }
  };

  const handleEdit = async (imageId: number, instruction: string) => {
    try {
      await api.editImage(imageId, instruction);
      setShowEditModal(false);
      setEditingImage(null);
      startEditPolling();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to queue edit');
    }
  };

  const startEditPolling = async () => {
    if (pollingEditStatus) return;
    
    setPollingEditStatus(true);
    const poll = async () => {
      try {
        const status = await api.getEditStatus();
        setEditQueue(status.queue);
        
        // Check if any tasks are still processing
        const hasActive = status.queue.some(t => t.status === 'queued' || t.status === 'processing');
        
        if (hasActive) {
          setTimeout(poll, 2000);
        } else {
          setPollingEditStatus(false);
          // Refresh images if any completed
          if (status.queue.some(t => t.status === 'completed')) {
            loadData();
          }
        }
      } catch (err) {
        console.error('Failed to get edit status:', err);
        setPollingEditStatus(false);
      }
    };
    poll();
  };

  // Load edit status on mount
  useEffect(() => {
    api.getEditStatus().then(status => {
      setEditQueue(status.queue);
      if (status.queue.some(t => t.status === 'queued' || t.status === 'processing')) {
        startEditPolling();
      }
    });
  }, []);

  // Image URL helper - works on both mobile and desktop
  const getImageUrl = (filePath: string) => {
    // Use relative path for images - works on both mobile and desktop
    if (filePath.startsWith('http')) {
      return filePath;
    }
    
    // For static files (/static/), use the Flask backend tunnel URL
    // Hardcoded fallback for production - update this if tunnel changes
    const tunnelUrl = import.meta.env.VITE_API_URL || 'https://welding-heaven-resistant-aviation.trycloudflare.com';
    const path = filePath.startsWith('/') ? filePath : '/' + filePath;
    
    if (filePath.startsWith('/static/')) {
      return `${tunnelUrl}${path}`;
    }
    
    // Fallback to current origin
    return `${window.location.origin}${path}`;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Results Gallery</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Browse, download, and edit generated images</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedImages.size > 0 && (
            <>
              <button 
                onClick={handleBulkDownload}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm 
                           text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 hover:bg-indigo-100 dark:hover:bg-indigo-900 
                           rounded-lg transition-colors"
              >
                <Package className="w-4 h-4" />
                Download ({selectedImages.size})
              </button>
              <button 
                onClick={() => setShowDeleteConfirm('bulk')}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm 
                           text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 hover:bg-red-100 dark:hover:bg-red-900 
                           rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </>
          )}
          <button
            onClick={loadData}
            className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Generation Queue - Global progress from any page */}
      {generationStatus.is_generating && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-slate-900 dark:text-white flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-violet-600 dark:text-violet-400" />
              Generation Queue
              <span className="ml-1 px-2 py-0.5 bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-300 text-xs rounded-full">
                Active
              </span>
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500 dark:text-slate-400">
                {generationStatus.completed} / {generationStatus.total} completed
              </span>
              <a 
                href="/generate" 
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
              >
                View in Generate
              </a>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mb-3">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-500"
              style={{ width: `${generationStatus.total > 0 ? (generationStatus.completed / generationStatus.total) * 100 : 0}%` }}
            />
          </div>

          {/* Current Prompt */}
          {generationStatus.current_prompt && (
            <div className="p-3 bg-violet-50 dark:bg-violet-950 border border-violet-100 dark:border-violet-900 rounded-lg">
              <p className="text-xs text-violet-600 dark:text-violet-400 mb-1">Currently generating:</p>
              <p className="text-sm text-slate-700 dark:text-slate-300 truncate">{generationStatus.current_prompt}</p>
            </div>
          )}

          {/* Errors */}
          {generationStatus.errors.length > 0 && (
            <div className="mt-3 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
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

      {/* Edit Queue Status */}
      {editQueue.filter(t => !dismissedEdits.has(t.id)).length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-slate-900 dark:text-white flex items-center gap-2">
              <Edit3 className="w-4 h-4" />
              Edit Queue
              {pollingEditStatus && (
                <Loader2 className="w-4 h-4 animate-spin text-indigo-600 dark:text-indigo-400" />
              )}
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500 dark:text-slate-400">
                {editQueue.filter(t => t.status === 'queued' && !dismissedEdits.has(t.id)).length} queued,{' '}
                {editQueue.filter(t => t.status === 'processing' && !dismissedEdits.has(t.id)).length} processing
              </span>
              {editQueue.some(t => dismissedEdits.has(t.id)) && (
                <button
                  onClick={clearAllDismissed}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
                >
                  Show dismissed
                </button>
              )}
            </div>
          </div>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {editQueue.filter(t => !dismissedEdits.has(t.id)).slice(-5).map(task => (
              <div 
                key={task.id}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm",
                  task.status === 'completed' && "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400",
                  task.status === 'processing' && "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400",
                  task.status === 'queued' && "bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300",
                  task.status === 'error' && "bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400"
                )}
              >
                {task.status === 'completed' && <Check className="w-4 h-4" />}
                {task.status === 'processing' && <Loader2 className="w-4 h-4 animate-spin" />}
                {task.status === 'queued' && <div className="w-4 h-4 rounded-full border-2 border-slate-300" />}
                {task.status === 'error' && <AlertCircle className="w-4 h-4" />}
                <span className="truncate flex-1">{task.instruction}</span>
                <span className="text-xs opacity-75 capitalize">{task.status}</span>
                <button
                  onClick={() => dismissEditTask(task.id)}
                  className="p-1 hover:bg-black/10 rounded"
                  title="Dismiss"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center justify-between">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          <button
            onClick={loadData}
            className="text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-medium"
          >
            Retry
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Search by prompt, character, or number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg 
                         focus:outline-none focus:ring-2 focus:ring-indigo-500/20 
                         focus:border-indigo-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white
                         placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors",
                showFilters
                  ? "border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950"
                  : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
              )}
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                "p-2 rounded-lg transition-colors",
                viewMode === 'grid' 
                  ? "bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400" 
                  : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              )}
            >
              <Grid3X3 className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                "p-2 rounded-lg transition-colors",
                viewMode === 'list' 
                  ? "bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400" 
                  : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              )}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Gender Filter Toggles */}
        <div className="flex items-center gap-2 mt-4">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Gender:</span>
          <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <button
              onClick={() => setGenderFilter('all')}
              className={cn(
                "px-4 py-2 text-sm font-medium transition-colors",
                genderFilter === 'all'
                  ? "bg-indigo-600 text-white"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              )}
            >
              ALL
            </button>
            <button
              onClick={() => setGenderFilter('female')}
              className={cn(
                "px-4 py-2 text-sm font-medium transition-colors border-l border-slate-200 dark:border-slate-700",
                genderFilter === 'female'
                  ? "bg-indigo-600 text-white"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              )}
            >
              FEMALE
            </button>
            <button
              onClick={() => setGenderFilter('male')}
              className={cn(
                "px-4 py-2 text-sm font-medium transition-colors border-l border-slate-200 dark:border-slate-700",
                genderFilter === 'male'
                  ? "bg-indigo-600 text-white"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              )}
            >
              MALE
            </button>
          </div>
          {genderFilter !== 'all' && (
            <button
              onClick={() => setGenderFilter('all')}
              className="text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 ml-2"
            >
              Clear
            </button>
          )}
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                <User className="w-4 h-4" />
                Character
              </label>
              <select
                value={characterFilter}
                onChange={(e) => setCharacterFilter(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500
                           bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              >
                <option value="all">All Characters</option>
                {characters.map(char => <option key={char} value={char}>{char}</option>)}
              </select>
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                <Tag className="w-4 h-4" />
                Model
              </label>
              <select
                value={modelFilter}
                onChange={(e) => setModelFilter(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500
                           bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              >
                <option value="all">All Models</option>
                {models.map(model => <option key={model} value={model}>{model}</option>)}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Gallery */}
      {loading ? (
        <div className="text-center py-16">
          <Loader2 className="w-12 h-12 text-indigo-600 dark:text-indigo-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-400">Loading images...</p>
        </div>
      ) : filteredImages.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
            <ImageIcon className="w-8 h-8 text-slate-400 dark:text-slate-500" />
          </div>
          <h3 className="text-lg font-medium text-slate-900 dark:text-white">No images found</h3>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {searchQuery || characterFilter !== 'all' || modelFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Generate some images to see them here'}
          </p>
          {!searchQuery && characterFilter === 'all' && modelFilter === 'all' && (
            <a 
              href="/generate"
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-800"
            >
              <Sparkles className="w-4 h-4" />
              Generate Images
            </a>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        // Grouped by character
        <div className="space-y-6">
          {/* Expand/Collapse All */}
          {Object.keys(groupedImages).length > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500 dark:text-slate-400">
                {Object.keys(groupedImages).length} groups
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={expandAllGroups}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
                >
                  Expand all
                </button>
                <span className="text-slate-300 dark:text-slate-600">|</span>
                <button
                  onClick={collapseAllGroups}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
                >
                  Collapse all
                </button>
              </div>
            </div>
          )}
          
          {Object.entries(groupedImages).map(([groupKey, groupImages]) => {
            const isExpanded = expandedGroups.has(groupKey) || expandedGroups.size === 0;
            return (
              <div key={groupKey} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                {/* Group Header */}
                <button
                  onClick={() => toggleGroup(groupKey)}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Package className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <div className="text-left">
                      <h3 className="font-medium text-slate-900 dark:text-white">{groupKey}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{groupImages.length} images</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadAllGroup(groupKey);
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-800 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Download All
                    </button>
                    <X 
                      className={cn(
                        "w-5 h-5 text-slate-400 dark:text-slate-500 transition-transform",
                        isExpanded ? "rotate-180" : ""
                      )} 
                    />
                  </div>
                </button>
                
                {/* Group Content */}
                {isExpanded && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-4 pt-0">
                    {groupImages.map((image) => (
            <div
              key={image.id}
              className={cn(
                "group relative aspect-square rounded-xl overflow-hidden cursor-pointer",
                "border-2 transition-all duration-200",
                selectedImages.has(image.id)
                  ? "border-indigo-500 ring-2 ring-indigo-500/20"
                  : "border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600"
              )}
              onClick={() => toggleSelection(image.id)}
            >
              <img
                src={getImageUrl(image.file_path)}
                alt={image.prompt_theme || 'Generated image'}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              
              {/* Selection Indicator */}
              {selectedImages.has(image.id) && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-indigo-500 
                                flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
              
              {/* Hover Actions */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 
                              transition-opacity flex items-center justify-center gap-2">
                <button 
                  onClick={(e) => { e.stopPropagation(); setPreviewImage(image); }}
                  className="p-2 bg-white dark:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDownload(image); }}
                  className="p-2 bg-white dark:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    setEditingImage(image); 
                    setShowEditModal(true); 
                  }}
                  className="p-2 bg-white dark:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDelete(image.id); }}
                  className="p-2 bg-white dark:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-200 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              
              {/* Info Overlay */}
              <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5 bg-gradient-to-t 
                              from-black/70 to-transparent text-white">
                <p className="text-xs font-medium truncate">{image.prompt_number}</p>
                <p className="text-[10px] text-white/70">{image.character_name} • {image.model_used}</p>
              </div>
            </div>
          ))}
                </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <th className="px-4 py-3 w-12">
                  <button 
                    onClick={toggleAll}
                    className="flex items-center justify-center w-5 h-5 rounded border 
                               border-slate-300 dark:border-slate-600 hover:border-indigo-500 transition-colors"
                  >
                    {selectedImages.size === filteredImages.length && filteredImages.length > 0 && (
                      <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Preview
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Prompt
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Character
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Model
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {filteredImages.map((image) => (
                <tr 
                  key={image.id}
                  className={cn(
                    "hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors",
                    selectedImages.has(image.id) && "bg-indigo-50/50 dark:bg-indigo-950/50"
                  )}
                >
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleSelection(image.id)}
                      className={cn(
                        "w-5 h-5 rounded border transition-colors flex items-center justify-center",
                        selectedImages.has(image.id)
                          ? "bg-indigo-600 border-indigo-600"
                          : "border-slate-300 dark:border-slate-600 hover:border-indigo-500"
                      )}
                    >
                      {selectedImages.has(image.id) && (
                        <Check className="w-3.5 h-3.5 text-white" />
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div 
                      className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center overflow-hidden cursor-pointer"
                      onClick={() => setPreviewImage(image)}
                    >
                      <img
                        src={getImageUrl(image.file_path)}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{image.prompt_number}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-xs">{image.prompt_theme}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs 
                                     font-medium bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                      {image.character_name}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                    {image.model_used}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                    {new Date(image.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button 
                        onClick={() => handleDownload(image)}
                        className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 
                                   hover:bg-indigo-50 dark:hover:bg-indigo-950 rounded-lg transition-colors"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => { setEditingImage(image); setShowEditModal(true); }}
                        className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 
                                   hover:bg-indigo-50 dark:hover:bg-indigo-950 rounded-lg transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(image.id)}
                        className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 
                                   hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Preview Modal */}
      {previewImage && (() => {
        // Get all images in the same group for navigation
        const groupKey = previewImage.character_name || 'Ungrouped';
        const groupImages = groupedImages[groupKey] || [];
        const currentIndex = groupImages.findIndex(img => img.id === previewImage.id);
        const hasPrev = currentIndex > 0;
        const hasNext = currentIndex < groupImages.length - 1;
        
        const goToPrev = () => {
          if (hasPrev) setPreviewImage(groupImages[currentIndex - 1]);
        };
        const goToNext = () => {
          if (hasNext) setPreviewImage(groupImages[currentIndex + 1]);
        };
        
        // Keyboard navigation
        const handleKeyDown = (e: React.KeyboardEvent) => {
          if (e.key === 'ArrowLeft') goToPrev();
          if (e.key === 'ArrowRight') goToNext();
          if (e.key === 'Escape') setPreviewImage(null);
        };
        
        return (
          <div 
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
            onClick={() => setPreviewImage(null)}
            onKeyDown={handleKeyDown}
            tabIndex={0}
          >
            {/* Left Arrow */}
            {hasPrev && (
              <button
                onClick={(e) => { e.stopPropagation(); goToPrev(); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors z-10"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}
            
            {/* Right Arrow */}
            {hasNext && (
              <button
                onClick={(e) => { e.stopPropagation(); goToNext(); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors z-10"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
            
            <div 
              className="relative max-w-4xl w-full"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Image */}
              <img
                src={getImageUrl(previewImage.file_path)}
                alt="Preview"
                className="max-w-full max-h-[75vh] object-contain rounded-lg mx-auto"
              />
              
              {/* Minimal Action Buttons Below Image */}
              <div className="flex items-center justify-center gap-2 mt-4">
                <button
                  onClick={(e) => { e.stopPropagation(); handleDownload(previewImage); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white/80 hover:text-white rounded-lg transition-colors text-sm"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
                <button
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    setEditingImage(previewImage); 
                    setShowEditModal(true); 
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white/80 hover:text-white rounded-lg transition-colors text-sm"
                >
                  <Edit3 className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    setShowDeleteConfirm('single'); 
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-red-600/80 text-white/80 hover:text-white rounded-lg transition-colors text-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
              
              {/* Image Info */}
              <div className="mt-3 text-center">
                <p className="text-white font-medium">{previewImage.prompt_number} - {previewImage.prompt_theme}</p>
                <p className="text-white/60 text-sm">{previewImage.character_name} • {previewImage.model_used}</p>
                <p className="text-white/40 text-xs mt-1">{currentIndex + 1} of {groupImages.length} in {groupKey}</p>
              </div>
              
              {/* Close Button */}
              <button
                onClick={() => setPreviewImage(null)}
                className="absolute top-0 right-0 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        );
      })()}

      {/* Edit Modal */}
      {showEditModal && editingImage && (
        <EditModal
          image={editingImage}
          onClose={() => { setShowEditModal(false); setEditingImage(null); }}
          onSubmit={handleEdit}
        />
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              {showDeleteConfirm === 'bulk' ? 'Delete Multiple Images' : 'Delete Image'}
            </h3>
            <p className="text-slate-600 dark:text-slate-300 mb-4">
              {showDeleteConfirm === 'bulk' 
                ? `Are you sure you want to delete ${selectedImages.size} images? This action cannot be undone.`
                : 'Are you sure you want to delete this image? This action cannot be undone.'}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => showDeleteConfirm === 'bulk' ? handleBulkDelete() : previewImage && handleDelete(previewImage.id)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 transition-colors"
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

// Download blob helper
function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

// Edit Modal Component
interface EditModalProps {
  image: api.GeneratedImage;
  onClose: () => void;
  onSubmit: (imageId: number, instruction: string) => void;
}

function EditModal({ image, onClose, onSubmit }: EditModalProps) {
  const [instruction, setInstruction] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instruction.trim()) return;
    
    setLoading(true);
    await onSubmit(image.id, instruction);
    setLoading(false);
  };

  const presetInstructions = [
    "Remove background and make it white",
    "Fix facial imperfections",
    "Enhance lighting and contrast",
    "Make the image more vibrant",
    "Add a soft vignette effect",
  ];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-lg w-full">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Edit Image with Gemini</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">{image.prompt_number} - {image.prompt_theme}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
            <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              The image will be edited using Gemini AI in the background. You'll be notified when complete.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Edit Instruction
            </label>
            <textarea
              required
              rows={3}
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg 
                         focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-y
                         bg-white dark:bg-slate-900 text-slate-900 dark:text-white
                         placeholder:text-slate-400 dark:placeholder:text-slate-500"
              placeholder="e.g., Remove the background, fix lighting, enhance colors..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Quick Presets
            </label>
            <div className="flex flex-wrap gap-2">
              {presetInstructions.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setInstruction(preset)}
                  className="px-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-full
                             hover:bg-indigo-100 dark:hover:bg-indigo-900 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !instruction.trim()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 
                         dark:bg-indigo-700 dark:hover:bg-indigo-800 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Queue Edit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
