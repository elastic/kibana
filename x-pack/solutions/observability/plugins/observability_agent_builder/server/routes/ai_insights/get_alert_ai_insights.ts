/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { InferenceClient, ChatCompletionEvent } from '@kbn/inference-common';
import { MessageRole } from '@kbn/inference-common';
import dedent from 'dedent';
import { compact, isEmpty } from 'lodash';
import moment from 'moment';
import type { Observable } from 'rxjs';
import type { ObservabilityAgentBuilderDataRegistry } from '../../data_registry/data_registry';
import { createAiInsightResult, type AiInsightResult } from './types';
import type {
  ObservabilityAgentBuilderCoreSetup,
  ObservabilityAgentBuilderPluginSetupDependencies,
} from '../../types';
import { getToolHandler as getLogGroups } from '../../tools/get_log_groups/handler';
import { getToolHandler as getRuntimeMetrics } from '../../tools/get_runtime_metrics/handler';
import { getToolHandler as getHosts } from '../../tools/get_hosts/handler';
import { getToolHandler as getServices } from '../../tools/get_services/handler';
import { getEntityLinkingInstructions } from '../../agent/register_observability_agent';

/**
 * These types are derived from the generated alerts-as-data schemas:
 * - `AlertSchema` in `kbn-alerts-as-data-utils` (see `alert_schema.ts`) which defines
 *   `kibana.alert.start` and other technical fields.
 * - `ObservabilityApmAlertSchema` in `observability_apm_schema.ts`, which adds
 *   the APM-specific fields like `service.*` and `transaction.*`.
 *
 * We only rely on these well-known keys; all other properties are treated as
 * opaque via the index signature below so this type can safely represent any
 * Observability alert document.
 */
export interface AlertDocForInsight {
  'service.name'?: string;
  'service.environment'?: string;
  'transaction.type'?: string;
  'transaction.name'?: string;
  'host.name'?: string;
  'kibana.alert.start'?: string | number;
  [key: string]: unknown;
}

interface GetAlertAiInsightParams {
  core: ObservabilityAgentBuilderCoreSetup;
  plugins: ObservabilityAgentBuilderPluginSetupDependencies;
  alertDoc: AlertDocForInsight;
  inferenceClient: InferenceClient;
  connectorId: string;
  dataRegistry: ObservabilityAgentBuilderDataRegistry;
  request: KibanaRequest;
  logger: Logger;
}

export async function getAlertAiInsight({
  core,
  plugins,
  alertDoc,
  inferenceClient,
  connectorId,
  dataRegistry,
  request,
  logger,
}: GetAlertAiInsightParams): Promise<AiInsightResult> {
  const urlPrefix = core.http.basePath.get(request);

  const relatedContext = await fetchAlertContext({
    core,
    plugins,
    alertDoc,
    dataRegistry,
    request,
    logger,
  });
  const events$: Observable<ChatCompletionEvent> = generateAlertSummary({
    inferenceClient,
    connectorId,
    alertDoc,
    urlPrefix,
    context: relatedContext,
  });

  return createAiInsightResult(relatedContext, events$);
}

// Time window offsets in minutes before alert start
const START_TIME_OFFSETS = {
  serviceSummary: 5,
  downstream: 24 * 60, // 24 hours
  logs: 15,
  changePoints: 6 * 60, // 6 hours
  runtimeMetrics: 15,
  infraHosts: 15,
  servicesOnHost: 15,
} as const;

async function fetchAlertContext({
  core,
  plugins,
  alertDoc,
  dataRegistry,
  request,
  logger,
}: Pick<
  GetAlertAiInsightParams,
  'core' | 'plugins' | 'alertDoc' | 'dataRegistry' | 'request' | 'logger'
>): Promise<string> {
  const serviceName = alertDoc?.['service.name'] ?? '';
  const serviceEnvironment = alertDoc?.['service.environment'] ?? '';
  const transactionType = alertDoc?.['transaction.type'];
  const transactionName = alertDoc?.['transaction.name'];
  const hostName = alertDoc?.['host.name'] ?? '';

  // Need at least a service name or host name to fetch context
  if (!serviceName && !hostName) {
    return 'No related signals available.';
  }

  const alertTime = moment(alertDoc?.['kibana.alert.start']);
  const alertStart = alertTime.toISOString();

  const getStart = (minutesBefore: number) =>
    alertTime.clone().subtract(minutesBefore, 'minutes').toISOString();

  // Config-driven fetch definitions
  const fetchConfigs = [
    {
      key: 'apmServiceSummary' as const,
      startOffset: START_TIME_OFFSETS.serviceSummary,
      params: { serviceName, serviceEnvironment, transactionType },
    },
    {
      key: 'apmDownstreamDependencies' as const,
      startOffset: START_TIME_OFFSETS.downstream,
      params: { serviceName, serviceEnvironment },
    },
    {
      key: 'apmServiceChangePoints' as const,
      startOffset: START_TIME_OFFSETS.changePoints,
      params: { serviceName, serviceEnvironment, transactionType, transactionName },
    },
    {
      key: 'apmExitSpanChangePoints' as const,
      startOffset: START_TIME_OFFSETS.changePoints,
      params: { serviceName, serviceEnvironment },
    },
  ];

  const [coreStart] = await core.getStartServices();
  const esClient = coreStart.elasticsearch.client.asScoped(request);

  async function fetchLogGroups() {
    // Build filter based on available identifiers
    let filter: string;
    if (serviceName) {
      filter = `service.name: "${serviceName}"`;
    } else if (hostName) {
      filter = `host.name: "${hostName}"`;
    } else {
      return null;
    }

    try {
      const start = getStart(START_TIME_OFFSETS.logs);
      const end = alertStart;
      const result = await getLogGroups({
        core,
        plugins,
        request,
        logger,
        esClient,
        start,
        end,
        kqlFilter: filter,
        fields: [],
        includeStackTrace: false,
        includeFirstSeen: false,
        size: 10,
      });

      return result.length > 0 ? { key: 'logGroups' as const, start, end, data: result } : null;
    } catch (err) {
      logger.debug(`AI insight: logGroups failed: ${err}`);
      return null;
    }
  }

  async function fetchRuntimeMetrics() {
    if (!serviceName) return null;

    try {
      const start = getStart(START_TIME_OFFSETS.runtimeMetrics);
      const end = alertStart;
      const result = await getRuntimeMetrics({
        core,
        plugins,
        request,
        logger,
        serviceName,
        serviceEnvironment,
        start,
        end,
      });

      return result.nodes.length > 0
        ? { key: 'runtimeMetrics' as const, start, end, data: result.nodes }
        : null;
    } catch (err) {
      logger.debug(`AI insight: runtimeMetrics failed: ${err}`);
      return null;
    }
  }

  async function fetchInfraHosts() {
    const kqlFilter = hostName
      ? `host.name: "${hostName}"`
      : serviceName
      ? `service.name: "${serviceName}"`
      : null;

    if (!kqlFilter) return null;

    try {
      const start = getStart(START_TIME_OFFSETS.infraHosts);
      const end = alertStart;
      const result = await getHosts({
        request,
        dataRegistry,
        start,
        end,
        limit: 10,
        kqlFilter,
      });

      return result.hosts.length > 0
        ? { key: 'infraHosts' as const, start, end, data: result.hosts }
        : null;
    } catch (err) {
      logger.debug(`AI insight: infraHosts failed: ${err}`);
      return null;
    }
  }

  // Reverse correlation: find services running on a host (for infra alerts)
  async function fetchServicesOnHost() {
    // Only fetch if we have a host name but no service name
    // (for infra alerts that need to discover which services are affected)
    if (!hostName || serviceName) return null;

    try {
      const start = getStart(START_TIME_OFFSETS.servicesOnHost);
      const end = alertStart;
      const result = await getServices({
        core,
        plugins,
        request,
        esClient,
        dataRegistry,
        logger,
        start,
        end,
        kqlFilter: `host.name: "${hostName}"`,
      });

      return result.services.length > 0
        ? { key: 'servicesOnHost' as const, start, end, data: result.services }
        : null;
    } catch (err) {
      logger.debug(`AI insight: servicesOnHost failed: ${err}`);
      return null;
    }
  }

  // APM-specific fetchers only run when we have a service name
  const apmFetchers = serviceName
    ? [
        ...fetchConfigs.map(async (config) => {
          try {
            const start = getStart(config.startOffset);
            const end = alertStart;
            const data = await dataRegistry.getData(config.key, {
              request,
              ...config.params,
              start,
              end,
            });
            return isEmpty(data) ? null : { key: config.key, start, end, data };
          } catch (err) {
            logger.debug(`AI insight: ${config.key} failed: ${err}`);
            return null;
          }
        }),
        fetchRuntimeMetrics(),
      ]
    : [];

  // These fetchers work with either service.name or host.name
  const allFetchers = [...apmFetchers, fetchLogGroups(), fetchInfraHosts(), fetchServicesOnHost()];

  const results = await Promise.all(allFetchers);
  const contextParts = compact(results).map(
    ({ key, start, end, data }) =>
      `<${key}>\nTime window: ${start} to ${end}\n\`\`\`json\n${JSON.stringify(
        data,
        null,
        2
      )}\n\`\`\`\n</${key}>`
  );

  return contextParts.length > 0 ? contextParts.join('\n\n') : 'No related signals available.';
}

function generateAlertSummary({
  inferenceClient,
  urlPrefix,
  connectorId,
  alertDoc,
  context,
}: {
  inferenceClient: InferenceClient;
  urlPrefix: string;
  connectorId: string;
  alertDoc: AlertDocForInsight;
  context: string;
}): Observable<ChatCompletionEvent> {
  const systemPrompt = dedent(`
    You are an SRE assistant. Help an SRE quickly understand likely cause, impact, and next actions for this alert using the provided context.

    Output format (use **bold** titles, prose paragraphs, minimal bullets):

    **Summary**
    1–2 sentences: What is likely happening and why it matters. If recovered, reduce urgency. If no strong signals, say "Inconclusive" and briefly note why.

    **Assessment**
    Most plausible explanation in prose, citing the signals that support it (e.g., "downstream metrics show...", "logs indicate..."). Say "Inconclusive" if signals do not support a clear cause.

    **Next Steps**
    2–3 numbered actions an SRE can take now.

    Guardrails:
    - Do not repeat the alert reason verbatim.
    - Only give a non-inconclusive Assessment when supported by on-topic signals; otherwise say "Inconclusive" and don't speculate.
    - Keep it concise (~100–150 words total).

    Available signals (use what's relevant and available):
    - Runtime metrics: CPU, memory, GC duration, thread count — indicates internal resource pressure
    - Downstream dependencies: latency/errors in called services — indicates external issues
    - Change points: sudden shifts in throughput/latency/failure rate — shows when problems started
    - Log categories: error messages and exception patterns
    - Service summary: instance counts, versions, anomalies, and metadata
    - Host infrastructure: CPU, memory, disk, network usage — indicates host-level resource pressure
    - Services on host: for infrastructure alerts, shows services running on the affected host — helps identify which service may be causing resource pressure

    Note: Numeric values on a 0-1 scale represent percentages (e.g., 0.95 = 95%, 0.3 = 30%).

    ${getEntityLinkingInstructions({ urlPrefix })}
  `);

  const alertDetails = `\`\`\`json\n${JSON.stringify(alertDoc, null, 2)}\n\`\`\``;

  const userPrompt = dedent(`
    <AlertDetails>
    ${alertDetails}
    </AlertDetails>
    <RelatedAlertContext>
    ${context}
    </RelatedAlertContext>
    Task:
    Summarize likely cause, impact, and immediate next checks for this alert using the format above. Tie related signals to the alert scope; ignore unrelated noise. If signals are weak or conflicting, mark Assessment "Inconclusive" and propose the safest next diagnostic step.
  `);

  return inferenceClient.chatComplete({
    connectorId,
    system: systemPrompt,
    messages: [{ role: MessageRole.User, content: userPrompt }],
    stream: true,
  });
}
