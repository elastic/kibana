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
import type { ObservabilityAgentBuilderDataRegistry } from '../../data_registry/data_registry';
import { getLogDocumentById, type LogDocument } from './get_log_document_by_id';

export interface GetLogAiInsightsParams {
  dataRegistry: ObservabilityAgentBuilderDataRegistry;
  inferenceClient: InferenceClient;
  connectorId: string;
  request: KibanaRequest;
  esClient: IScopedClusterClient;
  index?: string;
  id?: string;
  fields?: Record<string, unknown>;
}

export async function getLogAiInsights({
  index,
  id,
  request,
  fields,
  esClient,
  dataRegistry,
  inferenceClient,
  connectorId,
}: GetLogAiInsightsParams): Promise<{ summary: string; context: string }> {
  const systemPrompt = dedent(`
    You are assisting an SRE who is viewing a log entry in the Kibana Logs UI.
    Using the provided data produce a concise, action-oriented response.`);

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

  const response = await inferenceClient.chatComplete({
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
  });

  return { summary: response.content, context };
}
