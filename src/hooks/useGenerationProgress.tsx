/**
 * Generation Progress Context
 * Provides global state for generation progress that persists across tabs and page refreshes
 */

import React, { createContext, useContext, useEffect, useRef, useCallback, useState } from 'react';
import type { GenerationStatus } from '../types';
import * as api from '../api/client';

// localStorage key for persisting generation status
const STORAGE_KEY = 'toabh_generation_status';

// Default status (not generating)
const defaultStatus: GenerationStatus = {
  is_generating: false,
  stop_requested: false,
  total: 0,
  completed: 0,
  current_prompt: '',
  errors: [],
};

interface GenerationProgressContextType {
  // Current generation status
  status: GenerationStatus;
  // Whether we're currently polling for status
  isPolling: boolean;
  // Start a new generation
  startGeneration: (request: api.GenerationRequest) => Promise<void>;
  // Stop the current generation
  stopGeneration: () => Promise<void>;
  // Force refresh status from server
  refreshStatus: () => Promise<void>;
  // Clear local status (when generation completes or is stopped)
  clearStatus: () => void;
}

const GenerationProgressContext = createContext<GenerationProgressContextType | null>(null);

export function useGenerationProgress() {
  const context = useContext(GenerationProgressContext);
  if (!context) {
    throw new Error('useGenerationProgress must be used within GenerationProgressProvider');
  }
  return context;
}

// Load status from localStorage
function loadFromStorage(): GenerationStatus {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Validate the parsed status has required fields
      if (typeof parsed.is_generating === 'boolean' && typeof parsed.total === 'number') {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load generation status from localStorage:', e);
  }
  return { ...defaultStatus };
}

// Save status to localStorage
function saveToStorage(status: GenerationStatus): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(status));
  } catch (e) {
    console.error('Failed to save generation status to localStorage:', e);
  }
}

interface GenerationProgressProviderProps {
  children: React.ReactNode;
}

export function GenerationProgressProvider({ children }: GenerationProgressProviderProps) {
  const [status, setStatus] = useState<GenerationStatus>(() => loadFromStorage());
  const [isPolling, setIsPolling] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isUnmountedRef = useRef(false);

  // Poll for status updates
  const pollStatus = useCallback(async () => {
    if (isUnmountedRef.current) return;
    
    try {
      const newStatus = await api.getGenerationStatus();
      if (isUnmountedRef.current) return;
      
      setStatus(newStatus);
      saveToStorage(newStatus);

      // Stop polling if generation is complete
      if (!newStatus.is_generating && pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
        setIsPolling(false);
      }
    } catch (err) {
      console.error('Failed to poll generation status:', err);
    }
  }, []);

  // Start polling for status
  const startPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }
    
    setIsPolling(true);
    // Poll every 1 second
    pollingRef.current = setInterval(pollStatus, 1000);
    // Also fetch immediately
    pollStatus();
  }, [pollStatus]);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setIsPolling(false);
  }, []);

  // Start a new generation
  const startGeneration = useCallback(async (request: api.GenerationRequest) => {
    try {
      const result = await api.generateImages(request);
      
      // Update status with initial state
      const initialStatus: GenerationStatus = {
        is_generating: true,
        stop_requested: false,
        total: result.total,
        completed: 0,
        current_prompt: '',
        errors: [],
      };
      
      setStatus(initialStatus);
      saveToStorage(initialStatus);
      
      // Start polling
      startPolling();
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to start generation');
    }
  }, [startPolling]);

  // Stop the current generation
  const stopGeneration = useCallback(async () => {
    try {
      await api.stopGeneration();
      
      // Update local status to reflect stop requested
      setStatus(prev => {
        const updated = { ...prev, stop_requested: true };
        saveToStorage(updated);
        return updated;
      });
    } catch (err) {
      console.error('Failed to stop generation:', err);
      throw err;
    }
  }, []);

  // Force refresh status from server
  const refreshStatus = useCallback(async () => {
    await pollStatus();
  }, [pollStatus]);

  // Clear local status (when generation completes)
  const clearStatus = useCallback(() => {
    setStatus({ ...defaultStatus });
    saveToStorage({ ...defaultStatus });
  }, []);

  // Check on mount if there's an active generation
  useEffect(() => {
    const checkInitialStatus = async () => {
      try {
        const serverStatus = await api.getGenerationStatus();
        setStatus(serverStatus);
        saveToStorage(serverStatus);
        
        if (serverStatus.is_generating) {
          startPolling();
        }
      } catch (err) {
        console.error('Failed to get initial generation status:', err);
      }
    };
    
    checkInitialStatus();
  }, [startPolling]);

  // Cleanup on unmount
  useEffect(() => {
    isUnmountedRef.current = false;
    return () => {
      isUnmountedRef.current = true;
      stopPolling();
    };
  }, [stopPolling]);

  // Also listen for storage events (for cross-tab sync)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const newStatus = JSON.parse(e.newValue);
          setStatus(newStatus);
        } catch (err) {
          console.error('Failed to parse storage event:', err);
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const value: GenerationProgressContextType = {
    status,
    isPolling,
    startGeneration,
    stopGeneration,
    refreshStatus,
    clearStatus,
  };

  return (
    <GenerationProgressContext.Provider value={value}>
      {children}
    </GenerationProgressContext.Provider>
  );
}
