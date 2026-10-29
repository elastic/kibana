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
import {
  classifyInvestigationRun,
  type OnlineEvalsRoundClassification,
} from '../online_evals/classify_round';

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
    'recovery_verdict_unavailable',
    'recovery_unresolved',
  ])
);

type SkipReason = z.infer<typeof skipReasonSchema>;

/**
 * Scores initial rounds and recoveries with a resolved verdict. Follow-ups aren't scored yet:
 * telling a follow-up that changes the root cause from a question or Slack chatter comes with
 * follow-up scoring.
 */
const getRoundSkipReason = ({
  roundKind,
  recoveryVerdict,
}: OnlineEvalsRoundClassification): SkipReason | undefined => {
  if (roundKind === 'follow_up') {
    return 'follow_up_not_scored';
  }
  if (roundKind === 'alert_recovery') {
    if (recoveryVerdict === undefined) {
      return 'recovery_verdict_unavailable';
    }
    // An unresolved cause gives the alert-outcome judges no ground truth to grade against.
    if (recoveryVerdict === 'unresolved') {
      return 'recovery_unresolved';
    }
  }
  return undefined;
};

export const classifyOnlineEvalsRoundStepDefinition = ({
  getAgentBuilder,
  isEvalsAvailable,
  isPaused,
}: {
  getAgentBuilder: () => AgentBuilderPluginStart | undefined;
  /** Whether the evals plugin is loaded; it is an optional dependency. */
  isEvalsAvailable: () => boolean;
  /** The `nightshift.onlineEvals.paused` kill switch. */
  isPaused: () => boolean;
}) =>
  createServerStepDefinition({
    id: 'nightshift.onlineEvals.classifyRound',
    label: 'Classify an Investigation Round for Online Evals',
    category: StepCategory.Ai,
    description:
      'Decides whether the round this investigation run created has anything to score: an initial round, or an alert recovery with a resolved verdict. Makes no LLM call.',
    inputSchema,
    outputSchema: z.object({
      should_score: z.boolean().describe('Whether to start the scoring workflow for this round.'),
      round_kind: z
        .enum(['initial', 'follow_up', 'alert_recovery'])
        .optional()
        .describe('What kind of round this run created.'),
      round_id: z.string().optional().describe('The round this run created.'),
      recovery_verdict: z
        .string()
        .optional()
        .describe("Alert recoveries only: the recovery round's verdict on the root cause."),
      skip_reason: skipReasonSchema.optional().describe('Why the round is not scored.'),
    }),
    handler: async (context) => {
      const input = inputSchema.parse(context.input);
      const skip = (skipReason: SkipReason) => ({
        output: { should_score: false, skip_reason: skipReason },
      });

      if (!isEvalsAvailable()) {
        return skip('evals_unavailable');
      }
      if (isPaused()) {
        return skip('paused');
      }

      const agentBuilder = getAgentBuilder();
      if (!agentBuilder) {
        throw new Error('Agent Builder is not available, so the investigation cannot be read');
      }
      const conversations = await agentBuilder.conversations.getScopedClient({
        request: context.contextManager.getFakeRequest(),
      });
      const { rounds } = await conversations.get(input.investigation_id);

      const classification = classifyInvestigationRun({
        rounds: rounds.map(({ id, started_at: startedAt }) => ({ id, started_at: startedAt })),
        followUp: input.follow_up || undefined,
        runStartedAt: input.investigation_started_at,
      });
      if (!classification) {
        return skip('no_round');
      }

      const { roundKind, roundId, recoveryVerdict } = classification;
      const roundOutput = {
        round_kind: roundKind,
        round_id: roundId,
        ...(recoveryVerdict ? { recovery_verdict: recoveryVerdict } : {}),
      };

      const skipReason = getRoundSkipReason(classification);
      return skipReason
        ? { output: { should_score: false, ...roundOutput, skip_reason: skipReason } }
        : { output: { should_score: true, ...roundOutput } };
    },
  });
