/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import { usesDecisionTrees } from '../agents/agent_policy';
import { isInvestigationRoundKind } from '../client/round_kind';
import {
  extractAccessedTreeIdsFromRounds,
  type InvestigationToolCall,
} from '../decision_trees/accessed_trees';
import { prepareReinforcementTurn } from '../decision_trees/register_decision_trees';
import { withToolResults } from '../investigation_round';
import { toolCallsSchema, toolResultsSchema } from './tool_calls_schema';

export const decisionTreePrepareStepDefinition = ({
  getTelemetryConnectorId,
  getAgentBuilder,
  logger,
  isEnabled,
}: {
  getTelemetryConnectorId: (
    request: KibanaRequest,
    conversationId?: string
  ) => string | undefined | Promise<string | undefined>;
  getAgentBuilder: () => AgentBuilderPluginStart | undefined;
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
      round_kind: z
        .string()
        .max(64)
        .optional()
        .describe(
          'The kind of round (initial, follow_up, or alert_recovery), labelled when it started.'
        ),
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
    }),
    outputSchema: z.object({
      message: z.string().describe('Message to hand the reinforcement agent.'),
      tree_count: z.number().describe('Number of decision trees the agent may edit.'),
      turn_kind: z
        .enum(['initial_investigation', 'feedback_reinforcement'])
        .describe('Whether this round seeds the trees or follows up on them.'),
      skipped: z.boolean().describe('True when this round is not eligible for reinforcement.'),
    }),
    handler: async (context) => {
      const {
        conversation_id: conversationId,
        round_id: roundId,
        round_kind: roundKind,
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

      // Liquid renders an absent input as ''. Guessing a first round could seed a stray tree, and
      // guessing a follow-up would never seed one.
      if (!conversationId) {
        throw new Error('Decision tree reinforcement needs the conversation of the round');
      }
      if (!isInvestigationRoundKind(roundKind)) {
        throw new Error(
          `Round "${roundId}" of "${conversationId}" has no round kind, so there is no telling a first round from a follow-up. The before-agent workflow labels each round as it starts; see its logs.`
        );
      }
      const request = context.contextManager.getFakeRequest();

      let earlierAccessedTreeIds: string[] = [];
      if (roundKind !== 'initial') {
        const agentBuilder = getAgentBuilder();
        if (!agentBuilder) {
          throw new Error('Agent Builder is not available, so the investigation cannot be read');
        }
        const conversations = await agentBuilder.conversations.getScopedClient({ request });
        const { rounds } = await conversations.get(conversationId);
        earlierAccessedTreeIds = extractAccessedTreeIdsFromRounds(rounds, roundId || undefined);
      }

      const telemetryConnectorId = await getTelemetryConnectorId(request, conversationId);
      const { spaceId } = context.contextManager.getContext().workflow;
      const turn = await prepareReinforcementTurn({
        roundKind,
        investigationId: conversationId,
        earlierAccessedTreeIds,
        connectorNames: telemetryConnectorId ? [telemetryConnectorId] : [],
        esClient: context.contextManager.getScopedEsClient(),
        logger,
        spaceId,
        toolCalls: withToolResults((toolCalls ?? []) as InvestigationToolCall[], toolResults ?? []),
      });
      if (turn.skipped) {
        return skippedOutput;
      }

      return {
        output: {
          message: turn.message,
          tree_count: turn.treeCount,
          turn_kind: turn.turnKind,
          skipped: false,
        },
      };
    },
  });
