/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Configuration collected by the Attack Discovery Worker config flyout. Its fields map 1:1 to the
 * inputs of the `security.attack-discovery.run` workflow step the worker executes, so the flyout is
 * purely a UI over that input shape (this POC does not persist it anywhere).
 */
export interface AttackDiscoveryWorkerConfig {
  /** Retrieval strategy. The POC surfaces the two interactive modes. */
  alert_retrieval_mode: 'custom_query' | 'esql';
  /** ES|QL query, used only when `alert_retrieval_mode` is `esql`. */
  esql_query?: string;
  /** Maximum number of alerts to retrieve. */
  size: number;
  /** Retrieval window start (Elasticsearch date math). */
  start: string;
  /** Retrieval window end (Elasticsearch date math). */
  end: string;
  /** Optional Elasticsearch DSL filter applied during retrieval. */
  filter?: Record<string, unknown>;
  /** LLM connector id; omit to let the server resolve the default AI connector. */
  connector_id?: string;
  /** Validation workflow id; `default` uses the built-in validation. */
  validation_workflow_id: string;
}

export const DEFAULT_AD_WORKER_CONFIG: AttackDiscoveryWorkerConfig = {
  alert_retrieval_mode: 'custom_query',
  size: 100,
  start: 'now-24h',
  end: 'now',
  validation_workflow_id: 'default',
};
