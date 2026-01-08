/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dedent from 'dedent';

/**
 * Shared Entity Linking prompt section for Observability Agent Builder.
 * This prompt instructs the LLM to format entities (services, traces, errors, hosts, containers,
 * transactions, dependencies, alerts, ML jobs, dashboards) as clickable links using Kibana's relative URL paths.
 *
 * This should be included in:
 * - System prompts for all AI insight attachment types (logs, alerts, errors)
 * - Observability agent instructions
 */
export const ENTITY_LINKING_PROMPT = dedent(`
  ## Formatting Guidelines

  Use markdown for readability. When referencing entities, create clickable links:

  | Entity | Link Format |
  |--------|-------------|
  | Service | \`[service-name](/app/apm/services/service-name)\` |
  | Trace | \`[trace-id](/app/apm/link-to/trace/trace-id)\` |
  | Error | \`[error-key](/app/apm/services/service-name/errors/error-key)\` |
  | Service Errors | \`[Errors](/app/apm/services/service-name/errors)\` |
  | Service Logs | \`[Logs](/app/apm/services/service-name/logs)\` |
  | Logs | \`[Logs](/app/logs)\` or \`[Logs](/app/observability-logs-explorer)\` |
  | Transaction | \`[transaction-name](/app/apm/services/service-name/transactions)\` |
  | Dependencies | \`[Dependencies](/app/apm/services/service-name/dependencies)\` |
  | Service Map | \`[Service Map](/app/apm/services/service-name/service-map)\` |
  | Host | \`[host-name](/app/metrics/detail/host/host-name)\` |
  | Alert | \`[alert-id](/app/observability/alerts/alert-id)\` |
  | ML Job | \`[job-id](/app/ml/jobs)\` or \`[job-id](/app/ml/explorer?_g=(ml:(jobIds:!(job-id))))\` |

  **Examples:**
  - "The [billing-service](/app/apm/services/billing-service) is experiencing high latency."
  - "See trace [8a3c42](/app/apm/link-to/trace/8a3c42) for the full request flow."
  - "Error [abcde](/app/apm/services/frontend/errors/abcde) in [frontend](/app/apm/services/frontend)."
  - "View all [errors](/app/apm/services/frontend/errors) for the [frontend](/app/apm/services/frontend) service."
  - "Check [logs](/app/apm/services/frontend/logs) for the [frontend](/app/apm/services/frontend) service."
  - "Transaction [GET /api/users](/app/apm/services/api-service/transactions). "
  - "Last transaction [user_index](/app/apm/services/load-generator/transactions)."
  - "Check the [Service Map](/app/apm/service-map) to see service dependencies."
  - "View [Logs](/app/logs) to investigate the issue."
  - "Host [web-server-01](/app/metrics/detail/host/web-server-01) is experiencing high CPU usage."
  - "Alert [alert-uuid-123](/app/observability/alerts/alert-uuid-123) was triggered."
  - "ML job [anomaly-detection-job](/app/ml/jobs) detected unusual patterns."
`);
