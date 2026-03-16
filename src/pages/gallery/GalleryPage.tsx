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
  Sparkles
} from 'lucide-react';
import { clsx, type ClassValue } from '../../utils/clsx';
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

  // Modal states
  const [previewImage, setPreviewImage] = useState<api.GeneratedImage | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingImage, setEditingImage] = useState<api.GeneratedImage | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<'single' | 'bulk' | null>(null);

  // Edit queue state
  const [editQueue, setEditQueue] = useState<api.EditTask[]>([]);
  const [pollingEditStatus, setPollingEditStatus] = useState(false);

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
      await api.deleteGeneratedImage(id);
      setShowDeleteConfirm(null);
      setSelectedImages(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
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
    // The proxy/Vite handles serving static files correctly
    if (filePath.startsWith('http')) {
      return filePath;
    }
    // Remove leading slash if present for proper relative path
    const cleanPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
    // Use current window location for proper relative URLs on mobile
    const baseUrl = window.location.origin;
    return `${baseUrl}/${cleanPath}`;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Results Gallery</h1>
          <p className="text-slate-500 mt-1">Browse, download, and edit generated images</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedImages.size > 0 && (
            <>
              <button 
                onClick={handleBulkDownload}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm 
                           text-indigo-600 bg-indigo-50 hover:bg-indigo-100 
                           rounded-lg transition-colors"
              >
                <Package className="w-4 h-4" />
                Download ({selectedImages.size})
              </button>
              <button 
                onClick={() => setShowDeleteConfirm('bulk')}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm 
                           text-red-600 bg-red-50 hover:bg-red-100 
                           rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </>
          )}
          <button
            onClick={loadData}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Edit Queue Status */}
      {editQueue.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-slate-900 flex items-center gap-2">
              <Edit3 className="w-4 h-4" />
              Edit Queue
              {pollingEditStatus && (
                <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
              )}
            </h3>
            <span className="text-sm text-slate-500">
              {editQueue.filter(t => t.status === 'queued').length} queued,{' '}
              {editQueue.filter(t => t.status === 'processing').length} processing
            </span>
          </div>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {editQueue.slice(-5).map(task => (
              <div 
                key={task.id}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm",
                  task.status === 'completed' && "bg-emerald-50 text-emerald-700",
                  task.status === 'processing' && "bg-blue-50 text-blue-700",
                  task.status === 'queued' && "bg-slate-50 text-slate-600",
                  task.status === 'error' && "bg-red-50 text-red-700"
                )}
              >
                {task.status === 'completed' && <Check className="w-4 h-4" />}
                {task.status === 'processing' && <Loader2 className="w-4 h-4 animate-spin" />}
                {task.status === 'queued' && <div className="w-4 h-4 rounded-full border-2 border-slate-300" />}
                {task.status === 'error' && <AlertCircle className="w-4 h-4" />}
                <span className="truncate flex-1">{task.instruction}</span>
                <span className="text-xs opacity-75 capitalize">{task.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

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
              placeholder="Search by prompt, character, or number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg 
                         focus:outline-none focus:ring-2 focus:ring-indigo-500/20 
                         focus:border-indigo-500"
            />
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-2">
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
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                "p-2 rounded-lg transition-colors",
                viewMode === 'grid' 
                  ? "bg-indigo-100 text-indigo-600" 
                  : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              )}
            >
              <Grid3X3 className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                "p-2 rounded-lg transition-colors",
                viewMode === 'list' 
                  ? "bg-indigo-100 text-indigo-600" 
                  : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              )}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1.5">
                <User className="w-4 h-4" />
                Character
              </label>
              <select
                value={characterFilter}
                onChange={(e) => setCharacterFilter(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="all">All Characters</option>
                {characters.map(char => <option key={char} value={char}>{char}</option>)}
              </select>
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1.5">
                <Tag className="w-4 h-4" />
                Model
              </label>
              <select
                value={modelFilter}
                onChange={(e) => setModelFilter(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
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
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-500">Loading images...</p>
        </div>
      ) : filteredImages.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
            <ImageIcon className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-900">No images found</h3>
          <p className="text-slate-500 mt-1">
            {searchQuery || characterFilter !== 'all' || modelFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Generate some images to see them here'}
          </p>
          {!searchQuery && characterFilter === 'all' && modelFilter === 'all' && (
            <a 
              href="/generate"
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              <Sparkles className="w-4 h-4" />
              Generate Images
            </a>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredImages.map((image) => (
            <div
              key={image.id}
              className={cn(
                "group relative aspect-square rounded-xl overflow-hidden cursor-pointer",
                "border-2 transition-all duration-200",
                selectedImages.has(image.id)
                  ? "border-indigo-500 ring-2 ring-indigo-500/20"
                  : "border-slate-200 hover:border-indigo-300"
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
                  className="p-2 bg-white rounded-lg text-slate-700 hover:text-indigo-600 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDownload(image); }}
                  className="p-2 bg-white rounded-lg text-slate-700 hover:text-indigo-600 transition-colors"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    setEditingImage(image); 
                    setShowEditModal(true); 
                  }}
                  className="p-2 bg-white rounded-lg text-slate-700 hover:text-indigo-600 transition-colors"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDelete(image.id); }}
                  className="p-2 bg-white rounded-lg text-slate-700 hover:text-red-600 transition-colors"
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
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 w-12">
                  <button 
                    onClick={toggleAll}
                    className="flex items-center justify-center w-5 h-5 rounded border 
                               border-slate-300 hover:border-indigo-500 transition-colors"
                  >
                    {selectedImages.size === filteredImages.length && filteredImages.length > 0 && (
                      <CheckSquare className="w-4 h-4 text-indigo-600" />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Preview
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Prompt
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Character
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Model
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredImages.map((image) => (
                <tr 
                  key={image.id}
                  className={cn(
                    "hover:bg-slate-50 transition-colors",
                    selectedImages.has(image.id) && "bg-indigo-50/50"
                  )}
                >
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleSelection(image.id)}
                      className={cn(
                        "w-5 h-5 rounded border transition-colors flex items-center justify-center",
                        selectedImages.has(image.id)
                          ? "bg-indigo-600 border-indigo-600"
                          : "border-slate-300 hover:border-indigo-500"
                      )}
                    >
                      {selectedImages.has(image.id) && (
                        <Check className="w-3.5 h-3.5 text-white" />
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div 
                      className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden cursor-pointer"
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
                      <p className="text-sm font-medium text-slate-900">{image.prompt_number}</p>
                      <p className="text-xs text-slate-500 truncate max-w-xs">{image.prompt_theme}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs 
                                     font-medium bg-slate-100 text-slate-800">
                      {image.character_name}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {image.model_used}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">
                    {new Date(image.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button 
                        onClick={() => handleDownload(image)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 
                                   hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => { setEditingImage(image); setShowEditModal(true); }}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 
                                   hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(image.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 
                                   hover:bg-red-50 rounded-lg transition-colors"
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
      {previewImage && (
        <div 
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={getImageUrl(previewImage.file_path)}
              alt="Preview"
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent rounded-b-lg">
              <p className="text-white font-medium">{previewImage.prompt_number} - {previewImage.prompt_theme}</p>
              <p className="text-white/70 text-sm">{previewImage.character_name} • {previewImage.model_used}</p>
            </div>
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

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
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              {showDeleteConfirm === 'bulk' ? 'Delete Multiple Images' : 'Delete Image'}
            </h3>
            <p className="text-slate-600 mb-4">
              {showDeleteConfirm === 'bulk' 
                ? `Are you sure you want to delete ${selectedImages.size} images? This action cannot be undone.`
                : 'Are you sure you want to delete this image? This action cannot be undone.'}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => showDeleteConfirm === 'bulk' ? handleBulkDelete() : setShowDeleteConfirm(null)}
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
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Edit Image with Gemini</h3>
            <p className="text-sm text-slate-500">{image.prompt_number} - {image.prompt_theme}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-700">
              The image will be edited using Gemini AI in the background. You'll be notified when complete.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Edit Instruction
            </label>
            <textarea
              required
              rows={3}
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg 
                         focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-y"
              placeholder="e.g., Remove the background, fix lighting, enhance colors..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Quick Presets
            </label>
            <div className="flex flex-wrap gap-2">
              {presetInstructions.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setInstruction(preset)}
                  className="px-3 py-1.5 text-xs bg-slate-100 text-slate-700 rounded-full
                             hover:bg-indigo-100 hover:text-indigo-700 transition-colors"
                >
                  {preset}
                </button>
              ))}
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
              disabled={loading || !instruction.trim()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 
                         transition-colors disabled:opacity-50 flex items-center gap-2"
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
