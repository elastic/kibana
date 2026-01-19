/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dedent from 'dedent';

/**
 * Shared Entity Linking prompt section for Observability Agent Builder.
 * This prompt instructs the LLM to format entities as clickable links using Kibana's relative URL paths.
 *
 * Supported entity types:
 * - APM: Services, Traces, Errors (individual and service-level), Transactions, Dependencies, Service Map
 * - Logs: Service-specific logs and general logs explorer
 * - Infrastructure: Hosts
 * - Platform: Alerts, ML Jobs
 *
 * This should be included in:
 * - System prompts for all AI insight attachment types (logs, alerts, errors)
 * - Observability agent instructions
 */
export const ENTITY_LINKING_PROMPT = dedent(`
  ## Entity Linking Guidelines

  Use markdown for readability. When referencing entities, create clickable links:

  | Entity | Link Format | Example |
  |--------|-------------|---------|
  | Service | \`[<serviceName>](/app/apm/services/<serviceName>)\` | "The [payments](/app/apm/services/payments) service is experiencing high latency." |
  | Transaction | \`[<transactionName>](/app/apm/services/<serviceName>/transactions)\` | "The transaction [POST /checkout](/app/apm/services/payments/transactions) took 500ms." |
  | Trace | \`[<traceId>](/app/apm/link-to/trace/<traceId>)\` | "See trace [8bc26008603e16819bd6fcfb80fceff5](/app/apm/link-to/trace/8bc26008603e16819bd6fcfb80fceff5)" |
  | Error | \`[<errorKey>](/app/apm/services/<serviceName>/errors/<errorKey>)\` | "Error [upstream-5xx](/app/apm/services/catalog-api/errors/upstream-5xx) suggests a dependency failure." |
  | Service Errors | \`[errors](/app/apm/services/<serviceName>/errors)\` | "Review all [errors](/app/apm/services/frontend/errors) for the [frontend](/app/apm/services/frontend) service." |
  | Service Logs | \`[logs](/app/apm/services/<serviceName>/logs)\` | "Check [logs](/app/apm/services/frontend/logs) for the [frontend](/app/apm/services/frontend) service." |
  | Host | \`[<hostName>](/app/metrics/detail/host/<hostName>)\` | "Host [web-01](/app/metrics/detail/host/web-01) is experiencing high CPU usage." |
  | Service Map | \`[Service Map](/app/apm/services/<serviceName>/service-map)\` | "Check the [Service Map](/app/apm/services/payments/service-map) to see dependencies." |
  | Dependencies | \`[Dependencies](/app/apm/services/<serviceName>/dependencies)\` | "View [Dependencies](/app/apm/services/catalog-api/dependencies) to identify upstream issues." |
  | Alert | \`[<alertId>](/app/observability/alerts/<alertId>)\` | "Alert [alert-uuid-123](/app/observability/alerts/alert-uuid-123) was triggered." |
  | Logs Explorer | \`[Logs](/app/logs)\` | "View [Logs](/app/logs) to investigate the issue further." |
  | ML Job | \`[<jobId>](/app/ml/jobs)\` | "ML job [anomaly-detection](/app/ml/jobs) detected unusual patterns." |

`);
