/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { ConversationRoundStep } from '@kbn/agent-builder-common';
import { INVESTIGATION_TEMPLATE_ID } from '@kbn/agentic-investigations-plugin/common';
import type { Message } from '@kbn/inference-common';
import { createOptimizeModel } from '../lib/create_optimize_model';
import { createInvestigationUsageTelemetry } from '../lib/investigation_usage_telemetry';
import {
  STRUCTURED_OUTPUT_TOOL,
  buildRecorderMessages,
  toolNamesToDefine,
} from '../findings_recorder/messages';
import { readConversation, type FindingsPassDeps } from '../findings_recorder/run_pass';
import { DUE_DILIGENCE_INSTRUCTION, DUE_DILIGENCE_SYSTEM_PROMPT } from './prompt';
import {
  DUE_DILIGENCE_JSON_SCHEMA,
  dueDiligenceOutputSchema,
  selectReviewedHypotheses,
  type ReviewedHypothesis,
} from './output_schema';

/** The reviewer needs the same plugins and model resolution as the recorder, and nothing else. */
export type DueDiligenceDeps = Pick<
  FindingsPassDeps,
  'getAgentBuilder' | 'getInference' | 'getSavedObjects' | 'getUiSettings' | 'logger'
>;

export interface DueDiligenceParams {
  request: KibanaRequest;
  conversationId: string;
  steps: readonly ConversationRoundStep[];
  /** The human message that started the investigation. */
  question?: string;
  /** The connector the investigation runs on, so the reviewer uses the same model. */
  connectorId?: string;
  signal: AbortSignal;
}

interface ModelCall {
  function: { name: string; arguments: unknown };
}

/**
 * Asks a model to review the hypotheses the agent holds at the confidence bar. One forced call, no
 * retry: the agent waits for it, so a failure or an abort returns nothing and the agent carries on.
 */
export const runDueDiligence = async (
  deps: DueDiligenceDeps,
  { request, conversationId, steps, question, connectorId, signal }: DueDiligenceParams
): Promise<ReviewedHypothesis[]> => {
  const { logger } = deps;
  const agentBuilder = deps.getAgentBuilder();
  if (!agentBuilder) return [];

  try {
    const conversation = await readConversation(agentBuilder, request, conversationId);
    if (conversation.template_id !== INVESTIGATION_TEMPLATE_ID) return [];

    const model = await createOptimizeModel({
      request,
      roundConnectorId: connectorId,
      agentBuilder,
      inference: deps.getInference(),
      savedObjects: deps.getSavedObjects(),
      uiSettings: deps.getUiSettings(),
      telemetryMetadata: createInvestigationUsageTelemetry(conversationId),
      logger,
    });
    if (!model || signal.aborted) return [];

    const messages: Message[] = buildRecorderMessages({
      question,
      steps,
      turns: [],
      final: false,
      instruction: DUE_DILIGENCE_INSTRUCTION,
    });
    // The agent's tool calls are replayed as they happened, so each needs a definition for the
    // provider to accept them. The reviewer never calls them: only the answer tool is forced.
    const replayed = Object.fromEntries(
      toolNamesToDefine(messages).map((name) => [
        name,
        {
          description: 'Called earlier in this conversation.',
          schema: { type: 'object', properties: {} },
        },
      ])
    );
    const response = (await model.inferenceClient.chatComplete({
      system: DUE_DILIGENCE_SYSTEM_PROMPT,
      messages,
      tools: {
        ...replayed,
        [STRUCTURED_OUTPUT_TOOL]: {
          description:
            'Record your review of the hypotheses the agent currently treats as likely, with the confidence the evidence supports.',
          schema: DUE_DILIGENCE_JSON_SCHEMA,
        },
      } as never,
      toolChoice: { function: STRUCTURED_OUTPUT_TOOL } as never,
      sessionId: conversationId,
      abortSignal: signal,
    })) as unknown as { toolCalls?: ModelCall[] };

    const call = response.toolCalls?.find((c) => c.function.name === STRUCTURED_OUTPUT_TOOL);
    const parsed = dueDiligenceOutputSchema.safeParse(call?.function.arguments);
    if (!parsed.success) {
      logger.warn(
        `Due-diligence review returned an invalid answer for ${conversationId}: ${parsed.error.message}`
      );
      return [];
    }
    return selectReviewedHypotheses(parsed.data);
  } catch (error) {
    if (!signal.aborted) {
      logger.warn(
        `Due-diligence review failed for ${conversationId}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
    return [];
  }
};
