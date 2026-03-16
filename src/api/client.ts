/**
 * API Client for TOABH Flask Backend
 * Base URL: http://localhost:5000 (proxied via /api)
 */

import type {
  Prompt,
  Category,
  Character,
  ReferenceImage,
  GeneratedImage,
  GenerationStatus,
  ModelInfo,
  ResolutionsConfig,
  DashboardStats,
  PromptGeneratorKB,
  BulkSaveResult,
  BulkDeleteResult,
  EditStatus,
  EditTask,
  GenerationRequest,
  BulkPromptRequest,
  BulkPromptResult,
  PromptGeneratorResult,
  BulkSaveToLibraryRequest,
} from '../types';

const API_BASE = '/api';

// Helper for handling fetch responses
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json();
}

// Helper for JSON requests
function jsonRequest(method: string, body?: unknown): RequestInit {
  return {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  };
}

// ============ Prompts API ============

export interface GetPromptsParams {
  gender?: 'all' | 'male' | 'female';
  category?: string;
  favorites?: boolean;
}

export type { 
  Prompt, 
  Category, 
  Character,
  ReferenceImage,
  GeneratedImage,
  GenerationStatus,
  ModelInfo,
  ResolutionsConfig,
  DashboardStats,
  PromptGeneratorKB,
  BulkSaveResult,
  BulkDeleteResult,
  EditStatus,
  EditTask,
  GenerationRequest,
  BulkPromptRequest,
  BulkPromptResult,
  PromptGeneratorResult,
  BulkSaveToLibraryRequest,
} from '../types';

export async function getPrompts(params: GetPromptsParams = {}): Promise<Prompt[]> {
  const searchParams = new URLSearchParams();
  if (params.gender && params.gender !== 'all') searchParams.set('gender', params.gender);
  if (params.category && params.category !== 'all') searchParams.set('category', params.category);
  if (params.favorites) searchParams.set('favorites', 'true');
  
  const query = searchParams.toString();
  const url = `${API_BASE}/prompts${query ? `?${query}` : ''}`;
  
  const response = await fetch(url);
  return handleResponse<Prompt[]>(response);
}

export async function addPrompt(prompt: Partial<Prompt>): Promise<Prompt> {
  const response = await fetch(`${API_BASE}/prompts`, jsonRequest('POST', prompt));
  return handleResponse<Prompt>(response);
}

export async function updatePrompt(id: number, updates: Partial<Prompt>): Promise<Prompt> {
  const response = await fetch(`${API_BASE}/prompts/${id}`, jsonRequest('PUT', updates));
  return handleResponse<Prompt>(response);
}

export async function deletePrompt(id: number): Promise<{ deleted: boolean }> {
  const response = await fetch(`${API_BASE}/prompts/${id}`, { method: 'DELETE' });
  return handleResponse<{ deleted: boolean }>(response);
}

export async function bulkDeletePrompts(ids: number[]): Promise<BulkDeleteResult> {
  const response = await fetch(`${API_BASE}/prompts/bulk-delete`, jsonRequest('POST', { ids }));
  return handleResponse<BulkDeleteResult>(response);
}

export async function bulkAddPrompts(request: BulkPromptRequest): Promise<BulkPromptResult> {
  const response = await fetch(`${API_BASE}/prompts/bulk`, jsonRequest('POST', request));
  return handleResponse<BulkPromptResult>(response);
}

// ============ Prompt Generator API ============

export async function getPromptGeneratorKB(): Promise<PromptGeneratorKB> {
  const response = await fetch(`${API_BASE}/prompt-generator/kb`);
  return handleResponse<PromptGeneratorKB>(response);
}

export async function updatePromptGeneratorKB(kb: string): Promise<{ status: string }> {
  const response = await fetch(`${API_BASE}/prompt-generator/kb`, jsonRequest('POST', { kb }));
  return handleResponse<{ status: string }>(response);
}

export async function generatePromptsFromImages(images: FileList): Promise<PromptGeneratorResult> {
  const formData = new FormData();
  for (let i = 0; i < images.length; i++) {
    formData.append('images', images[i]);
  }
  
  const response = await fetch(`${API_BASE}/prompt-generator/generate`, {
    method: 'POST',
    body: formData,
  });
  return handleResponse<PromptGeneratorResult>(response);
}

export async function bulkSaveToLibrary(request: BulkSaveToLibraryRequest): Promise<BulkSaveResult> {
  const response = await fetch(`${API_BASE}/prompts/bulk-save`, jsonRequest('POST', request));
  return handleResponse<BulkSaveResult>(response);
}

// ============ Categories API ============

export async function getCategories(): Promise<Category[]> {
  const response = await fetch(`${API_BASE}/categories`);
  return handleResponse<Category[]>(response);
}

export async function addCategory(name: string): Promise<Category> {
  const response = await fetch(`${API_BASE}/categories`, jsonRequest('POST', { name }));
  return handleResponse<Category>(response);
}

export async function updateCategory(id: number, name: string): Promise<Category & { prompts_updated: number }> {
  const response = await fetch(`${API_BASE}/categories/${id}`, jsonRequest('PUT', { name }));
  return handleResponse<Category & { prompts_updated: number }>(response);
}

export async function deleteCategory(id: number): Promise<{ deleted: boolean }> {
  const response = await fetch(`${API_BASE}/categories/${id}`, { method: 'DELETE' });
  return handleResponse<{ deleted: boolean }>(response);
}

// ============ Characters API ============

export async function getCharacters(): Promise<Character[]> {
  const response = await fetch(`${API_BASE}/characters`);
  return handleResponse<Character[]>(response);
}

export async function addCharacter(name: string, files?: FileList): Promise<Character> {
  const formData = new FormData();
  formData.append('name', name);
  if (files) {
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }
  }
  
  const response = await fetch(`${API_BASE}/characters`, {
    method: 'POST',
    body: formData,
  });
  return handleResponse<Character>(response);
}

export async function updateCharacter(id: number, name?: string, files?: FileList): Promise<Character> {
  const formData = new FormData();
  if (name) formData.append('name', name);
  if (files) {
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }
  }
  
  const response = await fetch(`${API_BASE}/characters/${id}`, {
    method: 'PUT',
    body: formData,
  });
  return handleResponse<Character>(response);
}

export async function deleteCharacter(id: number): Promise<{ deleted: boolean }> {
  const response = await fetch(`${API_BASE}/characters/${id}`, { method: 'DELETE' });
  return handleResponse<{ deleted: boolean }>(response);
}

// ============ Reference Images API ============

export interface GetReferenceImagesParams {
  model_name?: string;
}

export interface GetGeneratedImagesParams {
  model_name?: string;
  prompt_id?: number;
}

export async function getReferenceImages(params: GetReferenceImagesParams = {}): Promise<ReferenceImage[]> {
  const searchParams = new URLSearchParams();
  if (params.model_name) searchParams.set('model_name', params.model_name);
  
  const query = searchParams.toString();
  const url = `${API_BASE}/reference-images${query ? `?${query}` : ''}`;
  
  const response = await fetch(url);
  return handleResponse<ReferenceImage[]>(response);
}

export async function uploadReferenceImages(modelName: string, files: FileList): Promise<ReferenceImage[]> {
  const formData = new FormData();
  formData.append('model_name', modelName);
  for (let i = 0; i < files.length; i++) {
    formData.append('files', files[i]);
  }
  
  const response = await fetch(`${API_BASE}/reference-images/upload`, {
    method: 'POST',
    body: formData,
  });
  return handleResponse<ReferenceImage[]>(response);
}

export async function deleteReferenceImage(id: number): Promise<{ deleted: boolean }> {
  const response = await fetch(`${API_BASE}/reference-images/${id}`, { method: 'DELETE' });
  return handleResponse<{ deleted: boolean }>(response);
}

export async function clearReferenceImages(modelName?: string): Promise<{ deleted: number }> {
  const response = await fetch(`${API_BASE}/reference-images/clear`, jsonRequest('POST', { model_name: modelName }));
  return handleResponse<{ deleted: number }>(response);
}

// ============ Generated Images API ============

export async function getGeneratedImages(params: GetGeneratedImagesParams = {}): Promise<GeneratedImage[]> {
  const searchParams = new URLSearchParams();
  if (params.model_name) searchParams.set('model_name', params.model_name);
  if (params.prompt_id) searchParams.set('prompt_id', params.prompt_id.toString());
  
  const query = searchParams.toString();
  const url = `${API_BASE}/generated-images${query ? `?${query}` : ''}`;
  
  const response = await fetch(url);
  return handleResponse<GeneratedImage[]>(response);
}

export async function deleteGeneratedImage(id: number): Promise<{ deleted: boolean }> {
  const response = await fetch(`${API_BASE}/generated-images/${id}`, { method: 'DELETE' });
  return handleResponse<{ deleted: boolean }>(response);
}

export async function bulkDeleteGeneratedImages(ids: number[]): Promise<BulkDeleteResult> {
  const response = await fetch(`${API_BASE}/generated-images/bulk-delete`, jsonRequest('POST', { ids }));
  return handleResponse<BulkDeleteResult>(response);
}

export async function deleteAllForCharacter(characterName: string): Promise<{ deleted: number }> {
  const response = await fetch(`${API_BASE}/generated-images/delete-all/${encodeURIComponent(characterName)}`, {
    method: 'POST',
  });
  return handleResponse<{ deleted: number }>(response);
}

export async function downloadImage(imageId: number): Promise<Blob> {
  const response = await fetch(`${API_BASE}/generated-images/download/${imageId}`);
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
  }
  return response.blob();
}

export async function bulkDownloadImages(ids: number[]): Promise<Blob> {
  const response = await fetch(`${API_BASE}/generated-images/bulk-download`, jsonRequest('POST', { ids }));
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
  }
  return response.blob();
}

// ============ Image Generation API ============

export async function generateImages(request: GenerationRequest): Promise<{ started: boolean; total: number }> {
  const response = await fetch(`${API_BASE}/generate`, jsonRequest('POST', request));
  return handleResponse<{ started: boolean; total: number }>(response);
}

export async function mockGenerateImages(request: GenerationRequest): Promise<{ started: boolean; total: number; mock: boolean }> {
  const response = await fetch(`${API_BASE}/generate/mock`, jsonRequest('POST', request));
  return handleResponse<{ started: boolean; total: number; mock: boolean }>(response);
}

export async function stopGeneration(): Promise<{ stopped: boolean; error?: string }> {
  const response = await fetch(`${API_BASE}/generate/stop`, { method: 'POST' });
  return handleResponse<{ stopped: boolean; error?: string }>(response);
}

export async function getGenerationStatus(): Promise<GenerationStatus> {
  const response = await fetch(`${API_BASE}/generation-status`);
  return handleResponse<GenerationStatus>(response);
}

// ============ Image Editing API ============

export async function editImage(imageId: number, instruction: string): Promise<{ success: boolean; message: string; task_id: number }> {
  const response = await fetch(`${API_BASE}/edit-image`, jsonRequest('POST', { image_id: imageId, instruction }));
  return handleResponse<{ success: boolean; message: string; task_id: number }>(response);
}

export async function getEditStatus(): Promise<EditStatus> {
  const response = await fetch(`${API_BASE}/edit-status`);
  return handleResponse<EditStatus>(response);
}

export async function getEditTaskStatus(taskId: number): Promise<EditTask> {
  const response = await fetch(`${API_BASE}/edit-status/${taskId}`);
  return handleResponse<EditTask>(response);
}

// ============ Models API ============

export async function getModels(): Promise<ModelInfo[]> {
  const response = await fetch(`${API_BASE}/models`);
  return handleResponse<ModelInfo[]>(response);
}

export async function getModelNames(): Promise<string[]> {
  const response = await fetch(`${API_BASE}/model-names`);
  return handleResponse<string[]>(response);
}

// ============ Resolutions API ============

export async function getResolutions(): Promise<ResolutionsConfig> {
  const response = await fetch(`${API_BASE}/resolutions`);
  return handleResponse<ResolutionsConfig>(response);
}

// ============ Stats API ============

export async function getStats(): Promise<DashboardStats> {
  const response = await fetch(`${API_BASE}/stats`);
  return handleResponse<DashboardStats>(response);
}

// ============ Debug API ============

export async function debugImages(): Promise<{
  count: number;
  sample: Array<{
    id: number;
    file_path: string;
    file_exists: boolean;
    character_name?: string;
    prompt_id?: number;
  }>;
  generated_folder: string;
}> {
  const response = await fetch(`${API_BASE}/debug/images`);
  return handleResponse(response);
}

// ============ Utility Functions ============

export function getImageUrl(filePath: string): string {
  if (filePath.startsWith('/static/')) {
    return `http://localhost:5000${filePath}`;
  }
  if (filePath.startsWith('static/')) {
    return `http://localhost:5000/${filePath}`;
  }
  return filePath;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
