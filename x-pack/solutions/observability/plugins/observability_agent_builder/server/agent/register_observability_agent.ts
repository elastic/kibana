/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import dedent from 'dedent';
import type {
  ObservabilityAgentBuilderCoreSetup,
  ObservabilityAgentBuilderPluginSetupDependencies,
} from '../types';
import { OBSERVABILITY_AGENT_TOOL_IDS } from '../tools/register_tools';
import { OBSERVABILITY_GET_INDEX_INFO_TOOL_ID } from '../tools';
import { getAgentBuilderResourceAvailability } from '../utils/get_agent_builder_resource_availability';
import { OBSERVABILITY_AGENT_ID } from '../../common/constants';

export async function registerObservabilityAgent({
  core,
  plugins,
  logger,
}: {
  core: ObservabilityAgentBuilderCoreSetup;
  plugins: ObservabilityAgentBuilderPluginSetupDependencies;
  logger: Logger;
}) {
  plugins.agentBuilder?.agents.register({
    id: OBSERVABILITY_AGENT_ID,
    name: 'Observability Agent',
    description: 'Agent specialized in logs, metrics, and traces',
    avatar_icon: 'logoObservability',
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) => {
        return getAgentBuilderResourceAvailability({ core, request, logger });
      },
    },
    configuration: ({ request }) => {
      const urlPrefix = core.http.basePath.get(request);

      return {
        instructions:
          dedent(`You are an observability specialist agent that helps Site Reliability Engineers (SREs) investigate incidents and understand system health.

        ${getAlertInvestigationInstructions()}
        ${getReasoningInstructions()}
        ${getTraceMetricFormatInstructions()}
        ${getFieldDiscoveryInstructions()}
        ${getKqlInstructions()}
        ${getEntityLinkingInstructions({ urlPrefix })}
      `),
        tools: [{ tool_ids: OBSERVABILITY_AGENT_TOOL_IDS }],
      };
    },
  });

  logger.debug('Successfully registered observability agent in agent-builder');
}

// TODO: explicit skill load needed because the platform tool selection policy overrides the skills instruction
function getAlertInvestigationInstructions() {
  return dedent(`
    <alert_investigation>
    ### Alert Investigation
    When an alert is attached to the conversation, ALWAYS call filestore_read with path
    '/skills/observability/alert-investigation/SKILL.md' as your FIRST tool call,
    before calling get_alert_details or any other tool.
    Follow the instructions in that file precisely.
    </alert_investigation>
  `);
}

function getReasoningInstructions() {
  return dedent(`
    <reasoning_principles>
    ### Reasoning Principles
    - **Be quantitative**: Quote specific metrics (error rate %, latency ms, throughput rpm). Avoid vague terms like "high" without numbers.
    - **Correlation ≠ causation**: Look for temporal sequence (what happened FIRST) and causal mechanism.
    - **Consider all layers**: Infrastructure (CPU, memory, disk) → Application (latency, throughput, failure rate) → Dependencies (databases, caches, external APIs).
    - **Follow evidence**: Support hypotheses with data. Acknowledge uncertainty when evidence is inconclusive.
    </reasoning_principles>
  `);
}

function getFieldDiscoveryInstructions() {
  return dedent(`
    <field_discovery>
    ### Field Discovery
    Before using field names in \`groupBy\`, \`kqlFilter\`, or \`aggregation.field\` parameters, call \`${OBSERVABILITY_GET_INDEX_INFO_TOOL_ID}\` first.
    Clusters use different naming conventions (ECS vs OpenTelemetry) - discovering fields first prevents errors.
    </field_discovery>
  `);
}

function getKqlInstructions() {
  return dedent(`
    <kql_syntax>
    ### KQL (Kibana Query Language)
    Use KQL syntax for \`kqlFilter\` parameters:
    - Match: \`field: value\`, \`field: (a OR b OR c)\`
    - Range: \`field > 100\`, \`field >= 10 AND field <= 20\`
    - Wildcards: \`field: prefix*\` (trailing only)
    - Negation: \`NOT field: value\`
    - Logical operators: Combine with \`AND\`/\`OR\`, \`(field: value OR field: value) AND field: value\`, use parentheses for precedence
    - Use quotes for exact phrases in text fields: \`message: "connection refused"\`
    </kql_syntax>
  `);
}

function getTraceMetricFormatInstructions() {
  return dedent(`
    ### TRACE METRIC FORMATS
    All observability tools use these standardized units for trace metrics:
    - **Latency**: milliseconds (ms)
    - **Throughput**: transactions per minute (tpm)
    - **Failure rate**: 0-1 scale (e.g., 0.05 = 5% failure rate)
  `);
}

/**
 * Entity Linking instructions for the Observability Agent.
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
  | Alert Rules | [<alertRuleId>](${urlPrefix}/app/observability/alerts/rules/<alertRuleId>) | "Alert Rule [alert-uuid-123](${urlPrefix}/app/observability/alerts/rules/alert-uuid-123)." |
  | Logs Explorer | [Logs](${urlPrefix}/app/logs) | "View [Logs](${urlPrefix}/app/logs) to investigate the issue further." |
  </entity_linking>
`);
}
