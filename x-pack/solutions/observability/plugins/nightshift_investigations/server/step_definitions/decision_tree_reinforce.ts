/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import { MAX_KEYWORD_LENGTH } from '../../common';
import { NIGHTSHIFT_DECISION_TREE_REINFORCEMENT_AGENT_ID } from '../agents/decision_tree_reinforcement';
import type { InvestigationToolCall } from '../decision_trees/accessed_trees';
import {
  buildInvestigationConversation,
  buildInvestigationRound,
} from '../decision_trees/investigation_round';
import { DECISION_TREE_LEARNING_TOOL_IDS } from '../tools/decision_tree';
import { withToolResults } from './cortex_optimize';
import { toolCallsSchema, toolResultsSchema } from './tool_calls_schema';
import { withTimeout } from './with_timeout';

const MAX_INPUT_CHARS = 100_000;
const REINFORCE_TIMEOUT_MS = 900_000;

export const decisionTreeReinforceStepDefinition = ({
  getAgentBuilder,
}: {
  getAgentBuilder: () => AgentBuilderPluginStart | undefined;
}) =>
  createServerStepDefinition({
    id: 'nightshift.decisionTreeReinforce',
    label: 'Run Decision Tree Reinforcement',
    category: StepCategory.Ai,
    description:
      "Runs the reinforcement agent with the investigator's round as conversation history (its " +
      'tool calls and their results as real tool messages), followed by the prepared turn message.',
    inputSchema: z.object({
      prompt: z.string().max(MAX_INPUT_CHARS).describe('The user message that started the round.'),
      response: z
        .string()
        .max(MAX_INPUT_CHARS)
        .describe("The investigator's final response for the round."),
      round_id: z
        .string()
        .max(1024)
        .optional()
        .describe("Id of the investigator's round, reused for the rebuilt history round."),
      message: z
        .string()
        .max(MAX_INPUT_CHARS)
        .describe('Turn message from nightshift.decisionTreePrepare.'),
      turn_kind: z
        .enum(['initial_investigation', 'feedback_reinforcement'])
        .describe('Turn kind from nightshift.decisionTreePrepare. Picks the tool set.'),
      connector_id: z
        .string()
        .max(MAX_KEYWORD_LENGTH)
        .optional()
        .describe('Inference connector for the reinforcement run.'),
      tool_calls: toolCallsSchema.describe('Investigator tool calls from this round.'),
      tool_results: toolResultsSchema.describe(
        'Results of the investigator tool calls, keyed by tool_call_id.'
      ),
    }),
    outputSchema: z.object({
      message: z.string().describe("The reinforcement agent's final response."),
    }),
    handler: async (context) => {
      const agentBuilder = getAgentBuilder();
      if (!agentBuilder) {
        throw new Error('Agent Builder is not available');
      }

      const {
        prompt,
        response,
        round_id: roundId,
        message,
        turn_kind: turnKind,
        connector_id: connectorId,
        tool_calls: toolCalls,
        tool_results: toolResults,
      } = context.input;
      const now = new Date().toISOString();
      const round = buildInvestigationRound({
        // Liquid renders an absent input as '', so empty strings count as unset.
        roundId: roundId || uuidv4(),
        prompt,
        response,
        toolCalls: withToolResults((toolCalls ?? []) as InvestigationToolCall[], toolResults ?? []),
        startedAt: now,
      });
      // A fresh id per run: the beforeAgent hydrate namespaces the sandbox by conversation id.
      const conversation = buildInvestigationConversation({
        conversationId: uuidv4(),
        agentId: NIGHTSHIFT_DECISION_TREE_REINFORCEMENT_AGENT_ID,
        round,
        now,
      });
      // Matches Deductive: an initial investigation only edits files; learnings need a follow-up.
      const configurationOverrides =
        turnKind === 'feedback_reinforcement'
          ? { tools: [{ tool_ids: [...DECISION_TREE_LEARNING_TOOL_IDS] }] }
          : undefined;

      const { result } = await withTimeout(
        (signal) =>
          agentBuilder.agents.runAgent({
            request: context.contextManager.getFakeRequest(),
            agentId: NIGHTSHIFT_DECISION_TREE_REINFORCEMENT_AGENT_ID,
            interactive: { enabled: false },
            defaultConnectorId: connectorId || undefined,
            abortSignal: signal,
            telemetryMetadata: {
              pluginId: 'nightshift_investigation_memory',
              aggregateBy: 'nightshift',
              productSolution: 'observability',
              productFeature: 'nightshift',
              interactionId: context.contextManager.getContext().execution.id,
            },
            agentParams: {
              conversation,
              nextInput: { message },
              ...(configurationOverrides ? { configurationOverrides } : {}),
            },
          }),
        REINFORCE_TIMEOUT_MS,
        `Decision tree reinforcement timed out after ${REINFORCE_TIMEOUT_MS}ms`,
        context.abortSignal
      );

      return { output: { message: result.round.response.message } };
    },
  });
