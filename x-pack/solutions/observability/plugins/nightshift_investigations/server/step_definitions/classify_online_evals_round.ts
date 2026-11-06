/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazySchema, z } from '@kbn/zod/v4';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import { StepCategory } from '@kbn/workflows';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { resolveRound, type RoundResolution } from '../investigation_round';
import { OnlineEvalsStepError, reportOnlineEvalsStepFailure } from '../online_evals/step_failure';
import type { NightshiftTelemetryClient } from '../telemetry';

const inputSchema = lazySchema(() =>
  z.object({
    investigation_id: z.string().min(1).max(1024).describe('The investigation the run belongs to.'),
    follow_up: z
      .string()
      .max(100)
      .optional()
      .describe('`inputs.context.follow_up` of the run; `alert_recovered` for a recovery round.'),
    investigation_started_at: z
      .string()
      .max(100)
      .refine((value) => !Number.isNaN(Date.parse(value)), 'Must be a date')
      .describe('When the investigation workflow run started (`execution.startedAt`).'),
  })
);

const skipReasonSchema = lazySchema(() =>
  z.enum([
    'evals_unavailable',
    'paused',
    'no_round',
    'follow_up_not_scored',
    'recovery_unresolved',
    'classification_failed',
  ])
);

type SkipReason = z.infer<typeof skipReasonSchema>;

/**
 * Scores initial rounds, and recoveries unless they leave no confirmed root cause. Follow-ups
 * aren't scored yet: telling a follow-up that changes the root cause from a question or Slack
 * chatter comes with follow-up scoring.
 */
const getRoundSkipReason = ({
  roundKind,
  hasConfirmedCause,
}: RoundResolution): SkipReason | undefined => {
  if (roundKind === 'follow_up') {
    return 'follow_up_not_scored';
  }
  // With no confirmed cause the alert-outcome judges have no ground truth. When the hypotheses
  // can't be compared, the round is scored and the judges' not-applicable check decides.
  if (roundKind === 'alert_recovery' && hasConfirmedCause === false) {
    return 'recovery_unresolved';
  }
  return undefined;
};

const skip = (skipReason: SkipReason) => ({
  output: { should_score: false, skip_reason: skipReason },
});

export const classifyOnlineEvalsRoundStepDefinition = ({
  getAgentBuilder,
  isEvalsAvailable,
  isPaused,
  telemetry,
}: {
  getAgentBuilder: () => AgentBuilderPluginStart | undefined;
  /** Whether the evals plugin is loaded; it is an optional dependency. */
  isEvalsAvailable: () => boolean;
  /** The `nightshift.onlineEvals.paused` kill switch. */
  isPaused: () => boolean;
  telemetry: NightshiftTelemetryClient;
}) =>
  createServerStepDefinition({
    id: 'nightshift.onlineEvals.classifyRound',
    label: 'Classify an Investigation Round for Online Evals',
    category: StepCategory.Ai,
    description:
      'Decides whether the round this investigation run created has anything to score: an initial round, or an alert recovery that leaves a confirmed root cause. Makes no LLM call, and never fails: a failure is reported as telemetry and the round is not scored.',
    inputSchema,
    outputSchema: z.object({
      should_score: z.boolean().describe('Whether to start the scoring workflow for this round.'),
      round_kind: z
        .enum(['initial', 'follow_up', 'alert_recovery'])
        .optional()
        .describe('What kind of round this run created.'),
      round_id: z.string().optional().describe('The round this run created.'),
      root_cause_outcome: z
        .enum(['found', 'changed', 'withdrawn', 'unchanged', 'unknown'])
        .optional()
        .describe(
          "What the round did to the confirmed root cause, from the findings recorder's hypotheses before and after it. `unknown` when they can't be compared."
        ),
      skip_reason: skipReasonSchema.optional().describe('Why the round is not scored.'),
    }),
    handler: async (context) => {
      if (!isEvalsAvailable()) {
        return skip('evals_unavailable');
      }
      if (isPaused()) {
        return skip('paused');
      }

      try {
        const input = inputSchema.parse(context.input);
        const agentBuilder = getAgentBuilder();
        if (!agentBuilder) {
          throw new OnlineEvalsStepError(
            'agent_builder_unavailable',
            'Agent Builder is not available, so the investigation cannot be read'
          );
        }
        const conversation = await agentBuilder.conversations
          .getScopedClient({ request: context.contextManager.getFakeRequest() })
          .then((conversations) => conversations.get(input.investigation_id))
          .catch((error) => {
            throw new OnlineEvalsStepError(
              'investigation_unavailable',
              error instanceof Error ? error.message : String(error)
            );
          });

        // Runs after the agent's round, so the latest round is the one this run created.
        const resolution = resolveRound(conversation, {
          followUp: input.follow_up || undefined,
          runStartedAt: input.investigation_started_at,
        });
        if (!resolution) {
          return skip('no_round');
        }

        const { roundKind, roundId, outcome } = resolution;
        const roundOutput = {
          round_kind: roundKind,
          round_id: roundId,
          root_cause_outcome: outcome,
        };

        const skipReason = getRoundSkipReason(resolution);
        return skipReason
          ? { output: { should_score: false, ...roundOutput, skip_reason: skipReason } }
          : { output: { should_score: true, ...roundOutput } };
      } catch (error) {
        // Runs inside the investigation workflow, so a failure here must never fail the investigation.
        reportOnlineEvalsStepFailure({ step: 'classify_round', error, context, telemetry });
        return skip('classification_failed');
      }
    },
  });
