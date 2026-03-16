import type { 
  Prompt, 
  GeneratedImage, 
  Category, 
  Character,
  GenerationStatus,
  DashboardStats,
  EditStatus,
  BulkPromptResult,
  BulkSaveResult,
  ResolutionsConfig,
} from '../types';

const API_BASE = '/api';

export const dashboardApi = {
  // Stats
  getStats: () => fetch(`${API_BASE}/stats`).then(r => r.json() as Promise<DashboardStats>),
  
  // Prompts
  getPrompts: (params?: { gender?: string; category?: string; favorites?: boolean }) => {
    const searchParams = new URLSearchParams();
    if (params?.gender) searchParams.append('gender', params.gender);
    if (params?.category) searchParams.append('category', params.category);
    if (params?.favorites) searchParams.append('favorites', String(params.favorites));
    return fetch(`${API_BASE}/prompts?${searchParams.toString()}`).then(r => r.json() as Promise<Prompt[]>);
  },
  addPrompt: (prompt: Partial<Prompt>) => fetch(`${API_BASE}/prompts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(prompt)
  }).then(r => r.json() as Promise<Prompt>),
  updatePrompt: (id: number, prompt: Partial<Prompt>) => fetch(`${API_BASE}/prompts/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(prompt)
  }).then(r => r.json() as Promise<Prompt>),
  deletePrompt: (id: number) => fetch(`${API_BASE}/prompts/${id}`, { method: 'DELETE' }).then(r => r.json()),
  bulkAddPrompts: (data: { text: string; gender: string; category: string; model_name?: string }) => fetch(`${API_BASE}/prompts/bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(r => r.json() as Promise<BulkPromptResult>),
  bulkDeletePrompts: (ids: number[]) => fetch(`${API_BASE}/prompts/bulk-delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids })
  }).then(r => r.json()),

  // Characters & Reference Images
  getCharacters: () => fetch(`${API_BASE}/characters`).then(r => r.json() as Promise<Character[]>),
  addCharacter: (formData: FormData) => fetch(`${API_BASE}/characters`, {
    method: 'POST',
    body: formData
  }).then(r => r.json() as Promise<Character>),
  updateCharacter: (id: number, formData: FormData) => fetch(`${API_BASE}/characters/${id}`, {
    method: 'PUT',
    body: formData
  }).then(r => r.json() as Promise<Character>),
  deleteCharacter: (id: number) => fetch(`${API_BASE}/characters/${id}`, { method: 'DELETE' }).then(r => r.json()),
  
  // Generation
  generateImages: (data: unknown) => fetch(`${API_BASE}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(r => r.json()),
  stopGeneration: () => fetch(`${API_BASE}/generate/stop`, { method: 'POST' }).then(r => r.json()),
  getGenerationStatus: () => fetch(`${API_BASE}/generation-status`).then(r => r.json() as Promise<GenerationStatus>),
  
  // Results
  getGeneratedImages: (params?: { prompt_id?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.prompt_id) searchParams.append('prompt_id', String(params.prompt_id));
    return fetch(`${API_BASE}/generated-images?${searchParams.toString()}`).then(r => r.json() as Promise<GeneratedImage[]>);
  },
  deleteGeneratedImage: (id: number) => fetch(`${API_BASE}/generated-images/${id}`, { method: 'DELETE' }).then(r => r.json()),
  bulkDeleteImages: (ids: number[]) => fetch(`${API_BASE}/generated-images/bulk-delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids })
  }).then(r => r.json()),
  
  // Editing
  editImage: (imageId: number, instruction: string) => fetch(`${API_BASE}/edit-image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_id: imageId, instruction })
  }).then(r => r.json()),
  getEditStatus: () => fetch(`${API_BASE}/edit-status`).then(r => r.json() as Promise<EditStatus>),

  // Prompt Generator
  getKB: () => fetch(`${API_BASE}/prompt-generator/kb`).then(r => r.json()),
  saveKB: (kb: string) => fetch(`${API_BASE}/prompt-generator/kb`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kb })
  }).then(r => r.json()),
  analyzeImages: (formData: FormData) => fetch(`${API_BASE}/prompt-generator/generate`, {
    method: 'POST',
    body: formData
  }).then(r => r.json()),
  bulkSaveToLibrary: (data: unknown) => fetch(`${API_BASE}/prompts/bulk-save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(r => r.json() as Promise<BulkSaveResult>),
  
  // Helpers
  getResolutions: () => fetch(`${API_BASE}/resolutions`).then(r => r.json() as Promise<ResolutionsConfig>),
  getCategories: () => fetch(`${API_BASE}/categories`).then(r => r.json() as Promise<Category[]>),
};
