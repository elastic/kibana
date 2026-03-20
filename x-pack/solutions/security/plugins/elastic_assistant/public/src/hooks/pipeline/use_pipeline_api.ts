/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import { useKibana } from '../../context/typed_kibana_context/typed_kibana_context';

const PIPELINE_API_BASE = '/internal/elastic_assistant/attack_discovery/pipeline';

export interface PipelineMetrics {
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  totalAlertsProcessed: number;
  totalCasesCreated: number;
  totalCasesMatched: number;
  totalAlertsAttached: number;
  totalAdTriggered: number;
  averageRunDurationMs: number;
  lastRunAt: string | null;
  lastRunStatus: 'success' | 'partial' | 'failed' | null;
  consecutiveFailures: number;
}

export interface PipelineHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  reason: string;
  metrics: PipelineMetrics;
  lastExecution: Record<string, unknown> | null;
}

export interface PipelineConfig {
  enabled: boolean;
  intervalMinutes: number;
  deduplication: {
    enabled: boolean;
    similarityThreshold: number;
    maxResults: number;
  };
  entityExtraction: {
    enabled: boolean;
    exclusionFilters: Record<string, string[]>;
  };
  caseMatching: {
    enabled: boolean;
    strategy: 'strict' | 'relaxed' | 'weighted' | 'temporal';
    matchThreshold: number;
    weights: Record<string, number>;
    temporalDecayDays: number;
  };
  incrementalAd: {
    enabled: boolean;
    minNewAlerts: number;
    autoTriggerOnAttachment: boolean;
  };
}

export const usePipelineHealth = () => {
  const { http } = useKibana().services;
  const [health, setHealth] = useState<PipelineHealthStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await http.get<PipelineHealthStatus>(`${PIPELINE_API_BASE}/_health`);
      setHealth(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch health');
    } finally {
      setLoading(false);
    }
  }, [http]);

  return { health, loading, error, fetchHealth };
};

export const usePipelineMetrics = () => {
  const { http } = useKibana().services;
  const [metrics, setMetrics] = useState<PipelineMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await http.get<PipelineMetrics>(`${PIPELINE_API_BASE}/_metrics`);
      setMetrics(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
    } finally {
      setLoading(false);
    }
  }, [http]);

  return { metrics, loading, error, fetchMetrics };
};

export const usePipelineConfig = () => {
  const { http } = useKibana().services;
  const [config, setConfig] = useState<PipelineConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await http.get<PipelineConfig>(`${PIPELINE_API_BASE}/_config`);
      setConfig(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch config');
    } finally {
      setLoading(false);
    }
  }, [http]);

  const updateConfig = useCallback(
    async (update: Record<string, unknown>) => {
      setLoading(true);
      setError(null);
      try {
        const result = await http.put<PipelineConfig>(`${PIPELINE_API_BASE}/_config`, {
          body: JSON.stringify(update),
        });
        setConfig(result);
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to update config';
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [http]
  );

  return { config, loading, error, fetchConfig, updateConfig };
};
