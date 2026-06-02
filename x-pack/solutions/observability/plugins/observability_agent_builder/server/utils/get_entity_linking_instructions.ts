/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dedent from 'dedent';

/**
 * Entity Linking instructions for Observability AI Insights.
 * Instructs the LLM to format entities as clickable links using Kibana's relative URL paths.
 */
export function getEntityLinkingInstructions({ urlPrefix }: { urlPrefix: string }): string {
  return dedent(`
  <entity_linking>
  ### Entity Linking Guidelines
  Use markdown for readability. When referencing entities, create clickable links.
  **IMPORTANT**: Do NOT wrap links in backticks - backticks prevent links from being clickable.

  | Entity | Link Format | Example |
  |--------|-------------|---------|
  | Service | [<serviceName>](${urlPrefix}/app/apm/services/<serviceName>) | "The [payments](${urlPrefix}/app/apm/services/payments) service is experiencing high latency." |
  | Transaction | [<transactionName>](${urlPrefix}/app/apm/services/<serviceName>/transactions) | "The transaction [POST /checkout](${urlPrefix}/app/apm/services/payments/transactions) took 500ms." |
  | Trace | [<traceId>](${urlPrefix}/app/apm/link-to/trace/<traceId>) | "See trace [8bc26008603e16819bd6fcfb80fceff5](${urlPrefix}/app/apm/link-to/trace/8bc26008603e16819bd6fcfb80fceff5)" |
  | Error | [<errorKey>](${urlPrefix}/app/apm/services/<serviceName>/errors/<errorKey>) | "Error [upstream-5xx](${urlPrefix}/app/apm/services/catalog-api/errors/upstream-5xx) suggests a dependency failure." |
  | Service Errors | [errors](${urlPrefix}/app/apm/services/<serviceName>/errors) | "Review all [errors](${urlPrefix}/app/apm/services/frontend/errors) for the [frontend](${urlPrefix}/app/apm/services/frontend) service." |
  | Service Logs | [logs](${urlPrefix}/app/apm/services/<serviceName>/logs) | "Check [logs](${urlPrefix}/app/apm/services/frontend/logs) for the [frontend](${urlPrefix}/app/apm/services/frontend) service." |
  | Host | [<hostName>](${urlPrefix}/app/metrics/detail/host/<hostName>) | "Host [web-01](${urlPrefix}/app/metrics/detail/host/web-01) is experiencing high CPU usage." |
  | Service Map | [Service Map](${urlPrefix}/app/apm/services/<serviceName>/service-map) | "Check the [Service Map](${urlPrefix}/app/apm/services/payments/service-map) to see dependencies." |
  | Dependencies | [Dependencies](${urlPrefix}/app/apm/services/<serviceName>/dependencies) | "View [Dependencies](${urlPrefix}/app/apm/services/catalog-api/dependencies) to identify upstream issues." |
  | Alert | [<alertId>](${urlPrefix}/app/observability/alerts/<alertId>) | "Alert [alert-uuid-123](${urlPrefix}/app/observability/alerts/alert-uuid-123) was triggered." |
  | Alert Rules | [<alertRuleId>](${urlPrefix}/app/rules/rule/<alertRuleId>) | "Alert Rule [alert-uuid-123](${urlPrefix}/app/rules/rule/alert-uuid-123)." |
  | Discover | [Discover](${urlPrefix}/app/discover) | "Go to [Discover](${urlPrefix}/app/discover) to investigate the issue further." |
  </entity_linking>
`);
}
