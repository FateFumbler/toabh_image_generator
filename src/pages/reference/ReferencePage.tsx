import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Upload, 
  Trash2, 
  Grid3X3,
  List,
  FolderOpen,
  Image as ImageIcon,
  Plus,
  X,
  User,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Search,
  Pencil,
  Check,
  XCircle
} from 'lucide-react';
import { clsx, type ClassValue } from '../../utils/clsx';
import * as api from '../../api/client';

function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

const MAX_IMAGES_PER_CHARACTER = 8;

export function ReferencePage() {
  // Data state
  const [characters, setCharacters] = useState<api.Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCharacter, setSelectedCharacter] = useState<string | 'all'>('all');
  const [expandedCharacters, setExpandedCharacters] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [showAddCharacter, setShowAddCharacter] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<api.Character | null>(null);
  const [uploadingCharacter, setUploadingCharacter] = useState<api.Character | null>(null);
  
  // Edit character state
  const [editingCharacterId, setEditingCharacterId] = useState<number | null>(null);
  const [editingCharacterName, setEditingCharacterName] = useState('');

  // Track which character to upload to when file input is triggered
  const [uploadTargetCharacter, setUploadTargetCharacter] = useState<api.Character | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getCharacters();
      setCharacters(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load characters');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Get all reference images
  const allImages = characters.flatMap(char => 
    (char.reference_images || []).map(img => ({ ...img, character_name: char.name }))
  );

  // Filter images by selected character and search
  const filteredImages = (selectedCharacter === 'all' 
    ? allImages 
    : allImages.filter(img => img.character_name === selectedCharacter)
  ).filter(img => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return img.character_name?.toLowerCase().includes(query);
  });

  // Filter characters by search
  const filteredCharacters = characters.filter(char => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return char.name?.toLowerCase().includes(query);
  });

  // Helper to get first image for a character
  const getFirstImage = (character: api.Character) => {
    if (character.reference_images && character.reference_images.length > 0) {
      return character.reference_images[0].file_path;
    }
    return null;
  };

  // Helper to get image URL - works on both mobile and desktop
  const getImageUrl = (path: string) => {
    // Use relative path for images - works on both mobile and desktop
    if (path.startsWith('http')) {
      return path;
    }
    
    // For static files (/static/), use the Flask backend tunnel URL
    // Hardcoded fallback for production - update this if tunnel changes
    const tunnelUrl = import.meta.env.VITE_API_URL || 'https://welding-heaven-resistant-aviation.trycloudflare.com';
    const urlPath = path.startsWith('/') ? path : '/' + path;
    
    if (path.startsWith('/static/')) {
      return `${tunnelUrl}${urlPath}`;
    }
    
    // Fallback to current origin
    return `${window.location.origin}${urlPath}`;
  };

  // Character handlers
  const handleCreateCharacter = async (name: string, files?: File[]) => {
    try {
      const formData = new FormData();
      formData.append('name', name);
      if (files) {
        files.forEach(f => formData.append('files', f));
      }
      await api.addCharacter(name, files ? formData.getAll('files') as unknown as FileList : undefined);
      setShowAddCharacter(false);
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create character');
    }
  };

  const handleDeleteCharacter = async (character: api.Character) => {
    try {
      await api.deleteCharacter(character.id);
      setShowDeleteConfirm(null);
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete character');
    }
  };

  const handleEditCharacter = async (character: api.Character) => {
    const newName = editingCharacterName.trim();
    if (!newName) {
      alert('Character name cannot be empty');
      return;
    }
    if (newName === character.name) {
      setEditingCharacterId(null);
      return;
    }
    try {
      await api.updateCharacter(character.id, newName);
      setEditingCharacterId(null);
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update character');
    }
  };

  const startEditing = (character: api.Character) => {
    setEditingCharacterId(character.id);
    setEditingCharacterName(character.name);
  };

  const cancelEditing = () => {
    setEditingCharacterId(null);
    setEditingCharacterName('');
  };

  const handleDeleteImage = async (imageId: number) => {
    try {
      await api.deleteReferenceImage(imageId);
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete image');
    }
  };

  const handleUploadImages = async (character: api.Character, files: File[]) => {
    const remainingSlots = MAX_IMAGES_PER_CHARACTER - (character.image_count || 0);
    if (remainingSlots <= 0) {
      alert(`Maximum ${MAX_IMAGES_PER_CHARACTER} images allowed per character`);
      return;
    }
    
    const filesToUpload = files.slice(0, remainingSlots);
    
    try {
      setUploadingCharacter(character);
      const formData = new FormData();
      filesToUpload.forEach(f => formData.append('files', f));
      await api.uploadReferenceImages(character.name, formData.getAll('files') as unknown as FileList);
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to upload images');
    } finally {
      setUploadingCharacter(null);
    }
  };

  const toggleExpanded = (charId: number) => {
    setExpandedCharacters(prev => {
      const next = new Set(prev);
      if (next.has(charId)) {
        next.delete(charId);
      } else {
        next.add(charId);
      }
      return next;
    });
  };

  // Drag and drop handlers
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent, character?: api.Character) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length === 0) return;

    if (character) {
      handleUploadImages(character, files);
    } else if (characters.length > 0) {
      // Upload to first character if none specified
      handleUploadImages(characters[0], files);
    } else {
      alert('Please create a character first');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reference Sets</h1>
          <p className="text-slate-500 mt-1">Manage reference images for consistent image generation</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddCharacter(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white 
                       rounded-lg hover:bg-indigo-700 transition-colors font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Character
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

      {/* Search Bar */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search reference sets by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg 
                       focus:outline-none focus:ring-2 focus:ring-indigo-500/20 
                       focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Main Content */}
      {selectedCharacter === 'all' ? (
        // Characters List View
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-slate-500 mt-2">Loading characters...</p>
            </div>
          ) : characters.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                <User className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-900">No characters yet</h3>
              <p className="text-slate-500 mt-1 mb-4">Create a character to start uploading reference images</p>
              <button
                onClick={() => setShowAddCharacter(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                <Plus className="w-4 h-4" />
                Add Character
              </button>
            </div>
          ) : (
            filteredCharacters.map(character => (
              <div key={character.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                {/* Character Header */}
                <div 
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  onClick={() => toggleExpanded(character.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-700 flex-shrink-0">
                      {getFirstImage(character) ? (
                        <img 
                          src={getImageUrl(getFirstImage(character)!)} 
                          alt={character.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <User className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      {editingCharacterId === character.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editingCharacterName}
                            onChange={(e) => setEditingCharacterName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleEditCharacter(character);
                              if (e.key === 'Escape') cancelEditing();
                            }}
                            className="px-2 py-1 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm flex-1 min-w-0"
                            autoFocus
                          />
                          <button
                            onClick={() => handleEditCharacter(character)}
                            className="p-1.5 text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/50 rounded-lg transition-colors"
                            title="Save"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                            title="Cancel"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <h3 className="font-semibold text-slate-900 dark:text-white truncate">{character.name}</h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {character.image_count || 0} images 
                            {(character.image_count || 0) >= MAX_IMAGES_PER_CHARACTER && (
                              <span className="text-amber-600 dark:text-amber-400 ml-1">(Max reached)</span>
                            )}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {editingCharacterId !== character.id && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditing(character);
                          }}
                          className="p-2 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/50 rounded-lg transition-colors"
                          title="Edit name"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setUploadTargetCharacter(character);
                            fileInputRef.current?.click();
                          }}
                          disabled={(character.image_count || 0) >= MAX_IMAGES_PER_CHARACTER || uploadingCharacter?.id === character.id}
                          className="px-3 py-1.5 text-sm bg-indigo-50 text-indigo-600 rounded-lg 
                                     hover:bg-indigo-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                                     flex items-center gap-1.5"
                        >
                          {uploadingCharacter?.id === character.id ? (
                            <>
                              <div className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className="w-3.5 h-3.5" />
                              Upload
                            </>
                          )}
                        </button>
                      </>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDeleteConfirm(character);
                      }}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    {expandedCharacters.has(character.id) ? (
                      <ChevronUp className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Images Grid */}
                {expandedCharacters.has(character.id) && (
                  <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                    {(character.reference_images || []).length === 0 ? (
                      <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, character)}
                        className={cn(
                          "border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer",
                          isDragging
                            ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                            : "border-slate-300 dark:border-slate-600 hover:border-indigo-400"
                        )}
                        onClick={() => {
                          setUploadTargetCharacter(character);
                          fileInputRef.current?.click();
                        }}
                      >
                        <FolderOpen className="w-8 h-8 text-slate-400 dark:text-slate-500 mx-auto mb-2" />
                        <p className="text-sm text-slate-600 dark:text-slate-400">Drop images here or click to upload</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                        {(character.reference_images || []).map(image => (
                          <div key={image.id} className="relative aspect-square rounded-lg overflow-hidden group">
                            <img
                              src={getImageUrl(image.file_path)}
                              alt={image.file_name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = '';
                                (e.target as HTMLImageElement).className = 'hidden';
                              }}
                            />
                            <div className="absolute inset-0 bg-slate-100 dark:bg-slate-700 flex items-center justify-center -z-10">
                              <ImageIcon className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                            </div>
                            <button
                              onClick={() => handleDeleteImage(image.id)}
                              className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full
                                         opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                        {/* Add More Slot */}
                        {(character.image_count || 0) < MAX_IMAGES_PER_CHARACTER && (
                          <button
                            onClick={() => {
                              setUploadTargetCharacter(character);
                              fileInputRef.current?.click();
                            }}
                            className="aspect-square rounded-lg border-2 border-dashed border-slate-300 
                                       hover:border-indigo-400 hover:bg-indigo-50 transition-all
                                       flex flex-col items-center justify-center gap-1"
                          >
                            <Plus className="w-6 h-6 text-slate-400" />
                            <span className="text-xs text-slate-500">Add</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      ) : (
        // Single Character Image Gallery
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              {selectedCharacter}'s Images
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  viewMode === 'grid' 
                    ? "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400" 
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
                    ? "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400" 
                    : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                )}
              >
                <List className="w-5 h-5" />
              </button>
              <button
                onClick={() => {
                  const char = characters.find(c => c.name === selectedCharacter);
                  if (char) setUploadTargetCharacter(char);
                  fileInputRef.current?.click();
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white 
                           rounded-lg hover:bg-indigo-700 transition-colors font-medium ml-2"
              >
                <Upload className="w-4 h-4" />
                Upload
              </button>
            </div>
          </div>

          {/* Images Display */}
          {filteredImages.length === 0 ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, characters.find(c => c.name === selectedCharacter))}
              className={cn(
                "border-2 border-dashed rounded-xl p-12 text-center transition-all",
                isDragging 
                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20" 
                  : "border-slate-300 dark:border-slate-600 hover:border-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
              )}
            >
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                <FolderOpen className="w-6 h-6 text-slate-500 dark:text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                Drag and drop images here
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                or click the upload button above
              </p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {filteredImages.map((image) => (
                <div
                  key={image.id}
                  className="group relative aspect-square rounded-xl overflow-hidden border border-slate-200"
                >
                  <img
                    src={getImageUrl(image.file_path)}
                    alt={image.file_name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-slate-100 flex items-center justify-center -z-10">
                    <ImageIcon className="w-8 h-8 text-slate-300" />
                  </div>
                  
                  {/* Hover Actions */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 
                                  transition-opacity flex items-center justify-center">
                    <button 
                      onClick={() => handleDeleteImage(image.id)}
                      className="p-2 bg-white rounded-lg text-slate-700 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {/* Filename */}
                  <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5 bg-gradient-to-t 
                                  from-black/60 to-transparent">
                    <p className="text-xs text-white truncate">{image.file_name}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Preview
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Filename
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Character
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredImages.map((image) => (
                    <tr key={image.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden">
                          <img
                            src={getImageUrl(image.file_path)}
                            alt={image.file_name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">
                        {image.file_name}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {image.character_name}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button 
                          onClick={() => handleDeleteImage(image.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 
                                     hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const files = e.target.files;
          if (files && files.length > 0) {
            // Use uploadTargetCharacter if set, otherwise fall back to old logic
            const char = uploadTargetCharacter || (
              selectedCharacter === 'all' 
                ? characters[0] 
                : characters.find(c => c.name === selectedCharacter)
            );
            if (char) {
              handleUploadImages(char, Array.from(files));
            }
          }
          // Clear the target after use
          setUploadTargetCharacter(null);
          // Reset file input value so same file can be selected again
          e.target.value = '';
        }}
      />

      {/* Add Character Modal */}
      {showAddCharacter && (
        <AddCharacterModal
          onClose={() => setShowAddCharacter(false)}
          onSubmit={handleCreateCharacter}
        />
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Delete Character</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-slate-600 dark:text-slate-300 mb-4">
              Are you sure you want to delete <strong>{showDeleteConfirm.name}</strong>? 
              This will also delete all {showDeleteConfirm.image_count} reference images.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteCharacter(showDeleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete Character
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Add Character Modal
interface AddCharacterModalProps {
  onClose: () => void;
  onSubmit: (name: string, files?: File[]) => void;
}

function AddCharacterModal({ onClose, onSubmit }: AddCharacterModalProps) {
  const [name, setName] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit(name.trim(), files.length > 0 ? files : undefined);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Add New Character</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Character Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white
                         focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              placeholder="e.g., Emma, Model A"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Initial Images (optional)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => setFiles(Array.from(e.target.files || []))}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-3 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg
                         hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all
                         flex flex-col items-center gap-1"
            >
              <Upload className="w-5 h-5 text-slate-400 dark:text-slate-500" />
              <span className="text-sm text-slate-600 dark:text-slate-400">
                {files.length > 0 ? `${files.length} images selected` : 'Click to upload images'}
              </span>
            </button>
            {files.length > 0 && (
              <button
                type="button"
                onClick={() => setFiles([])}
                className="mt-2 text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
              >
                Clear selection
              </button>
            )}
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 
                         transition-colors disabled:opacity-50"
            >
              Create Character
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
