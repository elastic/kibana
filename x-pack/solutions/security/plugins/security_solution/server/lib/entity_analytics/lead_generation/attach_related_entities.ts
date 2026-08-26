/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { LeadEntity, RelatedEntity } from './types';
import type { LeadCandidate } from './engine/lead_generation_engine';
import {
  getEntityRelationships,
  countInteractingEntities,
  ALL_KINDS,
  INTERACTION_KINDS,
  type InteractionKind,
  type RelatedEntityKind,
} from './entities_relationships';
import { getAssetCriticality, getEntityRisk } from './observation_modules/utils';

const isInteractionKind = (kind: RelatedEntityKind): kind is InteractionKind =>
  (INTERACTION_KINDS as readonly string[]).includes(kind);

const PER_KIND_CAP: Record<RelatedEntityKind, number> = {
  administers: 10,
  owns: 10,
  accesses_infrequently: 5,
  accesses_frequently: 5,
  communicates_with: 5,
};

const CRITICALITY_SCORES: Partial<Record<string, number>> = {
  low_impact: 25,
  medium_impact: 50,
  high_impact: 75,
  extreme_impact: 100,
};

const RISK_LEVEL_SCORES: Partial<Record<string, number>> = {
  Low: 25,
  Moderate: 50,
  High: 75,
  Critical: 100,
};

const getSignificanceScore = (entity: LeadEntity): number => {
  const criticality = getAssetCriticality(entity);
  const criticalityScore = criticality ? CRITICALITY_SCORES[criticality] ?? 0 : 0;
  const riskScore = getEntityRisk(entity)?.calculatedScoreNorm ?? 0;
  return Math.max(criticalityScore, riskScore);
};

export const getRelatedEntitySignificance = (related: RelatedEntity): number =>
  Math.max(
    related.criticality ? CRITICALITY_SCORES[related.criticality] ?? 0 : 0,
    related.riskLevel ? RISK_LEVEL_SCORES[related.riskLevel] ?? 0 : 0
  );

/**
 * Walks `candidate`'s relationship ids across all kinds, joins each id to
 * `entitiesMap` (which contains all entities data), and unions every related
 * entity kind an id matches under onto a single {@link Resolved} entry
 */
const resolveRelatedEntities = (
  candidate: LeadCandidate,
  entitiesMap: ReadonlyMap<string, LeadEntity>
): Resolved[] => {
  const relationships = getEntityRelationships(candidate.entity);
  if (!relationships) return [];

  const kindsById = new Map<string, Set<RelatedEntityKind>>();
  for (const kind of ALL_KINDS) {
    for (const id of relationships[kind]?.ids ?? []) {
      const kinds = kindsById.get(id);
      if (kinds) kinds.add(kind);
      else kindsById.set(id, new Set([kind]));
    }
  }

  const resolved: Resolved[] = [];
  for (const [id, kinds] of kindsById) {
    const entity = entitiesMap.get(id);
    if (entity) {
      resolved.push({
        entity,
        kinds,
        hasInteractionKind: [...kinds].some(isInteractionKind),
        significanceScore: getSignificanceScore(entity),
      });
    }
  }

  return resolved;
};

/**
 * Ranks by significance first
 * For interaction kinds: then ranks shared entities (> 1 interaction count) first.
 * Final tie-breaker: lower interaction count, since a target nearly every entity
 * touches says less than one only a few do.
 */
const compareWithinKind = (
  a: Resolved,
  b: Resolved,
  interactionCounts: ReadonlyMap<string, number>,
  kind: RelatedEntityKind
) => {
  if (b.significanceScore !== a.significanceScore) return b.significanceScore - a.significanceScore;

  if (!isInteractionKind(kind)) return 0;

  const aCount = interactionCounts.get(a.entity.id) ?? 0;
  const bCount = interactionCounts.get(b.entity.id) ?? 0;
  const aShared = aCount > 1;
  const bShared = bCount > 1;

  if (aShared !== bShared) return aShared ? -1 : 1;
  if (aShared && bShared) return aCount - bCount;
  return 0;
};

/**
 * Selects up to {@link PER_KIND_CAP} entities per kind. Some kinds can have
 * hundreds of edges, which could overwhelm a lead with little added insight,
 * so only the most significant few (see {@link getSignificanceScore}) are
 * kept per kind. Also returns, for each kind with at least one qualifying
 * entity, how many existed before the cap (`relatedEntityCounts`)
 */
const selectPerKind = (
  resolved: readonly Resolved[],
  interactionCounts: ReadonlyMap<string, number>
): { selected: Resolved[]; counts: Record<string, number> } => {
  const counts: Record<string, number> = {};
  const selectedIds = new Set<string>();
  const selected: Resolved[] = [];

  for (const kind of ALL_KINDS) {
    // Keep track of this kind's own bucket, sorted most significant first,
    // so it's capped and counted independently of every other kind's bucket.
    const bucket = resolved
      .filter((r) => r.kinds.has(kind))
      .sort((a, b) => compareWithinKind(a, b, interactionCounts, kind));
    if (bucket.length > 0) counts[kind] = bucket.length;

    // Keep track of already-selected entities so that, when a mixed-kind
    // entity was already added under an earlier kind, it doesn't get
    // duplicated here and doesn't take up one of this kind's cap slots.
    for (const r of bucket.slice(0, PER_KIND_CAP[kind])) {
      if (!selectedIds.has(r.entity.id)) {
        selectedIds.add(r.entity.id);
        selected.push(r);
      }
    }
  }

  return { selected, counts };
};

interface Resolved {
  readonly entity: LeadEntity;
  readonly kinds: ReadonlySet<RelatedEntityKind>;
  readonly hasInteractionKind: boolean;
  readonly significanceScore: number;
}

export const attachRelatedEntities = async ({
  candidates,
  entitiesMap,
  esClient,
  spaceId,
  logger,
  withInteractionCounts = true,
}: {
  candidates: readonly LeadCandidate[];
  entitiesMap: ReadonlyMap<string, LeadEntity>;
  esClient: ElasticsearchClient;
  spaceId: string;
  logger: Logger;
  withInteractionCounts?: boolean;
}): Promise<LeadCandidate[]> => {
  if (candidates.length === 0) return [];

  // group entities by ID and map all relationships kinds
  const resolvedByCandidate = candidates.map((candidate) =>
    resolveRelatedEntities(candidate, entitiesMap)
  );

  // get access/communication relationships and count how many other entities are interacting with them
  const interactionCounts = withInteractionCounts
    ? await countInteractingEntities(
        esClient,
        spaceId,
        [
          ...new Set(
            resolvedByCandidate
              .flat()
              .filter((r) => r.hasInteractionKind)
              .map(({ entity }) => entity.id)
          ),
        ],
        logger
      )
    : new Map<string, number>();

  const candidatesWithRelated = candidates.map((candidate, i) => {
    // select the top entities per kind
    const { selected, counts } = selectPerKind(resolvedByCandidate[i], interactionCounts);

    const topRelatedEntities: RelatedEntity[] = selected.map(
      ({ entity, kinds, hasInteractionKind }) => {
        return {
          id: entity.id,
          type: entity.type,
          name: entity.name,
          kinds: [...kinds],
          riskLevel: getEntityRisk(entity)?.calculatedLevel,
          criticality: getAssetCriticality(entity),
          interactedWithAtLeast: hasInteractionKind ? interactionCounts.get(entity.id) : undefined,
        };
      }
    );

    return { ...candidate, topRelatedEntities, relatedEntityCounts: counts };
  });

  return candidatesWithRelated;
};
