/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { fetchEntityRelationships } from './fetch_entity_relationships_graph';
import type { Logger } from '@kbn/core/server';
import type { EntityId } from './types';
import { getEntitiesLatestIndexName } from '@kbn/cloud-security-posture-common/utils/helpers';
import { ENTITY_RELATIONSHIP_FIELDS } from '@kbn/cloud-security-posture-common/constants';

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
    it('should use LOOKUP JOIN when entities index is in lookup mode', async () => {
      const indexName = getEntitiesLatestIndexName('default');

      // Mock lookup mode available
      (esClient.asInternalUser.indices as jest.Mocked<any>).getSettings = jest
        .fn()
        .mockResolvedValueOnce({
          [indexName]: {
            settings: {
              index: {
                mode: 'lookup',
              },
            },
          },
        });

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

      // Verify query uses v2 index and LOOKUP JOIN
      expect(query).toContain(`FROM ${indexName}`);
      expect(query).toContain(`LOOKUP JOIN ${indexName} ON entity.id`);
    });

    it('should return empty result when entities index is not in lookup mode', async () => {
      const indexName = getEntitiesLatestIndexName('default');

      // Mock lookup mode NOT available (standard mode)
      (esClient.asInternalUser.indices as jest.Mocked<any>).getSettings = jest
        .fn()
        .mockResolvedValueOnce({
          [indexName]: {
            settings: {
              index: {
                mode: 'standard',
              },
            },
          },
        });

      const entityIds: EntityId[] = [{ id: 'entity-1', isOrigin: false }];

      const result = await fetchEntityRelationships({
        esClient,
        logger,
        entityIds,
        spaceId: 'default',
      });

      // Should not call ESQL when lookup mode is not available
      expect(esClient.asCurrentUser.helpers.esql).not.toHaveBeenCalled();
      expect(result).toEqual({ columns: [], records: [] });
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('is not in lookup mode, skipping relationship fetch')
      );
    });
  });

  describe('DSL filter building', () => {
    it('should build correct terms filter from entityIds', async () => {
      const indexName = getEntitiesLatestIndexName('default');

      (esClient.asInternalUser.indices as jest.Mocked<any>).getSettings = jest
        .fn()
        .mockResolvedValueOnce({
          [indexName]: {
            settings: {
              index: {
                mode: 'lookup',
              },
            },
          },
        });

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
      // Verify it queries for entities that have these IDs in their relationships (all fields)
      ENTITY_RELATIONSHIP_FIELDS.forEach((field) => {
        expect(filterArg.bool.should).toContainEqual({
          terms: {
            [`entity.relationships.${field}`]: ['entity-1', 'entity-2', 'entity-3'],
          },
        });
      });
      expect(filterArg.bool.minimum_should_match).toEqual(1);
    });

    it('should handle empty entityIds array', async () => {
      const indexName = getEntitiesLatestIndexName('default');

      (esClient.asInternalUser.indices as jest.Mocked<any>).getSettings = jest
        .fn()
        .mockResolvedValueOnce({
          [indexName]: {
            settings: {
              index: {
                mode: 'lookup',
              },
            },
          },
        });

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
    it('should return empty result when index does not exist (404)', async () => {
      const indexName = getEntitiesLatestIndexName('default');

      (esClient.asInternalUser.indices as jest.Mocked<any>).getSettings = jest
        .fn()
        .mockResolvedValueOnce({
          [indexName]: {
            settings: {
              index: {
                mode: 'lookup',
              },
            },
          },
        });

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
      const indexName = getEntitiesLatestIndexName('default');

      (esClient.asInternalUser.indices as jest.Mocked<any>).getSettings = jest
        .fn()
        .mockResolvedValueOnce({
          [indexName]: {
            settings: {
              index: {
                mode: 'lookup',
              },
            },
          },
        });

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
    it('should include actorsDocData and targetsDocData in query', async () => {
      const indexName = getEntitiesLatestIndexName('default');

      (esClient.asInternalUser.indices as jest.Mocked<any>).getSettings = jest
        .fn()
        .mockResolvedValueOnce({
          [indexName]: {
            settings: {
              index: {
                mode: 'lookup',
              },
            },
          },
        });

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
      expect(query).toContain('actorsDocData');
      expect(query).toContain('targetsDocData');
      expect(query).toContain('availableInEntityStore');
      expect(query).toContain('ecsParentField');
      expect(query).toContain('relationshipNodeId');
      expect(query).toContain('actorHostIps = VALUES(host.ip)');
      expect(query).toContain('targetHostIps = VALUES(_target_host_ip)');
    });
  });
});
