/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { KbnClient } from '@kbn/kbn-client';
import { MessageRole, type ChatCompleteResponse } from '@kbn/inference-common';
import { SystemMessage, type BaseMessage } from '@langchain/core/messages';
import { JsonOutputParser } from '@langchain/core/output_parsers';
import { TELEMETRY_SIEM_MIGRATION_ID } from '../../../server/lib/siem_migrations/common/task/util/constants';

/** Same chat model options as the graph (common/task/util/actions_client_chat.ts). */
const LLM_TEMPERATURE = 0.05;
const LLM_MAX_RETRIES = 1;
const LLM_TELEMETRY_PLUGIN_ID = `${TELEMETRY_SIEM_MIGRATION_ID}_rules`;
/** Overrides the script ES client's 30s default for decision model calls. */
const LLM_REQUEST_TIMEOUT_MS = 5 * 60 * 1000;

const jsonParser = new JsonOutputParser<Record<string, unknown>>();

/**
 * Calls a connector through Kibana's inference service (`POST /internal/inference/chat_complete`),
 * the same service the graph's chat model uses, and parses its JSON answer the way the nodes do.
 * Like the graph's LangChain model, system messages become `system` and the rest user messages.
 */
export const chatCompleteJson = async <T extends Record<string, unknown>>(
  kbnClient: KbnClient,
  connectorId: string,
  messages: BaseMessage[]
): Promise<{ answer: T; latencyMs: number }> => {
  const system = messages
    .filter((message) => SystemMessage.isInstance(message))
    .map((message) => String(message.content))
    .join('\n');
  const startedAt = Date.now();
  const { data } = await kbnClient.request<ChatCompleteResponse>({
    method: 'POST',
    path: '/internal/inference/chat_complete',
    body: {
      connectorId,
      system: system || undefined,
      messages: messages
        .filter((message) => !SystemMessage.isInstance(message))
        .map((message) => ({ role: MessageRole.User, content: String(message.content) })),
      temperature: LLM_TEMPERATURE,
      maxRetries: LLM_MAX_RETRIES,
      metadata: { connectorTelemetry: { pluginId: LLM_TELEMETRY_PLUGIN_ID } },
    },
  });
  const answer = (await jsonParser.parse(data.content)) as T;
  return { answer, latencyMs: Date.now() - startedAt };
};

export interface DecisionModelAnswer {
  inferenceId: string;
  choice: string;
  confidence: number;
  probabilities: Record<string, number>;
  latencyMs: number;
}

/** The first `decision` endpoint the cluster lists, as #303573's `decide()` resolves it. */
export const resolveDecisionInferenceId = async (esClient: Client): Promise<string> => {
  const { endpoints = [] } = await esClient.transport.request<{
    endpoints?: Array<{ inference_id: string }>;
  }>({ method: 'GET', path: '/_inference/decision/_all' });
  if (!endpoints[0]) {
    throw new Error('No decision inference endpoint on the cluster');
  }
  return endpoints[0].inference_id;
};

/** Asks one `choice` question, with the request and response shapes of #303573's `decide()`. */
export const decideChoice = async (
  esClient: Client,
  inferenceId: string,
  question: { input: string; instructions: string; choices: Record<string, string> }
): Promise<DecisionModelAnswer> => {
  const startedAt = Date.now();
  const response = await esClient.transport.request<{
    decision?: { answers?: Record<string, Record<string, unknown>> };
  }>(
    {
      method: 'POST',
      path: `/_inference/decision/${encodeURIComponent(inferenceId)}`,
      body: {
        input: question.input,
        task_settings: {
          questions: {
            question_1: {
              type: 'choice',
              instructions: question.instructions,
              choices: question.choices,
            },
          },
        },
      },
    },
    { requestTimeout: LLM_REQUEST_TIMEOUT_MS }
  );
  const latencyMs = Date.now() - startedAt;

  const answer = response.decision?.answers?.question_1;
  if (answer?.type !== 'choice' || typeof answer.choice !== 'string') {
    throw new Error(`Malformed decision response: ${JSON.stringify(response)}`);
  }
  const rawProbabilities = Array.isArray(answer.probabilities) ? answer.probabilities : [];
  return {
    inferenceId,
    choice: answer.choice,
    confidence: Number(answer.confidence),
    probabilities: Object.fromEntries(
      rawProbabilities.map((entry: { value: string; probability: number }) => [
        entry.value,
        entry.probability,
      ])
    ),
    latencyMs,
  };
};
