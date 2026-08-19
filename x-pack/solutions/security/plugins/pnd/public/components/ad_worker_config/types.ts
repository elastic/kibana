/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Configuration collected by the Attack Discovery Worker config flyout. `run_every` maps to the
 * Watch Floor orchestrator's scheduled trigger cadence; the rest map to `security.attack-discovery.run`
 * inputs (see {@link toWorkerInputs}). This POC does not persist it.
 */
export interface AttackDiscoveryWorkerConfig {
  /** "ES|QL query" switch — retrieve alerts with the ES|QL query below. */
  esql_enabled: boolean;
  /** ES|QL query used to retrieve alerts. Pre-populated with a sensible default. */
  esql_query: string;
  /** "Alert retrieval workflows" switch — run custom retrieval workflows. */
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
  esql_enabled: true,
  esql_query: DEFAULT_ESQL_QUERY,
  alert_retrieval_workflows_enabled: false,
  alert_retrieval_workflow_ids: [],
  connector_id: undefined,
  run_every: '15m',
  validation_workflow_id: 'default',
};

/**
 * Projects the UI config into the object passed as `security.attack-discovery.run` inputs. Fields
 * gated by a disabled switch are omitted (e.g. no `alert_retrieval_mode` / `esql_query` when the
 * ES|QL switch is off).
 */
export const toWorkerInputs = (config: AttackDiscoveryWorkerConfig): Record<string, unknown> => ({
  ...(config.esql_enabled ? { alert_retrieval_mode: 'esql', esql_query: config.esql_query } : {}),
  ...(config.alert_retrieval_workflows_enabled && config.alert_retrieval_workflow_ids.length > 0
    ? { alert_retrieval_workflow_ids: config.alert_retrieval_workflow_ids }
    : {}),
  ...(config.connector_id ? { connector_id: config.connector_id } : {}),
  run_every: config.run_every,
  validation_workflow_id: config.validation_workflow_id,
});
