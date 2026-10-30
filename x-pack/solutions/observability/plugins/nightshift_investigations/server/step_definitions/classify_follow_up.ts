/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import type { KibanaRequest } from '@kbn/core/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import { MAX_KEYWORD_LENGTH } from '../../common';
import { usesDecisionTrees } from '../agents/agent_policy';
import { INVESTIGATION_ROUND_KINDS, isInvestigationRoundKind } from '../client/round_kind';
import type { InvestigationToolCall } from '../decision_trees/accessed_trees';
import { investigationRoundInputsSchema, withToolResults } from '../investigation_round';
import {
  NO_VERDICT,
  ROUND_VERDICT_SOURCES,
  buildCausalCheckTranscript,
  classifyRound,
  type RoundVerdict,
} from '../round_verdict';
import type { RunCausalCheck } from '../round_verdict/causal_check';
import { withTimeout } from './with_timeout';

/** Matches Deductive's causal check, which gives the call 90s. */
const CAUSAL_CHECK_TIMEOUT_MS = 90_000;

export type CreateCausalCheck = (options: {
  request: KibanaRequest;
  requestedConnectorId?: string;
  roundConnectorId?: string;
  interactionId: string;
  signal: AbortSignal;
}) => Promise<RunCausalCheck | undefined>;

const toOutput = (
  verdict: RoundVerdict,
  roundKind?: (typeof INVESTIGATION_ROUND_KINDS)[number]
) => ({
  output: {
    ...(roundKind ? { round_kind: roundKind } : {}),
    is_feedback: verdict.isFeedback,
    causal_confirmed: verdict.causalConfirmed,
    causal_summary: verdict.causalSummary,
    learning: verdict.learning,
    source: verdict.source,
  },
});

/**
 * Works out what a completed investigation round says about the investigation's earlier
 * conclusion, so the learners can tell a proven root cause from chatter. A recovery round's
 * recorded outcome is read as is; any other follow-up gets one LLM causal check. Anything that
 * cannot be read counts as no verdict, never as a confirmation.
 */
export const classifyFollowUpStepDefinition = ({
  getAgentBuilder,
  createCausalCheck,
  isEnabled,
}: {
  getAgentBuilder: () => AgentBuilderPluginStart | undefined;
  createCausalCheck: CreateCausalCheck;
  isEnabled?: () => boolean;
}) =>
  createServerStepDefinition({
    id: 'nightshift.classifyFollowUp',
    label: 'Classify Nightshift Follow-up',
    category: StepCategory.Ai,
    description:
      'Decides whether a completed investigation round confirmed, contradicted, or said nothing ' +
      'about the earlier root cause: from the recovery outcome the agent recorded, or, for other ' +
      'follow-ups, from one LLM causal check.',
    inputSchema: z.object({
      ...investigationRoundInputsSchema,
      agent_id: z.string().max(1024).optional().describe('Agent id that produced the round.'),
      round_kind: z
        .string()
        .max(64)
        .optional()
        .describe('The kind of round (initial, follow_up, or alert_recovery).'),
      connector_id: z
        .string()
        .max(MAX_KEYWORD_LENGTH)
        .optional()
        .describe('Strict model override for a direct run.'),
      round_connector_id: z
        .string()
        .max(MAX_KEYWORD_LENGTH)
        .optional()
        .describe('Inference connector the triggering agent used for this round.'),
    }),
    outputSchema: z.object({
      round_kind: z
        .enum(INVESTIGATION_ROUND_KINDS)
        .optional()
        .describe('The kind of round. Absent for rounds that are not part of an investigation.'),
      is_feedback: z.boolean().describe('The round speaks to the earlier root cause.'),
      causal_confirmed: z.boolean().describe('The round proved the root cause.'),
      causal_summary: z.string().describe('What was confirmed or what was wrong.'),
      learning: z.string().describe('What a human taught the investigator.'),
      source: z.enum(ROUND_VERDICT_SOURCES).describe('Where the verdict came from.'),
    }),
    handler: async (context) => {
      const {
        agent_id: agentId,
        round_kind: roundKind,
        conversation_id: conversationId,
        round_id: roundId,
        prompt,
        response,
        tool_calls: toolCalls,
        tool_results: toolResults,
        connector_id: requestedConnectorId,
        round_connector_id: roundConnectorId,
      } = context.input;

      if ((isEnabled && !isEnabled()) || !usesDecisionTrees(agentId)) {
        return toOutput(NO_VERDICT);
      }
      // prepare_turn fails the run on a missing kind. Cortex and Memory run first and must not
      // fail with it, so here it only means no verdict.
      if (!isInvestigationRoundKind(roundKind)) {
        context.logger.warn(
          `Round "${roundId}" of "${conversationId}" has no round kind, so it has no verdict`
        );
        return toOutput(NO_VERDICT);
      }

      const roundToolCalls = withToolResults(
        (toolCalls ?? []) as InvestigationToolCall[],
        toolResults ?? []
      );
      const request = context.contextManager.getFakeRequest();
      const runCausalCheck = async () => {
        const agentBuilder = getAgentBuilder();
        if (!agentBuilder || !conversationId) {
          throw new Error('The investigation cannot be read');
        }
        return withTimeout(
          async (signal) => {
            const check = await createCausalCheck({
              request,
              requestedConnectorId: requestedConnectorId || undefined,
              roundConnectorId: roundConnectorId || undefined,
              interactionId: context.contextManager.getContext().execution.id,
              signal,
            });
            if (!check) {
              throw new Error('No model is available for the causal check');
            }
            const conversations = await agentBuilder.conversations.getScopedClient({ request });
            const { rounds } = await conversations.get(conversationId);
            return check(
              buildCausalCheckTranscript({
                // The hook can run before the round is saved, so this round comes from its inputs.
                earlierRounds: rounds.filter((round) => round.id !== roundId),
                prompt,
                response,
                toolCalls: roundToolCalls,
              })
            );
          },
          CAUSAL_CHECK_TIMEOUT_MS,
          `Causal check timed out after ${CAUSAL_CHECK_TIMEOUT_MS}ms`,
          context.abortSignal
        );
      };

      try {
        const verdict = await classifyRound({
          roundKind,
          toolCalls: roundToolCalls,
          runCausalCheck,
        });
        context.logger.info(
          `Round "${roundId}" (${roundKind}) verdict: feedback=${verdict.isFeedback} confirmed=${verdict.causalConfirmed} source=${verdict.source}`
        );
        return toOutput(verdict, roundKind);
      } catch (error) {
        // A lost verdict leaves the learners where they were before verdicts existed: extending
        // the tree without claiming a cause. Failing here would also stop Cortex and Memory.
        context.logger.warn(
          `Round "${roundId}" of "${conversationId}" has no verdict: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
        return toOutput(NO_VERDICT, roundKind);
      }
    },
  });
