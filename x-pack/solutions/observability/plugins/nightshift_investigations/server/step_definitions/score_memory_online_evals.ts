/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import { ConversationRoundStepType, type ConversationRound } from '@kbn/agent-builder-common';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { CoreStart, KibanaRequest, Logger } from '@kbn/core/server';
import type { EvaluateFn, EvidenceRound } from '@kbn/evals-plugin/server';
import { StepCategory } from '@kbn/workflows';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { lazySchema, z } from '@kbn/zod/v4';
import { usesDecisionTrees, usesKnowledge } from '../agents/agent_policy';
import type { InvestigationToolCall } from '../decision_trees/accessed_trees';
import { createDecisionTreeStore } from '../decision_trees/store';
import {
  APPLIED_WRITE_STORES,
  extractWorkspaceReads,
  loadInvestigationRound,
  parseRoundAliasIndex,
  type AppliedWriteRecord,
  type InvestigationRoundKind,
} from '../investigation_round';
import { buildOnlineEvalScoreEvent, type EvaluateResult } from '../online_evals/build_score_event';
import {
  MEMORY_READ_JUDGE_VERSION,
  MEMORY_WRITE_JUDGE_VERSION,
  READ_JUDGE_EVALUATOR_NAME,
  WRITE_JUDGE_EVALUATOR_NAME,
} from '../online_evals/judges';
import type { NightshiftTelemetryClient } from '../telemetry';
import { toDeterministicTraceId, withNightshiftBackgroundSpan } from '../tracing';
import { createWikiStore } from '../wiki/register_wiki';
import { toolCallsSchema, toolResultsSchema } from './tool_calls_schema';

export const MEMORY_EVALUATOR_SET = 'memory';
const MAX_EVIDENCE_TOOL_CALLS = 200;

const parseOptionalArray = (value: unknown): unknown[] => {
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const optionalStringArraySchema = lazySchema(() =>
  z.preprocess(parseOptionalArray, z.array(z.string().max(1024)).max(500))
);

const appliedWriteInputSchema = lazySchema(() =>
  z.object({
    store: z.enum(APPLIED_WRITE_STORES),
    item_id: z.string().max(1024),
    action: z.string().max(128),
    version: z.union([z.string(), z.number()]).optional(),
    before_status: z.string().optional(),
    after_status: z.string().optional(),
    before_content: z.string().optional(),
    after_content: z.string().optional(),
    replaced_ids: z.array(z.string()).optional(),
    source_memory_ids: z.array(z.string()).optional(),
  })
);

const optionalAppliedWritesArraySchema = lazySchema(() =>
  z.preprocess(parseOptionalArray, z.array(appliedWriteInputSchema).max(200))
);

const inputSchema = lazySchema(() =>
  z.object({
    conversation_id: z
      .string()
      .max(1024)
      .optional()
      .describe('The investigation conversation id for the completed round.'),
    round_id: z
      .string()
      .max(1024)
      .optional()
      .describe('The completed conversation round id (or alias such as `last`).'),
    round_index: z
      .number()
      .int()
      .optional()
      .describe('Optional 0-based or negative round index selector.'),
    agent_id: z
      .string()
      .max(1024)
      .optional()
      .describe('Agent id that ran the investigation round.'),
    background_trace_id: z
      .string()
      .max(128)
      .optional()
      .describe('Deterministic T_background trace id from materialize.'),
    recalled_ids: optionalStringArraySchema
      .optional()
      .describe('Recalled Semantic Memory ids supplied to the round.'),
    hydrated_ids: optionalStringArraySchema
      .optional()
      .describe('Hydrated Wiki and Decision Tree ids supplied to the round.'),
    wiki_opened_ids: optionalStringArraySchema
      .optional()
      .describe('Wiki page ids opened by the agent during the round.'),
    memory_opened_ids: optionalStringArraySchema
      .optional()
      .describe('Semantic Memory ids opened by the agent during the round.'),
    decision_tree_opened_ids: optionalStringArraySchema
      .optional()
      .describe('Decision tree ids opened by the agent during the round.'),
    wiki_applied_writes: optionalAppliedWritesArraySchema
      .optional()
      .describe('Applied Wiki writes from optimize_wiki.'),
    memory_applied_writes: optionalAppliedWritesArraySchema
      .optional()
      .describe('Applied Semantic Memory writes from optimize_memory.'),
    decision_tree_applied_writes: optionalAppliedWritesArraySchema
      .optional()
      .describe('Applied Decision Tree and Learning writes from reinforce_decision_trees.'),
    tool_calls: toolCallsSchema
      .optional()
      .describe('Investigator tool calls from this round for fallback read extraction.'),
    tool_results: toolResultsSchema
      .optional()
      .describe('Investigator tool results from this round for fallback read extraction.'),
    sample_rate: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .describe('Deterministic subsample rate in [0, 1] (default: 1.0).'),
  })
);

type ScoreMemoryInput = z.infer<typeof inputSchema>;

const skipReasonSchema = lazySchema(() =>
  z.enum(['disabled', 'evals_unavailable', 'paused', 'nothing_to_score', 'not_sampled'])
);
type SkipReason = z.infer<typeof skipReasonSchema>;

/**
 * Deterministic hash-based subsampling in `[0, 1]` so a round is consistently sampled or skipped
 * for a given `sampleRate`.
 */
export const shouldSampleRound = (seed: string, sampleRate: number): boolean => {
  if (sampleRate >= 1) return true;
  if (sampleRate <= 0) return false;
  const digest = createHash('sha256').update(seed, 'utf8').digest();
  const fraction = digest.readUInt32BE(0) / 0xffffffff;
  return fraction < sampleRate;
};

export const buildMemoryJudgeEvidenceRound = (round?: ConversationRound): EvidenceRound => {
  if (!round) {
    return {
      input: { message: '' },
      steps: [],
      response: { message: '' },
    };
  }

  const toolCalls = round.steps.flatMap((step) =>
    step.type === ConversationRoundStepType.toolCall
      ? [
          {
            tool_call_id: step.tool_call_id,
            tool_id: step.tool_id,
            arguments: step.params,
            result: step.results,
          },
        ]
      : []
  );

  return {
    input: { message: round.input?.message ?? '' },
    steps: toolCalls.slice(0, MAX_EVIDENCE_TOOL_CALLS),
    response: { message: round.response?.message ?? '' },
  };
};

export const scoreMemoryOnlineEvalsStepDefinition = ({
  getAgentBuilder,
  getEvaluate,
  getSavedObjects,
  getUiSettings,
  isPaused,
  shouldIncludeExplanations,
  telemetry,
  logger,
  isEnabled,
  isWikiEnabled,
  isDecisionTreesEnabled,
}: {
  getAgentBuilder: () => AgentBuilderPluginStart | undefined;
  /** The evals plugin's `evaluate()`; absent when the evals plugin is not loaded. */
  getEvaluate: () => EvaluateFn | undefined;
  getSavedObjects?: () => CoreStart['savedObjects'] | undefined;
  getUiSettings?: () => CoreStart['uiSettings'] | undefined;
  /** The `nightshift.onlineEvals.paused` kill switch. */
  isPaused: () => boolean;
  /** The `nightshift.onlineEvals.includeExplanations` flag. */
  shouldIncludeExplanations: () => boolean;
  telemetry: Pick<NightshiftTelemetryClient, 'reportOnlineEvalScore'>;
  logger: Logger;
  isEnabled?: () => boolean;
  isWikiEnabled?: () => boolean;
  isDecisionTreesEnabled?: () => boolean;
}) =>
  createServerStepDefinition({
    id: 'nightshift.onlineEvals.scoreMemory',
    label: 'Score Nightshift Memory Read and Write Quality for Online Evals',
    category: StepCategory.Ai,
    description:
      'Runs the registered memory read and write evaluators on the completed agent_optimize outputs and sends the scores as a telemetry event.',
    inputSchema,
    outputSchema: z.object({
      scored: z.boolean().describe('Whether a score event was sent.'),
      evaluator_count: z.number().optional().describe('Evaluators the event reports.'),
      failed_count: z.number().optional().describe('Evaluators that failed.'),
      skipped_count: z
        .number()
        .optional()
        .describe("Evaluators the round didn't have evidence for."),
      skip_reason: skipReasonSchema.optional().describe('Why nothing was scored.'),
    }),
    handler: async (context) => {
      const input: ScoreMemoryInput = inputSchema.parse(context.input);
      const skip = (skipReason: SkipReason) => ({
        output: { scored: false, skip_reason: skipReason },
      });

      if (isEnabled && !isEnabled()) {
        return skip('disabled');
      }
      const evaluate = getEvaluate();
      if (!evaluate) {
        return skip('evals_unavailable');
      }
      if (isPaused()) {
        return skip('paused');
      }

      const { workflow, execution } = context.contextManager.getContext();
      const request: KibanaRequest = context.contextManager.getFakeRequest();
      const conversationId = input.conversation_id?.trim() || undefined;
      const requestedRoundId = input.round_id?.trim() || undefined;
      let agentId = input.agent_id?.trim() || undefined;

      // Resolve the investigation round using the shared round loader so selectors ('first', '0',
      // 'last', UUIDs) match the optimizer steps and reads are derived even if an optimizer branch failed.
      const loadedRound = await loadInvestigationRound({
        agentBuilder: getAgentBuilder(),
        request,
        conversationId,
        roundId:
          requestedRoundId ??
          (conversationId && input.round_index === undefined ? 'last' : undefined),
        roundIndex: input.round_index,
        fallbackToolCalls: (input.tool_calls ?? []) as InvestigationToolCall[],
        fallbackToolResults: input.tool_results ?? [],
        logger: context.logger,
        signal: context.abortSignal,
        retryDelaysMs: [0],
      });
      const transcriptReads = extractWorkspaceReads(loadedRound.steps);

      let round: ConversationRound | undefined;
      const agentBuilder = getAgentBuilder();
      if (agentBuilder && conversationId && loadedRound.source === 'persisted_round') {
        try {
          const conversations = await agentBuilder.conversations.getScopedClient({ request });
          const conversation = await conversations.get(conversationId);
          agentId = agentId || conversation.agent_id;
          round =
            loadedRound.roundIndex !== undefined
              ? conversation.rounds[loadedRound.roundIndex]
              : conversation.rounds.find(({ id }) => id === loadedRound.roundId);
        } catch (error) {
          // Conversation already loaded by loadInvestigationRound; fall back to loadedRound metadata.
          context.logger.debug(
            `Memory online evals could not read conversation "${conversationId}" for round evidence: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      }

      const appliedWrites = [
        ...(input.wiki_applied_writes ?? []),
        ...(input.memory_applied_writes ?? []),
        ...(input.decision_tree_applied_writes ?? []),
      ] as AppliedWriteRecord[];

      const newlyCreatedItemIds = new Set(
        appliedWrites
          .filter(
            (write) =>
              write.before_status === 'archived' ||
              (write.before_content === undefined &&
                (write.action === 'create' || write.version === 1 || write.version === '1'))
          )
          .map((write) => write.item_id)
      );
      const archivedThisRoundIds = new Set(
        appliedWrites
          .filter(
            (write) => write.after_status === 'archived' && write.before_status !== 'archived'
          )
          .map((write) => write.item_id)
      );

      // Include hydrated Wiki and Decision Tree IDs alongside Semantic Memory recalled_ids
      // so Wiki-only and Decision-Tree reads match the candidate set.
      const hydratedStoreIds: string[] = [...(input.hydrated_ids ?? [])];
      const esClient = context.contextManager.getScopedEsClient?.();
      if (esClient && typeof esClient.search === 'function') {
        if ((isWikiEnabled ? isWikiEnabled() : true) && usesKnowledge(agentId)) {
          try {
            const { pages } = await createWikiStore({
              esClient,
              logger,
              spaceId: workflow.spaceId,
              signal: context.abortSignal,
            }).list();
            for (const page of pages ?? []) {
              if (
                (page.status !== 'archived' || archivedThisRoundIds.has(page.id)) &&
                !newlyCreatedItemIds.has(page.id)
              ) {
                hydratedStoreIds.push(page.id);
              }
            }
          } catch (error) {
            context.logger.debug(
              `Memory online evals could not list Wiki store for hydrated IDs: ${
                error instanceof Error ? error.message : String(error)
              }`
            );
          }
        }
        if (
          (isDecisionTreesEnabled ? isDecisionTreesEnabled() : true) &&
          usesDecisionTrees(agentId)
        ) {
          try {
            const trees = await createDecisionTreeStore({
              esClient,
              logger,
              spaceId: workflow.spaceId,
              signal: context.abortSignal,
            }).list();
            for (const tree of trees ?? []) {
              if (
                (tree.status !== 'archived' || archivedThisRoundIds.has(tree.tree_id)) &&
                !newlyCreatedItemIds.has(tree.tree_id)
              ) {
                hydratedStoreIds.push(tree.tree_id);
              }
            }
          } catch (error) {
            context.logger.debug(
              `Memory online evals could not list Decision Tree store for hydrated IDs: ${
                error instanceof Error ? error.message : String(error)
              }`
            );
          }
        }
      }

      const explicitOpenedIds = [
        ...(input.wiki_opened_ids ?? []),
        ...(input.memory_opened_ids ?? []),
        ...(input.decision_tree_opened_ids ?? []),
      ].filter(Boolean);
      const recalledIds = [
        ...new Set([...(input.recalled_ids ?? []), ...hydratedStoreIds].filter(Boolean)),
      ];
      const openedIds = [
        ...new Set(
          [
            ...explicitOpenedIds,
            ...transcriptReads.wikiIds,
            ...transcriptReads.memoryIds,
            ...transcriptReads.decisionTreeIds,
          ].filter(Boolean)
        ),
      ];

      // When the conversation is unreadable (e.g. a private conversation), the round loader
      // returns an empty step list and the optimizers skip without returning `opened_ids`.
      // Skip the read evaluator in that case rather than scoring recalled IDs against an empty
      // read set.
      const readEvidenceAvailable =
        loadedRound.source !== 'conversation_unreadable' || explicitOpenedIds.length > 0;

      const evaluators: Array<{ name: string; version: string }> = [];
      if (readEvidenceAvailable && recalledIds.length > 0) {
        evaluators.push({
          name: READ_JUDGE_EVALUATOR_NAME,
          version: MEMORY_READ_JUDGE_VERSION,
        });
      }
      if (appliedWrites.length > 0) {
        evaluators.push({
          name: WRITE_JUDGE_EVALUATOR_NAME,
          version: MEMORY_WRITE_JUDGE_VERSION,
        });
      }
      if (evaluators.length === 0) {
        return skip('nothing_to_score');
      }

      const resolvedRoundId =
        loadedRound.source === 'persisted_round'
          ? loadedRound.roundId || undefined
          : requestedRoundId && parseRoundAliasIndex(requestedRoundId) === undefined
          ? requestedRoundId
          : undefined;
      const sampleSeed =
        input.background_trace_id ||
        (conversationId && resolvedRoundId ? `${conversationId}:${resolvedRoundId}` : execution.id);
      if (!shouldSampleRound(sampleSeed, input.sample_rate ?? 1.0)) {
        return skip('not_sampled');
      }

      const scoringStartedAt = Date.now();
      const roundTraceId = loadedRound.traceId;
      const roundKind: InvestigationRoundKind =
        loadedRound.roundIndex !== undefined && loadedRound.roundIndex > 0
          ? 'follow_up'
          : 'initial';

      const judgeTraceId = toDeterministicTraceId(input.background_trace_id || execution.id);
      let results: EvaluateResult[] = [];

      await withNightshiftBackgroundSpan(
        {
          name: 'nightshift.memoryJudge',
          traceId: judgeTraceId,
          foregroundTraceId: roundTraceId,
          roundId: resolvedRoundId,
          conversationId,
          spaceId: workflow.spaceId,
          workflowExecutionId: execution.id,
          request,
          getSavedObjects,
          getUiSettings,
          logger,
          attributes: {
            'nightshift.evaluator_set': MEMORY_EVALUATOR_SET,
          },
        },
        async () => {
          try {
            results = await evaluate({
              request,
              spaceId: workflow.spaceId,
              evaluators,
              evidence: {
                round: buildMemoryJudgeEvidenceRound(round),
                reference_data: {
                  recalled_ids: recalledIds,
                  opened_ids: openedIds,
                  applied_writes: appliedWrites,
                },
              },
            });
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            context.logger.warn(
              `Memory online evals failed to score execution "${execution.id}": ${message}`
            );
            results = evaluators.map((ev) => ({
              status: 'error' as const,
              evaluator: {
                name: ev.name,
                version: ev.version,
                kind: 'code' as const,
              },
              error: { message },
            }));
          }
        }
      );

      const startedAt =
        loadedRound.startedAt ?? round?.started_at ?? new Date(scoringStartedAt).toISOString();
      const startMs = round?.started_at ? Date.parse(round.started_at) : Number.NaN;
      const endedAt =
        Number.isFinite(startMs) &&
        typeof round?.time_to_last_token === 'number' &&
        Number.isFinite(round.time_to_last_token) &&
        round.time_to_last_token > 0
          ? new Date(startMs + round.time_to_last_token).toISOString()
          : undefined;

      const event = buildOnlineEvalScoreEvent({
        metadata: {
          investigation_id: conversationId ?? execution.id,
          round_id: resolvedRoundId ?? execution.id,
          ...(roundTraceId ? { round_trace_id: roundTraceId } : {}),
          ...(judgeTraceId ? { judge_trace_id: judgeTraceId } : {}),
          workflow_execution_id: execution.id,
          space_id: workflow.spaceId,
          ...(agentId ? { agent_id: agentId } : {}),
          evaluator_set: MEMORY_EVALUATOR_SET,
          round_kind: roundKind,
          graded_report: 'current',
          investigation_started_at: startedAt,
          ...(endedAt ? { investigation_ended_at: endedAt } : {}),
          scoring_duration_ms: Date.now() - scoringStartedAt,
        },
        results,
        includeExplanations: shouldIncludeExplanations(),
      });
      telemetry.reportOnlineEvalScore(event);

      return {
        output: {
          scored: true,
          evaluator_count: event.evaluator_count,
          failed_count: event.failed_count,
          skipped_count: event.skipped_count,
        },
      };
    },
  });
