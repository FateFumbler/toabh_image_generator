/**
 * API Client exports for TOABH Dashboard
 */

// Export all individual functions
export * from './client';

// Export the dashboardApi object for backward compatibility
export { dashboardApi } from './dashboard';

// Re-export types for convenience
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
  EditTask,
  EditStatus,
  GenerationRequest,
  BulkPromptRequest,
  BulkPromptResult,
  PromptGeneratorRequest,
  PromptGeneratorResult,
  BulkSaveToLibraryRequest,
  LogEntry,
} from '../types';
