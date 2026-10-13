/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttentionLevel } from '../../../../../common/entity_analytics/executive_brief/brief';
import { unique } from './evidence_index';
import type { BriefCheck, CheckOutcome } from './types';
import {
  assessmentPath,
  emptyOutcome,
  isDropped,
  mapAssessments,
  presentAssessments,
} from './types';

/** Only an absence claim ("nothing to report") at level `clear` needs no citation. */
const needsEvidence = (level: AttentionLevel): boolean => level !== 'clear';

/**
 * Citations: ids that are not facts of the evidence are removed from every assessment's
 * `factIds`. An assessment above `clear` left without a fact to back it is dropped. The verdict
 * cites nothing itself; it rests on the facts its assessments cite.
 */
export const checkCitations: BriefCheck = (input, context): CheckOutcome => {
  const { index } = context;
  const removed: number[] = [];
  const keepKnown = (ids: readonly number[]): number[] =>
    unique(ids).filter((id) => {
      if (!index.facts.has(id)) {
        removed.push(id);
      }
      return index.facts.has(id);
    });

  const outcome = emptyOutcome({
    ...input,
    assessments: mapAssessments(input.assessments, (assessment) => ({
      ...assessment,
      factIds: keepKnown(assessment.factIds),
    })),
  });
  if (removed.length > 0) {
    outcome.notes.push(`removed unknown fact ids: ${unique(removed).join(', ')}`);
  }

  presentAssessments(outcome.brief.assessments).forEach(({ key, assessment }) => {
    const path = assessmentPath(key);
    if (
      !isDropped(context, path) &&
      needsEvidence(assessment.level) &&
      assessment.factIds.length === 0
    ) {
      outcome.drops.push({ path, check: 'citation', reason: 'it cites no known fact in factIds' });
    }
  });
  return outcome;
};
