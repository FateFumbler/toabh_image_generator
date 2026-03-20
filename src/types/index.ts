// Dashboard Types based on Flask API structure

export interface Prompt {
  id: number;
  theme: string;
  prompt_text: string;
  gender: string;  // 'male' or 'female'
  category: string;
  favorite?: boolean;
  created_at: string;
  model_name?: string;
  model_reference_directory?: string;
  prompt_number?: string;  // e.g., 'P001', 'P002'
}

export interface Category {
  id: number;
  name: string;
  prompt_count?: number;
}

export interface Character {
  id: number;
  name: string;
  reference_images?: ReferenceImage[];
  image_count?: number;
}

export interface ReferenceImage {
  id: number;
  model_name: string;
  file_path: string;
  file_name: string;
  created_at: string;
}

export interface GeneratedImage {
  id: number;
  prompt_id: number;
  prompt_number?: string;
  file_path: string;
  model_used: string;
  resolution: string;
  aspect_ratio: string;
  created_at: string;
  edited_at?: string;
  character_name: string;
  // Additional computed fields from API
  prompt_theme?: string;
  prompt_gender?: string;
}

export interface GenerationStatus {
  is_generating: boolean;
  stop_requested: boolean;
  total: number;
  completed: number;
  current_prompt: string;
  errors: string[];
}

export interface ModelInfo {
  id: string;
  name: string;
}

export interface ResolutionsConfig {
  resolutions: Record<string, string>;
  aspect_ratios: string[];
}

export interface DashboardStats {
  total_prompts: number;
  total_generated: number;
  total_reference_images: number;
}

export interface PromptGeneratorKB {
  kb: string;
}

export interface BulkSaveResult {
  status: string;
  count: number;
}

export interface BulkDeleteResult {
  deleted: number;
}

export interface EditTask {
  id: number;
  image_id: number;
  instruction: string;
  status: 'queued' | 'processing' | 'completed' | 'error';
  created_at: string;
  started_at?: string;
  completed_at?: string;
  error?: string;
  success: boolean;
}

export interface EditStatus {
  queue: EditTask[];
  total: number;
  processing: number;
  queued: number;
  completed: number;
  error: number;
}

export interface GenerationRequest {
  prompt_ids: number[];
  model: string;
  resolution: string;
  aspect_ratio: string;
  model_name: string;
}

export interface BulkPromptRequest {
  text: string;
  gender?: string;
  category?: string;
  model_name?: string;
  model_reference_directory?: string;
}

export interface BulkPromptResult {
  added: number;
  total_lines: number;
  untitled: number;
}

export interface PromptGeneratorRequest {
  images: File[];
}

export interface PromptGeneratorResult {
  prompts: string[];
}

export interface BulkSaveToLibraryRequest {
  prompts: string;
  category_id?: number;
  gender?: string;
}

// Notification log entry for generation and edit events
export interface LogEntry {
  id: string;
  type: 'success' | 'error';
  message: string;
  timestamp: number;
  read: boolean;
}
