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
import { getLogDocumentById } from './get_log_document_by_id';

const ENVIRONMENT_ALL_VALUE = 'ENVIRONMENT_ALL';

export interface GetLogAiInsightsParams {
  index: string;
  id: string;
  dataRegistry: ObservabilityAgentBuilderDataRegistry;
  inferenceClient: InferenceClient;
  connectorId: string;
  request: KibanaRequest;
  esClient: IScopedClusterClient;
}

export async function getLogAiInsights({
  index,
  id,
  request,
  esClient,
  dataRegistry,
  inferenceClient,
  connectorId,
}: GetLogAiInsightsParams): Promise<{ summary: string; context: string }> {
  const systemPrompt = dedent(`
    You are assisting an SRE who is viewing a log entry in the Kibana Logs UI.
    Using the provided data produce a concise, action-oriented response.
    If it is an issue, provide remediation steps for further investigation.
    Check whether it is a problem with downstream services. Include when the issue started to appear.

    ## Entity Linking
    You must improve the SRE's navigation workflow by formatting specific Observability entities as Markdown links. When you identify the following entities in your context or data, you MUST format them using the specific relative URL paths defined below.

    ### Traces
      - Trigger: When mentioning a trace by its \`trace.id\`.
      - Template: \`[<trace.id>](/app/apm/link-to/trace/\${trace.id})\`
      - Example:
      - Text: "Investigate trace 8a3c42."
      - Output: "Investigate trace [8a3c42](/app/apm/link-to/trace/8a3c42)"
  `);

  const logEntry = await getLogDocumentById({
    esClient: esClient.asCurrentUser,
    index,
    id,
  });

  if (!logEntry) {
    throw new Error('Log entry not found');
  }

  const serviceName =
    (logEntry.service?.name || logEntry.resource?.attributes['service.name']);

  const serviceEnvironment =
  (logEntry.service?.environment || logEntry.resource?.attributes['service.environment']) ||
    ENVIRONMENT_ALL_VALUE;

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

    const [serviceSummary, downstreamDependencies] = await Promise.allSettled([
      dataRegistry.getData('apmServiceSummary', {
        request,
        serviceName,
        serviceEnvironment,
        start,
        end,
      }),
      dataRegistry.getData('apmDownstreamDependencies', {
        request,
        serviceName,
        serviceEnvironment,
        start,
        end,
      }),
    ]);
    if (serviceSummary.status === 'fulfilled' && serviceSummary.value) {
      context += dedent(`
        <ServiceSummary>
        Time window: ${start} to ${end}
        \`\`\`json
        ${safeJsonStringify(serviceSummary.value)}
        \`\`\`
        </ServiceSummary>
      `);
    }

    if (downstreamDependencies.status === 'fulfilled' && downstreamDependencies.value) {
      context += dedent(`
        <DownstreamDependencies>
        Time window: ${start} to ${end}
        These are the services, databases, and external APIs that this service calls.
        Check if these downstream services are healthy.
        \`\`\`json
        ${safeJsonStringify(downstreamDependencies.value)}
        \`\`\`
        </DownstreamDependencies>
      `);
    }
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
