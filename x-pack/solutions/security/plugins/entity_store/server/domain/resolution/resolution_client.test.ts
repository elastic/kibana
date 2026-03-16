/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { ElasticsearchClient } from '@kbn/core/server';
import { ResolutionClient } from '.';
import {
  ChainResolutionError,
  EntitiesNotFoundError,
  EntityHasAliasesError,
  MixedEntityTypesError,
  ResolutionSearchTruncatedError,
  ResolutionUpdateError,
  SelfLinkError,
} from '../errors';

const NAMESPACE = 'default';

const createEntityDoc = (
  entityId: string,
  type: string = 'user',
  resolvedTo?: string
): Record<string, unknown> => ({
  'entity.id': entityId,
  'entity.name': entityId,
  'entity.EngineMetadata.Type': type,
  ...(resolvedTo ? { 'entity.relationships.resolution.resolved_to': resolvedTo } : {}),
});

const createSearchResponse = (docs: Array<Record<string, unknown>>) => ({
  hits: {
    hits: docs.map((doc) => ({
      _id: `doc-${doc['entity.id']}`,
      _source: doc,
    })),
    total: { value: docs.length, relation: 'eq' as const },
  },
});

const createTruncatedSearchResponse = (
  docs: Array<Record<string, unknown>>,
  actualTotal: number,
  relation: 'eq' | 'gte' = 'eq'
) => ({
  hits: {
    hits: docs.map((doc) => ({
      _id: `doc-${doc['entity.id']}`,
      _source: doc,
    })),
    total: { value: actualTotal, relation },
  },
});

describe('ResolutionClient', () => {
  let client: ResolutionClient;
  let mockLogger: ReturnType<typeof loggerMock.create>;
  let mockEsClient: jest.Mocked<ElasticsearchClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLogger = loggerMock.create();
    mockEsClient = {
      search: jest.fn(),
      bulk: jest.fn(),
    } as unknown as jest.Mocked<ElasticsearchClient>;

    client = new ResolutionClient({
      logger: mockLogger,
      esClient: mockEsClient,
      namespace: NAMESPACE,
    });
  });

  describe('linkEntities', () => {
    it('should link entities to a target', async () => {
      const targetDoc = createEntityDoc('target-1');
      const entity1Doc = createEntityDoc('entity-1');
      const entity2Doc = createEntityDoc('entity-2');

      // fetchEntitiesByIds
      mockEsClient.search.mockResolvedValueOnce(
        createSearchResponse([targetDoc, entity1Doc, entity2Doc]) as never
      );
      // findEntitiesWithAliases — no aliases
      mockEsClient.search.mockResolvedValueOnce(createSearchResponse([]) as never);
      // bulk update
      mockEsClient.bulk.mockResolvedValueOnce({ errors: false, items: [] } as never);

      const result = await client.linkEntities('target-1', ['entity-1', 'entity-2']);

      expect(result).toEqual({
        linked: ['entity-1', 'entity-2'],
        skipped: [],
        target_id: 'target-1',
      });
      expect(mockEsClient.bulk).toHaveBeenCalledWith(
        expect.objectContaining({
          refresh: true,
          operations: expect.arrayContaining([
            expect.objectContaining({
              update: expect.objectContaining({
                retry_on_conflict: 3,
              }),
            }),
          ]),
        })
      );
    });

    it('should skip entities already linked to the same target', async () => {
      const targetDoc = createEntityDoc('target-1');
      const alreadyLinkedDoc = createEntityDoc('entity-1', 'user', 'target-1');
      const newDoc = createEntityDoc('entity-2');

      mockEsClient.search.mockResolvedValueOnce(
        createSearchResponse([targetDoc, alreadyLinkedDoc, newDoc]) as never
      );
      mockEsClient.search.mockResolvedValueOnce(createSearchResponse([]) as never);
      mockEsClient.bulk.mockResolvedValueOnce({ errors: false, items: [] } as never);

      const result = await client.linkEntities('target-1', ['entity-1', 'entity-2']);

      expect(result).toEqual({
        linked: ['entity-2'],
        skipped: ['entity-1'],
        target_id: 'target-1',
      });
    });

    it('should return empty linked when all are skipped', async () => {
      const targetDoc = createEntityDoc('target-1');
      const alreadyLinkedDoc = createEntityDoc('entity-1', 'user', 'target-1');

      mockEsClient.search.mockResolvedValueOnce(
        createSearchResponse([targetDoc, alreadyLinkedDoc]) as never
      );
      mockEsClient.search.mockResolvedValueOnce(createSearchResponse([]) as never);

      const result = await client.linkEntities('target-1', ['entity-1']);

      expect(result).toEqual({
        linked: [],
        skipped: ['entity-1'],
        target_id: 'target-1',
      });
      expect(mockEsClient.bulk).not.toHaveBeenCalled();
    });

    it('should throw SelfLinkError when target is in entity_ids', async () => {
      await expect(client.linkEntities('target-1', ['target-1', 'entity-1'])).rejects.toThrow(
        SelfLinkError
      );
    });

    it('should throw EntitiesNotFoundError when entities are missing', async () => {
      const targetDoc = createEntityDoc('target-1');

      mockEsClient.search.mockResolvedValueOnce(createSearchResponse([targetDoc]) as never);

      await expect(client.linkEntities('target-1', ['entity-1', 'entity-2'])).rejects.toThrow(
        EntitiesNotFoundError
      );
    });

    it('should throw EntitiesNotFoundError when target is missing', async () => {
      const entity1Doc = createEntityDoc('entity-1');

      mockEsClient.search.mockResolvedValueOnce(createSearchResponse([entity1Doc]) as never);

      await expect(client.linkEntities('target-1', ['entity-1'])).rejects.toThrow(
        EntitiesNotFoundError
      );
    });

    it('should throw MixedEntityTypesError when entities have different types', async () => {
      const targetDoc = createEntityDoc('target-1', 'user');
      const entity1Doc = createEntityDoc('entity-1', 'host');

      mockEsClient.search.mockResolvedValueOnce(
        createSearchResponse([targetDoc, entity1Doc]) as never
      );

      await expect(client.linkEntities('target-1', ['entity-1'])).rejects.toThrow(
        MixedEntityTypesError
      );
    });

    it('should throw ChainResolutionError when target is already an alias', async () => {
      const targetDoc = createEntityDoc('target-1', 'user', 'other-target');
      const entity1Doc = createEntityDoc('entity-1');

      mockEsClient.search.mockResolvedValueOnce(
        createSearchResponse([targetDoc, entity1Doc]) as never
      );

      await expect(client.linkEntities('target-1', ['entity-1'])).rejects.toThrow(
        ChainResolutionError
      );
    });

    it('should throw ChainResolutionError when entity is already an alias of another target', async () => {
      const targetDoc = createEntityDoc('target-1');
      const entity1Doc = createEntityDoc('entity-1', 'user', 'other-target');

      mockEsClient.search.mockResolvedValueOnce(
        createSearchResponse([targetDoc, entity1Doc]) as never
      );
      mockEsClient.search.mockResolvedValueOnce(createSearchResponse([]) as never);

      await expect(client.linkEntities('target-1', ['entity-1'])).rejects.toThrow(
        ChainResolutionError
      );
    });

    it('should throw EntityHasAliasesError when entity has aliases pointing to it', async () => {
      const targetDoc = createEntityDoc('target-1');
      const entity1Doc = createEntityDoc('entity-1');
      const aliasOfEntity1 = createEntityDoc('alias-1', 'user', 'entity-1');

      mockEsClient.search.mockResolvedValueOnce(
        createSearchResponse([targetDoc, entity1Doc]) as never
      );
      // findEntitiesWithAliases returns alias-1 pointing to entity-1
      mockEsClient.search.mockResolvedValueOnce(createSearchResponse([aliasOfEntity1]) as never);

      await expect(client.linkEntities('target-1', ['entity-1'])).rejects.toThrow(
        EntityHasAliasesError
      );
    });

    it('should deduplicate entity_ids', async () => {
      const targetDoc = createEntityDoc('target-1');
      const entity1Doc = createEntityDoc('entity-1');

      mockEsClient.search.mockResolvedValueOnce(
        createSearchResponse([targetDoc, entity1Doc]) as never
      );
      mockEsClient.search.mockResolvedValueOnce(createSearchResponse([]) as never);
      mockEsClient.bulk.mockResolvedValueOnce({ errors: false, items: [] } as never);

      const result = await client.linkEntities('target-1', ['entity-1', 'entity-1', 'entity-1']);

      expect(result).toEqual({
        linked: ['entity-1'],
        skipped: [],
        target_id: 'target-1',
      });
    });

    it('should throw ResolutionUpdateError when bulk update has errors', async () => {
      const targetDoc = createEntityDoc('target-1');
      const entity1Doc = createEntityDoc('entity-1');

      mockEsClient.search.mockResolvedValueOnce(
        createSearchResponse([targetDoc, entity1Doc]) as never
      );
      mockEsClient.search.mockResolvedValueOnce(createSearchResponse([]) as never);
      mockEsClient.bulk.mockResolvedValueOnce({
        errors: true,
        items: [
          {
            update: {
              _id: 'doc-1',
              status: 409,
              error: { type: 'version_conflict_engine_exception', reason: 'test failure' },
            },
          },
        ],
      } as never);

      await expect(client.linkEntities('target-1', ['entity-1'])).rejects.toThrow(
        ResolutionUpdateError
      );
    });

    it('should throw ResolutionSearchTruncatedError when findEntitiesWithAliases is truncated', async () => {
      const targetDoc = createEntityDoc('target-1');
      const entity1Doc = createEntityDoc('entity-1');

      mockEsClient.search.mockResolvedValueOnce(
        createSearchResponse([targetDoc, entity1Doc]) as never
      );
      // findEntitiesWithAliases returns truncated results (1 doc but total says 15000)
      mockEsClient.search.mockResolvedValueOnce(
        createTruncatedSearchResponse(
          [createEntityDoc('alias-1', 'user', 'entity-1')],
          15000
        ) as never
      );

      await expect(client.linkEntities('target-1', ['entity-1'])).rejects.toThrow(
        ResolutionSearchTruncatedError
      );
    });
  });

  describe('unlinkEntities', () => {
    it('should unlink alias entities', async () => {
      const aliasDoc = createEntityDoc('alias-1', 'user', 'target-1');

      mockEsClient.search.mockResolvedValueOnce(createSearchResponse([aliasDoc]) as never);
      mockEsClient.bulk.mockResolvedValueOnce({ errors: false, items: [] } as never);

      const result = await client.unlinkEntities(['alias-1']);

      expect(result).toEqual({ unlinked: ['alias-1'], skipped: [] });
      expect(mockEsClient.bulk).toHaveBeenCalledWith(
        expect.objectContaining({
          refresh: true,
          operations: expect.arrayContaining([
            expect.objectContaining({
              doc: { 'entity.relationships.resolution.resolved_to': null },
            }),
          ]),
        })
      );
    });

    it('should throw EntitiesNotFoundError when entities are missing', async () => {
      mockEsClient.search.mockResolvedValueOnce(createSearchResponse([]) as never);

      await expect(client.unlinkEntities(['alias-1'])).rejects.toThrow(EntitiesNotFoundError);
    });

    it('should skip non-alias entities', async () => {
      const standaloneDoc = createEntityDoc('entity-1');

      mockEsClient.search.mockResolvedValueOnce(createSearchResponse([standaloneDoc]) as never);

      const result = await client.unlinkEntities(['entity-1']);

      expect(result).toEqual({ unlinked: [], skipped: ['entity-1'] });
      expect(mockEsClient.bulk).not.toHaveBeenCalled();
    });

    it('should unlink aliases and skip non-aliases in mixed input', async () => {
      const aliasDoc = createEntityDoc('alias-1', 'user', 'target-1');
      const standaloneDoc = createEntityDoc('entity-1');

      mockEsClient.search.mockResolvedValueOnce(
        createSearchResponse([aliasDoc, standaloneDoc]) as never
      );
      mockEsClient.bulk.mockResolvedValueOnce({ errors: false, items: [] } as never);

      const result = await client.unlinkEntities(['alias-1', 'entity-1']);

      expect(result).toEqual({ unlinked: ['alias-1'], skipped: ['entity-1'] });
    });

    it('should deduplicate entity_ids', async () => {
      const aliasDoc = createEntityDoc('alias-1', 'user', 'target-1');

      mockEsClient.search.mockResolvedValueOnce(createSearchResponse([aliasDoc]) as never);
      mockEsClient.bulk.mockResolvedValueOnce({ errors: false, items: [] } as never);

      const result = await client.unlinkEntities(['alias-1', 'alias-1', 'alias-1']);

      expect(result).toEqual({ unlinked: ['alias-1'], skipped: [] });
    });

    it('should throw ResolutionUpdateError when bulk update has errors', async () => {
      const aliasDoc = createEntityDoc('alias-1', 'user', 'target-1');

      mockEsClient.search.mockResolvedValueOnce(createSearchResponse([aliasDoc]) as never);
      mockEsClient.bulk.mockResolvedValueOnce({
        errors: true,
        items: [
          {
            update: {
              _id: 'doc-1',
              status: 409,
              error: { type: 'version_conflict_engine_exception', reason: 'test failure' },
            },
          },
        ],
      } as never);

      await expect(client.unlinkEntities(['alias-1'])).rejects.toThrow(ResolutionUpdateError);
    });
  });

  describe('getResolutionGroup', () => {
    it('should return group from target entity', async () => {
      const targetDoc = createEntityDoc('target-1');
      const aliasDoc = createEntityDoc('alias-1', 'user', 'target-1');

      // fetchEntitiesByIds for the requested entity
      mockEsClient.search.mockResolvedValueOnce(createSearchResponse([targetDoc]) as never);
      // search for group (target + aliases)
      mockEsClient.search.mockResolvedValueOnce(
        createSearchResponse([targetDoc, aliasDoc]) as never
      );

      const result = await client.getResolutionGroup('target-1');

      expect(result).toEqual({
        target: targetDoc,
        aliases: [aliasDoc],
        group_size: 2,
      });
    });

    it('should return group from alias entity', async () => {
      const targetDoc = createEntityDoc('target-1');
      const aliasDoc = createEntityDoc('alias-1', 'user', 'target-1');

      // fetchEntitiesByIds for the requested entity (alias)
      mockEsClient.search.mockResolvedValueOnce(createSearchResponse([aliasDoc]) as never);
      // search for group — resolves to target-1
      mockEsClient.search.mockResolvedValueOnce(
        createSearchResponse([targetDoc, aliasDoc]) as never
      );

      const result = await client.getResolutionGroup('alias-1');

      expect(result).toEqual({
        target: targetDoc,
        aliases: [aliasDoc],
        group_size: 2,
      });
    });

    it('should return standalone entity as target with empty aliases', async () => {
      const standaloneDoc = createEntityDoc('entity-1');

      // fetchEntitiesByIds
      mockEsClient.search.mockResolvedValueOnce(createSearchResponse([standaloneDoc]) as never);
      // search for group — only the entity itself
      mockEsClient.search.mockResolvedValueOnce(createSearchResponse([standaloneDoc]) as never);

      const result = await client.getResolutionGroup('entity-1');

      expect(result).toEqual({
        target: standaloneDoc,
        aliases: [],
        group_size: 1,
      });
    });

    it('should throw EntitiesNotFoundError when entity does not exist', async () => {
      mockEsClient.search.mockResolvedValueOnce(createSearchResponse([]) as never);

      await expect(client.getResolutionGroup('nonexistent')).rejects.toThrow(EntitiesNotFoundError);
    });

    it('should throw EntitiesNotFoundError when alias points to non-existent target', async () => {
      const aliasDoc = createEntityDoc('alias-1', 'user', 'deleted-target');

      // fetchEntitiesByIds returns the alias
      mockEsClient.search.mockResolvedValueOnce(createSearchResponse([aliasDoc]) as never);
      // search for group — target not found, only alias returned
      mockEsClient.search.mockResolvedValueOnce(createSearchResponse([aliasDoc]) as never);

      await expect(client.getResolutionGroup('alias-1')).rejects.toThrow(EntitiesNotFoundError);
    });

    it('should throw ResolutionSearchTruncatedError when group search is truncated', async () => {
      const targetDoc = createEntityDoc('target-1');

      // fetchEntitiesByIds
      mockEsClient.search.mockResolvedValueOnce(createSearchResponse([targetDoc]) as never);
      // search for group — returns 1 doc but total says 15000
      mockEsClient.search.mockResolvedValueOnce(
        createTruncatedSearchResponse([targetDoc], 15000) as never
      );

      await expect(client.getResolutionGroup('target-1')).rejects.toThrow(
        ResolutionSearchTruncatedError
      );
    });

    it('should throw ResolutionSearchTruncatedError when total relation is gte', async () => {
      const targetDoc = createEntityDoc('target-1');

      mockEsClient.search.mockResolvedValueOnce(createSearchResponse([targetDoc]) as never);
      // total.value === returned but relation is 'gte' — actual total is higher
      mockEsClient.search.mockResolvedValueOnce(
        createTruncatedSearchResponse([targetDoc], 1, 'gte') as never
      );

      await expect(client.getResolutionGroup('target-1')).rejects.toThrow(
        ResolutionSearchTruncatedError
      );
    });
  });
});
