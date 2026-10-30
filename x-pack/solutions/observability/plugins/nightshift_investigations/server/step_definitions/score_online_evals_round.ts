/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazySchema, z } from '@kbn/zod/v4';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { EvaluateFn } from '@kbn/evals-plugin/server';
import { StepCategory } from '@kbn/workflows';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { buildOnlineEvalsEvidence } from '../online_evals/build_evidence';
import { buildOnlineEvalScoreEvent, type EvaluateResult } from '../online_evals/build_score_event';
import type { NightshiftTelemetryClient } from '../telemetry';

/** Judges run in parallel within one evaluation, so this bounds concurrent judge calls. */
export const MAX_ONLINE_EVALS_EVALUATORS = 4;

const isDate = (value: string) => !Number.isNaN(Date.parse(value));

const inputSchema = lazySchema(() =>
  z.object({
    investigation_id: z
      .string()
      .min(1)
      .max(1024)
      .describe('The investigation the round belongs to.'),
    round_id: z.string().min(1).max(1024).describe('The round to score, from `classifyRound`.'),
    round_kind: z
      .enum(['initial', 'follow_up', 'alert_recovery'])
      .describe('What kind of round it is, from `classifyRound`.'),
    graded_report: z
      .enum(['first_round', 'pre_recovery', 'current'])
      .describe('Which report the judges grade.'),
    evaluator_set: z
      .string()
      .min(1)
      .max(100)
      .describe('Name of the evaluator set, such as `reference_free`, for dashboards.'),
    evaluators: z
      .array(
        z.object({
          name: z.string().min(1).max(256),
          version: z.string().max(64).optional(),
        })
      )
      .min(1)
      .max(MAX_ONLINE_EVALS_EVALUATORS)
      .describe('The evaluators to run.'),
    judge_connector_id: z.string().min(1).max(256).describe('The connector every judge calls.'),
    investigation_started_at: z
      .string()
      .max(100)
      .refine(isDate, 'Must be a date')
      .describe('When the scored investigation run started.'),
    investigation_execution_id: z
      .string()
      .max(1024)
      .optional()
      .describe('The investigation workflow run that was scored.'),
    entry_point: z
      .enum(['start_api', 'automation', 'slack', 'alert_recovery'])
      .optional()
      .describe('How the scored run started.'),
    alert_rule_type: z
      .string()
      .max(256)
      .optional()
      .describe('Rule type of the alert that was investigated.'),
  })
);

type ScoreInput = z.infer<typeof inputSchema>;

const skipReasonSchema = lazySchema(() => z.enum(['evals_unavailable', 'paused']));
type SkipReason = z.infer<typeof skipReasonSchema>;

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

export const scoreOnlineEvalsRoundStepDefinition = ({
  getAgentBuilder,
  getEvaluate,
  isPaused,
  shouldIncludeExplanations,
  telemetry,
}: {
  getAgentBuilder: () => AgentBuilderPluginStart | undefined;
  /** The evals plugin's `evaluate()`; absent when the evals plugin isn't loaded. */
  getEvaluate: () => EvaluateFn | undefined;
  /** The `nightshift.onlineEvals.paused` kill switch. */
  isPaused: () => boolean;
  /** The `nightshift.onlineEvals.includeExplanations` flag. */
  shouldIncludeExplanations: () => boolean;
  telemetry: NightshiftTelemetryClient;
}) =>
  createServerStepDefinition({
    id: 'nightshift.onlineEvals.score',
    label: 'Score an Investigation Round for Online Evals',
    category: StepCategory.Ai,
    description:
      'Runs judges on one investigation round and sends the scores as a telemetry event. Judge and evidence failures are reported in the event; the step does not fail on them.',
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
      const input: ScoreInput = inputSchema.parse(context.input);
      const skip = (skipReason: SkipReason) => ({
        output: { scored: false, skip_reason: skipReason },
      });

      const evaluate = getEvaluate();
      if (!evaluate) {
        return skip('evals_unavailable');
      }
      if (isPaused()) {
        return skip('paused');
      }

      const scoringStartedAt = Date.now();
      const { workflow, execution } = context.contextManager.getContext();
      const request = context.contextManager.getFakeRequest();

      let results: EvaluateResult[] = [];
      let failedEvaluators: ScoreInput['evaluators'] = [];
      let agentId: string | undefined;
      let roundTraceId: string | undefined;
      let investigationEndedAt: string | undefined;
      try {
        const agentBuilder = getAgentBuilder();
        if (!agentBuilder) {
          throw new Error('Agent Builder is not available, so the investigation cannot be read');
        }
        const conversations = await agentBuilder.conversations.getScopedClient({ request });
        const conversation = await conversations.get(input.investigation_id);
        agentId = conversation.agent_id;
        const round = conversation.rounds.find(({ id }) => id === input.round_id);
        if (!round) {
          throw new Error(`Round "${input.round_id}" not found in the investigation`);
        }
        roundTraceId = Array.isArray(round.trace_id) ? round.trace_id[0] : round.trace_id;
        const roundEndedAt = Date.parse(round.started_at) + round.time_to_last_token;
        investigationEndedAt = Number.isFinite(roundEndedAt)
          ? new Date(roundEndedAt).toISOString()
          : undefined;

        results = await evaluate({
          request,
          spaceId: workflow.spaceId,
          evidence: buildOnlineEvalsEvidence({ round }),
          evaluators: input.evaluators.map((evaluator) => ({
            ...evaluator,
            connector_id: input.judge_connector_id,
          })),
        });
      } catch (error) {
        context.logger.warn(
          `Online evals could not score round "${input.round_id}" of investigation "${
            input.investigation_id
          }": ${getErrorMessage(error)}`
        );
        failedEvaluators = input.evaluators;
      }

      const event = buildOnlineEvalScoreEvent({
        metadata: {
          investigation_id: input.investigation_id,
          round_id: input.round_id,
          ...(roundTraceId ? { round_trace_id: roundTraceId } : {}),
          workflow_execution_id: execution.id,
          ...(input.investigation_execution_id
            ? { investigation_execution_id: input.investigation_execution_id }
            : {}),
          space_id: workflow.spaceId,
          ...(agentId ? { agent_id: agentId } : {}),
          evaluator_set: input.evaluator_set,
          round_kind: input.round_kind,
          graded_report: input.graded_report,
          ...(input.entry_point ? { entry_point: input.entry_point } : {}),
          ...(input.alert_rule_type ? { alert_rule_type: input.alert_rule_type } : {}),
          judge_connector_id: input.judge_connector_id,
          investigation_started_at: input.investigation_started_at,
          ...(investigationEndedAt ? { investigation_ended_at: investigationEndedAt } : {}),
          scoring_duration_ms: Date.now() - scoringStartedAt,
        },
        results,
        failedEvaluators,
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
