/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Configuration collected by the Attack Discovery Worker config flyout. Fields map to the inputs of
 * the `security.attack-discovery.run` step; `run_every` maps to the Watch Floor orchestrator's
 * scheduled trigger cadence. This POC does not persist it.
 */
export interface AttackDiscoveryWorkerConfig {
  /** "Alert retrieval method" switch — run the built-in (ES|QL) retrieval. */
  default_retrieval_enabled: boolean;
  /** Retrieval strategy. The POC surfaces the ES|QL mode only (Query builder is a placeholder). */
  alert_retrieval_mode: 'esql' | 'custom_query';
  /** ES|QL query used to retrieve alerts. Pre-populated with a sensible default. */
  esql_query: string;
  /** "Alert retrieval workflows" switch — run custom retrieval workflows alongside the built-in one. */
  alert_retrieval_workflows_enabled: boolean;
  /** Selected custom retrieval workflow ids (when the workflows switch is on). */
  alert_retrieval_workflow_ids: string[];
  /** LLM connector id; omit to let the server resolve the default AI connector. */
  connector_id?: string;
  /** Orchestrator cadence (Watch Floor scheduled trigger), e.g. "15m". */
  run_every: string;
  /** Validation workflow id; `default` uses the built-in validation. */
  validation_workflow_id: string;
}

/** Pre-populated ES|QL query shown in the Alert retrieval step. */
export const DEFAULT_ESQL_QUERY = `FROM .alerts-security.alerts-default METADATA _id
| WHERE kibana.alert.workflow_status == "open"
| SORT @timestamp DESC
| LIMIT 100`;

export const DEFAULT_AD_WORKER_CONFIG: AttackDiscoveryWorkerConfig = {
  default_retrieval_enabled: true,
  alert_retrieval_mode: 'esql',
  esql_query: DEFAULT_ESQL_QUERY,
  alert_retrieval_workflows_enabled: false,
  alert_retrieval_workflow_ids: [],
  connector_id: undefined,
  run_every: '15m',
  validation_workflow_id: 'default',
};
