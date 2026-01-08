/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import moment from 'moment';
import { MessageRole, type InferenceClient } from '@kbn/inference-common';
import type { IScopedClusterClient, KibanaRequest } from '@kbn/core/server';
import { safeJsonStringify } from '@kbn/std';
import dedent from 'dedent';
import { concat, of } from 'rxjs';
import type { ObservabilityAgentBuilderDataRegistry } from '../../data_registry/data_registry';
import { getLogDocumentById } from './get_log_document_by_id';
import type { AiInsightResult, ContextEvent } from './types';

export interface GetLogAiInsightsParams {
  index: string;
  id: string;
  dataRegistry: ObservabilityAgentBuilderDataRegistry;
  inferenceClient: InferenceClient;
  connectorId: string;
  request: KibanaRequest;
  esClient: IScopedClusterClient;
}

export type GetLogAiInsightsResult = AiInsightResult;

export async function getLogAiInsights({
  index,
  id,
  request,
  esClient,
  dataRegistry,
  inferenceClient,
  connectorId,
}: GetLogAiInsightsParams): Promise<GetLogAiInsightsResult> {
  const systemPrompt = dedent(`
    You are assisting an SRE who is viewing a log entry in the Kibana Logs UI.
    Using the provided data produce a concise, action-oriented response.`);

  const logEntry = await getLogDocumentById({
    esClient: esClient.asCurrentUser,
    index,
    id,
  });

  if (!logEntry) {
    throw new Error('Log entry not found');
  }

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

  if (logEntry.service?.name && logEntry.service?.environment) {
    const serviceSummary = await dataRegistry.getData('apmServiceSummary', {
      request,
      serviceName: logEntry.service?.name,
      serviceEnvironment: logEntry.service?.environment,
      start: moment(logEntry['@timestamp']).subtract(24, 'hours').toISOString(),
      end: moment(logEntry['@timestamp']).add(24, 'hours').toISOString(),
    });
    context += dedent(`
      <ServiceSummary>
      \`\`\`json
      ${safeJsonStringify(serviceSummary)}
      \`\`\`
      </ServiceSummary>
    `);
  }

  const events$ = inferenceClient.chatComplete({
    connectorId,
    system: systemPrompt,
    messages: [
      {
        role: MessageRole.User,
        content:
          dedent(`Explain this log message: what it means, where it is from, whether it is expected, and if it is an issue.
          ${context}
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
