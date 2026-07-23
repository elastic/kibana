/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { fetchEntityRelationships } from './fetch_entity_relationships_graph';
import {
  regroupRelationships,
  enrichRelationshipDocData,
  enrichEntityRecords,
} from './parse_records';
import type { Logger } from '@kbn/core/server';
import type { EntityId, RelationshipEsqlRow, EntityRecord } from './types';
import { hashIds } from './utils';
import { getEntitiesLatestIndexName } from '@kbn/cloud-security-posture-common/utils/helpers';
import { ENTITY_RELATIONSHIP_FIELDS } from '@kbn/cloud-security-posture-common/constants';
import { RELATIONSHIP_FIELDS_FORK_BATCH_SIZE } from './constants';
import type { EntityEnrichmentFields } from './fetch_entity_enrichment';

describe('fetchEntityRelationships', () => {
  const esClient = elasticsearchServiceMock.createScopedClusterClient();
  let logger: Logger;

  beforeEach(() => {
    logger = {
      trace: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      error: jest.fn(),
    } as unknown as Logger;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('successful queries', () => {
    it('should NOT use LOOKUP JOIN and should query when entities index exists', async () => {
      const indexName = getEntitiesLatestIndexName('default');

      const toRecordsMock = jest.fn().mockResolvedValue({ records: [] });
      esClient.asCurrentUser.helpers.esql.mockReturnValue({
        toRecords: toRecordsMock,
        toArrowTable: jest.fn(),
        toArrowReader: jest.fn(),
      });

      const entityIds: EntityId[] = [{ id: 'entity-1', isOrigin: false }];

      await fetchEntityRelationships({
        esClient,
        logger,
        entityIds,
        spaceId: 'default',
        entityStoreIndexExists: true,
      });

      // ENTITY_RELATIONSHIP_FIELDS has more than 8 entries, so the query is batched into
      // multiple FORK-bounded ES|QL calls (see RELATIONSHIP_FIELDS_FORK_BATCH_SIZE).
      const batchCount = Math.ceil(
        ENTITY_RELATIONSHIP_FIELDS.length / RELATIONSHIP_FIELDS_FORK_BATCH_SIZE
      );
      expect(esClient.asCurrentUser.helpers.esql).toBeCalledTimes(batchCount);
      const esqlCallArgs = esClient.asCurrentUser.helpers.esql.mock.calls[0];
      const query = esqlCallArgs[0].query;

      // Verify query uses the entity store index and does NOT use LOOKUP JOIN
      expect(query).toContain(`FROM ${indexName}`);
      expect(query).not.toContain('LOOKUP JOIN');
      expect(query).toContain('`entity.relationships.owns.ids`');
    });

    it('should return empty result when entities index does not exist', async () => {
      const entityIds: EntityId[] = [{ id: 'entity-1', isOrigin: false }];

      const result = await fetchEntityRelationships({
        esClient,
        logger,
        entityIds,
        spaceId: 'default',
        entityStoreIndexExists: false,
      });

      // Should not call ESQL when index does not exist
      expect(esClient.asCurrentUser.helpers.esql).not.toHaveBeenCalled();
      expect(result).toEqual({ columns: [], records: [] });
    });

    it('should never set project_routing — entity store queries are always origin-only', async () => {
      const toRecordsMock = jest.fn().mockResolvedValue({ records: [] });
      esClient.asCurrentUser.helpers.esql.mockReturnValue({
        toRecords: toRecordsMock,
        toArrowTable: jest.fn(),
        toArrowReader: jest.fn(),
      });

      await fetchEntityRelationships({
        esClient,
        logger,
        entityIds: [{ id: 'entity-1', isOrigin: false }],
        spaceId: 'default',
        entityStoreIndexExists: true,
      });

      const [args] = esClient.asCurrentUser.helpers.esql.mock.calls[0];
      expect(args).not.toHaveProperty('project_routing');
    });
  });

  describe('DSL filter building', () => {
    it('should build correct terms filter from entityIds', async () => {
      const toRecordsMock = jest.fn().mockResolvedValue({ records: [] });
      esClient.asCurrentUser.helpers.esql.mockReturnValue({
        toRecords: toRecordsMock,
        toArrowTable: jest.fn(),
        toArrowReader: jest.fn(),
      });

      const entityIds: EntityId[] = [
        { id: 'entity-1', isOrigin: true },
        { id: 'entity-2', isOrigin: false },
        { id: 'entity-3', isOrigin: false },
      ];

      await fetchEntityRelationships({
        esClient,
        logger,
        entityIds,
        spaceId: 'default',
        entityStoreIndexExists: true,
      });

      const batchCount = Math.ceil(
        ENTITY_RELATIONSHIP_FIELDS.length / RELATIONSHIP_FIELDS_FORK_BATCH_SIZE
      );
      expect(esClient.asCurrentUser.helpers.esql).toBeCalledTimes(batchCount);
      const esqlCallArgs = esClient.asCurrentUser.helpers.esql.mock.calls[0];
      const filterArg = esqlCallArgs[0].filter as any;

      // Verify filter contains bool.should with terms query for entity.id and all relationship fields
      expect(filterArg.bool.should).toContainEqual({
        terms: {
          'entity.id': ['entity-1', 'entity-2', 'entity-3'],
        },
      });
      const ids = ['entity-1', 'entity-2', 'entity-3'];

      // Relationship bags: match `entity.relationships.<leaf>.ids`; resolution uses resolved_to path
      ENTITY_RELATIONSHIP_FIELDS.forEach((field) => {
        if (field === 'resolution.resolved_to') {
          expect(filterArg.bool.should).toContainEqual({
            terms: {
              'entity.relationships.resolution.resolved_to': ids,
            },
          });
          return;
        }

        expect(filterArg.bool.should).toContainEqual({
          terms: {
            [`entity.relationships.${field}.ids`]: ids,
          },
        });
      });
      expect(filterArg.bool.minimum_should_match).toEqual(1);
    });

    it('should handle empty entityIds array', async () => {
      const toRecordsMock = jest.fn().mockResolvedValue({ records: [] });
      esClient.asCurrentUser.helpers.esql.mockReturnValue({
        toRecords: toRecordsMock,
        toArrowTable: jest.fn(),
        toArrowReader: jest.fn(),
      });

      const entityIds: EntityId[] = [];

      await fetchEntityRelationships({
        esClient,
        logger,
        entityIds,
        spaceId: 'default',
        entityStoreIndexExists: true,
      });

      const batchCount = Math.ceil(
        ENTITY_RELATIONSHIP_FIELDS.length / RELATIONSHIP_FIELDS_FORK_BATCH_SIZE
      );
      expect(esClient.asCurrentUser.helpers.esql).toBeCalledTimes(batchCount);
      const esqlCallArgs = esClient.asCurrentUser.helpers.esql.mock.calls[0];

      // Filter should be undefined when no entityIds provided
      expect(esqlCallArgs[0].filter).toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('should propagate ESQL errors to the caller', async () => {
      const genericError = new Error('Connection refused');
      esClient.asCurrentUser.helpers.esql.mockReturnValue({
        toRecords: jest.fn().mockRejectedValue(genericError),
        toArrowTable: jest.fn(),
        toArrowReader: jest.fn(),
      });

      const entityIds: EntityId[] = [{ id: 'entity-1', isOrigin: true }];

      await expect(
        fetchEntityRelationships({
          esClient,
          logger,
          entityIds,
          spaceId: 'default',
          entityStoreIndexExists: true,
        })
      ).rejects.toThrow('Connection refused');
    });

    it('rejects the whole call when one of multiple batches fails', async () => {
      const goodBatch = { records: [{ relationship: 'owns' } as unknown as RelationshipEsqlRow] };
      const genericError = new Error('Batch 2 failed');
      let call = 0;
      esClient.asCurrentUser.helpers.esql.mockImplementation(() => ({
        toRecords: jest.fn().mockImplementation(() => {
          call += 1;
          return call === 1 ? Promise.resolve(goodBatch) : Promise.reject(genericError);
        }),
        toArrowTable: jest.fn(),
        toArrowReader: jest.fn(),
      }));

      await expect(
        fetchEntityRelationships({
          esClient,
          logger,
          entityIds: [{ id: 'entity-1', isOrigin: true }],
          spaceId: 'default',
          entityStoreIndexExists: true,
        })
      ).rejects.toThrow('Batch 2 failed');
    });
  });

  describe('FORK branch-limit batching', () => {
    it('splits ENTITY_RELATIONSHIP_FIELDS into multiple ES|QL queries bounded by the FORK branch limit', async () => {
      const toRecordsMock = jest.fn().mockResolvedValue({ records: [] });
      esClient.asCurrentUser.helpers.esql.mockReturnValue({
        toRecords: toRecordsMock,
        toArrowTable: jest.fn(),
        toArrowReader: jest.fn(),
      });

      await fetchEntityRelationships({
        esClient,
        logger,
        entityIds: [{ id: 'entity-1', isOrigin: true }],
        spaceId: 'default',
        entityStoreIndexExists: true,
      });

      const calls = esClient.asCurrentUser.helpers.esql.mock.calls;
      const expectedBatchCount = Math.ceil(
        ENTITY_RELATIONSHIP_FIELDS.length / RELATIONSHIP_FIELDS_FORK_BATCH_SIZE
      );
      expect(calls).toHaveLength(expectedBatchCount);

      // Every FORK branch count per query must stay within the branch limit, and every
      // relationship field must appear in exactly one batch's query.
      const fieldsSeenPerQuery = calls.map(([{ query }]: any[]) =>
        ENTITY_RELATIONSHIP_FIELDS.filter((field) => query.includes(`_rel_targets_${field}`))
      );
      fieldsSeenPerQuery.forEach((fields: string[]) => {
        expect(fields.length).toBeLessThanOrEqual(RELATIONSHIP_FIELDS_FORK_BATCH_SIZE);
      });
      const allFieldsCovered = fieldsSeenPerQuery.flat();
      expect(new Set(allFieldsCovered)).toEqual(new Set(ENTITY_RELATIONSHIP_FIELDS));
      expect(allFieldsCovered).toHaveLength(ENTITY_RELATIONSHIP_FIELDS.length);
    });

    it('merges records from all batches into a single result', async () => {
      const batch1Records = [{ relationship: 'owns' } as unknown as RelationshipEsqlRow];
      const batch2Records = [{ relationship: 'administers' } as unknown as RelationshipEsqlRow];
      let call = 0;
      esClient.asCurrentUser.helpers.esql.mockImplementation(() => ({
        toRecords: jest.fn().mockImplementation(() => {
          call += 1;
          return Promise.resolve({
            columns: [{ name: `col${call}`, type: 'keyword' }],
            records: call === 1 ? batch1Records : batch2Records,
          });
        }),
        toArrowTable: jest.fn(),
        toArrowReader: jest.fn(),
      }));

      const result = await fetchEntityRelationships({
        esClient,
        logger,
        entityIds: [{ id: 'entity-1', isOrigin: true }],
        spaceId: 'default',
        entityStoreIndexExists: true,
      });

      expect(result.records).toEqual([...batch1Records, ...batch2Records]);
    });
  });

  describe('query structure', () => {
    it('pre-aggregates rows via STATS BY actor/relationship/target for TypeScript-side regrouping', async () => {
      const toRecordsMock = jest.fn().mockResolvedValue({ records: [] });
      esClient.asCurrentUser.helpers.esql.mockReturnValue({
        toRecords: toRecordsMock,
        toArrowTable: jest.fn(),
        toArrowReader: jest.fn(),
      });

      const entityIds: EntityId[] = [{ id: 'entity-1', isOrigin: true }];

      await fetchEntityRelationships({
        esClient,
        logger,
        entityIds,
        spaceId: 'default',
        entityStoreIndexExists: true,
      });

      const esqlCallArgs = esClient.asCurrentUser.helpers.esql.mock.calls[0];
      const query = esqlCallArgs[0].query;

      // Per-triple shape: relationship fork branches and per-row doc data
      expect(query).toContain('_rel_targets_owns');
      expect(query).toContain('actorDocData');
      expect(query).toContain('targetDocData');
      expect(query).toContain('availableInEntityStore');

      // Actor entity columns are renamed to the names regroupRelationships expects
      expect(query).toContain('`entity.type` AS actorEntityType');
      expect(query).toContain('`entity.sub_type` AS actorEntitySubType');
      expect(query).toContain('`entity.name` AS actorEntityName');
      expect(query).toContain('`host.ip` AS actorHostIps');

      // Pre-aggregate by the actor TYPE dimensions (NOT raw actorId — entity.id is unique,
      // so it would never merge same-type actors). actorIds collected via VALUES.
      expect(query).toContain('| STATS badge = COUNT(*)');
      expect(query).toMatch(/BY actorEntityType,\s*actorEntitySubType,\s*relationship,\s*pinned/);
      expect(query).toContain('actorIds = VALUES(actorId)');
      expect(query).toContain('targetIds = VALUES(targetId)');
      expect(query).toContain('actorTargetMap = VALUES(actorTargetMap)');
      expect(query).toContain('actorEntityName = MV_FIRST(VALUES(actorEntityName))');
      expect(query).toContain('actorHostIps = VALUES(actorHostIps)');
      // actorId must NOT be a grouping key (it is unique per entity — no merging)
      expect(query).not.toMatch(/BY actorId/);
      // targetId must NOT be a grouping key — same-type targets merge, and the row can carry
      // targets of different types that regroupRelationships splits after enrichment.
      expect(query).not.toMatch(/BY[\s\S]*targetId/);
      // target type/sub-type are NOT grouped on — they come from phase-2 enrichment
      expect(query).not.toMatch(/BY[\s\S]*targetEntityType/);

      // Verify sourceFields are included in actor doc data
      expect(query).toContain('sourceFields');
    });
  });
});

// Helper to build a minimal RelationshipEsqlRow (aggregated ESQL output) for tests.
// Accepts convenient single `actorId`/`targetId` values and maps them to the aggregated
// `actorIds`/`targetIds` fields (one same-type actor/target collapsed into this row).
// Pass `targetIds` explicitly to model a row carrying multiple targets. badge defaults to 1.
const buildRelationshipEsqlRow = ({
  actorId,
  targetId,
  ...overrides
}: Partial<Omit<RelationshipEsqlRow, 'actorIds'>> & {
  actorId: string;
  targetId?: string;
}): RelationshipEsqlRow => {
  const targetIds = overrides.targetIds ?? (targetId != null ? [targetId] : []);
  const targetIdArray = Array.isArray(targetIds) ? targetIds : [targetIds];
  // Single target → single string (preserves the historical shape asserted by tests);
  // multiple targets → one doc-data entry per target.
  const defaultTargetDocData =
    targetIdArray.length === 1
      ? `{"id":"${targetIdArray[0]}","type":"entity"}`
      : targetIdArray.map((id) => `{"id":"${id}","type":"entity"}`);
  // Default actor → target mapping: this single actor points at every target in the row.
  // Tests modelling a merged multi-actor row can override actorTargetMap explicitly.
  const defaultActorTargetMap = targetIdArray.map((t) => `${actorId}\n${t}`);
  return {
    actorIds: [actorId],
    targetIds,
    relationship: 'Owns',
    actorDocData: `{"id":"${actorId}","type":"entity","entity":{"availableInEntityStore":true}}`,
    targetDocData: overrides.targetDocData ?? defaultTargetDocData,
    actorTargetMap: overrides.actorTargetMap ?? defaultActorTargetMap,
    badge: 1,
    ...overrides,
  };
};

describe('regroupRelationships', () => {
  it('single record with no enrichment produces one group with actorNodeId/targetNodeId equal to the single IDs and raw docData passed through', () => {
    const record = buildRelationshipEsqlRow({
      actorId: 'host:webserver',
      targetId: 'user:alice',
    });
    const result = regroupRelationships([record], new Map());

    expect(result).toHaveLength(1);
    const [group] = result;
    expect(group.actorNodeId).toBe('host:webserver');
    expect(group.actorIdsCount).toBe(1);
    expect(group.actorIds).toEqual(['host:webserver']);
    expect(group.targetNodeId).toBe('user:alice');
    expect(group.targetEntityType).toBeNull();
    expect(group.targetsDocData).toEqual([record.targetDocData]);
  });

  it('single record with enrichment has correct targetEntityType/SubType/Name but raw docData', () => {
    const record = buildRelationshipEsqlRow({
      actorId: 'host:webserver',
      targetId: 'user:alice',
    });
    const enrichmentMap = new Map<string, EntityEnrichmentFields>([
      [
        'user:alice',
        { name: 'Alice', type: 'user', subType: 'admin', engineType: 'ecs', hostIps: [] },
      ],
    ]);

    const result = regroupRelationships([record], enrichmentMap);

    expect(result).toHaveLength(1);
    const [group] = result;
    expect(group.targetEntityType).toBe('user');
    expect(group.targetEntitySubType).toBe('admin');
    expect(group.targetEntityName).toBe('Alice');
    expect(group.targetsDocData).toEqual([record.targetDocData]);
  });

  it('merges same-type targets from one row into a single grouped target node', () => {
    // The ES|QL row carries multiple targets (targetId is no longer a group key). Two targets
    // of the same enrichment type/sub-type collapse into ONE group with targetIdsCount=2.
    const enrichmentMap = new Map<string, EntityEnrichmentFields>([
      ['user:a', { name: 'A', type: 'user', subType: 'iam', engineType: 'ecs', hostIps: [] }],
      ['user:b', { name: 'B', type: 'user', subType: 'iam', engineType: 'ecs', hostIps: [] }],
    ]);
    const record = buildRelationshipEsqlRow({
      actorId: 'user:root',
      relationship: 'supervises',
      targetIds: ['user:a', 'user:b'],
      targetDocData: ['{"id":"user:a","type":"entity"}', '{"id":"user:b","type":"entity"}'],
    });

    const result = regroupRelationships([record], enrichmentMap);

    expect(result).toHaveLength(1);
    expect(result[0].targetEntityType).toBe('user');
    expect(result[0].targetIdsCount).toBe(2);
    expect(result[0].targetIds).toEqual(['user:a', 'user:b']);
    expect(result[0].targetNodeId).toBe(hashIds(['user:a', 'user:b']));
  });

  it('splits targets of different types from one row into separate groups without leaking docData', () => {
    // One row with a Host target and an unenriched (null-type) target must produce two groups,
    // each carrying only its own target and its own doc data.
    const hostDoc = '{"id":"host:h","type":"entity"}';
    const genericDoc = '{"id":"projects/generic","type":"entity"}';
    const enrichmentMap = new Map<string, EntityEnrichmentFields>([
      ['host:h', { name: 'H', type: 'host', subType: 'linux', engineType: 'ecs', hostIps: [] }],
    ]);
    const record = buildRelationshipEsqlRow({
      actorId: 'user:root',
      relationship: 'communicates_with',
      targetIds: ['host:h', 'projects/generic'],
      targetDocData: [hostDoc, genericDoc],
    });

    const result = regroupRelationships([record], enrichmentMap);

    expect(result).toHaveLength(2);
    const hostGroup = result.find((g) => g.targetEntityType === 'host')!;
    const genericGroup = result.find((g) => g.targetEntityType === null)!;

    expect(hostGroup.targetIds).toEqual(['host:h']);
    expect(hostGroup.targetsDocData).toEqual([hostDoc]);
    expect(hostGroup.targetsDocData).not.toContain(genericDoc);

    expect(genericGroup.targetIds).toEqual(['projects/generic']);
    expect(genericGroup.targetsDocData).toEqual([genericDoc]);
    expect(genericGroup.targetsDocData).not.toContain(hostDoc);
  });

  it('sums badge across pre-aggregated rows merged into one type group', () => {
    const enrichmentMap = new Map<string, EntityEnrichmentFields>([
      ['host:t', { type: 'host', subType: 'linux', name: 'T', engineType: null, hostIps: [] }],
    ]);
    // Two pre-aggregated rows for the same actor type, relationship, and target → one merged
    // group. (In practice ES|QL would emit a single row per actor-type with actorIds=[a,b];
    // two rows here also exercises the cross-row union and badge sum.)
    const rows: RelationshipEsqlRow[] = [
      {
        actorIds: ['host:a'],
        actorEntityType: 'host',
        actorEntitySubType: 'linux',
        actorEntityName: 'A',
        actorHostIps: null,
        actorDocData: '{"id":"host:a"}',
        relationship: 'communicates_with',
        targetIds: ['host:t'],
        targetDocData: '{"id":"host:t"}',
        actorTargetMap: ['host:a\nhost:t'],
        pinned: null,
        badge: 4,
      },
      {
        actorIds: ['host:b'],
        actorEntityType: 'host',
        actorEntitySubType: 'linux',
        actorEntityName: 'B',
        actorHostIps: null,
        actorDocData: '{"id":"host:b"}',
        relationship: 'communicates_with',
        targetIds: ['host:t'],
        targetDocData: '{"id":"host:t"}',
        actorTargetMap: ['host:b\nhost:t'],
        pinned: null,
        badge: 6,
      },
    ];

    const result = regroupRelationships(rows, enrichmentMap);

    expect(result).toHaveLength(1);
    expect(result[0].badge).toBe(10);
    expect(result[0].actorIds).toEqual(['host:a', 'host:b']);
    expect(result[0].targetIds).toEqual(['host:t']);
  });

  it('merges the multi-value actorIds of a single ES|QL row (same-type actors pre-merged in query)', () => {
    const enrichmentMap = new Map<string, EntityEnrichmentFields>([
      ['host:t', { type: 'host', subType: 'linux', name: 'T', engineType: null, hostIps: [] }],
    ]);
    // The new ES|QL STATS BY actor type emits ONE row per (actorType, relationship, target)
    // carrying the multi-value set of same-type actor IDs. regroupRelationships must union them
    // into actorIds[] / actorNodeId exactly as if they arrived on separate rows.
    const row: RelationshipEsqlRow = {
      actorIds: ['host:a', 'host:b'],
      actorEntityType: 'host',
      actorEntitySubType: 'linux',
      actorEntityName: 'A',
      actorHostIps: null,
      actorDocData: ['{"id":"host:a"}', '{"id":"host:b"}'],
      relationship: 'communicates_with',
      targetIds: ['host:t'],
      targetDocData: '{"id":"host:t"}',
      actorTargetMap: ['host:a\nhost:t', 'host:b\nhost:t'],
      pinned: null,
      badge: 5,
    };

    const result = regroupRelationships([row], enrichmentMap);

    expect(result).toHaveLength(1);
    expect(result[0].badge).toBe(5);
    expect(result[0].actorIds).toEqual(['host:a', 'host:b']);
    expect(result[0].actorIdsCount).toBe(2);
    // multi-actor group → actorNodeId is the hashIds (SHA-256) of the sorted IDs
    expect(result[0].actorNodeId).toBe(hashIds(['host:a', 'host:b']));
    expect(result[0].relationshipNodeId).toBe(`${hashIds(['host:a', 'host:b'])}-communicates_with`);
  });

  it('splits same-type actors of one row into separate groups when they point at different targets', () => {
    // A single STATS row merges two same-type actors (svc:a, svc:b) that communicate_with
    // DIFFERENT targets. They must NOT collapse into one relationship node — actorTargetMap lets
    // regroupRelationships recover the per-actor target sets and split them.
    const enrichmentMap = new Map<string, EntityEnrichmentFields>([
      [
        'svc:a',
        {
          type: 'Service',
          subType: 'lambda',
          name: 'Svc A',
          engineType: 'ecs',
          hostIps: ['10.0.0.1'],
        },
      ],
      [
        'svc:b',
        {
          type: 'Service',
          subType: 'lambda',
          name: 'Svc B',
          engineType: 'ecs',
          hostIps: ['10.0.0.2'],
        },
      ],
      ['host:x', { type: 'Host', subType: 'ec2', name: 'X', engineType: 'ecs', hostIps: [] }],
      ['host:y', { type: 'Host', subType: 'ec2', name: 'Y', engineType: 'ecs', hostIps: [] }],
    ]);
    const row: RelationshipEsqlRow = {
      actorIds: ['svc:a', 'svc:b'],
      actorEntityType: 'Service',
      actorEntitySubType: 'lambda',
      // MV_FIRST would pick only 'Svc A' for the whole row; each split node must still get its own
      // enriched name rather than inheriting this single value.
      actorEntityName: 'Svc A',
      // Row-level VALUES(actorHostIps) covers both actors; each split node must resolve only its
      // own IPs from enrichment rather than inheriting this union.
      actorHostIps: ['10.0.0.1', '10.0.0.2'],
      actorDocData: ['{"id":"svc:a"}', '{"id":"svc:b"}'],
      relationship: 'communicates_with',
      targetIds: ['host:x', 'host:y'],
      targetDocData: ['{"id":"host:x"}', '{"id":"host:y"}'],
      // svc:a → host:x, svc:b → host:y (different target sets)
      actorTargetMap: ['svc:a\nhost:x', 'svc:b\nhost:y'],
      pinned: null,
      badge: 2,
    };

    const result = regroupRelationships([row], enrichmentMap);

    expect(result).toHaveLength(2);
    const byActor = new Map(result.map((g) => [g.actorIds.sort().join(','), g]));
    expect(byActor.get('svc:a')!.targetIds).toEqual(['host:x']);
    expect(byActor.get('svc:a')!.relationshipNodeId).toBe('svc:a-communicates_with');
    // Each split node keeps its OWN name and host IPs (not the row-level MV_FIRST/VALUES union).
    expect(byActor.get('svc:a')!.actorEntityName).toBe('Svc A');
    expect(byActor.get('svc:a')!.actorHostIps).toEqual(['10.0.0.1']);
    expect(byActor.get('svc:b')!.targetIds).toEqual(['host:y']);
    expect(byActor.get('svc:b')!.relationshipNodeId).toBe('svc:b-communicates_with');
    expect(byActor.get('svc:b')!.actorEntityName).toBe('Svc B');
    expect(byActor.get('svc:b')!.actorHostIps).toEqual(['10.0.0.2']);
  });

  it('empty-string actorDocData and targetDocData are not added to the doc-data sets', () => {
    const row: RelationshipEsqlRow = {
      actorIds: ['host:a'],
      actorEntityType: 'host',
      actorEntitySubType: 'linux',
      actorEntityName: 'A',
      actorHostIps: null,
      actorDocData: '',
      relationship: 'communicates_with',
      targetIds: ['host:t'],
      targetDocData: '',
      actorTargetMap: ['host:a\nhost:t'],
      pinned: null,
      badge: 1,
    };

    const result = regroupRelationships([row], new Map());

    expect(result).toHaveLength(1);
    expect(result[0].actorsDocData).toEqual([]);
    expect(result[0].targetsDocData).toEqual([]);
  });

  it('two records with different targetType produce two groups with single-target nodeIds', () => {
    const record1 = buildRelationshipEsqlRow({
      actorId: 'host:webserver',
      targetId: 'user:alice',
    });
    const record2 = buildRelationshipEsqlRow({
      actorId: 'host:webserver',
      targetId: 'host:db',
    });

    const enrichmentMap = new Map<string, EntityEnrichmentFields>([
      ['user:alice', { name: 'Alice', type: 'user', subType: null, engineType: null, hostIps: [] }],
      ['host:db', { name: 'db', type: 'host', subType: null, engineType: null, hostIps: [] }],
    ]);

    const result = regroupRelationships([record1, record2], enrichmentMap);

    expect(result).toHaveLength(2);
    const targetNodeIds = result.map((r) => r.targetNodeId).sort();
    expect(targetNodeIds).toContain('user:alice');
    expect(targetNodeIds).toContain('host:db');
  });

  it('two actors of the same type with the same relationship and target type produce one merged group', () => {
    const r1 = buildRelationshipEsqlRow({
      actorId: 'host:my-server-7',
      targetId: 'host:my-server-9',
      actorEntityType: 'Host',
      actorEntitySubType: 'Linux Host',
      relationship: 'communicates_with',
    });
    const r2 = buildRelationshipEsqlRow({
      actorId: 'host:my-server-8',
      targetId: 'host:my-server-9',
      actorEntityType: 'Host',
      actorEntitySubType: 'Linux Host',
      relationship: 'communicates_with',
    });

    const enrichmentMap = new Map<string, EntityEnrichmentFields>([
      [
        'host:my-server-9',
        {
          name: 'my-server-9',
          type: 'Host',
          subType: 'Linux Host',
          engineType: 'ecs',
          hostIps: [],
        },
      ],
    ]);

    const result = regroupRelationships([r1, r2], enrichmentMap);

    expect(result).toHaveLength(1);
    const [group] = result;
    expect(group.actorIdsCount).toBe(2);
    expect(group.actorIds.sort()).toEqual(['host:my-server-7', 'host:my-server-8']);
    expect(group.actorNodeId).not.toBe('host:my-server-7');
    expect(group.actorNodeId).not.toBe('host:my-server-8');
    expect(group.targetNodeId).toBe('host:my-server-9');
    expect(group.badge).toBe(2);
    expect(group.relationshipNodeId).toBe(`${group.actorNodeId}-communicates_with`);
  });

  it('two actors of different types produce separate groups even with same relationship and target', () => {
    const r1 = buildRelationshipEsqlRow({
      actorId: 'host:my-server-7',
      targetId: 'host:my-server-9',
      actorEntityType: 'Host',
      actorEntitySubType: 'Linux Host',
      relationship: 'communicates_with',
    });
    const r2 = buildRelationshipEsqlRow({
      actorId: 'host:my-server-10',
      targetId: 'host:my-server-9',
      actorEntityType: 'Host1',
      actorEntitySubType: 'Linux Host1',
      relationship: 'communicates_with',
    });

    const enrichmentMap = new Map<string, EntityEnrichmentFields>([
      [
        'host:my-server-9',
        {
          name: 'my-server-9',
          type: 'Host',
          subType: 'Linux Host',
          engineType: 'ecs',
          hostIps: [],
        },
      ],
    ]);

    const result = regroupRelationships([r1, r2], enrichmentMap);

    expect(result).toHaveLength(2);
    expect(result.every((g) => g.actorIdsCount === 1)).toBe(true);
  });

  it('single actor preserves raw entity.id-based relationshipNodeId format', () => {
    const record = buildRelationshipEsqlRow({
      actorId: 'user:data-pipeline@my-project.iam.gserviceaccount.com@gcp',
      targetId: 'host:some-host',
      actorEntityType: 'Service Account',
      actorEntitySubType: 'GCP Service Account',
      relationship: 'owns',
    });

    const result = regroupRelationships([record], new Map());

    expect(result).toHaveLength(1);
    expect(result[0].relationshipNodeId).toBe(
      'user:data-pipeline@my-project.iam.gserviceaccount.com@gcp-owns'
    );
    expect(result[0].actorNodeId).toBe('user:data-pipeline@my-project.iam.gserviceaccount.com@gcp');
  });

  it('relationshipNodeId is stable across actor merges and not derived from any individual entity.id', () => {
    const r1 = buildRelationshipEsqlRow({
      actorId: 'host:my-server-7',
      targetId: 'host:my-server-9',
      actorEntityType: 'Host',
      actorEntitySubType: 'Linux Host',
      relationship: 'communicates_with',
    });
    const r2 = buildRelationshipEsqlRow({
      actorId: 'host:my-server-8',
      targetId: 'host:my-server-9',
      actorEntityType: 'Host',
      actorEntitySubType: 'Linux Host',
      relationship: 'communicates_with',
    });
    const result = regroupRelationships([r1, r2], new Map());

    expect(result).toHaveLength(1);
    expect(result[0].relationshipNodeId).not.toContain('my-server-7');
    expect(result[0].relationshipNodeId).not.toContain('my-server-8');
    expect(result[0].relationshipNodeId).toMatch(/-communicates_with$/);

    const r3 = buildRelationshipEsqlRow({
      actorId: 'host:my-server-11',
      targetId: 'host:my-server-9',
      actorEntityType: 'Host',
      actorEntitySubType: 'Linux Host',
      relationship: 'communicates_with',
    });
    const r4 = buildRelationshipEsqlRow({
      actorId: 'host:my-server-12',
      targetId: 'host:my-server-9',
      actorEntityType: 'Host',
      actorEntitySubType: 'Linux Host',
      relationship: 'communicates_with',
    });
    const result2 = regroupRelationships([r3, r4], new Map());
    expect(result2[0].actorNodeId).not.toBe(result[0].actorNodeId);
    expect(result2[0].relationshipNodeId).toMatch(/-communicates_with$/);
  });
});

describe('enrichRelationshipDocData', () => {
  it('returns empty array for empty input', () => {
    const result = enrichRelationshipDocData([], new Map());
    expect(result).toEqual([]);
  });

  it('rebuilds targetsDocData with availableInEntityStore=false when no enrichment', () => {
    const record = buildRelationshipEsqlRow({
      actorId: 'host:webserver',
      targetId: 'user:alice',
    });
    const grouped = regroupRelationships([record], new Map());
    const result = enrichRelationshipDocData(grouped, new Map());

    expect(result).toHaveLength(1);
    const [group] = result;

    const targetDoc = JSON.parse((group.targetsDocData as string[])[0]);
    expect(targetDoc.entity.availableInEntityStore).toBe(false);
  });

  it('rebuilds targetsDocData with enrichment data when enrichment found', () => {
    const record = buildRelationshipEsqlRow({
      actorId: 'host:webserver',
      targetId: 'user:alice',
    });
    const enrichmentMap = new Map<string, EntityEnrichmentFields>([
      [
        'user:alice',
        { name: 'Alice', type: 'user', subType: 'admin', engineType: 'ecs', hostIps: [] },
      ],
    ]);

    const grouped = regroupRelationships([record], enrichmentMap);
    const result = enrichRelationshipDocData(grouped, enrichmentMap);

    expect(result).toHaveLength(1);
    const [group] = result;

    const targetDoc = JSON.parse((group.targetsDocData as string[])[0]);
    expect(targetDoc.entity.availableInEntityStore).toBe(true);
    expect(targetDoc.entity.name).toBe('Alice');
    expect(targetDoc.entity.type).toBe('user');
    expect(targetDoc.entity.sub_type).toBe('admin');
  });
});

describe('enrichEntityRecords', () => {
  it('record with no enrichment is returned unchanged', () => {
    const record: EntityRecord = {
      id: 'user:alice',
      name: 'alice',
      type: 'user',
      sub_type: '',
      docData: '{}',
    };

    const result = enrichEntityRecords([record], new Map());

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(record);
  });

  it('record with enrichment gets name, type and sub_type updated', () => {
    const record: EntityRecord = {
      id: 'user:alice',
      name: '',
      type: '',
      sub_type: '',
      docData: '{}',
    };
    const enrichmentMap = new Map<string, EntityEnrichmentFields>([
      [
        'user:alice',
        { name: 'Alice Smith', type: 'user', subType: 'admin', engineType: 'ecs', hostIps: [] },
      ],
    ]);

    const result = enrichEntityRecords([record], enrichmentMap);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Alice Smith');
    expect(result[0].type).toBe('user');
    expect(result[0].sub_type).toBe('admin');
  });
});
