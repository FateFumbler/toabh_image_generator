import { useState, useEffect, useCallback } from 'react';
import { 
  Save, 
  RefreshCw, 
  Database, 
  Image, 
  Key,
  FolderOpen,
  Globe,
  Moon,
  Sun,
  Monitor,
  Check,
  AlertCircle,
  Plus,
  Trash2,
  Edit2,
  X,
  Tag,
  Loader2
} from 'lucide-react';
import { clsx, type ClassValue } from '../../utils/clsx';
import { useSettings, RESOLUTION_OPTIONS, ASPECT_RATIO_OPTIONS, FORMAT_OPTIONS, MODEL_OPTIONS } from '../../hooks/useSettings';
import * as api from '../../api/client';

function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'general' | 'categories' | 'api' | 'storage'>('general');
  const { settings, setSettings, loaded } = useSettings();
  const [saved, setSaved] = useState(false);

  // Categories state
  const [categories, setCategories] = useState<api.Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState<api.Category | null>(null);

  const loadCategories = useCallback(async () => {
    try {
      setLoadingCategories(true);
      const data = await api.getCategories();
      setCategories(data);
    } catch (err) {
      console.error('Failed to load categories:', err);
    } finally {
      setLoadingCategories(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'categories') {
      loadCategories();
    }
  }, [activeTab, loadCategories]);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleCreateCategory = async (name: string) => {
    try {
      await api.addCategory(name);
      setShowAddCategory(false);
      loadCategories();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create category');
    }
  };

  const handleUpdateCategory = async (id: number, name: string) => {
    try {
      await api.updateCategory(id, name);
      // Update prompts that have this category will be handled by backend
      setEditingCategory(null);
      loadCategories();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update category');
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm('Are you sure you want to delete this category? Prompts using this category will not be affected.')) {
      return;
    }
    try {
      await api.deleteCategory(id);
      loadCategories();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete category');
    }
  };

  const tabs = [
    { id: 'general' as const, label: 'General', icon: Monitor },
    { id: 'categories' as const, label: 'Categories', icon: Tag },
    { id: 'api' as const, label: 'API & Models', icon: Key },
    { id: 'storage' as const, label: 'Storage', icon: Database },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
          <p className="text-slate-500 mt-1">Configure your dashboard preferences</p>
        </div>
        <button
          onClick={handleSave}
          className={cn(
            "inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all",
            saved
              ? "bg-emerald-600 text-white"
              : "bg-indigo-600 text-white hover:bg-indigo-700"
          )}
        >
          {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                activeTab === tab.id
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {activeTab === 'general' && (
          <>
            <SettingSection
              title="Appearance"
              description="Customize how the dashboard looks"
              icon={Monitor}
            >
              <div className="space-y-4">
                <InputField label="Theme">
                  <div className="flex gap-2 flex-wrap">
                    {(['light', 'dark', 'system'] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setSettings({ theme: t })}
                        className={cn(
                          "flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all",
                          settings.theme === t
                            ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                            : "border-slate-200 hover:border-slate-300 text-slate-700"
                        )}
                      >
                        {t === 'light' && <Sun className="w-4 h-4" />}
                        {t === 'dark' && <Moon className="w-4 h-4" />}
                        {t === 'system' && <Monitor className="w-4 h-4" />}
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </button>
                    ))}
                  </div>
                </InputField>

                <InputField label="Language" description="Select your preferred language">
                  <select className="w-full max-w-xs px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500">
                    <option value="en">English</option>
                  </select>
                </InputField>
              </div>
            </SettingSection>

            <SettingSection
              title="Default Settings"
              description="Default values for new generations"
              icon={RefreshCw}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField label="Default Model">
                  <select
                    value={settings.defaultModel}
                    onChange={(e) => setSettings({ defaultModel: e.target.value as 'flux' | 'gemini' })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    {MODEL_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </InputField>

                <InputField label="Default Resolution">
                  <select
                    value={settings.defaultResolution}
                    onChange={(e) => setSettings({ defaultResolution: e.target.value as '1k' | '2k' | '4k' })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    {RESOLUTION_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </InputField>

                <InputField label="Default Aspect Ratio">
                  <select
                    value={settings.defaultAspectRatio}
                    onChange={(e) => setSettings({ defaultAspectRatio: e.target.value as '1:1' | '16:9' | '9:16' | '4:3' | '3:4' })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    {ASPECT_RATIO_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </InputField>

                <InputField label="Output Format">
                  <select
                    value={settings.defaultFormat}
                    onChange={(e) => setSettings({ defaultFormat: e.target.value as 'png' | 'jpg' | 'webp' })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    {FORMAT_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </InputField>
              </div>
            </SettingSection>
          </>
        )}

        {activeTab === 'categories' && (
          <SettingSection
            title="Categories"
            description="Manage prompt categories"
            icon={Tag}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">
                  {categories.length} categories defined
                </p>
                <button
                  onClick={() => setShowAddCategory(true)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white 
                             rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Add Category
                </button>
              </div>

              {loadingCategories ? (
                <div className="text-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mx-auto" />
                </div>
              ) : (
                <div className="border border-slate-200 rounded-lg divide-y divide-slate-200">
                  {categories.map((category) => (
                    <div key={category.id} className="flex items-center justify-between p-4 hover:bg-slate-50">
                      {editingCategory?.id === category.id ? (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            const input = e.currentTarget.elements.namedItem('name') as HTMLInputElement;
                            handleUpdateCategory(category.id, input.value);
                          }}
                          className="flex-1 flex items-center gap-2"
                        >
                          <input
                            name="name"
                            type="text"
                            defaultValue={category.name}
                            autoFocus
                            className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-sm
                                       focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                          />
                          <button
                            type="submit"
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingCategory(null)}
                            className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </form>
                      ) : (
                        <>
                          <span className="font-medium text-slate-900">{category.name}</span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setEditingCategory(category)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteCategory(category.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                  {categories.length === 0 && (
                    <div className="p-8 text-center text-slate-500">
                      No categories found
                    </div>
                  )}
                </div>
              )}
            </div>
          </SettingSection>
        )}

        {activeTab === 'api' && (
          <>
            <SettingSection
              title="API Configuration"
              description="Configure your AI model API keys (managed by backend)"
              icon={Key}
            >
              <div className="space-y-4">
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                  <p className="text-sm text-amber-800">
                    API keys are configured in the Flask backend environment variables. 
                    Contact your administrator to update them.
                  </p>
                </div>

                <InputField label="Backend URL">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      defaultValue="http://localhost:5000"
                      readOnly
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50"
                    />
                  </div>
                </InputField>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <h4 className="font-medium text-slate-900 mb-1">FLUX API</h4>
                    <p className="text-sm text-slate-500">Configured via FLUX_API_KEY env variable</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <h4 className="font-medium text-slate-900 mb-1">Gemini API</h4>
                    <p className="text-sm text-slate-500">Configured via GEMINI_API_KEY env variable</p>
                  </div>
                </div>
              </div>
            </SettingSection>

            <SettingSection
              title="Proxy Settings"
              description="Configure proxy for API requests"
              icon={Globe}
            >
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="useProxy"
                    className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                  />
                  <label htmlFor="useProxy" className="text-sm text-slate-700">
                    Use proxy for API requests
                  </label>
                </div>

                <InputField label="Proxy URL">
                  <input
                    type="text"
                    placeholder="http://proxy.example.com:8080"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </InputField>
              </div>
            </SettingSection>
          </>
        )}

        {activeTab === 'storage' && (
          <>
            <SettingSection
              title="Storage Paths"
              description="Configure where files are stored (managed by backend)"
              icon={FolderOpen}
            >
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-700">
                    Storage paths are configured in the Flask backend. 
                    Contact your administrator to update them.
                  </p>
                </div>

                <InputField label="Reference Images Path">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      defaultValue="./static/uploads"
                      readOnly
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50"
                    />
                  </div>
                </InputField>

                <InputField label="Generated Images Path">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      defaultValue="./static/generated"
                      readOnly
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50"
                    />
                  </div>
                </InputField>

                <InputField label="Database Path">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      defaultValue="./toabh_imagen.db"
                      readOnly
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50"
                    />
                  </div>
                </InputField>
              </div>
            </SettingSection>

            <SettingSection
              title="Storage Usage"
              description="Current storage statistics"
              icon={Database}
            >
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-50 rounded-lg text-center">
                    <Image className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-slate-900">-</p>
                    <p className="text-xs text-slate-500">Reference Images</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg text-center">
                    <Image className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-slate-900">-</p>
                    <p className="text-xs text-slate-500">Generated Images</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg text-center">
                    <Database className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-slate-900">-</p>
                    <p className="text-xs text-slate-500">Database</p>
                  </div>
                </div>

                <button className="w-full py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
                  Clear Generated Images Cache
                </button>
              </div>
            </SettingSection>
          </>
        )}
      </div>

      {/* Add Category Modal */}
      {showAddCategory && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Add Category</h3>
              <button onClick={() => setShowAddCategory(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const input = e.currentTarget.elements.namedItem('name') as HTMLInputElement;
                handleCreateCategory(input.value);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Category Name</label>
                <input
                  name="name"
                  type="text"
                  required
                  autoFocus
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg 
                             focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  placeholder="e.g., Fashion, Portrait"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddCategory(false)}
                  className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Add Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

interface SettingSectionProps {
  title: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}

function SettingSection({ title, description, icon: Icon, children }: SettingSectionProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
            <Icon className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">{title}</h3>
            {description && <p className="text-sm text-slate-500">{description}</p>}
          </div>
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

interface InputFieldProps {
  label: string;
  description?: string;
  children: React.ReactNode;
}

function InputField({ label, description, children }: InputFieldProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-700">{label}</label>
      {children}
      {description && <p className="text-xs text-slate-500">{description}</p>}
    </div>
  );
}
