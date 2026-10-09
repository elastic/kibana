/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazySchema, z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import type { Logger } from '@kbn/core/server';
import { NIGHTSHIFT_INVESTIGATION_AGENT_ID } from '../agents/investigation';
import type { InvestigationToolCall } from '../decision_trees/accessed_trees';
import { prepareReinforcementTurn } from '../decision_trees/register_decision_trees';
import { toolCallsSchema } from './tool_calls_schema';

const MAX_INPUT_CHARS = 100_000;

export const decisionTreePrepareStepDefinition = ({
  getTelemetryConnectorId,
  logger,
  isEnabled,
}: {
  getTelemetryConnectorId: () => string | undefined;
  logger: Logger;
  isEnabled?: () => boolean;
}) =>
  createServerStepDefinition({
    id: 'nightshift.decisionTreePrepare',
    label: 'Prepare Decision Tree Reinforcement Turn',
    category: StepCategory.Ai,
    description:
      'Builds the closing reinforcement message for a completed investigation round: the decision ' +
      'trees available to edit, the learnings already on file, and the turn script.',
    inputSchema: lazySchema(() =>
      z.object({
        response: z
          .string()
          .max(MAX_INPUT_CHARS)
          .describe("The investigator's final response for the round."),
        agent_id: z
          .string()
          .max(1024)
          .optional()
          .describe('Agent id that produced the round. Rounds from other agents are skipped.'),
        tool_calls: toolCallsSchema.describe(
          'Investigator tool calls from this round. Used to see which decision-tree files were read.'
        ),
      })
    ),
    outputSchema: lazySchema(() =>
      z.object({
        message: z.string().describe('Message to hand the reinforcement agent.'),
        tree_count: z.number().describe('Number of decision trees the agent may edit.'),
        turn_kind: z
          .enum(['initial_investigation', 'feedback_reinforcement'])
          .describe('Whether this round seeds the trees or follows up on them.'),
        skipped: z.boolean().describe('True when this round is not eligible for reinforcement.'),
      })
    ),
    handler: async (context) => {
      const { response, agent_id: agentId, tool_calls: toolCalls } = context.input;
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
      if (agentId !== NIGHTSHIFT_INVESTIGATION_AGENT_ID) {
        return skippedOutput;
      }

      const telemetryConnectorId = getTelemetryConnectorId();
      const { spaceId } = context.contextManager.getContext().workflow;
      const { message, treeCount, turnKind } = await prepareReinforcementTurn({
        response,
        connectorNames: telemetryConnectorId ? [telemetryConnectorId] : [],
        esClient: context.contextManager.getScopedEsClient(),
        logger,
        spaceId,
        toolCalls: (toolCalls ?? []) as InvestigationToolCall[],
      });

      return {
        output: { message, tree_count: treeCount, turn_kind: turnKind, skipped: false },
      };
    },
  });
