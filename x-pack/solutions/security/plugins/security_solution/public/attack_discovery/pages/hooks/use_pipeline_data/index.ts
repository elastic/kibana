/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useRef } from 'react';
import type { HttpSetup } from '@kbn/core/public';
import { useQuery } from '@kbn/react-query';

/** Extraction strategy used to retrieve alerts from a workflow execution. */
export type ExtractionStrategy = 'custom_workflow' | 'default_custom_query' | 'default_esql';

/** Pre-execution check result — mirrors server-side DiagnosticsPreExecutionCheck. */
export interface DiagnosticsPreExecutionCheck {
  check: string;
  message: string;
  passed: boolean;
  severity?: 'critical' | 'warning';
}

/** Workflow integrity snapshot — mirrors server-side DiagnosticsWorkflowIntegrity. */
export interface DiagnosticsWorkflowIntegrity {
  repaired: Array<{ key: string; workflowId: string }>;
  status: 'all_intact' | 'repair_failed' | 'repaired';
  unrepairableErrors: Array<{ error: string; key: string; workflowId: string }>;
}

/** Config summary — mirrors server-side DiagnosticsConfig. */
export interface DiagnosticsConfig {
  alertRetrievalMode: string;
  alertRetrievalWorkflowCount: number;
  connectorType: string;
  hasCustomValidation: boolean;
}

/**
 * Diagnostic context collected during pre-execution checks.
 * Mirrors server-side DiagnosticsContext from @kbn/discoveries (server-only package).
 */
export interface DiagnosticsContext {
  config: DiagnosticsConfig;
  preExecutionChecks: DiagnosticsPreExecutionCheck[];
  workflowIntegrity: DiagnosticsWorkflowIntegrity;
}

/** Per-workflow alert retrieval data. */
export interface PipelineAlertRetrievalData {
  alerts: string[];
  alerts_context_count: number | null;
  extraction_strategy: ExtractionStrategy;
  workflow_run_id?: string;
}

/** A single attack discovery output from the generation step. */
export interface AttackDiscoveryOutput {
  alert_ids: string[];
  details_markdown: string;
  entity_summary_markdown?: string;
  id?: string;
  mitre_attack_tactics?: string[];
  summary_markdown: string;
  timestamp?: string;
  title: string;
}

/** Data extracted from the generation step of an orchestrator workflow execution. */
export interface PipelineGenerationData {
  attack_discoveries: AttackDiscoveryOutput[];
  execution_uuid: string;
  replacements: Record<string, string>;
}

/** Combined alerts from all retrieval workflow results. */
export interface CombinedAlerts {
  alerts: string[];
  alerts_context_count: number;
}

/** Response from the pipeline data GET endpoint. All fields are snake_case. */
export interface PipelineDataResponse {
  alert_retrieval: PipelineAlertRetrievalData[] | null;
  combined_alerts: CombinedAlerts | null;
  diagnostics_context?: DiagnosticsContext;
  generation: PipelineGenerationData | null;
  validated_discoveries: unknown[] | null;
}

interface UsePipelineDataProps {
  executionId: string;
  http: HttpSetup;
  /** Whether the query should be enabled (starts fetching when true) */
  isEnabled: boolean;
  /**
   * Polling interval in milliseconds. When set (and > 0), the query refetches
   * at this interval so pipeline data updates as each step completes.
   * Set to `0` or `undefined` to disable polling (e.g. when execution is
   * complete and data won't change).
   */
  refetchIntervalMs?: number;
  workflowId: string;
}

interface UsePipelineDataResult {
  data: PipelineDataResponse | undefined;
  error: unknown;
  isError: boolean;
  isLoading: boolean;
}

const PIPELINE_DATA_QUERY_KEY = 'GET_PIPELINE_DATA';

/**
 * Fetches pipeline data from the GET endpoint on demand (lazy).
 *
 * Uses @tanstack/react-query (via @kbn/react-query) for caching.
 * Only fetches when `isEnabled` is `true`.
 *
 * When `refetchIntervalMs` is provided, the query polls at that interval
 * so inspect buttons appear as each step completes. Once the execution
 * reaches a terminal state the caller should set `refetchIntervalMs` to
 * `0` / `undefined` — data is then cached indefinitely (`staleTime: Infinity`).
 *
 * @param executionId - The execution ID to fetch pipeline data for
 * @param http - Kibana HTTP service for making API requests
 * @param isEnabled - Whether the query should be enabled (lazy fetch)
 * @param refetchIntervalMs - Polling interval (0 or undefined to disable)
 * @param workflowId - The workflow definition ID
 * @returns An object containing the pipeline data, error state, and loading state
 */
export const usePipelineData = ({
  executionId,
  http,
  isEnabled,
  refetchIntervalMs,
  workflowId,
}: UsePipelineDataProps): UsePipelineDataResult => {
  const abortController = useRef(new AbortController());
  const isPolling = refetchIntervalMs != null && refetchIntervalMs > 0;

  const queryFn = useCallback(async () => {
    abortController.current = new AbortController();

    const response = await http.fetch<PipelineDataResponse>(
      `/internal/attack_discovery/workflow/${encodeURIComponent(
        workflowId
      )}/execution/${encodeURIComponent(executionId)}`,
      {
        method: 'GET',
        signal: abortController.current.signal,
        version: '1',
      }
    );

    return response;
  }, [executionId, http, workflowId]);

  const { data, error, isError, isFetching, isLoading } = useQuery(
    [PIPELINE_DATA_QUERY_KEY, executionId],
    queryFn,
    {
      enabled: isEnabled,
      refetchInterval: isPolling ? refetchIntervalMs : false,
      refetchOnWindowFocus: false,
      // While polling, allow refetches; once complete, cache indefinitely
      staleTime: isPolling ? 0 : Infinity,
    }
  );

  return {
    data,
    error,
    isError,
    isLoading: isLoading && isFetching,
  };
};
