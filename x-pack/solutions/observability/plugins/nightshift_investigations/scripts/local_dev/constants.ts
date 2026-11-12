/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** The shared sandbox account of local Kibanas, minted on the eval sandbox cluster. */
export const LOCAL_DEV_SANDBOX_USERNAME = 'kibana-local-dev';

/** The default superusers of a local stack, tried in turn when `--kibana-auth` is not passed. */
export const DEFAULT_KIBANA_AUTH = ['elastic:changeme', 'elastic_serverless:changeme'] as const;

/**
 * The organization of a local Serverless project with UIAM, which the admin session must name. Must
 * match `MOCK_IDP_UIAM_ORGANIZATION_ID` in `@kbn/mock-idp-utils`, which `kibana --dev --serverless`
 * configures; that package is private to the platform group.
 */
export const LOCAL_SERVERLESS_UIAM_ORGANIZATION_ID = 'org1234567890';

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

/**
 * The custom context the ORCA evals give their space (`ORCA_CUSTOM_CONTEXT` in the
 * nightshift-investigations eval suite), so local runs see the same pointer to the demo's source.
 * Kept here because plugin code must not depend on the eval suite.
 */
const ORCA_DEMO_COMMIT = 'fc77a6cbc0bf36ff52f21e4d59fa7b8a0f5d6733';
export const ORCA_SOURCE_CODE_CONTEXT = `Source code: the system is the OpenTelemetry Astronomy Shop demo, and its source is public: github.com/open-telemetry/opentelemetry-demo at commit ${ORCA_DEMO_COMMIT} (blobless clone in the sandbox with \`git clone --filter=blob:none\`, then \`git checkout ${ORCA_DEMO_COMMIT}\`; find files with \`git ls-tree\`/\`git grep\`, don't guess paths).`;

/** Sandbox egress the source code context needs: cloning the demo from GitHub. */
export const ORCA_SANDBOX_ALLOWED_HOSTS: readonly string[] = ['github.com'];

export const MANAGED_BLOCK_START = '# >>> nightshift local-dev (managed by setup_local_dev.js) >>>';
export const MANAGED_BLOCK_END = '# <<< nightshift local-dev (managed by setup_local_dev.js) <<<';
