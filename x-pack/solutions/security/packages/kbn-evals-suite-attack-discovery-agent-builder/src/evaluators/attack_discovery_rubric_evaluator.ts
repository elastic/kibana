/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { DefaultEvaluators, Evaluator } from '@kbn/evals';
import type {
  AttackDiscovery,
  AttackDiscoveryAgentBuilderExample,
  AttackDiscoveryAgentBuilderTaskOutput,
} from '../types';

/** Label on a rubric cell the judge never graded. The score is `null`, never 0. */
export const JUDGE_FAILED_LABEL = 'judge_failed';

const DEFAULT_MAX_JUDGE_RETRIES = 2;
const MAX_FAILURE_DETAILS = 5;
const MAX_DETAIL_LENGTH = 300;
const MAX_EXPLANATION_LENGTH = 2000;

const truncateInsightsForRubric = (
  insights: AttackDiscovery[] | null | undefined
): Array<{
  title: string;
  summaryMarkdown: string;
  detailsMarkdown: string;
  entitySummaryMarkdown?: string;
  mitreAttackTactics?: string[];
  alertIds: string[];
}> => {
  if (!insights || !Array.isArray(insights)) {
    return [];
  }

  return insights.map((insight) => ({
    title: insight.title ?? '',
    summaryMarkdown: insight.summaryMarkdown ?? '',
    detailsMarkdown: insight.detailsMarkdown ?? '',
    entitySummaryMarkdown: insight.entitySummaryMarkdown ?? '',
    mitreAttackTactics: insight.mitreAttackTactics ?? [],
    alertIds: insight.alertIds ?? [],
  }));
};

const getStatus = (error: unknown): number | undefined => {
  const e = error as { status?: unknown; statusCode?: unknown; cause?: unknown } | undefined;
  const status = e?.status ?? e?.statusCode;
  if (typeof status === 'number') {
    return status;
  }
  return e?.cause && e.cause !== error ? getStatus(e.cause) : undefined;
};

const describeSingleError = (error: unknown): string => {
  const status = getStatus(error);
  const message = error instanceof Error ? error.message : String(error);
  return `${status !== undefined ? `HTTP ${status}: ` : ''}${message}`.slice(0, MAX_DETAIL_LENGTH);
};

/**
 * The criteria judge reports an exhausted retry loop as one `AggregateError`
 * ("LLM could not complete task successfully in N attempts") and keeps the real
 * per-attempt causes in `error.errors`. Walk those — and every `cause` — so a
 * stored score doc names the transport or parse/validation failure that actually
 * happened instead of only the generic wrapper message.
 */
export const collectJudgeFailureDetails = (
  error: unknown,
  details: string[] = [],
  trail: unknown[] = []
): string[] => {
  if (error === null || error === undefined) {
    return details;
  }

  if (typeof error === 'object') {
    // `trail` only breaks reference cycles; the same cause reached twice through
    // different branches (or repeated by two retries) is reported twice, so the
    // caller can count how often it happened.
    if (trail.includes(error)) {
      return details;
    }
    const nextTrail = [...trail, error];

    const { errors, cause } = error as { errors?: unknown; cause?: unknown };
    if (Array.isArray(errors)) {
      errors.forEach((inner) => collectJudgeFailureDetails(inner, details, nextTrail));
      // The wrapper only says "could not complete … in N attempts"; its message
      // is added separately by `describeJudgeError`.
      if (cause !== undefined) {
        collectJudgeFailureDetails(cause, details, nextTrail);
      }
      return details;
    }
    if (cause !== undefined) {
      collectJudgeFailureDetails(cause, details, nextTrail);
      return details;
    }
  }

  details.push(describeSingleError(error));
  return details;
};

/** Same detail repeated by every retry is reported once, with its count. */
const countRepeats = (details: string[]): string[] => {
  const counts = new Map<string, number>();
  details.forEach((detail) => counts.set(detail, (counts.get(detail) ?? 0) + 1));

  return Array.from(counts).map(([detail, count]) =>
    count > 1 ? `${detail} (x${count})` : detail
  );
};

export const describeJudgeError = (error: unknown): string => {
  const wrapper = error instanceof Error ? error.message : String(error);
  const details = countRepeats(
    collectJudgeFailureDetails(error).filter((detail) => detail !== wrapper)
  );

  return details.length
    ? `${wrapper} — ${details.slice(0, MAX_FAILURE_DETAILS).join('; ')}`
    : wrapper;
};

/**
 * A judge call can hit Kibana's 300s inference stream cap (408) or a transient
 * upstream error; those never reach the judge prompt's own retry loop, which only
 * re-runs tool callbacks that returned an error. Request and auth errors fail the
 * same way every time and are not retried here either.
 */
export const isRetryableJudgeError = (error: unknown): boolean => {
  const status = getStatus(error);
  if (status === 408 || status === 429 || (status !== undefined && status >= 500)) {
    return true;
  }

  const message = error instanceof Error ? error.message : String(error);
  return /exceeded the maximum allowed duration/i.test(message);
};

export const createAttackDiscoveryRubricEvaluator = ({
  evaluators,
  log,
  maxJudgeRetries = DEFAULT_MAX_JUDGE_RETRIES,
}: {
  evaluators: DefaultEvaluators;
  log: ToolingLog;
  maxJudgeRetries?: number;
}): Evaluator<AttackDiscoveryAgentBuilderExample, AttackDiscoveryAgentBuilderTaskOutput> => {
  return {
    name: 'Rubric',
    kind: 'LLM',
    direction: 'maximize',
    evaluate: async ({ expected, output, input, metadata }) => {
      const referenceInsights = truncateInsightsForRubric(expected?.attackDiscoveries);
      // Without a reference discovery there is nothing for the judge to compare
      // against: rubric item 1 alone would score the submission N and pin the
      // aggregate at a ceiling. Mirrors the `criteria.length === 0` guard in
      // attack_discovery_criteria_evaluator.
      if (referenceInsights.length === 0) {
        return {
          score: null,
          label: 'N/A',
          explanation: 'No reference attack discoveries — skipping rubric evaluation.',
        };
      }

      const submissionInsights = truncateInsightsForRubric(output?.insights);

      const submission = JSON.stringify({ attackDiscoveries: submissionInsights }, null, 2);
      const reference = JSON.stringify({ attackDiscoveries: referenceInsights }, null, 2);

      const rubric = [
        'Evaluate the submission against the reference using these 7 rubric items:',
        '1. Is the submission non-empty and well-formed JSON with an array of attackDiscoveries?',
        '2. Do the detailsMarkdown values capture the overall essence of the reference, allowing slight differences in wording but not omitting or misrepresenting key incidents?',
        '3. Does the submission mention at least half of the same entities (host or user) as the reference?',
        '4. Are the summaryMarkdown values at least partially similar and summarizing the same incidents?',
        '5. Are the title values at least partially similar and mentioning the same incidents?',
        '6. Do more than half of the alertIds in the submission overlap with the alertIds in the reference?',
        '7. Are the MITRE tactics consistent with the reference?',
        `Reference: ${reference}`,
        'Score the submission as passing if at least 5 of the 7 rubric items are correct. Explain your reasoning briefly and end with a single character: Y or N.',
      ].join('\n');

      // Every failure here is the judge's, never the candidate's: the task already
      // finished. The failure is logged with its underlying cause and, once the
      // retries are spent, the cell is recorded as unscored (score null) instead
      // of throwing — a throw out of an evaluator fails the whole spec and loses
      // the other evaluators' scores for that cell.
      const judgeFailures: string[] = [];

      for (let attempt = 0; attempt <= maxJudgeRetries; attempt++) {
        try {
          const result = await evaluators.criteria([rubric]).evaluate({
            input,
            expected: { expected: reference },
            output: {
              messages: [{ message: submission }],
              steps: [],
              errors: output?.errors ?? [],
            },
            metadata,
          });

          return attempt > 0
            ? { ...result, metadata: { ...result.metadata, judgeAttempts: attempt + 1 } }
            : result;
        } catch (error) {
          const failure = describeJudgeError(error);
          judgeFailures.push(failure);
          log.warning(
            `Rubric judge attempt ${attempt + 1}/${maxJudgeRetries + 1} failed: ${failure}`
          );

          if (!isRetryableJudgeError(error)) {
            break;
          }
        }
      }

      return {
        score: null,
        label: JUDGE_FAILED_LABEL,
        explanation: `Rubric judge failed after ${judgeFailures.length} attempt(s): ${judgeFailures
          .join(' | ')
          .slice(0, MAX_EXPLANATION_LENGTH)}`,
        metadata: { judgeAttempts: judgeFailures.length, judgeFailures },
      };
    },
  };
};
