/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { partition, uniq } from 'lodash';
import { MAX_CITED_IDS } from '../../../../../common/entity_analytics/executive_brief/brief';
import type { BriefCheck } from './context';
import { failClaim, mapAssessments } from './context';

/**
 * Citations: ids that are not facts of the evidence are removed (and the rest deduplicated and
 * capped). An assessment above `clear` left without a fact is dropped. The verdict cites nothing
 * itself; it rests on the facts its assessments cite.
 */
export const checkCitations: BriefCheck = (brief, context) => {
  const removed: number[] = [];
  const assessments = mapAssessments(brief.assessments, (assessment, key) => {
    const [known, unknown] = partition(uniq(assessment.factIds), (id) => context.facts.has(id));
    removed.push(...unknown);
    if (assessment.level !== 'clear' && known.length === 0) {
      failClaim(context, key, 'citation', 'it cites no known fact in factIds');
    }
    return { ...assessment, factIds: known.slice(0, MAX_CITED_IDS) };
  });
  if (removed.length > 0) {
    context.notes.push(`removed unknown fact ids: ${uniq(removed).join(', ')}`);
  }
  return { ...brief, assessments };
};
