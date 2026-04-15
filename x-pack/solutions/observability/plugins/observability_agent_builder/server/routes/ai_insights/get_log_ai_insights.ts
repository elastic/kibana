/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import type { Observable } from 'rxjs';
import type {
  ChatCompletionEvent,
  InferenceClient,
  InferenceConnector,
} from '@kbn/inference-common';
import { MessageRole } from '@kbn/inference-common';
import type { IScopedClusterClient, KibanaRequest, Logger } from '@kbn/core/server';
import dedent from 'dedent';
import type {
  ObservabilityAgentBuilderCoreSetup,
  ObservabilityAgentBuilderPluginSetupDependencies,
} from '../../types';
import { getLogDocumentById, type LogDocument } from './get_log_document_by_id';
import { getToolHandler as getTraces } from '../../tools/get_traces/handler';
import { isWarningOrAbove } from '../../utils/warning_and_above_log_filter';
import { getEntityLinkingInstructions } from '../../agent/register_observability_agent';
import { createAiInsightResult, type AiInsightResult } from './types';

export interface GetLogAiInsightsParams {
  core: ObservabilityAgentBuilderCoreSetup;
  plugins: ObservabilityAgentBuilderPluginSetupDependencies;
  inferenceClient: InferenceClient;
  connectorId: string;
  connector: InferenceConnector;
  request: KibanaRequest;
  esClient: IScopedClusterClient;
  logger: Logger;
  index?: string;
  id?: string;
  fields?: Record<string, unknown>;
}

export async function getLogAiInsights({
  core,
  plugins,
  index,
  id,
  fields,
  esClient,
  inferenceClient,
  connectorId,
  connector,
  request,
  logger,
}: GetLogAiInsightsParams): Promise<AiInsightResult> {
  let logEntry: LogDocument;

  if (typeof index === 'string' && typeof id === 'string') {
    const fetchedById = await getLogDocumentById({
      esClient: esClient.asCurrentUser,
      index,
      id,
    });
    if (!fetchedById) {
      throw new Error('Log entry not found');
    }
    logEntry = fetchedById;
    // esql mode, filter out null entries from passed in fields
  } else {
    logEntry = Object.fromEntries(
      Object.entries(fields ?? {}).filter(([, v]) => v != null)
    ) as LogDocument;
  }

  const context = await fetchLogContext({
    core,
    plugins,
    logger,
    esClient,
    index,
    id,
    logEntry,
  });

  const events$ = generateLogSummary({
    inferenceClient,
    connectorId,
    logEntry,
    context,
    core,
    request,
  });

  return createAiInsightResult(context, connector, events$);
}

async function fetchLogContext({
  core,
  plugins,
  logger,
  esClient,
  index,
  id,
  logEntry,
}: {
  core: ObservabilityAgentBuilderCoreSetup;
  plugins: ObservabilityAgentBuilderPluginSetupDependencies;
  logger: Logger;
  esClient: IScopedClusterClient;
  index?: string;
  id?: string;
  logEntry: LogDocument;
}): Promise<string> {
  const logTimestamp = logEntry['@timestamp'];
  if (!logTimestamp) {
    return dedent(`
      <LogEntryFields>
      \`\`\`json
      ${JSON.stringify(logEntry, null, 2)}
      \`\`\`
      </LogEntryFields>
    `);
  }

  const logTime = moment(logTimestamp);
  const windowStart = logTime.clone().subtract(60, 'minutes').toISOString();
  const windowEnd = logTime.clone().add(60, 'minutes').toISOString();

  let context = '';

  if (index) {
    context += dedent(`
      <LogEntryIndex>
      ${index}
      </LogEntryIndex>
    `);
  }
  if (id) {
    context += dedent(`
      <LogEntryId>
      ${id}
      </LogEntryId>
    `);
  }

  context += dedent(`
    <LogEntryFields>
    \`\`\`json
    ${JSON.stringify(logEntry, null, 2)}
    \`\`\`
    </LogEntryFields>
  `);
  // in esql (fields) mode, trace.id may be available
  const traceId = logEntry['trace.id'] as string | undefined;
  const traceFilter = id ? `_id: ${id}` : traceId ? `trace.id: ${traceId}` : undefined;
  const traceIndex = index ?? 'traces-*';

  if (traceFilter) {
    try {
      const { traces } = await getTraces({
        core,
        plugins,
        logger,
        esClient,
        index: traceIndex,
        start: windowStart,
        end: windowEnd,
        kqlFilter: traceFilter,
        maxTraces: 10,
        maxDocsPerTrace: 100,
      });
      const trace = traces[0];
      if (trace) {
        context += dedent(`
        <TraceDocuments>
        Time window: ${windowStart} to ${windowEnd}
        \`\`\`json
        ${JSON.stringify(trace, null, 2)}
        \`\`\`
        </TraceDocuments>
      `);
      }
    } catch (error) {
      logger.debug(`Failed to fetch traces: ${error.message}`);
    }
  }

  return context;
}

function generateLogSummary({
  inferenceClient,
  connectorId,
  logEntry,
  context,
  core,
  request,
}: {
  inferenceClient: InferenceClient;
  connectorId: string;
  logEntry: LogDocument;
  context: string;
  core: ObservabilityAgentBuilderCoreSetup;
  request: KibanaRequest;
}): Observable<ChatCompletionEvent> {
  const isErrorOrWarning = isWarningOrAbove(logEntry);
  const entityLinkingInstructions = getEntityLinkingInstructions({
    urlPrefix: core.http.basePath.get(request),
  });

  const systemPrompt = isErrorOrWarning
    ? dedent(`
        You are an expert SRE assistant analyzing an ${logEntry['log.level']} log entry. Provide a thorough investigation:

        - **What happened**: Summarize the error in plain language
        - **Where it originated**: Identify the service, component, or code path
        - **Root cause analysis**: Use the available context to identify potential causes
        - **Impact**: Note any affected downstream services or dependencies
        - **Next steps**: Suggest specific actions for investigation or remediation

        Base your analysis strictly on the provided data.

        ${entityLinkingInstructions}
      `)
    : dedent(`
        You are an expert SRE assistant analyzing an ${logEntry['log.level']} log entry. Keep it concise:

        - Explain what the log message means in context
        - Identify the source (service, host, container)
        - If CorrelatedLogSequence is available, use it to provide additional context

        Base your analysis strictly on the provided data. Be specific and reference actual field values.

        ${entityLinkingInstructions}
      `);

  const userPrompt = dedent(`
    ${context}
    Analyze this log entry and generate a summary explaining what it means.
    Ensure the analysis is grounded in the provided context, and concise.
  `);

  return inferenceClient.chatComplete({
    connectorId,
    system: systemPrompt,
    messages: [{ role: MessageRole.User, content: userPrompt }],
    stream: true,
  });
}
