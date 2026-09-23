/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { LeadEntity } from './types';
import type { LeadCandidate } from './engine/lead_generation_engine';
import { attachRelatedEntities } from './attach_related_entities';

const logger = loggingSystemMock.createLogger();
const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
const spaceId = 'default';

interface EntityOverrides {
  type?: string;
  name?: string;
  id?: string;
  relationships?: Record<string, unknown>;
  criticality?: string;
  riskLevel?: string;
  riskScoreNorm?: number;
}

const buildEntity = ({
  type = 'host',
  name,
  id,
  relationships,
  criticality,
  riskLevel,
  riskScoreNorm,
}: EntityOverrides = {}): LeadEntity => {
  const entityId = id ?? `${type}:${name ?? 'entity'}`;
  return {
    id: entityId,
    type,
    name: name ?? entityId,
    record: {
      entity: {
        id: entityId,
        type,
        name: name ?? entityId,
        relationships,
        risk:
          riskLevel || riskScoreNorm !== undefined
            ? { calculated_level: riskLevel, calculated_score_norm: riskScoreNorm }
            : undefined,
      },
      ...(criticality ? { asset: { criticality } } : {}),
    } as unknown as LeadEntity['record'],
  };
};

const buildCandidate = (entity: LeadEntity): LeadCandidate => ({
  entity,
  priority: 5,
  observations: [],
  leadId: `lead-${entity.id}`,
  topRelatedEntities: [],
  relatedEntityCounts: {},
});

/** Terms aggregation response used by `countInteractingEntities`. */
const interactionCountsResponse = (counts: Record<string, number>) => {
  const buckets = Object.entries(counts).map(([key, doc_count]) => ({ key, doc_count }));
  return {
    aggregations: {
      accesses_frequently: { buckets },
      accesses_infrequently: { buckets: [] },
      communicates_with: { buckets: [] },
    },
  } as never;
};

describe('attachRelatedEntities', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns empty array without querying when there are no candidates', async () => {
    const result = await attachRelatedEntities({
      candidates: [],
      entitiesMap: new Map(),
      esClient,
      spaceId,
      logger,
    });

    expect(result).toEqual([]);
    expect(esClient.search).not.toHaveBeenCalled();
  });

  it('keeps all matching kinds for an entity related via more than one kind', async () => {
    const target = buildEntity({ id: 'host:shared' });
    const candidateEntity = buildEntity({
      id: 'user:alice',
      relationships: {
        communicates_with: { ids: ['host:shared'] },
        administers: { ids: ['host:shared'] },
      },
    });
    esClient.search.mockResolvedValueOnce(interactionCountsResponse({ 'host:shared': 3 }));

    const [result] = await attachRelatedEntities({
      candidates: [buildCandidate(candidateEntity)],
      entitiesMap: new Map([[target.id, target]]),
      esClient,
      spaceId,
      logger,
    });

    expect(result.topRelatedEntities).toHaveLength(1);
    expect(result.topRelatedEntities[0]).toMatchObject({
      id: 'host:shared',
      kinds: ['administers', 'communicates_with'],
      interactedWithAtLeast: 3,
    });
    expect(result.relatedEntityCounts).toEqual({ administers: 1, communicates_with: 1 });
  });

  it('does not let an interaction count from an unrelated interaction kind drag an entity down in a declarative bucket', async () => {
    const mixedKind = buildEntity({ id: 'host:mixed-kind', criticality: 'extreme_impact' });
    const administersOnly = buildEntity({ id: 'host:administers-only', criticality: 'low_impact' });
    const candidateEntity = buildEntity({
      id: 'user:alice',
      relationships: {
        administers: { ids: [mixedKind.id, administersOnly.id] },
        communicates_with: { ids: [mixedKind.id] },
      },
    });
    esClient.search.mockResolvedValueOnce(interactionCountsResponse({ [mixedKind.id]: 1 }));

    const [result] = await attachRelatedEntities({
      candidates: [buildCandidate(candidateEntity)],
      entitiesMap: new Map([
        [mixedKind.id, mixedKind],
        [administersOnly.id, administersOnly],
      ]),
      esClient,
      spaceId,
      logger,
    });

    expect(result.topRelatedEntities.map((e) => e.id)).toEqual([mixedKind.id, administersOnly.id]);
  });

  it('excludes unresolved targets', async () => {
    const candidateEntity = buildEntity({
      id: 'user:alice',
      relationships: { owns: { ids: ['host:unknown'] } },
    });

    const [result] = await attachRelatedEntities({
      candidates: [buildCandidate(candidateEntity)],
      entitiesMap: new Map(),
      esClient,
      spaceId,
      logger,
    });

    expect(result.topRelatedEntities).toEqual([]);
    expect(esClient.search).not.toHaveBeenCalled();
  });

  it('keeps a solo interaction-kind edge when there is nothing more shared competing for its kind', async () => {
    const target = buildEntity({ id: 'host:solo' });
    const candidateEntity = buildEntity({
      id: 'user:alice',
      relationships: { accesses_frequently: { ids: ['host:solo'] } },
    });
    esClient.search.mockResolvedValueOnce(interactionCountsResponse({ 'host:solo': 1 }));

    const [result] = await attachRelatedEntities({
      candidates: [buildCandidate(candidateEntity)],
      entitiesMap: new Map([[target.id, target]]),
      esClient,
      spaceId,
      logger,
    });

    expect(result.topRelatedEntities).toEqual([
      expect.objectContaining({ id: 'host:solo', interactedWithAtLeast: 1 }),
    ]);
    expect(result.relatedEntityCounts).toEqual({ accesses_frequently: 1 });
  });

  it('drops the entity that falls in the unshared tier once a kind is over its per-kind cap', async () => {
    // accesses_frequently caps at 5; 6 candidates means one must be dropped. All
    // have significanceScore 0, so the shared tier decides: least ubiquitous
    // first, and the one unshared entity (count 1) loses the slot.
    const interactionCountByIndex = [5, 4, 3, 2, 2, 1];
    const targets = interactionCountByIndex.map((count, i) =>
      buildEntity({ id: `host:target-${i}-count-${count}` })
    );
    const candidateEntity = buildEntity({
      id: 'user:alice',
      relationships: { accesses_frequently: { ids: targets.map((t) => t.id) } },
    });
    const counts = Object.fromEntries(targets.map((t, i) => [t.id, interactionCountByIndex[i]]));
    esClient.search.mockResolvedValueOnce(interactionCountsResponse(counts));

    const [result] = await attachRelatedEntities({
      candidates: [buildCandidate(candidateEntity)],
      entitiesMap: new Map(targets.map((t) => [t.id, t])),
      esClient,
      spaceId,
      logger,
    });

    // counts [5, 4, 3, 2, 2, 1] — ascending, stable for the two tied on 2.
    expect(result.topRelatedEntities.map((e) => e.id)).toEqual([
      targets[3].id,
      targets[4].id,
      targets[2].id,
      targets[1].id,
      targets[0].id,
    ]);
    expect(result.topRelatedEntities.map((e) => e.id)).not.toContain(targets[5].id);
    expect(result.relatedEntityCounts).toEqual({ accesses_frequently: 6 });
  });

  it('within the shared tier, ranks by significance rather than by the interaction count itself', async () => {
    // Both are shared (count > 1), so significance should decide the order,
    // even though lessShared has a higher raw interaction count than moreShared.
    const moreSignificantButLessShared = buildEntity({
      id: 'host:more-significant',
      riskScoreNorm: 50,
    });
    const lessSignificantButMoreShared = buildEntity({
      id: 'host:less-significant',
      riskScoreNorm: 30,
    });
    const candidateEntity = buildEntity({
      id: 'user:alice',
      relationships: {
        accesses_frequently: {
          ids: [moreSignificantButLessShared.id, lessSignificantButMoreShared.id],
        },
      },
    });
    esClient.search.mockResolvedValueOnce(
      interactionCountsResponse({
        [moreSignificantButLessShared.id]: 2,
        [lessSignificantButMoreShared.id]: 3,
      })
    );

    const [result] = await attachRelatedEntities({
      candidates: [buildCandidate(candidateEntity)],
      entitiesMap: new Map(
        [moreSignificantButLessShared, lessSignificantButMoreShared].map((e) => [e.id, e])
      ),
      esClient,
      spaceId,
      logger,
    });

    expect(result.topRelatedEntities.map((e) => e.id)).toEqual([
      moreSignificantButLessShared.id,
      lessSignificantButMoreShared.id,
    ]);
  });

  it('ranks a significant unshared target above an insignificant shared one', async () => {
    // Significance outranks sharing.
    const dedicatedCriticalServer = buildEntity({
      id: 'host:backup-server',
      criticality: 'extreme_impact',
    });
    const unremarkableSharedBox = buildEntity({ id: 'host:shared-box' });
    const candidateEntity = buildEntity({
      id: 'user:svc-backup',
      relationships: {
        accesses_frequently: { ids: [unremarkableSharedBox.id, dedicatedCriticalServer.id] },
      },
    });
    esClient.search.mockResolvedValueOnce(
      interactionCountsResponse({
        [dedicatedCriticalServer.id]: 1,
        [unremarkableSharedBox.id]: 6,
      })
    );

    const [result] = await attachRelatedEntities({
      candidates: [buildCandidate(candidateEntity)],
      entitiesMap: new Map([dedicatedCriticalServer, unremarkableSharedBox].map((e) => [e.id, e])),
      esClient,
      spaceId,
      logger,
    });

    expect(result.topRelatedEntities.map((e) => e.id)).toEqual([
      dedicatedCriticalServer.id,
      unremarkableSharedBox.id,
    ]);
  });

  it('prefers the less ubiquitous of two equally significant shared targets', async () => {
    // A handful of co-accessors is a lead; hundreds is background.
    const nearlyEverything = buildEntity({ id: 'host:file-server' });
    const handfulOfEntities = buildEntity({ id: 'host:build-server' });
    const candidateEntity = buildEntity({
      id: 'user:alice',
      relationships: {
        accesses_infrequently: { ids: [nearlyEverything.id, handfulOfEntities.id] },
      },
    });
    esClient.search.mockResolvedValueOnce(
      interactionCountsResponse({
        [nearlyEverything.id]: 380,
        [handfulOfEntities.id]: 4,
      })
    );

    const [result] = await attachRelatedEntities({
      candidates: [buildCandidate(candidateEntity)],
      entitiesMap: new Map([nearlyEverything, handfulOfEntities].map((e) => [e.id, e])),
      esClient,
      spaceId,
      logger,
    });

    expect(result.topRelatedEntities.map((e) => e.id)).toEqual([
      handfulOfEntities.id,
      nearlyEverything.id,
    ]);
  });

  it('keeps interaction-kind edges touched by more than one entity, with interactedWithAtLeast set', async () => {
    const target = buildEntity({ id: 'host:shared' });
    const candidateEntity = buildEntity({
      id: 'user:alice',
      relationships: { accesses_frequently: { ids: ['host:shared'] } },
    });
    esClient.search.mockResolvedValueOnce(interactionCountsResponse({ 'host:shared': 4 }));

    const [result] = await attachRelatedEntities({
      candidates: [buildCandidate(candidateEntity)],
      entitiesMap: new Map([[target.id, target]]),
      esClient,
      spaceId,
      logger,
    });

    expect(result.topRelatedEntities).toEqual([
      expect.objectContaining({ id: 'host:shared', interactedWithAtLeast: 4 }),
    ]);
  });

  it('does not drop owns/administers edges', async () => {
    const target = buildEntity({ id: 'host:owned' });
    const candidateEntity = buildEntity({
      id: 'user:alice',
      relationships: { owns: { ids: ['host:owned'] } },
    });

    const [result] = await attachRelatedEntities({
      candidates: [buildCandidate(candidateEntity)],
      entitiesMap: new Map([[target.id, target]]),
      esClient,
      spaceId,
      logger,
    });

    expect(esClient.search).not.toHaveBeenCalled();
    expect(result.topRelatedEntities).toEqual([
      expect.objectContaining({ id: 'host:owned', interactedWithAtLeast: undefined }),
    ]);
  });

  it('withInteractionCounts: false issues no query and leaves interactedWithAtLeast undefined', async () => {
    const target = buildEntity({ id: 'host:shared' });
    const candidateEntity = buildEntity({
      id: 'user:alice',
      relationships: { accesses_frequently: { ids: ['host:shared'] } },
    });

    const [result] = await attachRelatedEntities({
      candidates: [buildCandidate(candidateEntity)],
      entitiesMap: new Map([[target.id, target]]),
      esClient,
      spaceId,
      logger,
      withInteractionCounts: false,
    });

    expect(esClient.search).not.toHaveBeenCalled();
    expect(result.topRelatedEntities).toEqual([
      expect.objectContaining({ id: 'host:shared', interactedWithAtLeast: undefined }),
    ]);
  });

  it('produces identical topRelatedEntities regardless of withInteractionCounts when selection does not depend on the accessor count', async () => {
    const owned = buildEntity({ id: 'host:owned', criticality: 'high_impact' });
    const administered = buildEntity({ id: 'host:administered', riskScoreNorm: 40 });
    const candidateEntity = buildEntity({
      id: 'user:alice',
      relationships: {
        owns: { ids: [owned.id] },
        administers: { ids: [administered.id] },
      },
    });
    const entitiesMap = new Map([
      [owned.id, owned],
      [administered.id, administered],
    ]);

    const [withCounts] = await attachRelatedEntities({
      candidates: [buildCandidate(candidateEntity)],
      entitiesMap,
      esClient,
      spaceId,
      logger,
      withInteractionCounts: true,
    });
    const [withoutCounts] = await attachRelatedEntities({
      candidates: [buildCandidate(candidateEntity)],
      entitiesMap,
      esClient,
      spaceId,
      logger,
      withInteractionCounts: false,
    });

    expect(withoutCounts.topRelatedEntities).toEqual(withCounts.topRelatedEntities);
  });

  it('caps each kind independently and reports the pre-cap count per kind', async () => {
    const owned = buildEntity({ id: 'host:owned', criticality: 'high_impact' });
    const highValueAccess = buildEntity({ id: 'host:high-value', riskScoreNorm: 90 });
    const lowValueAccess = buildEntity({ id: 'host:low-value', riskScoreNorm: 10 });
    const extras = Array.from({ length: 20 }, (_, i) => buildEntity({ id: `host:extra-${i}` }));

    const candidateEntity = buildEntity({
      id: 'user:alice',
      relationships: {
        owns: { ids: [owned.id] },
        accesses_frequently: {
          ids: [highValueAccess.id, lowValueAccess.id, ...extras.map((e) => e.id)],
        },
      },
    });

    const counts: Record<string, number> = { [highValueAccess.id]: 5, [lowValueAccess.id]: 3 };
    extras.forEach((e) => {
      counts[e.id] = 2;
    });
    esClient.search.mockResolvedValueOnce(interactionCountsResponse(counts));

    const entitiesMap = new Map(
      [owned, highValueAccess, lowValueAccess, ...extras].map((e) => [e.id, e])
    );

    const [result] = await attachRelatedEntities({
      candidates: [buildCandidate(candidateEntity)],
      entitiesMap,
      esClient,
      spaceId,
      logger,
    });

    // `owns` cap is 10 but only 1 entity qualifies; `accesses_frequently` cap is 5
    // out of 22 qualifying entities.
    expect(result.topRelatedEntities).toHaveLength(1 + 5);
    expect(result.topRelatedEntities[0].id).toBe(owned.id);
    expect(result.topRelatedEntities[1].id).toBe(highValueAccess.id);
    expect(result.relatedEntityCounts).toEqual({ owns: 1, accesses_frequently: 22 });
  });
});
