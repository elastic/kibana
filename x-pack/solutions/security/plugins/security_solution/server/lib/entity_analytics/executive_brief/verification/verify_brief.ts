/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Brief,
  VerificationCheck,
  VerificationSummary,
} from '../../../../../common/entity_analytics/executive_brief/brief';
import type { Evidence } from '../../../../../common/entity_analytics/executive_brief/evidence';
import { checkCitations } from './citations';
import { buildEvidenceIndex } from './evidence_index';
import { checkGuardrails } from './guardrails';
import { checkMentions } from './mentions';
import { createNumbersCheck } from './numbers';
import type { BriefCheck, ItemDrop } from './types';
import { assessmentPath, presentAssessments } from './types';

export interface VerifyBriefOptions {
  /** The window label (e.g. "7d"); its number may be quoted. */
  range?: string;
}

export interface VerifyBriefResult {
  /** The brief with unknown ids removed, failing assessments dropped and levels capped. */
  brief: Brief;
  summary: Omit<VerificationSummary, 'repaired'>;
  /** Problems only the model can fix; non-empty means the brief is not usable as is. */
  structuralErrors: string[];
  /** Why items were dropped, and other clean-ups, for debug logging. */
  notes: string[];
}

/**
 * Verifies an AI-written brief against the evidence it was written from. Checks run in order
 * (mentions, citations, numbers, guardrails); each sees the previous one's clean-ups and skips items already
 * marked for removal. Failing assessments are dropped at the end; verdict problems are returned as
 * structural errors for the repair round-trip.
 */
export const verifyBrief = (
  input: Brief,
  evidence: Evidence,
  { range }: VerifyBriefOptions = {}
): VerifyBriefResult => {
  const index = buildEvidenceIndex(evidence);
  const checks: readonly BriefCheck[] = [
    checkMentions,
    checkCitations,
    createNumbersCheck(range),
    checkGuardrails,
  ];

  const dropped = new Map<string, ItemDrop>();
  const structuralErrors: string[] = [];
  const notes: string[] = [];
  let lowered = 0;

  const checked = checks.reduce<Brief>((brief, check) => {
    const outcome = check(brief, { index, dropped: new Set(dropped.keys()) });
    outcome.drops.forEach((drop) => {
      if (!dropped.has(drop.path)) {
        dropped.set(drop.path, drop);
        notes.push(`dropped ${drop.path} (${drop.check}): ${drop.reason}`);
      }
    });
    structuralErrors.push(...outcome.structuralErrors);
    lowered += outcome.lowered;
    notes.push(...outcome.notes);
    return outcome.brief;
  }, input);

  const droppedCounts: Partial<Record<VerificationCheck, number>> = {};
  dropped.forEach(({ check }) => {
    droppedCounts[check] = (droppedCounts[check] ?? 0) + 1;
  });

  return {
    brief: {
      verdict: checked.verdict,
      assessments: presentAssessments(checked.assessments).reduce<Brief['assessments']>(
        (kept, { key, assessment }) =>
          dropped.has(assessmentPath(key)) ? kept : { ...kept, [key]: assessment },
        {}
      ),
    },
    summary: { dropped: droppedCounts, lowered },
    structuralErrors,
    notes,
  };
};
