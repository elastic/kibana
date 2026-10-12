/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { LinkType } from '../../../../../common/entity_analytics/executive_brief/evidence';
import type { BriefSignal, EntityRef, FactDraft, LinkDraft } from './types';
import { getEntitiesLatestIndex, getEntitiesMetadataIndex } from './shared/indices';
import { isIndexNotFoundError } from './define_signal';
import { fetchResolutionGroups } from './shared/resolution_groups';

const RELATIONSHIP_KINDS = [
  'owns',
  'administers',
  'accesses_frequently',
  'accesses_infrequently',
  'communicates_with',
  'supervises',
] as const;
type RelationshipKind = (typeof RELATIONSHIP_KINDS)[number];

const LINK_TYPE_BY_KIND: Record<RelationshipKind, LinkType> = {
  owns: 'owns',
  administers: 'administers',
  accesses_frequently: 'accesses_frequently',
  accesses_infrequently: 'accesses_rarely',
  communicates_with: 'communicates_with',
  supervises: 'supervises',
};

/** Only first-ever access is reported as a fact; other kinds still become links. */
const ACCESS_KINDS: ReadonlySet<RelationshipKind> = new Set([
  'accesses_frequently',
  'accesses_infrequently',
]);

/**
 * The first maintainer run backfills the lookback window with the install time, so first-seen
 * only means something once a kind has at least this much history (and then only for
 * relationships observed after the first run).
 */
const RELATIONSHIP_HISTORY_MIN_DAYS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_LINKS = 100;
const MAX_FACTS = 20;

const idsField = (kind: RelationshipKind): string => `entity.relationships.${kind}.ids`;
const targetField = (kind: RelationshipKind): string => `entity.relationships.${kind}.target`;

interface RelatedPair {
  kind: RelationshipKind;
  from: EntityRef;
  to: EntityRef;
}

interface TargetBucket {
  key: string;
  first?: { value_as_string?: string };
}
interface ActorBucket {
  key: string;
  targets?: { buckets?: TargetBucket[] };
}

const unique = (values: string[]): string[] => [...new Set(values)].sort();

const asStrings = (value: unknown): string[] =>
  (Array.isArray(value) ? value : []).filter(
    (item): item is string => typeof item === 'string' && item.length > 0
  );

/**
 * First-observed time of each (actor, kind, target) from `relationship_observed` metadata docs,
 * and each kind's history start, in one size:0 search. Keys are `kind|fromGolden|toGolden`.
 */
const fetchFirstSeen = async ({
  esClient,
  spaceId,
  pairs,
  membersOf,
  goldenOf,
  abortSignal,
}: {
  esClient: ElasticsearchClient;
  spaceId: string;
  pairs: RelatedPair[];
  membersOf: Map<string, string[]>;
  goldenOf: Map<string, string>;
  abortSignal: AbortSignal;
}): Promise<{ firstSeen: Map<string, string>; historyStart: Map<RelationshipKind, string> }> => {
  const aggs: Record<string, estypes.AggregationsAggregationContainer> = {};
  const kinds = RELATIONSHIP_KINDS.filter((kind) => pairs.some((pair) => pair.kind === kind));
  for (const kind of kinds) {
    const kindPairs = pairs.filter((pair) => pair.kind === kind);
    const actorIds = unique(kindPairs.flatMap((pair) => membersOf.get(pair.from.euid) ?? []));
    const targetIds = unique(kindPairs.flatMap((pair) => membersOf.get(pair.to.euid) ?? []));
    aggs[`history_${kind}`] = {
      filter: { exists: { field: targetField(kind) } },
      aggs: { start: { min: { field: '@timestamp' } } },
    };
    aggs[`scoped_${kind}`] = {
      filter: {
        bool: {
          filter: [{ terms: { 'entity.id': actorIds } }, { exists: { field: targetField(kind) } }],
        },
      },
      aggs: {
        actors: {
          terms: { field: 'entity.id', include: actorIds, size: actorIds.length },
          aggs: {
            targets: {
              terms: { field: targetField(kind), include: targetIds, size: targetIds.length },
              aggs: { first: { min: { field: '@timestamp' } } },
            },
          },
        },
      },
    };
  }

  const response = await esClient.search(
    {
      index: getEntitiesMetadataIndex(spaceId),
      size: 0,
      query: { term: { 'event.action': 'relationship_observed' } },
      aggs,
    },
    { signal: abortSignal }
  );

  const aggregations = (response.aggregations ?? {}) as Record<string, unknown>;
  const historyStart = new Map<RelationshipKind, string>();
  const firstSeen = new Map<string, string>();
  for (const kind of kinds) {
    const start = (aggregations[`history_${kind}`] as { start?: { value_as_string?: string } })
      ?.start?.value_as_string;
    if (start) {
      historyStart.set(kind, start);
    }
    const actors =
      (aggregations[`scoped_${kind}`] as { actors?: { buckets?: ActorBucket[] } })?.actors
        ?.buckets ?? [];
    for (const actor of actors) {
      const fromGolden = goldenOf.get(String(actor.key));
      for (const target of actor.targets?.buckets ?? []) {
        const toGolden = goldenOf.get(String(target.key));
        const at = target.first?.value_as_string;
        const key = `${kind}|${fromGolden}|${toGolden}`;
        const existing = firstSeen.get(key);
        if (fromGolden && toGolden && at && (!existing || at < existing)) {
          firstSeen.set(key, at);
        }
      }
    }
  }
  return { firstSeen, historyStart };
};

/** Relationships among the candidate entities, with first-ever access within the window. */
export const relationshipsSignal: BriefSignal<'entities'> = {
  id: 'relationships',
  title: 'Relationships',
  capability: 'relationships',
  scope: 'entities',
  isAvailable: async ({ esClient, spaceId }) => {
    try {
      const { count } = await esClient.count({
        index: getEntitiesLatestIndex(spaceId),
        query: {
          bool: {
            should: RELATIONSHIP_KINDS.map((kind) => ({ exists: { field: idsField(kind) } })),
            minimum_should_match: 1,
          },
        },
        terminate_after: 1,
      });
      return count > 0
        ? { available: true }
        : { available: false, reason: 'No entity relationships have been computed yet' };
    } catch (error) {
      if (isIndexNotFoundError(error)) {
        return { available: false, reason: 'The Entity Store has not been set up' };
      }
      throw error;
    }
  },
  run: async (ctx, { entities }, abortSignal) => {
    if (entities.length < 2) {
      return { facts: [], links: [] };
    }
    const { esClient, spaceId, timeRange, now } = ctx;
    const { membersOf, goldenOf, fieldsOf } = await fetchResolutionGroups({
      esClient,
      spaceId,
      goldenEuids: entities.map(({ euid }) => euid),
      fields: RELATIONSHIP_KINDS.map(idsField),
      abortSignal,
    });
    const entityByEuid = new Map(entities.map((entity) => [entity.euid, entity]));

    // Targets of every group member (golden and aliases), kept only when they resolve to
    // another candidate: the set stays bounded by the candidate count.
    const pairByKey = new Map<string, RelatedPair>();
    for (const from of entities) {
      for (const member of membersOf.get(from.euid) ?? []) {
        const memberFields = fieldsOf.get(member) ?? {};
        for (const kind of RELATIONSHIP_KINDS) {
          for (const target of asStrings(memberFields[idsField(kind)])) {
            const to = entityByEuid.get(goldenOf.get(target) ?? '');
            if (to && to.euid !== from.euid) {
              pairByKey.set(`${kind}|${from.euid}|${to.euid}`, { kind, from, to });
            }
          }
        }
      }
    }
    const pairs = [...pairByKey.values()];
    if (pairs.length === 0) {
      return { facts: [], links: [] };
    }

    const { firstSeen, historyStart } = await fetchFirstSeen({
      esClient,
      spaceId,
      pairs,
      membersOf,
      goldenOf,
      abortSignal,
    });

    // Backfill guard: first-seen is trusted only for kinds with enough history, and only when
    // the relationship appeared after the first (backfilling) run.
    const minHistoryMs = RELATIONSHIP_HISTORY_MIN_DAYS * DAY_MS;
    const trustedFirstSeen = (pair: RelatedPair): string | undefined => {
      const at = firstSeen.get(`${pair.kind}|${pair.from.euid}|${pair.to.euid}`);
      const start = historyStart.get(pair.kind);
      if (!at || !start) {
        return undefined;
      }
      const startMs = new Date(start).getTime();
      return now.getTime() - startMs >= minHistoryMs && new Date(at).getTime() > startMs + DAY_MS
        ? at
        : undefined;
    };

    const fromMs = new Date(timeRange.from).getTime();
    const toMs = new Date(timeRange.to).getTime();
    const enriched = pairs
      .map((pair) => ({ pair, firstSeenAt: trustedFirstSeen(pair) }))
      .sort((a, b) =>
        `${a.pair.kind}|${a.pair.from.euid}|${a.pair.to.euid}`.localeCompare(
          `${b.pair.kind}|${b.pair.from.euid}|${b.pair.to.euid}`
        )
      );

    const factCandidates = enriched
      .filter(({ pair, firstSeenAt }) => {
        if (!firstSeenAt || !ACCESS_KINDS.has(pair.kind)) {
          return false;
        }
        const atMs = new Date(firstSeenAt).getTime();
        return atMs >= fromMs && atMs <= toMs;
      })
      .sort((a, b) => (b.firstSeenAt ?? '').localeCompare(a.firstSeenAt ?? ''))
      .slice(0, MAX_FACTS);

    const facts: FactDraft[] = [];
    const factIndexByPair = new Map<RelatedPair, number>();
    for (const { pair, firstSeenAt } of factCandidates) {
      factIndexByPair.set(pair, facts.length);
      facts.push({
        kind: 'relationship_first_seen',
        title: `First-ever logon: ${pair.from.name} → ${pair.to.name}`,
        at: firstSeenAt,
        entities: [pair.from, pair.to],
        details: { relationship: LINK_TYPE_BY_KIND[pair.kind] },
      });
    }

    const links: LinkDraft[] = enriched.slice(0, MAX_LINKS).map(({ pair, firstSeenAt }) => {
      const factIndex = factIndexByPair.get(pair);
      return {
        type: LINK_TYPE_BY_KIND[pair.kind],
        from: pair.from,
        to: pair.to,
        ...(factIndex !== undefined ? { factIndexes: [factIndex] } : {}),
        ...(firstSeenAt ? { firstSeen: firstSeenAt } : {}),
      };
    });
    return { facts, links };
  },
};
