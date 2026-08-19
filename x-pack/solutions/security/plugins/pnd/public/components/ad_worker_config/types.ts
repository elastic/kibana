/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Configuration collected by the Attack Discovery Worker config flyout. Most fields map 1:1 to the
 * inputs of the `security.attack-discovery.run` workflow step; `run_every` maps to the Watch Floor
 * orchestrator's scheduled trigger cadence, not a run-step input. This POC does not persist it.
 */
export interface AttackDiscoveryWorkerConfig {
  /** Retrieval strategy for the built-in retrieval workflow. */
  alert_retrieval_mode: 'custom_query' | 'esql';
  /** ES|QL query, used only when `alert_retrieval_mode` is `esql`. */
  esql_query?: string;
  /** Additional alert-retrieval workflow ids to run alongside the built-in retrieval. */
  alert_retrieval_workflow_ids: string[];
  /** Maximum number of alerts to retrieve (Query-builder mode). */
  size: number;
  /** Retrieval window start (Elasticsearch date math, Query-builder mode). */
  start: string;
  /** Retrieval window end (Elasticsearch date math, Query-builder mode). */
  end: string;
  /** Optional Elasticsearch DSL filter applied during retrieval (Query-builder mode). */
  filter?: Record<string, unknown>;
  /** LLM connector id; omit to let the server resolve the default AI connector. */
  connector_id?: string;
  /** Orchestrator cadence (Watch Floor scheduled trigger), e.g. "15m". */
  run_every: string;
  /** Validation workflow id; `default` uses the built-in validation. */
  validation_workflow_id: string;
}

export const DEFAULT_AD_WORKER_CONFIG: AttackDiscoveryWorkerConfig = {
  alert_retrieval_mode: 'custom_query',
  alert_retrieval_workflow_ids: [],
  size: 100,
  start: 'now-24h',
  end: 'now',
  connector_id: undefined,
  run_every: '15m',
  validation_workflow_id: 'default',
};
