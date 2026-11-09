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
import { usesDecisionTrees } from '../agents/agent_policy';
import {
  extractAccessedTreeIdsFromRounds,
  roundsBefore,
  type InvestigationToolCall,
} from '../decision_trees/accessed_trees';
import { prepareReinforcementTurn } from '../decision_trees/register_decision_trees';
import { withToolResults } from '../investigation_round';
import { withNightshiftBackgroundSpan } from '../tracing';
import { toolCallsSchema, toolResultsSchema } from './tool_calls_schema';

export const decisionTreePrepareStepDefinition = ({
  getAgentBuilder,
  getSavedObjects,
  getUiSettings,
  logger,
  isEnabled,
}: {
  getAgentBuilder: () => AgentBuilderPluginStart | undefined;
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
      'round only edits the trees of its own investigation, and is skipped when there are none.',
    inputSchema: z.object({
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
    }),
    handler: async (context) => {
      const {
        conversation_id: conversationId,
        round_id: roundId,
        agent_id: agentId,
        tool_calls: toolCalls,
        tool_results: toolResults,
      } = context.input;
      const skippedOutput = {
        output: {
          message: '',
          tree_count: 0,
          turn_kind: 'initial_investigation' as const,
          skipped: true,
        },
      };

      // The combined optimize workflow installs with Cortex or Memory, so this step runs even
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
      const rounds = await conversations.get(conversationId).then(
        (conversation) => conversation.rounds,
        (error) => {
          if (isConversationNotFoundError(error)) {
            return [];
          }
          throw error;
        }
      );
      const earlierRounds = roundsBefore(rounds, roundId);

      const workflowContext = context.contextManager.getContext();
      const { spaceId } = workflowContext.workflow;
      const executionId = workflowContext.execution?.id;
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
            toolCalls: withToolResults(
              (toolCalls ?? []) as InvestigationToolCall[],
              toolResults ?? []
            ),
          });
          if (res.skipped) {
            span?.setAttribute('nightshift.skipped', true);
            return res;
          }
          span?.setAttribute('nightshift.tree_count', res.treeCount);
          span?.setAttribute('nightshift.turn_kind', res.turnKind);
          span?.setAttribute('nightshift.opened_tree_ids', JSON.stringify(res.openedTreeIds));
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
        },
      };
    },
  });
