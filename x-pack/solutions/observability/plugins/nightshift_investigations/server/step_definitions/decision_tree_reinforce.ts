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
import {
  appliedWriteSchema,
  investigationRoundInputsSchema,
  loadInvestigationRound,
} from '../investigation_round';
import {
  DECISION_TREE_LEARNING_TOOL_IDS,
  reinforcementSessionRegistry,
} from '../tools/decision_tree';
import { scopeConversationId } from '../tools/sandbox_bash/tool_utils';
import { withNightshiftBackgroundSpan } from '../tracing';

const MAX_INPUT_CHARS = 100_000;

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
      prompt: z.string().max(MAX_INPUT_CHARS).describe('The user message that started the round.'),
      response: z
        .string()
        .max(MAX_INPUT_CHARS)
        .describe("The investigator's final response for the round."),
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
      background_trace_id: z
        .string()
        .max(128)
        .optional()
        .describe('Deterministic T_background trace id from materialize.'),
    }),
    outputSchema: z.object({
      message: z.string().describe("The reinforcement agent's final response."),
      skipped: z.boolean().optional(),
      applied_writes: z
        .array(appliedWriteSchema)
        .optional()
        .describe('Decision tree and learning writes applied during this reinforcement turn.'),
    }),
    handler: async (context) => {
      // The combined optimize workflow installs with Cortex or Memory, so this step is registered
      // even when the tree feature is off.
      if (isEnabled && !isEnabled()) {
        context.logger.info('Skipped decision tree reinforcement (flag off)');
        return { output: { message: '', skipped: true } };
      }

      const agentBuilder = getAgentBuilder();
      if (!agentBuilder) {
        throw new Error('Agent Builder is not available');
      }

      const {
        prompt,
        response,
        conversation_id: conversationId,
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
        conversationId: conversationId || undefined,
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
      const conversation = buildInvestigationConversation({
        conversationId: uuidv4(),
        agentId: NIGHTSHIFT_DECISION_TREE_REINFORCEMENT_AGENT_ID,
        round,
        now,
      });
      const workflowContext = context.contextManager.getContext();
      const spaceId = workflowContext.workflow.spaceId;
      const executionId = workflowContext.execution.id;
      const scopedReinforcementConvId = scopeConversationId(spaceId, conversation.id);
      reinforcementSessionRegistry.registerSession(scopedReinforcementConvId, {
        conversationId: conversationId || undefined,
        roundId: roundId || undefined,
        workflowExecutionId: executionId,
      });

      // Matches Deductive: an initial investigation only edits files; learnings need a follow-up.
      const configurationOverrides =
        turnKind === 'feedback_reinforcement'
          ? { tools: [{ tool_ids: [...DECISION_TREE_LEARNING_TOOL_IDS] }] }
          : undefined;

      try {
        // Wrapping `runAgent` in `withNightshiftBackgroundSpan` joins the entire reinforcement
        // sub-agent run (`invoke_agent` -> `chat <model>` -> `execute_tool nightshift_*`)
        // under `T_background` in `traces-agent_builder.otel-<spaceId>`.
        const { result, sessionState } = await withNightshiftBackgroundSpan(
          {
            name: 'nightshift.decisionTreeReinforce',
            traceId: context.input.background_trace_id || executionId,
            foregroundTraceId: loadedRound.traceId,
            roundId: roundId || undefined,
            conversationId: conversationId || undefined,
            spaceId,
            workflowExecutionId: executionId,
            request,
            logger: context.logger,
            attributes: {
              'nightshift.reinforcement_conversation_id': conversation.id,
              'nightshift.turn_kind': turnKind,
            },
          },
          async (span) => {
            const agentReturn = await agentBuilder.agents.runAgent({
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
                interactionId: executionId,
              },
              agentParams: {
                conversation,
                nextInput: { message },
                ...(configurationOverrides ? { configurationOverrides } : {}),
              },
            });
            const drained = reinforcementSessionRegistry.drainSession(scopedReinforcementConvId);
            if (drained.appliedWrites.length > 0) {
              span?.setAttribute(
                'nightshift.applied_writes',
                JSON.stringify(drained.appliedWrites)
              );
            }
            return { result: agentReturn.result, sessionState: drained };
          }
        );

        return {
          output: {
            message: result.round.response.message,
            ...(sessionState.appliedWrites.length > 0
              ? { applied_writes: sessionState.appliedWrites }
              : {}),
          },
        };
      } finally {
        reinforcementSessionRegistry.drainSession(scopedReinforcementConvId);
      }
    },
  });
