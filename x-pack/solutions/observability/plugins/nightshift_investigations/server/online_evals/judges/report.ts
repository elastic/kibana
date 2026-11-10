/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The report the user sees: the agent's final answer plus the hypotheses panel it wrote with
// `set_hypotheses`, as it stood at the end of the graded round.

import { z, lazySchema } from '@kbn/zod/v4';
import { truncate } from './truncate';

/** Each hypothesis reason is cut to this many characters when rendered. */
export const MAX_HYPOTHESIS_REASON_CHARS = 2_000;

// Unbounded on purpose: the schema is checked for the whole evaluation, so a rejection here would
// fail every evaluator in the set. `renderReport` truncates instead.
export const reportHypothesisSchema = lazySchema(() =>
  z.object({
    candidate: z.string(),
    status: z.string(),
    confidence: z.number(),
    reason: z.string().optional(),
  })
);

export type ReportHypothesis = z.infer<typeof reportHypothesisSchema>;

/** Reference data for the reference-free judges that grade the report; absent data parses to `{}`. */
export const reportReferenceDataSchema = lazySchema(() =>
  z.object({ hypotheses: z.array(reportHypothesisSchema).optional() }).default({})
);

export type ReportReferenceData = z.infer<typeof reportReferenceDataSchema>;

const renderHypothesis = ({ candidate, status, confidence, reason }: ReportHypothesis): string => {
  const line = `- [${status}] ${candidate} (confidence ${confidence})`;
  return reason ? `${line}\n  Reason: ${truncate(reason, MAX_HYPOTHESIS_REASON_CHARS)}` : line;
};

/** Renders the answer followed by the hypotheses panel; returns the answer alone without hypotheses. */
export const renderReport = ({
  answer,
  hypotheses,
}: {
  answer: string;
  hypotheses?: ReportHypothesis[];
}): string => {
  if (!hypotheses || hypotheses.length === 0) {
    return answer;
  }
  return `${answer}\n\n## Hypotheses panel (shown to the user)\n${hypotheses
    .map(renderHypothesis)
    .join('\n')}`;
};
