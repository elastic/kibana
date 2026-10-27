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
import { isToolCallStep } from '@kbn/agent-builder-common';
import type { ConversationRoundStep } from '@kbn/agent-builder-common';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import { MAX_KEYWORD_LENGTH } from '../../common';
import { NIGHTSHIFT_DECISION_TREE_REINFORCEMENT_AGENT_ID } from '../agents/decision_tree_reinforcement';
import type { InvestigationToolCall } from '../decision_trees/accessed_trees';
import {
  buildInvestigationConversation,
  buildInvestigationRound,
} from '../decision_trees/investigation_round';
import { investigationRoundInputsSchema, loadInvestigationRound } from '../investigation_round';
import {
  DECISION_TREE_LEARNING_TOOL_IDS,
  DECISION_TREE_SUBMIT_TOOL_ID,
} from '../tools/decision_tree';

const MAX_INPUT_CHARS = 100_000;
const SUBMIT_ARGUMENTS_JSON_LIMIT = 100_000;

/** The reinforcement round's Agent Builder trace, when tracing recorded one. */
export const agentTraceId = (traceId: string | string[] | undefined): string | undefined => {
  const ids = (typeof traceId === 'string' ? [traceId] : traceId ?? []).filter(
    (id) => id.length > 0
  );
  return ids.at(-1);
};

/** Arguments of each submit call, so a micro-eval can grade them without a persisted conversation. */
export const submitArgumentsJson = (
  steps: readonly ConversationRoundStep[] | undefined
): string => {
  const submissions = (steps ?? [])
    .filter(isToolCallStep)
    .filter((step) => step.tool_id === DECISION_TREE_SUBMIT_TOOL_ID)
    .map((step) => step.params);
  const json = JSON.stringify(submissions);
  if (json.length <= SUBMIT_ARGUMENTS_JSON_LIMIT) return json;
  const last = JSON.stringify(submissions.slice(-1));
  return last.length <= SUBMIT_ARGUMENTS_JSON_LIMIT ? last : '[]';
};

export const decisionTreeReinforceStepDefinition = ({
  getAgentBuilder,
  isEnabled,
}: {
  getAgentBuilder: () => AgentBuilderPluginStart | undefined;
  isEnabled?: () => boolean;
}) =>
  createServerStepDefinition({
    id: 'nightshift.decisionTreeReinforce',
    label: 'Run Decision Tree Reinforcement',
    category: StepCategory.Ai,
    description:
      "Runs the reinforcement agent with the investigator's round as conversation history (its " +
      'tool calls and their results as real tool messages), followed by the prepared turn message.',
    inputSchema: z.object({
      ...investigationRoundInputsSchema,
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
    }),
    outputSchema: z.object({
      message: z.string().describe("The reinforcement agent's final response."),
      skipped: z.boolean().optional(),
      conversation_id: z
        .string()
        .max(MAX_KEYWORD_LENGTH)
        .optional()
        .describe('Conversation that holds this reinforcement run.'),
      trace_id: z
        .string()
        .max(MAX_KEYWORD_LENGTH)
        .optional()
        .describe('Agent Builder trace of this reinforcement run, when tracing recorded one.'),
      submissions_json: z
        .string()
        .describe(
          'JSON array of nightshift_submit_optimizer_result arguments, in call order. Empty when the agent did not submit.'
        ),
    }),
    handler: async (context) => {
      // The combined optimize workflow installs with Cortex or Memory, so this step is registered
      // even when the tree feature is off.
      if (isEnabled && !isEnabled()) {
        context.logger.info('Skipped decision tree reinforcement (flag off)');
        return { output: { message: '', skipped: true, submissions_json: '[]' } };
      }

      const agentBuilder = getAgentBuilder();
      if (!agentBuilder) {
        throw new Error('Agent Builder is not available');
      }

      const {
        prompt,
        response,
        conversation_id: inputConversationId,
        round_id: roundId,
        round_index: roundIndex,
        message,
        turn_kind: turnKind,
        connector_id: connectorId,
        tool_calls: toolCalls,
        tool_results: toolResults,
      } = context.input;
      const request = context.contextManager.getFakeRequest();
      const loadedRound = await loadInvestigationRound({
        agentBuilder,
        request,
        conversationId: inputConversationId || undefined,
        roundId: roundId || undefined,
        roundIndex,
        fallbackToolCalls: (toolCalls ?? []) as InvestigationToolCall[],
        fallbackToolResults: toolResults ?? [],
        logger: context.logger,
        signal: context.abortSignal,
      });
      const now = new Date().toISOString();
      const round = buildInvestigationRound({
        // Liquid renders an absent input as '', so empty strings count as unset.
        roundId: loadedRound.roundId || roundId || uuidv4(),
        prompt,
        response,
        toolCalls: loadedRound.toolCalls,
        steps: loadedRound.source === 'persisted_round' ? loadedRound.steps : undefined,
        rawSteps: loadedRound.source === 'persisted_round' ? loadedRound.rawSteps : undefined,
        startedAt: loadedRound.startedAt ?? now,
      });
      // A fresh id per run: the beforeAgent hydrate namespaces the sandbox by conversation id.
      const conversationId = uuidv4();
      const conversation = buildInvestigationConversation({
        conversationId,
        agentId: NIGHTSHIFT_DECISION_TREE_REINFORCEMENT_AGENT_ID,
        round,
        now,
      });
      // Matches Deductive: an initial investigation only edits files; learnings need a follow-up.
      const configurationOverrides =
        turnKind === 'feedback_reinforcement'
          ? { tools: [{ tool_ids: [...DECISION_TREE_LEARNING_TOOL_IDS] }] }
          : undefined;

      // The workflow step's `timeout` bounds the run: its timeout zone aborts this signal.
      const { result } = await agentBuilder.agents.runAgent({
        request,
        agentId: NIGHTSHIFT_DECISION_TREE_REINFORCEMENT_AGENT_ID,
        interactive: { enabled: false },
        defaultConnectorId: connectorId || undefined,
        abortSignal: context.abortSignal,
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
      });

      const traceId = agentTraceId(result.round.trace_id);
      return {
        output: {
          message: result.round.response.message,
          conversation_id: conversationId,
          ...(traceId ? { trace_id: traceId } : {}),
          submissions_json: submitArgumentsJson(result.round.steps),
        },
      };
    },
  });
