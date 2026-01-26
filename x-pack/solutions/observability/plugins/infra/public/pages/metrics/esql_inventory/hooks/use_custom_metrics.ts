/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import type { CustomMetric } from '../types';

const STORAGE_KEY = 'esqlInventory.customMetrics';

/**
 * Generate a unique ID for a custom metric
 */
const generateId = (): string => {
  return `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Load custom metrics from localStorage
 */
const loadFromStorage = (): CustomMetric[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[useCustomMetrics] Failed to load from localStorage:', err);
  }
  return [];
};

/**
 * Save custom metrics to localStorage
 */
const saveToStorage = (metrics: CustomMetric[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(metrics));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[useCustomMetrics] Failed to save to localStorage:', err);
  }
};

export interface UseCustomMetricsResult {
  /** All saved custom metrics */
  customMetrics: CustomMetric[];
  /** Custom metrics filtered by the selected entity */
  customMetricsForEntity: CustomMetric[];
  /** Save a new custom metric */
  saveCustomMetric: (name: string, query: string, entity: string, unit?: string) => CustomMetric;
  /** Delete a custom metric by ID */
  deleteCustomMetric: (id: string) => void;
  /** Update an existing custom metric */
  updateCustomMetric: (
    id: string,
    updates: Partial<Omit<CustomMetric, 'id' | 'createdAt'>>
  ) => void;
  /** Get a custom metric by ID */
  getCustomMetricById: (id: string) => CustomMetric | undefined;
}

interface UseCustomMetricsParams {
  /** Currently selected entity to filter custom metrics */
  selectedEntity: string | null;
}

/**
 * Hook to manage custom saved ES|QL metrics in localStorage
 */
export const useCustomMetrics = ({
  selectedEntity,
}: UseCustomMetricsParams): UseCustomMetricsResult => {
  const [customMetrics, setCustomMetrics] = useState<CustomMetric[]>(() => loadFromStorage());

  // Persist to localStorage whenever metrics change
  useEffect(() => {
    saveToStorage(customMetrics);
  }, [customMetrics]);

  // Filter custom metrics by selected entity
  const customMetricsForEntity = useMemo(() => {
    if (!selectedEntity) {
      return customMetrics;
    }
    // CustomMetric still has 'dimension' field for backwards compatibility with stored data
    return customMetrics.filter((m) => m.dimension === selectedEntity);
  }, [customMetrics, selectedEntity]);

  // Save a new custom metric
  const saveCustomMetric = useCallback(
    (name: string, query: string, entity: string, unit?: string): CustomMetric => {
      const newMetric: CustomMetric = {
        id: generateId(),
        name,
        query,
        dimension: entity, // Store as 'dimension' for backwards compatibility
        unit,
        createdAt: Date.now(),
      };

      setCustomMetrics((prev) => [...prev, newMetric]);
      return newMetric;
    },
    []
  );

  // Delete a custom metric
  const deleteCustomMetric = useCallback((id: string) => {
    setCustomMetrics((prev) => prev.filter((m) => m.id !== id));
  }, []);

  // Update an existing custom metric
  const updateCustomMetric = useCallback(
    (id: string, updates: Partial<Omit<CustomMetric, 'id' | 'createdAt'>>) => {
      setCustomMetrics((prev) => prev.map((m) => (m.id === id ? { ...m, ...updates } : m)));
    },
    []
  );

  // Get a custom metric by ID
  const getCustomMetricById = useCallback(
    (id: string): CustomMetric | undefined => {
      return customMetrics.find((m) => m.id === id);
    },
    [customMetrics]
  );

  return {
    customMetrics,
    customMetricsForEntity,
    saveCustomMetric,
    deleteCustomMetric,
    updateCustomMetric,
    getCustomMetricById,
  };
};
