/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Brief,
  VerificationSummary,
} from '../../../../../common/api/entity_analytics/executive_brief/common.gen';
import type { Evidence } from '../signals';
import { checkCitations } from './citations';
import type { BriefCheck } from './context';
import { createCheckContext, mapAssessments } from './context';
import { checkGuardrails } from './guardrails';
import { checkMentions } from './mentions';
import { checkNumbers } from './numbers';

/** In order; each sees the previous one's clean-ups and skips assessments already dropped. */
const CHECKS: readonly BriefCheck[] = [
  checkMentions,
  checkCitations,
  checkNumbers,
  checkGuardrails,
];

export interface VerifyBriefResult {
  /** The brief with unknown ids removed, failing assessments dropped and levels capped. */
  brief: Brief;
  summary: Omit<VerificationSummary, 'repaired'>;
  /** Problems only the model can fix; non-empty means the brief is not usable as is. */
  structuralErrors: string[];
  /** Drops and other clean-ups, for debug logging. */
  notes: string[];
}

/** Verifies an AI-written brief against the evidence it was written from; `range` is the window label. */
export const verifyBrief = (
  input: Brief,
  evidence: Evidence,
  range?: string
): VerifyBriefResult => {
  const context = createCheckContext(evidence, range);
  const checked = CHECKS.reduce((brief, check) => check(brief, context), input);
  const dropped: VerificationSummary['dropped'] = {};
  context.dropped.forEach((check) => {
    dropped[check] = (dropped[check] ?? 0) + 1;
  });
  return {
    brief: {
      verdict: checked.verdict,
      assessments: mapAssessments(checked.assessments, (assessment, key) =>
        context.dropped.has(key) ? undefined : assessment
      ),
    },
    summary: { dropped, lowered: context.lowered },
    structuralErrors: context.structuralErrors,
    notes: context.notes,
  };
};
