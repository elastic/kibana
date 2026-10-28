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
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { usesDecisionTrees } from '../agents/agent_policy';
import type { InvestigationToolCall } from '../decision_trees/accessed_trees';
import { checkCausalConfirmation } from '../decision_trees/causal_check';
import { prepareReinforcementTurn } from '../decision_trees/register_decision_trees';
import { deriveCausalConfirmed } from '../decision_trees/turn';
import { withToolResults } from '../investigation_round';
import { createOptimizeModel } from '../lib/create_optimize_model';
import { createInvestigationUsageTelemetry } from '../lib/investigation_usage_telemetry';
import { renderMemoryTranscript, stepsFromToolCalls } from '../memory/transcript';
import { toolCallsSchema, toolResultsSchema } from './tool_calls_schema';

const MAX_INPUT_CHARS = 100_000;

/**
 * Whether the round is a follow-up: not the first round of its conversation. When the conversation
 * or the round cannot be read it counts as a first round, so nothing is reinforced as confirmed
 * without a person's follow-up behind it.
 */
const isFollowUpRound = async ({
  agentBuilder,
  request,
  conversationId,
  roundId,
}: {
  agentBuilder?: AgentBuilderPluginStart;
  request: Parameters<AgentBuilderPluginStart['conversations']['getScopedClient']>[0]['request'];
  conversationId?: string;
  roundId?: string;
}): Promise<boolean> => {
  if (!agentBuilder || !conversationId || !roundId) return false;
  try {
    const conversations = await agentBuilder.conversations.getScopedClient({ request });
    const { rounds } = await conversations.get(conversationId);
    return rounds.findIndex(({ id }) => id === roundId) > 0;
  } catch {
    return false;
  }
};

export const decisionTreePrepareStepDefinition = ({
  getTelemetryConnectorId,
  getAgentBuilder,
  getInference,
  getSavedObjects,
  getUiSettings,
  logger,
  isEnabled,
}: {
  getTelemetryConnectorId: () => string | undefined;
  getAgentBuilder?: () => AgentBuilderPluginStart | undefined;
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
      'trees available to edit, the learnings already on file, and the turn script.',
    inputSchema: z.object({
      response: z
        .string()
        .max(MAX_INPUT_CHARS)
        .describe("The investigator's final response for the round."),
      prompt: z
        .string()
        .max(MAX_INPUT_CHARS)
        .optional()
        .describe('The user message that started the round, for the causal check.'),
      agent_id: z
        .string()
        .max(1024)
        .optional()
        .describe('Agent id that produced the round. Rounds from other agents are skipped.'),
      conversation_id: z
        .string()
        .max(1024)
        .optional()
        .describe('Conversation of the round, to tell a first round from a follow-up.'),
      round_id: z.string().max(1024).optional().describe('Id of the completed round.'),
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
        response,
        prompt,
        agent_id: agentId,
        conversation_id: conversationId,
        round_id: roundId,
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

      const telemetryConnectorId = getTelemetryConnectorId();
      const workflowContext = context.contextManager.getContext();
      const { spaceId } = workflowContext.workflow;
      const investigatorToolCalls = (toolCalls ?? []) as InvestigationToolCall[];
      const toolCallsWithResults = withToolResults(investigatorToolCalls, toolResults ?? []);
      const answer = response;

      // Whether a cause was confirmed needs ground truth, and a first round has none: only a
      // person's follow-up on the investigation can confirm or correct its cause. So the causal
      // check runs on follow-up rounds only, and a first round is never reinforced as confirmed.
      let causalConfirmed = false;
      if (
        await isFollowUpRound({
          agentBuilder: getAgentBuilder?.(),
          request: context.contextManager.getFakeRequest(),
          conversationId,
          roundId,
        })
      ) {
        // The check reads the whole round, so a confirmed cause no longer has to appear as a
        // status line in the answer. The text match stays as a floor if the check cannot run.
        causalConfirmed = deriveCausalConfirmed(answer);
        try {
          const model = await createOptimizeModel({
            request: context.contextManager.getFakeRequest(),
            agentBuilder: getAgentBuilder?.(),
            inference: getInference?.(),
            savedObjects: getSavedObjects?.(),
            uiSettings: getUiSettings?.(),
            telemetryMetadata: createInvestigationUsageTelemetry(workflowContext.execution.id),
            logger,
          });
          if (model) {
            const check = await checkCausalConfirmation({
              inferenceClient: model.inferenceClient,
              transcript: renderMemoryTranscript({
                task: prompt ?? '',
                answer,
                // The check needs what each query returned, not only the queries.
                investigation: stepsFromToolCalls(toolCallsWithResults),
                toolCalls: investigatorToolCalls,
              }),
            });
            causalConfirmed = (check?.causalConfirmed ?? false) || causalConfirmed;
          }
        } catch (error) {
          logger.warn(
            `Causal check unavailable, using the text match: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      }

      const { message, treeCount, turnKind } = await prepareReinforcementTurn({
        response: answer,
        causalConfirmed,
        connectorNames: telemetryConnectorId ? [telemetryConnectorId] : [],
        esClient: context.contextManager.getScopedEsClient(),
        logger,
        spaceId,
        toolCalls: toolCallsWithResults,
      });

      return {
        output: { message, tree_count: treeCount, turn_kind: turnKind, skipped: false },
      };
    },
  });
