/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndexedBehavior, ValidatedBehavior } from './types';

const buildFindingId = (techniqueId: string, reportId?: string): string =>
  `${reportId ?? 'anon'}:${techniqueId}`;

/** Projects `ValidatedBehavior[]` to the strict `extracted.behaviors` nested mapping shape. */
export const toIndexedBehaviors = (
  behaviors: ValidatedBehavior[],
  reportId?: string
): IndexedBehavior[] =>
  behaviors.map(({ technique_id, evidence_quote, llm_confidence, confidence }) => ({
    id: buildFindingId(technique_id, reportId),
    technique_id,
    description: evidence_quote,
    llm_confidence,
    confidence,
  }));
