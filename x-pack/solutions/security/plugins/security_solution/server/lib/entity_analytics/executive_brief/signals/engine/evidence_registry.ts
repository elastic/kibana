/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Entity } from '@kbn/entity-store/common';
import type { Fact } from '../../../../../../common/api/entity_analytics/executive_brief/common.gen';
import type { Evidence, FactDraft, SignalOutcome } from './types';

/**
 * Turns the signals' facts, in signal-priority order, into `Evidence`: facts numbered 1, 2, … and
 * entities keyed by EUID in order of first appearance, so the same output always gets the same ids.
 */
export const buildEvidence = (
  results: ReadonlyArray<{ signalId: string; facts: readonly FactDraft[] }>,
  outcomes: readonly SignalOutcome[]
): Evidence => {
  const entities: Record<string, Entity> = {};
  const facts: Fact[] = [];

  for (const { signalId, facts: drafts } of results) {
    for (const { entities: records, numbers, details, ...draft } of drafts) {
      const entityIds = records.flatMap((record) => {
        const euid = record.entity?.id;
        if (!euid) return [];
        entities[euid] ??= record;
        return [euid];
      });
      facts.push({
        ...draft,
        id: facts.length + 1,
        signalId,
        entityIds: [...new Set(entityIds)],
        ...(numbers && Object.keys(numbers).length > 0 ? { numbers } : {}),
        ...(details && Object.keys(details).length > 0 ? { details } : {}),
      });
    }
  }

  const signals: Evidence['signals'] = {};
  for (const { id, status, took } of outcomes) {
    signals[id] = { status, took };
  }
  return { entities, facts, signals };
};
