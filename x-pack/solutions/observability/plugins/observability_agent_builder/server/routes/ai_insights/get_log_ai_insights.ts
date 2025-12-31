/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import moment from 'moment';
import { MessageRole, type InferenceClient } from '@kbn/inference-common';
import type { IScopedClusterClient, KibanaRequest, CoreSetup, Logger } from '@kbn/core/server';
import { safeJsonStringify } from '@kbn/std';
import dedent from 'dedent';
import type { ObservabilityAgentBuilderDataRegistry } from '../../data_registry/data_registry';
import { getLogDocumentById } from './get_log_document_by_id';
import type {
  ObservabilityAgentBuilderPluginSetupDependencies,
  ObservabilityAgentBuilderPluginStart,
  ObservabilityAgentBuilderPluginStartDependencies,
} from '../../types';
import { getApmIndices } from '../../utils/get_apm_indices';
import { fetchDistributedTrace } from './apm_error/fetch_distributed_trace';
import { parseDatemath } from '../../utils/time';

export interface GetLogAiInsightsParams {
  index: string;
  id: string;
  dataRegistry: ObservabilityAgentBuilderDataRegistry;
  inferenceClient: InferenceClient;
  connectorId: string;
  request: KibanaRequest;
  esClient: IScopedClusterClient;
  core: CoreSetup<
    ObservabilityAgentBuilderPluginStartDependencies,
    ObservabilityAgentBuilderPluginStart
  >;
  plugins: ObservabilityAgentBuilderPluginSetupDependencies;
  logger: Logger;
}

export async function getLogAiInsights({
  index,
  id,
  request,
  esClient,
  dataRegistry,
  inferenceClient,
  connectorId,
  core,
  plugins,
  logger,
}: GetLogAiInsightsParams): Promise<{ summary: string; context: string }> {
  const systemPrompt = dedent(`
    You are an expert SRE assistant helping a user analyze a log entry in Kibana. Your goal is to provide actionable insights tailored to the log's severity and content.

    ## Analysis Approach

    1. **Classify the log by log.level**: Determine the log level from the log.level field (error, warning, info, debug, trace, fatal, critical, alert, emergency).
       **Important**: Even if log.level is "info", "debug", or "trace", if the log mentions error messages, error fields, or exception fields, treat it as an error-level log.

    2. **Respond based on log level:**

    ### Error/Fatal/Critical/Alert/Emergency Logs (or logs with error/exception fields)
    Provide a thorough investigation:
    - **What happened**: Summarize the error in plain language
    - **Where it originated**: Identify the service, component, or code path
    - **Root cause**: Analyze using ServiceSummary, DownstreamDependencies, TraceDocuments, and TraceServices if available
    - **Impact**: Note any affected downstream services or dependencies
    - **Next steps**: Suggest specific actions for investigation or remediation
    - **Timeline**: Include when the issue started *only if this information exists in the data*

    ### Warning Logs
    - Assess whether the warning indicates an emerging problem or is purely informational
    - If it signals a potential issue, analyze it like an error log (see above)
    - If it's routine, provide a brief explanation of what triggered it

    ### Info/Debug/Trace Logs
    Keep it concise:
    - Explain what the log message means in context
    - Identify the source (service, host, container)
    - Only flag concerns if the content unexpectedly suggests a problem

    ## Important Notes
    - Base your analysis strictly on the provided data (**DO NOT** speculate beyond what the evidence shows)
    - Be specific: reference actual field values, timestamps, and service names from the log entry
    - Prioritize actionable information over generic advice
  `);

  const logEntry = await getLogDocumentById({
    esClient: esClient.asCurrentUser,
    index,
    id,
  });

  if (!logEntry) {
    throw new Error('Log entry not found');
  }

  const resourceAttributes = logEntry.resource?.attributes;

  const serviceName =
    logEntry.service?.name ?? (resourceAttributes?.['service.name'] as string) ?? '';

  const serviceEnvironment =
    logEntry.service?.environment ?? (resourceAttributes?.['service.environment'] as string) ?? '';

  let context = dedent(`
    <LogEntryIndex>
    ${index}
    </LogEntryIndex>
    <LogEntryId>
    ${id}
    </LogEntryId>
    <LogEntryFields>
    \`\`\`json
    ${safeJsonStringify(logEntry)}
    \`\`\`
    </LogEntryFields>
  `);

  if (serviceName) {
    const logTimestamp = logEntry['@timestamp'] as string;
    const start = moment(logTimestamp).subtract(24, 'hours').toISOString();
    const end = moment(logTimestamp).add(24, 'hours').toISOString();

    interface ContextPart {
      name: string;
      handler: () => Promise<unknown>;
    }

    const contextParts: ContextPart[] = [
      {
        name: 'ServiceSummary',
        handler: () =>
          dataRegistry.getData('apmServiceSummary', {
            request,
            serviceName,
            serviceEnvironment,
            start,
            end,
          }),
      },
      {
        name: 'DownstreamDependencies',
        handler: () =>
          dataRegistry.getData('apmDownstreamDependencies', {
            request,
            serviceName,
            serviceEnvironment,
            start,
            end,
          }),
      },
    ];

    const traceId = (logEntry.trace_id as string) || (logEntry.trace as { id?: string })?.id;

    if (traceId) {
      const parsedStart = parseDatemath(start, { roundUp: false });
      const parsedEnd = parseDatemath(end, { roundUp: true });
      const traceContextPromise = (async () => {
        const apmIndices = await getApmIndices({ core, plugins, logger });
        return fetchDistributedTrace({
          esClient,
          apmIndices,
          traceId,
          start: parsedStart,
          end: parsedEnd,
          logger,
        });
      })();

      contextParts.push({
        name: 'TraceDocuments',
        handler: async () => (await traceContextPromise).traceDocuments,
      });

      contextParts.push({
        name: 'TraceServices',
        handler: async () => (await traceContextPromise).services,
      });
    }

    const results = await Promise.allSettled(
      contextParts.map(async (part) => {
        const data = await part.handler();
        return { part, data };
      })
    );

    const contextPartsStrings: string[] = [];

    results.forEach((result) => {
      if (result.status === 'rejected') {
        logger.debug(`Log AI Insight: fetch failed: ${result.reason}`);
        return;
      }

      const { part, data } = result.value;
      if (!data || (Array.isArray(data) && data.length === 0)) {
        return;
      }

      contextPartsStrings.push(
        dedent(`
        <${part.name}>
        Time window: ${start} to ${end}
        \`\`\`json
        ${safeJsonStringify(data)}
        \`\`\`
        </${part.name}>
      `)
      );
    });

    if (contextPartsStrings.length > 0) {
      context += contextPartsStrings.join('\n\n');
    }
  }
  const response = await inferenceClient.chatComplete({
    connectorId,
    system: systemPrompt,
    messages: [
      {
        role: MessageRole.User,
        content: dedent(`
          <LogContext>
          ${context}
          </LogContext>
          Analyze this log entry and generate a summary explaining what it means, whether this is expected behavior or indicates an issue (e.g., error, warning, exception, service failure, etc.).
          If it indicates an issue, explain the likely root cause if determinable and recommended actions or steps for further investigation.
          Follow your system instructions. Ensure the analysis is grounded in the provided context, and concise.
        `),
      },
    ],
  });

  return { summary: response.content, context };
}
