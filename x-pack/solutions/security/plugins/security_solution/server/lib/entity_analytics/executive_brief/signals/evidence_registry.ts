/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Entity } from '@kbn/entity-store/common';
import type { Evidence, EntityRef, SignalOutcome, SignalOutput } from './types';
import type { Fact } from '../../../../../common/api/entity_analytics/executive_brief/common.gen';
import { minimalEntityRecord, nameFromEuid } from '../entity_record';
import type { EntityResolution } from './resolve_entities';

export interface SignalResult {
  signalId: string;
  output: SignalOutput;
}

/**
 * Turns signal outputs into `Evidence`. Results are consumed in the order given (the engine passes
 * them in signal-priority order, not completion order), so the same outputs always get the same
 * evidence: entities keyed by golden EUID in order of first appearance, and facts numbered 1, 2, …
 * in output order. Each entity is its golden Entity Store record, or the record a signal read when
 * resolution has none.
 */
export const buildEvidence = ({
  results,
  outcomes,
  resolution,
}: {
  results: readonly SignalResult[];
  outcomes: readonly SignalOutcome[];
  resolution: EntityResolution;
}): Evidence => {
  const entityRefs = new Map<string, EntityRef>();
  const signalRecords = new Map<string, Entity>();

  for (const { output } of results) {
    for (const record of output.entityRecords ?? []) {
      const euid = record.entity?.id;
      if (euid && resolution.golden(euid) === euid && !signalRecords.has(euid)) {
        signalRecords.set(euid, record);
      }
    }
  }

  /** Returns the golden euid, remembering the first ref seen for it. */
  const registerEntity = (ref: EntityRef): string => {
    const golden = resolution.golden(ref.euid);
    if (!entityRefs.has(golden)) {
      entityRefs.set(golden, ref);
    }
    return golden;
  };

  const facts: Fact[] = [];

  for (const { signalId, output } of results) {
    output.facts.forEach((draft) => {
      const id = facts.length + 1;
      const entityIds = [...new Set(draft.entities.map(registerEntity))];
      facts.push({
        id,
        signalId,
        title: draft.title,
        ...(draft.timestamp ? { timestamp: draft.timestamp } : {}),
        ...(draft.severity ? { severity: draft.severity } : {}),
        entityIds,
        ...(draft.numbers && Object.keys(draft.numbers).length > 0
          ? { numbers: draft.numbers }
          : {}),
        ...(draft.details && Object.keys(draft.details).length > 0
          ? { details: draft.details }
          : {}),
        ...(draft.source ? { source: draft.source } : {}),
      });
    });
  }

  const entities: Record<string, Entity> = {};
  for (const [golden, ref] of entityRefs) {
    entities[golden] =
      resolution.get(golden) ??
      signalRecords.get(golden) ??
      minimalEntityRecord({
        euid: golden,
        type: ref.type,
        name: ref.euid === golden && ref.name ? ref.name : nameFromEuid(golden),
      });
  }

  const signals: Evidence['signals'] = {};
  for (const { id, status, took } of outcomes) {
    signals[id] = { status, took };
  }

  return { entities, facts, signals };
};
