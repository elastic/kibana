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
import { isToolCallStep, ToolResultType } from '@kbn/agent-builder-common';
import type { ConversationRoundStep } from '@kbn/agent-builder-common';
import type { CoreStart } from '@kbn/core/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import { REPLAY_CONVERSATION_ID_PREFIX } from '@kbn/nightshift-decision-trees';
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
  DECISION_TREE_SUBMIT_TOOL_ID,
  reinforcementSessionRegistry,
} from '../tools/decision_tree';
import { scopeConversationId } from '../tools/sandbox_bash/tool_utils';
import { withNightshiftBackgroundSpan } from '../tracing';

const MAX_INPUT_CHARS = 100_000;
const SUBMIT_ARGUMENTS_JSON_LIMIT = 100_000;

/** The reinforcement round's Agent Builder trace, when tracing recorded one. */
export const agentTraceId = (traceId: string | string[] | undefined): string | undefined => {
  const ids = (typeof traceId === 'string' ? [traceId] : traceId ?? []).filter(
    (id) => id.length > 0
  );
  return ids.at(-1);
};

/** True when the last submit call returned a tool error. A completed step can still have been rejected. */
export const lastSubmitRejected = (
  steps: readonly ConversationRoundStep[] | undefined
): boolean => {
  const submits = (steps ?? [])
    .filter(isToolCallStep)
    .filter((step) => step.tool_id === DECISION_TREE_SUBMIT_TOOL_ID);
  const last = submits.at(-1);
  return last?.results.some((result) => result.type === ToolResultType.error) ?? false;
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
  getSavedObjects,
  getUiSettings,
  isEnabled,
}: {
  getAgentBuilder: () => AgentBuilderPluginStart | undefined;
  getSavedObjects?: () => CoreStart['savedObjects'] | undefined;
  getUiSettings?: () => CoreStart['uiSettings'] | undefined;
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
      background_trace_id: z
        .string()
        .max(128)
        .optional()
        .describe('Deterministic T_background trace id from materialize.'),
      replay: z
        .boolean()
        .optional()
        .describe(
          'True when the round is a recorded transcript an evaluation replays: reinforcement learns from tool_calls and tool_results instead of reading the conversation.'
        ),
    }),
    outputSchema: z.object({
      message: z.string().describe("The reinforcement agent's final response."),
      skipped: z.boolean().optional(),
      applied_writes: z
        .array(appliedWriteSchema)
        .optional()
        .describe('Decision tree and learning writes applied during this reinforcement turn.'),
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
      submit_rejected: z
        .boolean()
        .optional()
        .describe('True when the last submit call returned a tool error.'),
      submissions_json: z
        .string()
        .describe(
          'JSON array of nightshift_submit_optimizer_result arguments, in call order. Empty when the agent did not submit.'
        ),
    }),
    handler: async (context) => {
      // The combined optimize workflow also installs with Wiki or Memory alone, so this step is
      // registered even when the tree feature is off.
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
        replay,
      } = context.input;
      // A replay skips the readability check below, so its id must not name a real investigation
      // whose trees it would then be recorded as writing.
      if (replay === true && !inputConversationId?.startsWith(REPLAY_CONVERSATION_ID_PREFIX)) {
        context.logger.warn(
          `Skipped decision tree reinforcement — a replayed round's conversation_id must start with ${REPLAY_CONVERSATION_ID_PREFIX}`
        );
        return { output: { message: '', skipped: true, submissions_json: '[]' } };
      }
      const request = context.contextManager.getFakeRequest();
      // A replayed round has no conversation to read, so the loader builds it from the supplied
      // tool calls; the input conversation id still records provenance below.
      const loadedRound = await loadInvestigationRound({
        agentBuilder,
        request,
        conversationId: replay === true ? undefined : inputConversationId || undefined,
        roundId: roundId || undefined,
        roundIndex,
        fallbackToolCalls: (toolCalls ?? []) as InvestigationToolCall[],
        fallbackToolResults: toolResults ?? [],
        logger: context.logger,
        signal: context.abortSignal,
      });
      // Reinforcing a tree from a conversation this caller cannot read would mean reinforcing it
      // from the hook's partial view of the round, so the round is left alone instead.
      if (loadedRound.source === 'conversation_unreadable') {
        context.logger.info(
          `Skipped decision tree reinforcement — conversation ${inputConversationId} is not readable by this caller`
        );
        return { output: { message: '', skipped: true, submissions_json: '[]' } };
      }
      const resolvedRoundId = loadedRound.roundId || roundId || undefined;
      const now = new Date().toISOString();
      const round = buildInvestigationRound({
        // Liquid renders an absent input as '', so empty strings count as unset.
        roundId: resolvedRoundId || uuidv4(),
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
      const workflowContext = context.contextManager.getContext();
      const spaceId = workflowContext.workflow.spaceId;
      const executionId = workflowContext.execution.id;
      const scopedReinforcementConvId = scopeConversationId(spaceId, conversation.id);
      reinforcementSessionRegistry.registerSession(scopedReinforcementConvId, {
        conversationId: inputConversationId || undefined,
        roundId: resolvedRoundId,
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
            roundId: resolvedRoundId,
            conversationId: inputConversationId || undefined,
            spaceId,
            workflowExecutionId: executionId,
            request,
            getSavedObjects,
            getUiSettings,
            logger: context.logger,
            attributes: {
              'nightshift.reinforcement_conversation_id': conversation.id,
              'nightshift.turn_kind': turnKind,
            },
          },
          async (span) => {
            try {
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
            } finally {
              const remaining =
                reinforcementSessionRegistry.drainSession(scopedReinforcementConvId);
              if (remaining.appliedWrites.length > 0) {
                span?.setAttribute(
                  'nightshift.applied_writes',
                  JSON.stringify(remaining.appliedWrites)
                );
              }
            }
          }
        );

        const traceId = agentTraceId(result.round.trace_id);
        const submitRejected = lastSubmitRejected(result.round.steps);
        return {
          output: {
            message: result.round.response.message,
            conversation_id: conversation.id,
            ...(traceId ? { trace_id: traceId } : {}),
            ...(submitRejected ? { submit_rejected: true } : {}),
            submissions_json: submitArgumentsJson(result.round.steps),
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
