/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { MessageRole, type InferenceClient } from '@kbn/inference-common';
import { safeJsonStringify } from '@kbn/std';
import dedent from 'dedent';
import type { ServiceSummary } from '../../data_registry/data_registry_types';

export interface GetLogAiInsightsParams {
  index: string;
  id: string;
  fields: Record<string, any>;
  serviceSummary: ServiceSummary;
  inferenceClient: InferenceClient;
  connectorId: string;
}

export async function getLogAiInsights({
  index,
  id,
  fields,
  serviceSummary,
  inferenceClient,
  connectorId,
}: GetLogAiInsightsParams): Promise<{ context: string; summary: string }> {
  const systemPrompt = dedent(`
    You are assisting an SRE who is viewing a log entry in the Kibana Logs UI.
    Using the provided data produce a concise, action-oriented response.
     - Only call tools if the attachments do not contain the necessary data to analyze the log message.`);

  const response = await inferenceClient.chatComplete({
    connectorId,
    system: systemPrompt,
    messages: [
      {
        role: MessageRole.User,
        content:
          dedent(`Explain this log message: what it means, where it is from, whether it is expected, and if it is an issue.
          <LogEntryIndex>
          ${index}
          </LogEntryIndex>
          <LogEntryId>
          ${id}
          </LogEntryId>
          <LogEntryFields>
          \`\`\`json
          ${safeJsonStringify(fields)}
          \`\`\`
          </LogEntryFields>
          <ServiceSummary>
          \`\`\`json
          ${safeJsonStringify(serviceSummary)}
          \`\`\`
          </ServiceSummary>
          `),
      },
    ],
  });

  return response.content;
}
