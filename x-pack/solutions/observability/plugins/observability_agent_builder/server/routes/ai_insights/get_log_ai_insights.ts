/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import moment from 'moment';
import { MessageRole, type InferenceClient } from '@kbn/inference-common';
import type { IScopedClusterClient, KibanaRequest, Logger } from '@kbn/core/server';
import { safeJsonStringify } from '@kbn/std';
import dedent from 'dedent';
import { concat, of } from 'rxjs';
import type { ObservabilityAgentBuilderDataRegistry } from '../../data_registry/data_registry';
import { getLogDocumentById } from './get_log_document_by_id';
import type { ObservabilityAgentBuilderPluginSetupDependencies } from '../../types';
import { getToolHandler as getCorrelatedLogs } from '../../tools/get_correlated_logs/handler';
import { getToolHandler as getLogCategories } from '../../tools/get_log_categories/handler';
import { isWarningOrAbove } from './get_log_severity';
import type { AiInsightResult, ContextEvent } from './types';

export interface GetLogAiInsightsParams {
  index: string;
  id: string;
  dataRegistry: ObservabilityAgentBuilderDataRegistry;
  inferenceClient: InferenceClient;
  connectorId: string;
  request: KibanaRequest;
  esClient: IScopedClusterClient;
  core: ObservabilityAgentBuilderCoreSetup;
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
}: GetLogAiInsightsParams): Promise<AiInsightResult> {
  const logEntry = await getLogDocumentById({
    esClient: esClient.asCurrentUser,
    index,
    id,
  });

  if (!logEntry) {
    throw new Error('Log entry not found');
  }
  const isErrorOrWarning = isWarningOrAbove(logEntry);
  const systemPrompt = isErrorOrWarning
    ? dedent(`
        You are an expert SRE assistant analyzing a log with severity ${severity}. Provide a thorough investigation:

        - **What happened**: Summarize the error in plain language
        - **Where it originated**: Identify the service, component, or code path
        - **Root cause**: Analyze using CorrelatedLogSequence and LogCategories to understand what happened before and after the error
        - **Pattern analysis**: Use LogCategories to identify if this is a recurring pattern or anomaly
        - **Impact**: Note any affected downstream services or dependencies
        - **Next steps**: Suggest specific actions for investigation or remediation

        Base your analysis strictly on the provided data.
      `)
    : dedent(`
        You are an expert SRE assistant analyzing a log with severity ${severity}. Keep it concise:

        - Explain what the log message means in context
        - Identify the source (service, host, container)
        - Use LogCategories to show common log patterns in the time window

        Base your analysis strictly on the provided data. Be specific and reference actual field values.
      `);

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

  interface ContextPart {
    name: string;
    handler: () => Promise<unknown>;
  }

  const contextParts: ContextPart[] = [];

  contextParts.push({
    name: 'CorrelatedLogSequence',
    handler: async () => {
      try {
        const { sequences } = await getCorrelatedLogs({
          core,
          logger,
          esClient,
          index,
          start: windowStart,
          end: windowEnd,
          logId: id,
          errorLogsOnly: true,
        });

        return sequences[0] || null;
      } catch (error) {
        logger.debug(`Failed to fetch correlated logs: ${error.message}`);
        return null;
      }
    },
  });

  contextParts.push({
    name: 'LogCategories',
    handler: async () => {
      try {
        const categories = await getLogCategories({
          core,
          logger,
          esClient,
          index,
          start: windowStart,
          end: windowEnd,
          fields: ['service.name', 'host.name', 'container.id'],
        });
        return categories;
      } catch (error) {
        logger.debug(`Failed to fetch log categories: ${error.message}`);
        return null;
      }
    },
  });

  const results = await Promise.allSettled(
    contextParts.map(async (part) => {
      const data = await part.handler();
      return { part, data };
    })
  );

  const contextPartsStrings = results
    .filter((result): result is PromiseFulfilledResult<{ part: ContextPart; data: unknown }> => {
      if (result.status === 'rejected') {
        logger.debug(`Log AI Insight: fetch failed: ${result.reason}`);
        return false;
      }
      return true;
    })
    .map((result) => result.value)
    .filter(({ data }) => data && (!Array.isArray(data) || data.length > 0))
    .map(({ part, data }) =>
      dedent(`
        <${part.name}>
        Time window: ${windowStart} to ${windowEnd}
        \`\`\`json
        ${safeJsonStringify(data)}
        \`\`\`
        </${part.name}>
      `)
    );

  if (contextPartsStrings.length > 0) {
    context += contextPartsStrings.join('\n\n');
  }

  const events$ = inferenceClient.chatComplete({
    connectorId,
    system: systemPrompt,
    messages: [
      {
        role: MessageRole.User,
        content: dedent(`
          <LogContext>
          ${context}
          </LogContext>
          Analyze this log entry and generate a summary explaining what it means.
          Follow your system instructions. Ensure the analysis is grounded in the provided context, and concise.
        `),
      },
    ],
    stream: true,
  });

  const streamWithContext$ = concat(of<ContextEvent>({ type: 'context', context }), events$);

  return {
    events$: streamWithContext$,
    context,
  };
}
