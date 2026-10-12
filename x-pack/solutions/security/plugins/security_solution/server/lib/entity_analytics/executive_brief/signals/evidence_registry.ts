/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  BriefEntity,
  EntityId,
  Evidence,
  Fact,
  FactId,
  Link,
  LinkId,
  LinkType,
  SignalRun,
} from '../../../../../common/entity_analytics/executive_brief/evidence';
import { compareStrings } from './define_signal';
import type { EntityResolution } from './resolve_entities';
import { nameFromEuid } from './resolve_entities';
import type { EntityAttributes, EntityRef, LinkDraft, SignalOutput } from './types';

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

const factNumber = (id: FactId): number => Number(id.slice(2));

const mergeAttributes = (base: EntityAttributes, extra: EntityAttributes): EntityAttributes => {
  const watchlists = [...new Set([...(base.watchlists ?? []), ...(extra.watchlists ?? [])])].sort(
    compareStrings
  );
  return {
    euid: base.euid,
    riskScore: base.riskScore ?? extra.riskScore,
    riskLevel: base.riskLevel ?? extra.riskLevel,
    criticality: base.criticality ?? extra.criticality,
    ...(watchlists.length > 0 ? { watchlists } : {}),
    ...(base.privileged || extra.privileged ? { privileged: true } : {}),
  };
};

/**
 * Turns signal outputs into `Evidence` with stable ids. Results are consumed in the order given
 * (the engine passes them in signal-priority order, not completion order), so the same outputs
 * always get the same ids: entities `ENT-n` by first appearance (each result's facts, then its
 * links), keyed by golden euid; facts `F-n` in output order; links `L-n` in output order after
 * resolution. Links that collapse onto one entity are dropped, and identical links (in either
 * direction for undirected types) are merged.
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
  const entityIds = new Map<string, EntityId>();
  const entityRefs = new Map<string, EntityRef>();
  const attributes = new Map<string, EntityAttributes>();

  for (const { output } of results) {
    for (const extra of output.entityAttributes ?? []) {
      const golden = resolution.golden(extra.euid);
      const current = attributes.get(golden) ?? { euid: golden };
      attributes.set(golden, mergeAttributes(current, { ...extra, euid: golden }));
    }
  }

  const registerEntity = (ref: EntityRef): EntityId => {
    const golden = resolution.golden(ref.euid);
    const existing = entityIds.get(golden);
    if (existing) {
      return existing;
    }
    const id: EntityId = `ENT-${entityIds.size + 1}`;
    entityIds.set(golden, id);
    entityRefs.set(golden, ref);
    return id;
  };

  const facts: Fact[] = [];
  const linksByKey = new Map<string, Link>();

  const sortFactIds = (ids: FactId[]): FactId[] =>
    [...new Set(ids)].sort((a, b) => factNumber(a) - factNumber(b));

  const addLink = (draft: LinkDraft, factIdsOfOutput: FactId[]): void => {
    const fromGolden = resolution.golden(draft.from.euid);
    const toGolden = resolution.golden(draft.to.euid);
    if (fromGolden === toGolden) {
      return;
    }
    const swap = SYMMETRIC_LINK_TYPES.has(draft.type) && compareStrings(toGolden, fromGolden) < 0;
    const [first, second] = swap ? [draft.to, draft.from] : [draft.from, draft.to];
    const key = `${draft.type}|${swap ? toGolden : fromGolden}|${swap ? fromGolden : toGolden}`;
    const factIds = (draft.factIndexes ?? []).flatMap((index) =>
      factIdsOfOutput[index] ? [factIdsOfOutput[index]] : []
    );
    const existing = linksByKey.get(key);
    if (existing) {
      existing.factIds = sortFactIds([...existing.factIds, ...factIds]);
      if (draft.firstSeen && (!existing.firstSeen || draft.firstSeen < existing.firstSeen)) {
        existing.firstSeen = draft.firstSeen;
      }
      return;
    }
    const from = registerEntity(first);
    const to = registerEntity(second);
    const id: LinkId = `L-${linksByKey.size + 1}`;
    linksByKey.set(key, {
      id,
      type: draft.type,
      from,
      to,
      factIds: sortFactIds(factIds),
      ...(draft.firstSeen ? { firstSeen: draft.firstSeen } : {}),
    });
  };

  for (const { signalId, output } of results) {
    const factIdsOfOutput: FactId[] = output.facts.map((draft) => {
      const id: FactId = `F-${facts.length + 1}`;
      const entities = [...new Set(draft.entities.map(registerEntity))];
      facts.push({
        id,
        kind: draft.kind,
        signalId,
        title: draft.title,
        ...(draft.at ? { at: draft.at } : {}),
        ...(draft.severity ? { severity: draft.severity } : {}),
        entities,
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

  const entities: Record<EntityId, BriefEntity> = {};
  for (const [golden, id] of entityIds) {
    const ref = entityRefs.get(golden);
    const resolved = resolution.get(golden);
    const merged = mergeAttributes(
      resolved?.attributes ?? { euid: golden },
      attributes.get(golden) ?? { euid: golden }
    );
    entities[id] = {
      id,
      euid: golden,
      type: resolved?.type ?? ref?.type ?? 'generic',
      name:
        resolved?.name ??
        (ref && ref.euid === golden && ref.name ? ref.name : nameFromEuid(golden)),
      ...(merged.riskScore !== undefined ? { riskScore: merged.riskScore } : {}),
      ...(merged.riskLevel !== undefined ? { riskLevel: merged.riskLevel } : {}),
      ...(merged.criticality !== undefined ? { criticality: merged.criticality } : {}),
      ...(merged.watchlists ? { watchlists: merged.watchlists } : {}),
      ...(merged.privileged ? { privileged: true } : {}),
      ...(resolved && resolved.aliasCount > 0 ? { aliasCount: resolved.aliasCount } : {}),
    };
  }

  return { entities, facts, links: [...linksByKey.values()], signals: [...runs] };
};
