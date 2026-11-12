/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** The shared sandbox account of local Kibanas, minted on the eval sandbox cluster. */
export const LOCAL_DEV_SANDBOX_USERNAME = 'kibana-local-dev';

/** The eval sandbox-api, which local Kibanas share with the eval runs. */
export const EVAL_SANDBOX_HOST = 'eval-sandbox-api.elastic-observability-ocp.elastic.dev';
export const EVAL_SANDBOX_PORT = 9090;

/**
 * Dev Vault secret names, under `secret/kibana-issues/dev/kbn-evals/`. `nightshift-local-dev` holds
 * only the `sandbox` block; the ORCA key is read from `golden`, which the evals own and rotate.
 */
export const LOCAL_DEV_VAULT_SECRET = 'nightshift-local-dev';
export const ORCA_VAULT_SECRET = 'golden';

/** The same id and name as the eval's ORCA connector, since ORCA questions name the connector. */
export const ORCA_CONNECTOR_ID = 'orcabench-es';
export const ORCA_CONNECTOR_NAME = 'orcabench_es';
export const ORCA_INDEX_PATTERNS = [
  'logs-orcabench.otel-*',
  'traces-orcabench.otel-*',
  'metrics-orcabench.otel-*',
] as const;

export const MANAGED_BLOCK_START = '# >>> nightshift local-dev (managed by setup_local_dev.js) >>>';
export const MANAGED_BLOCK_END = '# <<< nightshift local-dev (managed by setup_local_dev.js) <<<';
