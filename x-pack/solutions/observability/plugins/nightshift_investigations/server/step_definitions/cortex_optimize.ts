/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import type { AnalyticsServiceSetup, CoreStart, Logger } from '@kbn/core/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { MAX_KEYWORD_LENGTH } from '../../common';
import { runCortexOptimize } from '../cortex/register_cortex';
import { withTimeout } from './with_timeout';

const MAX_ROUND_TEXT_LENGTH = 65_536;

/**
 * Bounds the post-round optimizer. It runs non-blocking, so a stall does not hold up an
 * investigation, but it should not leave a task hanging on a stuck inference call either.
 */
const OPTIMIZE_TIMEOUT_MS = 120_000;

export const cortexOptimizeStepDefinition = ({
  getInference,
  getSavedObjects,
  getUiSettings,
  analytics,
  logger,
}: {
  getInference: () => InferenceServerStart | undefined;
  getSavedObjects: () => CoreStart['savedObjects'] | undefined;
  getUiSettings: () => CoreStart['uiSettings'] | undefined;
  analytics: AnalyticsServiceSetup;
  logger: Logger;
}) =>
  createServerStepDefinition({
    id: 'nightshift.cortexOptimize',
    label: 'Optimize Nightshift Cortex',
    category: StepCategory.Ai,
    description:
      'Proposes Cortex wiki edits from a completed investigation round and writes them ' +
      'to the Context Engine AI index.',
    inputSchema: z.object({
      prompt: z
        .string()
        .max(MAX_ROUND_TEXT_LENGTH)
        .describe('The user message that started the round.'),
      response: z
        .string()
        .max(MAX_ROUND_TEXT_LENGTH)
        .describe("The assistant's final response for the round."),
      agent_id: z.string().max(1024).optional().describe('Agent id that produced the round.'),
      conversation_id: z
        .string()
        .max(1024)
        .optional()
        .describe('Conversation the round belongs to. Recorded on the edit telemetry events.'),
      round_id: z
        .string()
        .max(1024)
        .optional()
        .describe('Id of the completed round. Recorded on the edit telemetry events.'),
      connector_id: z.string().max(MAX_KEYWORD_LENGTH).optional(),
      round_connector_id: z.string().max(MAX_KEYWORD_LENGTH).optional(),
    }),
    outputSchema: z.object({
      status: z.literal('ok').describe('The optimizer finished without throwing.'),
    }),
    handler: async (context) => {
      const { workflow, execution } = context.contextManager.getContext();
      await withTimeout(
        (signal) =>
          runCortexOptimize({
            request: context.contextManager.getFakeRequest(),
            agentId: context.input.agent_id,
            userMessage: context.input.prompt,
            assistantMessage: context.input.response,
            esClient: context.contextManager.getScopedEsClient(),
            spaceId: workflow.spaceId,
            interactionId: execution.id,
            signal,
            analytics,
            conversationId: context.input.conversation_id,
            roundId: context.input.round_id,
            requestedConnectorId: context.input.connector_id,
            roundConnectorId: context.input.round_connector_id,
            logger,
            getInference,
            getSavedObjects,
            getUiSettings,
          }),
        OPTIMIZE_TIMEOUT_MS,
        `Cortex optimize timed out after ${OPTIMIZE_TIMEOUT_MS}ms`
      );

      return { output: { status: 'ok' as const } };
    },
  });
