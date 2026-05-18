/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import {
  fetchEntityRelationships,
  regroupRelationships,
  enrichRelationshipDocData,
  enrichEntityRecords,
} from './fetch_entity_relationships_graph';
import type { Logger } from '@kbn/core/server';
import type { EntityId, RelationshipEdge, EntityRecord } from './types';
import { getEntitiesLatestIndexName } from '@kbn/cloud-security-posture-common/utils/helpers';
import { ENTITY_RELATIONSHIP_FIELDS } from '@kbn/cloud-security-posture-common/constants';
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

      // Mock index exists check
      (esClient.asInternalUser.indices as jest.Mocked<any>).exists = jest
        .fn()
        .mockResolvedValueOnce(true);

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
      });

      expect(esClient.asCurrentUser.helpers.esql).toBeCalledTimes(1);
      const esqlCallArgs = esClient.asCurrentUser.helpers.esql.mock.calls[0];
      const query = esqlCallArgs[0].query;

      // Verify query uses the entity store index and does NOT use LOOKUP JOIN
      expect(query).toContain(`FROM ${indexName}`);
      expect(query).not.toContain('LOOKUP JOIN');
      expect(query).toContain('`entity.relationships.owns.ids`');
    });

    it('should return empty result when entities index does not exist', async () => {
      // Mock index does NOT exist
      (esClient.asInternalUser.indices as jest.Mocked<any>).exists = jest
        .fn()
        .mockResolvedValueOnce(false);

      const entityIds: EntityId[] = [{ id: 'entity-1', isOrigin: false }];

      const result = await fetchEntityRelationships({
        esClient,
        logger,
        entityIds,
        spaceId: 'default',
      });

      // Should not call ESQL when index does not exist
      expect(esClient.asCurrentUser.helpers.esql).not.toHaveBeenCalled();
      expect(result).toEqual({ columns: [], records: [] });
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('does not exist, skipping relationship fetch')
      );
    });
  });

  describe('DSL filter building', () => {
    it('should build correct terms filter from entityIds', async () => {
      // Mock index exists
      (esClient.asInternalUser.indices as jest.Mocked<any>).exists = jest
        .fn()
        .mockResolvedValueOnce(true);

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
      });

      expect(esClient.asCurrentUser.helpers.esql).toBeCalledTimes(1);
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
      // Mock index exists
      (esClient.asInternalUser.indices as jest.Mocked<any>).exists = jest
        .fn()
        .mockResolvedValueOnce(true);

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
      });

      expect(esClient.asCurrentUser.helpers.esql).toBeCalledTimes(1);
      const esqlCallArgs = esClient.asCurrentUser.helpers.esql.mock.calls[0];

      // Filter should be undefined when no entityIds provided
      expect(esqlCallArgs[0].filter).toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('should return empty result when ESQL query returns 404', async () => {
      // Mock index exists (passes the existence check)
      (esClient.asInternalUser.indices as jest.Mocked<any>).exists = jest
        .fn()
        .mockResolvedValueOnce(true);

      // Mock ESQL query throwing 404 error
      esClient.asCurrentUser.helpers.esql.mockReturnValue({
        toRecords: jest.fn().mockRejectedValue({ statusCode: 404 }),
        toArrowTable: jest.fn(),
        toArrowReader: jest.fn(),
      });

      const entityIds: EntityId[] = [{ id: 'entity-1', isOrigin: true }];

      const result = await fetchEntityRelationships({
        esClient,
        logger,
        entityIds,
        spaceId: 'default',
      });

      expect(result).toEqual({ columns: [], records: [] });
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('does not exist, skipping relationship fetch')
      );
    });

    it('should throw error on non-404 errors', async () => {
      // Mock index exists
      (esClient.asInternalUser.indices as jest.Mocked<any>).exists = jest
        .fn()
        .mockResolvedValueOnce(true);

      // Mock ESQL query throwing generic error
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
        })
      ).rejects.toThrow('Connection refused');
    });
  });

  describe('query structure', () => {
    it('should include actorsDocData and targetsDocData in query without LOOKUP JOIN', async () => {
      // Mock index exists
      (esClient.asInternalUser.indices as jest.Mocked<any>).exists = jest
        .fn()
        .mockResolvedValueOnce(true);

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
      });

      const esqlCallArgs = esClient.asCurrentUser.helpers.esql.mock.calls[0];
      const query = esqlCallArgs[0].query;

      // Verify doc data fields are generated
      expect(query).toContain('_rel_targets_owns');
      expect(query).toContain('actorsDocData');
      expect(query).toContain('targetsDocData');
      expect(query).toContain('availableInEntityStore');
      expect(query).toContain('relationshipNodeId');
      expect(query).toContain('actorHostIps = VALUES(host.ip)');

      // LOOKUP JOIN is removed — target enrichment happens in TypeScript
      expect(query).not.toContain('LOOKUP JOIN');

      // Verify sourceFields are included in actor doc data
      expect(query).toContain('sourceFields');

      // Verify STATS groups BY _target_id (not target type/subtype)
      expect(query).toContain('BY entity.id, relationship, _target_id');
    });
  });
});

// Helper to build a minimal RelationshipEdge for tests
const buildRelationshipEdge = (
  overrides: Partial<RelationshipEdge> & Pick<RelationshipEdge, 'actorNodeId' | 'targetId'>
): RelationshipEdge => {
  const { actorNodeId, targetId, ...rest } = overrides;
  return {
    badge: 1,
    relationship: 'Owns',
    relationshipNodeId: `${actorNodeId}-Owns`,
    actorNodeId,
    actorIdsCount: 1,
    actorIds: [actorNodeId],
    targetId,
    targetNodeId: targetId ?? '',
    targetIdsCount: targetId ? 1 : 0,
    targetIds: targetId ? [targetId] : [],
    targetsDocData: targetId ? [`{"id":"${targetId}","type":"entity"}`] : [],
    ...rest,
  };
};

describe('regroupRelationships', () => {
  it('single record with no enrichment produces one group with targetNodeId equal to targetId and raw docData passed through', () => {
    const record = buildRelationshipEdge({ actorNodeId: 'host:webserver', targetId: 'user:alice' });
    const result = regroupRelationships([record], new Map());

    expect(result).toHaveLength(1);
    const [group] = result;
    expect(group.targetNodeId).toBe('user:alice');
    expect(group.targetEntityType).toBeNull();

    // Raw docData should be passed through unchanged (no entity object built yet)
    expect(group.targetsDocData).toEqual(record.targetsDocData);
  });

  it('single record with enrichment has correct targetEntityType/SubType/Name but raw docData', () => {
    const record = buildRelationshipEdge({ actorNodeId: 'host:webserver', targetId: 'user:alice' });
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

    // Raw docData still passed through (no entity object built yet)
    expect(group.targetsDocData).toEqual(record.targetsDocData);
  });

  it('two records with same (actorNodeId, relationship, targetType, targetSubType) are merged and badge is summed', () => {
    const record1 = buildRelationshipEdge({
      actorNodeId: 'host:webserver',
      targetId: 'user:alice',
      badge: 1,
    });
    const record2 = buildRelationshipEdge({
      actorNodeId: 'host:webserver',
      targetId: 'user:alice',
      badge: 2,
    });

    const enrichmentMap = new Map<string, EntityEnrichmentFields>([
      ['user:alice', { name: 'Alice', type: 'user', subType: null, engineType: null, hostIps: [] }],
    ]);

    const result = regroupRelationships([record1, record2], enrichmentMap);

    expect(result).toHaveLength(1);
    expect(result[0].badge).toBe(3);
  });

  it('two records with different targetType produce two groups with MD5 targetNodeId for multi-target group', () => {
    const record1 = buildRelationshipEdge({
      actorNodeId: 'host:webserver',
      targetId: 'user:alice',
      badge: 1,
    });
    const record2 = buildRelationshipEdge({
      actorNodeId: 'host:webserver',
      targetId: 'host:db',
      badge: 1,
    });

    const enrichmentMap = new Map<string, EntityEnrichmentFields>([
      ['user:alice', { name: 'Alice', type: 'user', subType: null, engineType: null, hostIps: [] }],
      ['host:db', { name: 'db', type: 'host', subType: null, engineType: null, hostIps: [] }],
    ]);

    const result = regroupRelationships([record1, record2], enrichmentMap);

    // Different target types → two separate groups
    expect(result).toHaveLength(2);
    // Each group has a single target, so targetNodeId equals the targetId
    const targetNodeIds = result.map((r) => r.targetNodeId).sort();
    expect(targetNodeIds).toContain('user:alice');
    expect(targetNodeIds).toContain('host:db');
  });
});

describe('enrichRelationshipDocData', () => {
  it('returns empty array for empty input', () => {
    const result = enrichRelationshipDocData([], new Map());
    expect(result).toEqual([]);
  });

  it('rebuilds targetsDocData with availableInEntityStore=false when no enrichment', () => {
    const record = buildRelationshipEdge({ actorNodeId: 'host:webserver', targetId: 'user:alice' });
    const grouped = regroupRelationships([record], new Map());
    const result = enrichRelationshipDocData(grouped, new Map());

    expect(result).toHaveLength(1);
    const [group] = result;

    const targetDoc = JSON.parse((group.targetsDocData as string[])[0]);
    expect(targetDoc.entity.availableInEntityStore).toBe(false);
  });

  it('rebuilds targetsDocData with enrichment data when enrichment found', () => {
    const record = buildRelationshipEdge({ actorNodeId: 'host:webserver', targetId: 'user:alice' });
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
