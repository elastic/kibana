/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import type { Observable } from 'rxjs';
import type { ChatCompletionEvent, InferenceClient } from '@kbn/inference-common';
import { MessageRole } from '@kbn/inference-common';
import type { IScopedClusterClient, KibanaRequest, Logger } from '@kbn/core/server';
import dedent from 'dedent';
import type {
  ObservabilityAgentBuilderCoreSetup,
  ObservabilityAgentBuilderPluginSetupDependencies,
} from '../../types';
import { getLogDocumentById, type LogDocument } from './get_log_document_by_id';
import { getToolHandler as getCorrelatedLogs } from '../../tools/get_correlated_logs/handler';
import { isWarningOrAbove } from '../../utils/warning_and_above_log_filter';
import { getEntityLinkingInstructions } from '../../agent/register_observability_agent';
import { createAiInsightResult, type AiInsightResult } from './types';
import { fetchDistributedTrace } from './apm_error/fetch_distributed_trace';
import { getApmIndices } from '../../utils/get_apm_indices';

export interface GetLogAiInsightsParams {
  core: ObservabilityAgentBuilderCoreSetup;
  plugins: ObservabilityAgentBuilderPluginSetupDependencies;
  index: string;
  id: string;
  inferenceClient: InferenceClient;
  connectorId: string;
  request: KibanaRequest;
  esClient: IScopedClusterClient;
  logger: Logger;
}

export async function getLogAiInsights({
  core,
  plugins,
  index,
  id,
  esClient,
  inferenceClient,
  connectorId,
  request,
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

  return createAiInsightResult(context, events$);
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
  index: string;
  id: string;
  logEntry: LogDocument;
}): Promise<string> {
  const logTimestamp = logEntry['@timestamp'] as string;
  const logTime = moment(logTimestamp);
  const windowStart = logTime.clone().subtract(60, 'minutes').toISOString();
  const windowEnd = logTime.clone().add(60, 'minutes').toISOString();

  let context = dedent(`
    <LogEntryIndex>
    ${index}
    </LogEntryIndex>
    <LogEntryId>
    ${id}
    </LogEntryId>
    <LogEntryFields>
    \`\`\`json
    ${JSON.stringify(logEntry, null, 2)}
    \`\`\`
    </LogEntryFields>
  `);

  const traceId = logEntry['trace.id'] as string | undefined;
  const isErrorOrWarning = isWarningOrAbove(logEntry);

  const [correlatedLogsResult, distributedTraceResult] = await Promise.all([

    (async () => {
      try {
        const { sequences } = await getCorrelatedLogs({
          core,
          logger,
          esClient,
          index,
          start: windowStart,
          end: windowEnd,
          logId: id,
          errorLogsOnly: false,
        });
        return sequences[0];
      } catch (error) {
        logger.debug(`Failed to fetch correlated logs: ${error.message}`);
        return undefined;
      }
    })(),

    (async () => {
      if (!traceId || !isErrorOrWarning) {
        return undefined;
      }

      try {
        const apmIndices = await getApmIndices({ core, plugins, logger });
        const trace = await fetchDistributedTrace({
          esClient,
          apmIndices,
          traceId,
          start: new Date(windowStart).getTime(),
          end: new Date(windowEnd).getTime(),
          logger,
        });

        if (trace.traceDocuments.length > 0) {
          return trace;
        }
        return undefined;
      } catch (error) {
        logger.debug(`Failed to fetch distributed trace for trace.id=${traceId}: ${error.message}`);
        return undefined;
      }
    })(),
  ]);

  if (correlatedLogsResult?.logs?.length) {
    context += dedent(`
      <CorrelatedLogSequence>
      Time window: ${windowStart} to ${windowEnd}
      \`\`\`json
      ${JSON.stringify(correlatedLogsResult, null, 2)}
      \`\`\`
      </CorrelatedLogSequence>
    `);
  }

  if (distributedTraceResult) {
    const partialTraceNote = distributedTraceResult.isPartialTrace
      ? 'Note: This is a partial trace.'
      : '';

    context += dedent(`
      <DistributedTrace>
      Trace ID: ${traceId}
      Time window: ${windowStart} to ${windowEnd}
      ${partialTraceNote}

      Services involved (sorted by activity, with error counts):
      \`\`\`json
      ${JSON.stringify(distributedTraceResult.services, null, 2)}
      \`\`\`

      Trace documents (spans, transactions, errors) - use parent.id to understand call hierarchy:
      \`\`\`json
      ${JSON.stringify(distributedTraceResult.traceDocuments, null, 2)}
      \`\`\`
      </DistributedTrace>
    `);
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
        You are an expert SRE assistant analyzing an error or warning log entry. Provide a thorough investigation:

        - **What happened**: Summarize the error in plain language
        - **Where it originated**: Identify the service, component, or code path that is the ROOT CAUSE
        - **Root cause analysis**: If DistributedTrace is available, use the parent.id relationships to trace the call hierarchy and identify which service CAUSED the error vs which services were AFFECTED by it
        - **Impact**: Note any affected downstream services or dependencies
        - **Next steps**: Suggest specific actions for investigation or remediation

        Base your analysis strictly on the provided data.

        ${entityLinkingInstructions}
      `)
    : dedent(`
        You are an expert SRE assistant analyzing an info, debug, or trace log entry. Keep it concise:

        - Explain what the log message means in context
        - Identify the source (service, host, container)
        - If CorrelatedLogSequence is available, use it to provide additional context

        Base your analysis strictly on the provided data. Be specific and reference actual field values.

        ${entityLinkingInstructions}
      `);

  const userPrompt = dedent(`
    <LogContext>
    ${context}
    </LogContext>
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
