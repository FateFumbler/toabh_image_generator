import { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Upload, 
  Wand2, 
  FileText, 
  X, 
  Image as ImageIcon,
  Download,
  Sparkles,
  Settings,
  Loader2,
  Save,
  AlertCircle
} from 'lucide-react';
import { clsx, type ClassValue } from '../../utils/clsx';
import * as api from '../../api/client';

function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

const MAX_IMAGES = 20;

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

export function PromptGeneratorPage() {
  // Data state
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploadedPreviews, setUploadedPreviews] = useState<string[]>([]);
  const [generatedPrompts, setGeneratedPrompts] = useState<string[]>([]);
  const [kbContent, setKbContent] = useState('');
  const [categories, setCategories] = useState<api.Category[]>([]);

  // UI state
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSavingKB, setIsSavingKB] = useState(false);
  const [showKbEditor, setShowKbEditor] = useState(false);
  const [loadingKB, setLoadingKB] = useState(false);
  const [showBulkSave, setShowBulkSave] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load KB on mount
  const loadKB = useCallback(async () => {
    try {
      setLoadingKB(true);
      const data = await api.getPromptGeneratorKB();
      setKbContent(data.kb);
      
      // Also load categories for bulk save
      const cats = await api.getCategories();
      setCategories(cats);
    } catch (err) {
      console.error('Failed to load KB:', err);
      // Set default KB if loading fails
      setKbContent(`### Prompt Style Rules:
- Start with 'Theme: '
- Followed by a descriptive prompt text.
- Use cinematic lighting terms.
- Focus on facial details and atmosphere.
- Example: Theme: Sunset Glow - High-end fashion editorial, soft golden hour lighting on face, sharp eyes, cinematic bokeh.`);
    } finally {
      setLoadingKB(false);
    }
  }, []);

  useEffect(() => {
    loadKB();
  }, [loadKB]);

  // File handlers
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const remainingSlots = MAX_IMAGES - uploadedFiles.length;
    if (remainingSlots <= 0) {
      alert(`Maximum ${MAX_IMAGES} images allowed`);
      return;
    }

    const filesToAdd = files.slice(0, remainingSlots);
    
    // Create previews
    filesToAdd.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedPreviews(prev => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });

    setUploadedFiles(prev => [...prev, ...filesToAdd]);
  };

  const removeImage = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    setUploadedPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleGenerate = async () => {
    if (uploadedFiles.length === 0) return;

    try {
      setIsGenerating(true);
      const dataTransfer = new DataTransfer();
      uploadedFiles.forEach(file => dataTransfer.items.add(file));
      const result = await api.generatePromptsFromImages(dataTransfer.files);
      setGeneratedPrompts(result.prompts);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to generate prompts');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveKB = async () => {
    try {
      setIsSavingKB(true);
      await api.updatePromptGeneratorKB(kbContent);
      setShowKbEditor(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save KB');
    } finally {
      setIsSavingKB(false);
    }
  };

  const handleCopyPrompt = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleExportAll = () => {
    const blob = new Blob([generatedPrompts.join('\n\n')], { type: 'text/plain' });
    downloadBlob(blob, 'generated_prompts.txt');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Prompt Generator</h1>
          <p className="text-slate-500 mt-1">
            Upload reference images and generate prompts using Gemini AI
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowKbEditor(!showKbEditor)}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors",
              showKbEditor
                ? "border-indigo-500 text-indigo-600 bg-indigo-50"
                : "border-slate-200 hover:bg-slate-50 text-slate-700"
            )}
          >
            <Settings className="w-4 h-4" />
            KB Rules
          </button>
        </div>
      </div>

      {/* KB Editor */}
      {showKbEditor && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Knowledge Base Rules</h2>
            </div>
            <button 
              onClick={() => setShowKbEditor(false)}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            </button>
          </div>
          
          {loadingKB ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            </div>
          ) : (
            <>
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  These rules guide how Gemini generates prompts from your reference images.
                  Changes will apply to future generations.
                </p>
              </div>
              
              <textarea
                value={kbContent}
                onChange={(e) => setKbContent(e.target.value)}
                rows={12}
                className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white
                           focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500
                           resize-y"
              />
              
              <div className="mt-4 flex justify-end gap-3">
                <button
                  onClick={() => setShowKbEditor(false)}
                  className="px-4 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveKB}
                  disabled={isSavingKB}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg 
                             hover:bg-indigo-700 transition-colors font-medium
                             flex items-center gap-2 disabled:opacity-50"
                >
                  {isSavingKB ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Rules
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Image Upload Section */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Reference Images</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn(
                "text-sm",
                uploadedFiles.length >= MAX_IMAGES ? "text-red-500 dark:text-red-400 font-medium" : "text-slate-500 dark:text-slate-400"
              )}>
                {uploadedFiles.length}/{MAX_IMAGES} images
              </span>
              {uploadedFiles.length > 0 && (
                <button
                  onClick={() => { setUploadedFiles([]); setUploadedPreviews([]); }}
                  className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>

          {/* Upload Area */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadedFiles.length >= MAX_IMAGES}
            className={cn(
              "w-full border-2 border-dashed rounded-xl p-8 text-center transition-all",
              uploadedFiles.length >= MAX_IMAGES 
                ? "border-slate-200 dark:border-slate-700 opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-700"
                : "border-slate-300 dark:border-slate-600 hover:border-indigo-500 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/20"
            )}
          >
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-indigo-50 flex items-center justify-center">
              <Upload className="w-6 h-6 text-indigo-600" />
            </div>
            <p className="text-sm font-medium text-slate-900">
              Click to upload images
            </p>
            <p className="text-xs text-slate-500 mt-1">
              PNG, JPG up to 10MB each. Max {MAX_IMAGES} images.
            </p>
          </button>
          
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
            disabled={uploadedFiles.length >= MAX_IMAGES}
          />

          {/* Image Grid */}
          {uploadedPreviews.length > 0 && (
            <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 gap-3">
              {uploadedPreviews.map((preview, index) => (
                <div key={index} className="relative aspect-square rounded-lg overflow-hidden group border border-slate-200 dark:border-slate-700">
                  <img
                    src={preview}
                    alt={`Upload ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full
                               opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] px-1.5 py-0.5 truncate">
                    {uploadedFiles[index]?.name}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={uploadedFiles.length === 0 || isGenerating}
            className={cn(
              "w-full mt-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2",
              "transition-all duration-200",
              uploadedFiles.length === 0 || isGenerating
                ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                : "bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:shadow-lg hover:shadow-indigo-500/25"
            )}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Analyzing {uploadedFiles.length} image{uploadedFiles.length !== 1 ? 's' : ''}...
              </>
            ) : (
              <>
                <Wand2 className="w-5 h-5" />
                Generate Prompts
              </>
            )}
          </button>
        </div>

        {/* Generated Prompts Section */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-semibold text-slate-900">Generated Prompts</h2>
            </div>
            {generatedPrompts.length > 0 && (
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleExportAll}
                  className="inline-flex items-center gap-1.5 text-sm text-slate-600 
                             hover:text-indigo-600 font-medium"
                >
                  <Download className="w-4 h-4" />
                  Export
                </button>
              </div>
            )}
          </div>

          {generatedPrompts.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/50">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                <Wand2 className="w-6 h-6 text-slate-400 dark:text-slate-500" />
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Upload images and click generate to create prompts
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
              {generatedPrompts.map((prompt, index) => (
                <div
                  key={index}
                  className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-700 
                             hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors group"
                >
                  <div className="flex items-start gap-3">
                    {uploadedPreviews[index] && (
                      <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 border border-slate-200 dark:border-slate-700">
                        <img 
                          src={uploadedPreviews[index]} 
                          alt="" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm text-slate-700 dark:text-slate-200 flex-1">{prompt}</p>
                        <button 
                          onClick={() => handleCopyPrompt(prompt)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 dark:text-slate-500 
                                     hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/50 rounded-lg transition-all flex-shrink-0"
                          title="Copy to clipboard"
                        >
                          <CopyIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Bulk Actions */}
          {generatedPrompts.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex gap-3">
              <button 
                onClick={() => setShowBulkSave(true)}
                className="flex-1 py-2 bg-indigo-600 text-white rounded-lg 
                           hover:bg-indigo-700 transition-colors font-medium text-sm
                           flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save All to Library
              </button>
              <button 
                onClick={() => { setGeneratedPrompts([]); setUploadedFiles([]); setUploadedPreviews([]); }}
                className="flex-1 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 
                           rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-medium text-sm"
              >
                Clear All
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bulk Save Modal */}
      {showBulkSave && (
        <BulkSaveModal
          prompts={generatedPrompts}
          categories={categories}
          onClose={() => setShowBulkSave(false)}
          onSuccess={() => {
            setShowBulkSave(false);
            setGeneratedPrompts([]);
            setUploadedFiles([]);
            setUploadedPreviews([]);
          }}
        />
      )}
    </div>
  );
}

// Bulk Save Modal
interface BulkSaveModalProps {
  prompts: string[];
  categories: api.Category[];
  onClose: () => void;
  onSuccess: () => void;
}

function BulkSaveModal({ prompts, categories, onClose, onSuccess }: BulkSaveModalProps) {
  const [categoryId, setCategoryId] = useState<number | undefined>(categories[0]?.id);
  const [gender, setGender] = useState('female');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      const promptsText = prompts.join('\n');
      const request: api.BulkSaveToLibraryRequest = {
        prompts: promptsText,
        category_id: categoryId,
        gender: gender,
      };
      await api.bulkSaveToLibrary(request);
      onSuccess();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save prompts');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Save to Library</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Save {prompts.length} generated prompts</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
            <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white
                         focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Gender</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white
                         focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="female">Female</option>
              <option value="male">Male</option>
            </select>
          </div>

          <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Prompts will be parsed and saved to your prompt library. Make sure they follow the 
                &quot;Theme: Description&quot; format for best results.
              </p>
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
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 
                         transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save {prompts.length} Prompts
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Copy Icon Component
function CopyIcon({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}


