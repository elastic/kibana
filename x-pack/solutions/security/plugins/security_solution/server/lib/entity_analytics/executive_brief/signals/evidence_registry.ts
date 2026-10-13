/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Entity } from '@kbn/entity-store/common';
import type {
  Evidence,
  Fact,
  Link,
  LinkType,
  SignalRun,
} from '../../../../../common/entity_analytics/executive_brief/evidence';
import { minimalEntityRecord, nameFromEuid } from '../entity_record';
import { compareStrings } from './define_signal';
import type { EntityResolution } from './resolve_entities';
import type { EntityRef, LinkDraft, SignalOutput } from './types';

/** Link types with no direction: (a, b) and (b, a) are the same link. */
const SYMMETRIC_LINK_TYPES: ReadonlySet<LinkType> = new Set<LinkType>([
  'same_attack',
  'co_alert',
  'same_lead',
]);

export interface SignalResult {
  signalId: string;
  output: SignalOutput;
}

/**
 * Turns signal outputs into `Evidence`. Results are consumed in the order given (the engine passes
 * them in signal-priority order, not completion order), so the same outputs always get the same
 * evidence: entities keyed by golden EUID in order of first appearance (each result's facts, then
 * its links), facts numbered 1, 2, … in output order, and links numbered the same way in output
 * order after resolution. Each entity is its golden Entity Store record, or the record a signal
 * read when resolution has none. Links that collapse onto one entity are dropped, and identical
 * links (in either direction for undirected types) are merged.
 */
export const buildEvidence = ({
  results,
  runs,
  resolution,
}: {
  results: readonly SignalResult[];
  runs: readonly SignalRun[];
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
  const linksByKey = new Map<string, Link>();

  const sortFactIds = (ids: number[]): number[] => [...new Set(ids)].sort((a, b) => a - b);

  const addLink = (draft: LinkDraft, factIdsOfOutput: number[]): void => {
    const fromGolden = resolution.golden(draft.from.euid);
    const toGolden = resolution.golden(draft.to.euid);
    if (fromGolden === toGolden) {
      return;
    }
    const swap = SYMMETRIC_LINK_TYPES.has(draft.type) && compareStrings(toGolden, fromGolden) < 0;
    const [first, second] = swap ? [draft.to, draft.from] : [draft.from, draft.to];
    const key = `${draft.type}|${swap ? toGolden : fromGolden}|${swap ? fromGolden : toGolden}`;
    const factIds = (draft.factIndexes ?? []).flatMap((index) =>
      factIdsOfOutput[index] !== undefined ? [factIdsOfOutput[index]] : []
    );
    const existing = linksByKey.get(key);
    if (existing) {
      existing.factIds = sortFactIds([...existing.factIds, ...factIds]);
      if (draft.firstSeen && (!existing.firstSeen || draft.firstSeen < existing.firstSeen)) {
        existing.firstSeen = draft.firstSeen;
      }
      return;
    }
    const fromEntityId = registerEntity(first);
    const toEntityId = registerEntity(second);
    linksByKey.set(key, {
      id: linksByKey.size + 1,
      type: draft.type,
      fromEntityId,
      toEntityId,
      factIds: sortFactIds(factIds),
      ...(draft.firstSeen ? { firstSeen: draft.firstSeen } : {}),
    });
  };

  for (const { signalId, output } of results) {
    const factIdsOfOutput = output.facts.map((draft): number => {
      const id = facts.length + 1;
      const entityIds = [...new Set(draft.entities.map(registerEntity))];
      facts.push({
        id,
        kind: draft.kind,
        signalId,
        title: draft.title,
        ...(draft.at ? { at: draft.at } : {}),
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
      return id;
    });

    (output.links ?? []).forEach((draft) => addLink(draft, factIdsOfOutput));
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

  return { entities, facts, links: [...linksByKey.values()], signals: [...runs] };
};
