/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { isInvestigationRoundKind } from '../client/round_kind';

/** The post-round steps' inputs that carry nightshift.classifyFollowUp's verdict. */
export const followUpVerdictInputsSchema = {
  round_kind: lazySchema(() =>
    z
      .string()
      .max(64)
      .optional()
      .describe(
        'The kind of round (initial, follow_up, or alert_recovery), labelled when it started.'
      )
  ),
  is_feedback: lazySchema(() =>
    z
      .boolean()
      .optional()
      .describe('From nightshift.classifyFollowUp: the round speaks to the earlier root cause.')
  ),
  causal_confirmed: lazySchema(() =>
    z
      .boolean()
      .optional()
      .describe('From nightshift.classifyFollowUp: the round proved the root cause.')
  ),
  causal_summary: lazySchema(() =>
    z
      .string()
      .max(16_384)
      .optional()
      .describe('From nightshift.classifyFollowUp: what was confirmed or what was wrong.')
  ),
};

/** The verdict on a follow-up round, as Cortex and Memory see it. */
export interface FollowUpVerdict {
  isFeedback: boolean;
  causalConfirmed: boolean;
  causalSummary: string;
}

/**
 * Only an investigation's follow-ups carry a verdict. A first round, or a round with no kind
 * (another agent, or a direct run), is learned from as before verdicts existed.
 */
export const followUpVerdictFromInputs = ({
  roundKind,
  isFeedback,
  causalConfirmed,
  causalSummary,
}: {
  roundKind?: string;
  isFeedback?: boolean;
  causalConfirmed?: boolean;
  causalSummary?: string;
}): FollowUpVerdict | undefined => {
  if (!isInvestigationRoundKind(roundKind) || roundKind === 'initial') {
    return undefined;
  }
  return {
    isFeedback: isFeedback === true,
    causalConfirmed: isFeedback === true && causalConfirmed === true,
    causalSummary: isFeedback === true ? causalSummary ?? '' : '',
  };
};

/** A transcript section telling an optimizer what the follow-up proved, if anything. */
export const describeFollowUpVerdict = (
  verdict: FollowUpVerdict,
  /** What the optimizer should do about a cause the follow-up contradicted. */
  contradictedAdvice: string
): string => {
  if (verdict.causalConfirmed) {
    return `## Outcome of this follow-up\nThe follow-up proved the root cause.\n${verdict.causalSummary}`;
  }
  if (verdict.isFeedback) {
    return `## Outcome of this follow-up\nThe follow-up did not confirm the earlier root cause.\n${verdict.causalSummary}\n${contradictedAdvice}`;
  }
  return '## Outcome of this follow-up\nThe follow-up neither confirmed nor contradicted the earlier root cause, so treat nothing in it as confirmed.';
};
