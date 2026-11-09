/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import type { CoreStart, Logger } from '@kbn/core/server';
import { isConversationNotFoundError } from '@kbn/agent-builder-common';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { MAX_KEYWORD_LENGTH } from '../../common';
import { usesDecisionTrees } from '../agents/agent_policy';
import {
  extractAccessedTreeIdsFromRounds,
  roundsBefore,
  type InvestigationToolCall,
} from '../decision_trees/accessed_trees';
import {
  NO_CAUSAL_VERDICT,
  buildCausalCheckTranscript,
  createLlmCausalCheck,
  type CausalCheckResult,
} from '../decision_trees/causal_check';
import { prepareReinforcementTurn } from '../decision_trees/register_decision_trees';
import {
  createInvestigationMemoryTelemetry,
  createOptimizeModel,
} from '../lib/create_optimize_model';
import { investigationRoundInputsSchema, withToolResults } from '../investigation_round';
import { withNightshiftBackgroundSpan } from '../tracing';
import { toolCallsSchema, toolResultsSchema } from './tool_calls_schema';
import { withTimeout } from './with_timeout';

/** Matches Deductive's causal check, which gives the call 90s. */
const CAUSAL_CHECK_TIMEOUT_MS = 90_000;

export const decisionTreePrepareStepDefinition = ({
  getAgentBuilder,
  getInference,
  getSavedObjects,
  getUiSettings,
  logger,
  isEnabled,
}: {
  getAgentBuilder: () => AgentBuilderPluginStart | undefined;
  getInference?: () => InferenceServerStart | undefined;
  getSavedObjects?: () => CoreStart['savedObjects'] | undefined;
  getUiSettings?: () => CoreStart['uiSettings'] | undefined;
  logger: Logger;
  isEnabled?: () => boolean;
}) =>
  createServerStepDefinition({
    id: 'nightshift.decisionTreePrepare',
    label: 'Prepare Decision Tree Reinforcement Turn',
    category: StepCategory.Ai,
    description:
      'Builds the closing reinforcement message for a completed investigation round: the decision ' +
      'trees available to edit, the learnings already on file, and the turn script. A follow-up ' +
      'round only edits the trees of its own investigation, and is skipped when there are none. ' +
      'A follow-up that has trees gets one LLM causal check: only a cause the investigation data ' +
      'shows reinforces a path.',
    inputSchema: z.object({
      prompt: investigationRoundInputsSchema.prompt.optional(),
      response: investigationRoundInputsSchema.response.optional(),
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
      conversation_id: z
        .string()
        .max(512)
        .optional()
        .describe('The investigation (conversation) the round belongs to.'),
      round_id: z.string().max(1024).optional().describe('The completed round.'),
      agent_id: z
        .string()
        .max(1024)
        .optional()
        .describe('Agent id that produced the round. Rounds from other agents are skipped.'),
      tool_calls: toolCallsSchema.describe(
        'Investigator tool calls from this round. Used to see which decision-tree files were read.'
      ),
      tool_results: toolResultsSchema.describe(
        'Results of the investigator tool calls, keyed by tool_call_id.'
      ),
      background_trace_id: z
        .string()
        .max(128)
        .optional()
        .describe('Deterministic T_background trace id from materialize.'),
    }),
    outputSchema: z.object({
      message: z.string().describe('Message to hand the reinforcement agent.'),
      tree_count: z.number().describe('Number of decision trees the agent may edit.'),
      opened_ids: z
        .array(z.string())
        .optional()
        .describe('Canonical symptom:<slug> tree ids opened by the investigator this round.'),
      turn_kind: z
        .enum(['initial_investigation', 'feedback_reinforcement'])
        .describe('Whether this round seeds the trees or follows up on them.'),
      skipped: z.boolean().describe('True when this round is not eligible for reinforcement.'),
      causal_check: z
        .object({
          is_feedback: z.boolean().describe('The human message speaks to the root cause.'),
          causal_confirmed: z
            .boolean()
            .describe('The investigation data shows the cause the message states.'),
          causal_summary: z.string().describe('What was confirmed, or which evidence is missing.'),
          learning: z.string().describe('What the human taught the investigator.'),
        })
        .optional()
        .describe('For a follow-up with trees to edit: what its causal check found.'),
    }),
    handler: async (context) => {
      const {
        conversation_id: conversationId,
        round_id: roundId,
        agent_id: agentId,
        tool_calls: toolCalls,
        tool_results: toolResults,
        prompt,
        response,
        connector_id: requestedConnectorId,
        round_connector_id: roundConnectorId,
      } = context.input;
      const skippedOutput = {
        output: {
          message: '',
          tree_count: 0,
          turn_kind: 'initial_investigation' as const,
          skipped: true,
        },
      };

      // The combined optimize workflow installs with Wiki or Memory, so this step runs even
      // when the tree feature is off. `skipped` also gates the reinforcement agent steps.
      if (isEnabled && !isEnabled()) {
        context.logger.info('Skipped decision tree prepare (flag off)');
        return skippedOutput;
      }

      // Only the Nightshift investigator's rounds feed the decision trees: this workflow is its
      // post-execution hook, and another agent's round must not rewrite the trees.
      if (!usesDecisionTrees(agentId)) {
        return skippedOutput;
      }

      // Liquid renders an absent input as ''. A workflow definition stored before this step took
      // `round_id` passes none; guessing a first round could seed a stray tree.
      if (!conversationId || !roundId) {
        context.logger.warn(
          'Skipped decision tree reinforcement: without the conversation and round ids there is no telling a first round from a follow-up'
        );
        return skippedOutput;
      }

      const agentBuilder = getAgentBuilder();
      if (!agentBuilder) {
        throw new Error('Agent Builder is not available, so the investigation cannot be read');
      }
      const request = context.contextManager.getFakeRequest();
      const conversations = await agentBuilder.conversations.getScopedClient({ request });
      // A chat's conversation is only saved with its first round, so a missing one has no
      // earlier rounds. Any other failure must not be read as a first round.
      const conversation = await conversations.get(conversationId).catch((error) => {
        if (isConversationNotFoundError(error)) {
          return undefined;
        }
        throw error;
      });
      const rounds = conversation?.rounds ?? [];
      const earlierRounds = roundsBefore(rounds, roundId);
      const roundToolCalls = withToolResults(
        (toolCalls ?? []) as InvestigationToolCall[],
        toolResults ?? []
      );

      const workflowContext = context.contextManager.getContext();
      const { spaceId } = workflowContext.workflow;
      const executionId = workflowContext.execution?.id;

      // A lost verdict leaves the tree where it was before causal checks existed: extended, with
      // no cause claimed. Failing here would also stop the reinforcement run.
      const checkCausal = async (): Promise<CausalCheckResult> => {
        try {
          const verdict = await withTimeout(
            async (signal) => {
              const model = await createOptimizeModel({
                request,
                requestedConnectorId: requestedConnectorId || undefined,
                roundConnectorId: roundConnectorId || undefined,
                agentBuilder,
                inference: getInference?.(),
                savedObjects: getSavedObjects?.(),
                uiSettings: getUiSettings?.(),
                telemetryMetadata: createInvestigationMemoryTelemetry(executionId ?? ''),
                logger,
              });
              if (!model) {
                throw new Error('No model is available for the causal check');
              }
              const startedAt = rounds.find((round) => round.id === roundId)?.started_at;
              return createLlmCausalCheck({ inferenceClient: model.inferenceClient, signal })(
                buildCausalCheckTranscript({
                  earlierRounds,
                  attachments: conversation?.attachments,
                  ...(startedAt ? { latestStartedAt: Date.parse(startedAt) } : {}),
                  // The hook can run before the round is saved, so this round comes from its inputs.
                  prompt: prompt ?? '',
                  response: response ?? '',
                  toolCalls: roundToolCalls,
                })
              );
            },
            CAUSAL_CHECK_TIMEOUT_MS,
            `Causal check timed out after ${CAUSAL_CHECK_TIMEOUT_MS}ms`,
            context.abortSignal
          );
          context.logger.info(
            `Round "${roundId}" of "${conversationId}" causal check: feedback=${verdict.isFeedback} confirmed=${verdict.causalConfirmed}`
          );
          return verdict;
        } catch (error) {
          context.logger.warn(
            `Round "${roundId}" of "${conversationId}" has no causal verdict: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
          return NO_CAUSAL_VERDICT;
        }
      };
      const turn = await withNightshiftBackgroundSpan(
        {
          name: 'nightshift.decisionTreePrepare',
          traceId: context.input.background_trace_id || executionId,
          spaceId,
          workflowExecutionId: executionId,
          request: context.contextManager?.getFakeRequest?.(),
          getSavedObjects,
          getUiSettings,
          logger,
        },
        async (span) => {
          const res = await prepareReinforcementTurn({
            turnKind:
              earlierRounds.length === 0 ? 'initial_investigation' : 'feedback_reinforcement',
            investigationId: conversationId,
            earlierAccessedTreeIds: extractAccessedTreeIdsFromRounds(earlierRounds),
            connectorNames: [],
            esClient: context.contextManager.getScopedEsClient(),
            logger,
            spaceId,
            toolCalls: roundToolCalls,
            checkCausal,
          });
          if (res.skipped) {
            span?.setAttribute('nightshift.skipped', true);
            return res;
          }
          span?.setAttribute('nightshift.tree_count', res.treeCount);
          span?.setAttribute('nightshift.turn_kind', res.turnKind);
          span?.setAttribute('nightshift.opened_tree_ids', JSON.stringify(res.openedTreeIds));
          if (res.verdict) {
            span?.setAttribute('nightshift.causal_check.is_feedback', res.verdict.isFeedback);
            span?.setAttribute('nightshift.causal_check.confirmed', res.verdict.causalConfirmed);
          }
          return res;
        }
      );
      if (turn.skipped) {
        return skippedOutput;
      }

      return {
        output: {
          message: turn.message,
          tree_count: turn.treeCount,
          turn_kind: turn.turnKind,
          skipped: false,
          ...(turn.openedTreeIds.length > 0 ? { opened_ids: turn.openedTreeIds } : {}),
          ...(turn.verdict
            ? {
                causal_check: {
                  is_feedback: turn.verdict.isFeedback,
                  causal_confirmed: turn.verdict.causalConfirmed,
                  causal_summary: turn.verdict.causalSummary,
                  learning: turn.verdict.learning,
                },
              }
            : {}),
        },
      };
    },
  });
