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
import { getToolHandler } from '../../tools/get_correlated_logs/handler';
import { isWarningOrAbove } from './get_log_severity';

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
    - **Root cause**: Analyze using CorrelatedLogSequence (chronological sequence of related logs). The CorrelatedLogSequence shows what happened before and after the error.
    - **Impact**: Note any affected downstream services or dependencies
    - **Next steps**: Suggest specific actions for investigation or remediation

    ### Warning Logs
    - Assess whether the warning indicates an emerging problem or is purely informational
    - If it signals a potential issue, analyze it like an error log (see above)
    - If it's routine, provide a brief explanation of what triggered it

    ### Info/Debug/Trace Logs
    Keep it concise:
    - Explain what the log message means in context
    - Identify the source (service, host, container)
    - Use ServiceSummary if available to provide service context
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

  const isErrorOrWarning = isWarningOrAbove(logEntry);
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

  const logTimestamp = logEntry['@timestamp'] as string;
  const windowStart = moment(logTimestamp).subtract(1, 'hours').toISOString();
  const windowEnd = moment(logTimestamp).add(1, 'hours').toISOString();

  const resourceAttributes = logEntry.resource?.attributes;
  const serviceName =
    logEntry.service?.name ?? (resourceAttributes?.['service.name'] as string) ?? '';
  const serviceEnvironment =
    logEntry.service?.environment ?? (resourceAttributes?.['service.environment'] as string) ?? '';

  interface ContextPart {
    name: string;
    handler: () => Promise<unknown>;
  }

  const contextParts: ContextPart[] = [];

  if (isErrorOrWarning) {
    contextParts.push({
      name: 'CorrelatedLogSequence',
      handler: async () => {
        try {
          const logSourceFields = [
            '@timestamp',
            'message',
            'log.level',
            'level',
            'severity',
            'service.name',
            'service.environment',
            'trace.id',
            'trace_id',
            'request.id',
            'request_id',
            'error.*',
            'exception.*',
            'event.name',
            'event_name',
            'event.message',
            'event.type',
            'event.action',
            'event.dataset',
            'event.*',
            'attributes.*', // OpenTelemetry attributes (contains nested fields like attributes.message, attributes.service.name, etc.)
            'host.name',
            'container.id',
          ];

          const { sequences } = await getToolHandler({
            core,
            logger,
            esClient,
            start: windowStart,
            end: windowEnd,
            logId: id,
            errorLogsOnly: false,
            maxSequences: 1,
            maxLogsPerSequence: 50,
            logSourceFields,
          });

          return sequences[0] || null;
        } catch (error) {
          logger.debug(`Failed to fetch correlated logs: ${error.message}`);
          return null;
        }
      },
    });
  }

  if (!isErrorOrWarning && serviceName) {
    contextParts.push({
      name: 'ServiceSummary',
      handler: () =>
        dataRegistry.getData('apmServiceSummary', {
          request,
          serviceName,
          serviceEnvironment,
          start: windowStart,
          end: windowEnd,
        }),
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
        Time window: ${windowStart} to ${windowEnd}
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
