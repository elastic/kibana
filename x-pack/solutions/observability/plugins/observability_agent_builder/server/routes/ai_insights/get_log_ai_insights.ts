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
import type { ObservabilityAgentBuilderCoreSetup } from '../../types';
import { getLogDocumentById, type LogDocument } from './get_log_document_by_id';
import { getCorrelatedLogsForLogEntry } from '../../tools/get_correlated_logs/handler';
import { isWarningOrAbove } from '../../utils/warning_and_above_log_filter';
import { getEntityLinkingInstructions } from '../../agent/register_observability_agent';
import { createAiInsightResult, type AiInsightResult } from './types';

export interface GetLogAiInsightsParams {
  core: ObservabilityAgentBuilderCoreSetup;
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
  logger,
  esClient,
  index,
  id,
  logEntry,
}: {
  core: ObservabilityAgentBuilderCoreSetup;
  logger: Logger;
  esClient: IScopedClusterClient;
  index: string;
  id: string;
  logEntry: LogDocument;
}): Promise<string> {
  const logTimestamp = logEntry['@timestamp'];
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

  let correlatedLogsResult;
  try {
    const { sequences } = await getCorrelatedLogsForLogEntry({
      core,
      logger,
      esClient,
      index,
      start: windowStart,
      end: windowEnd,
      logId: id,
    });
    correlatedLogsResult = sequences[0];
  } catch (error) {
    logger.debug(`Failed to fetch correlated logs: ${error.message}`);
  }

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
