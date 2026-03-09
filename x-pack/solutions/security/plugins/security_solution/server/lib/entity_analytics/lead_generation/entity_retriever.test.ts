/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { createEntityRetriever, entityRecordToLeadEntity } from './entity_retriever';
import type { EntityRetriever } from './entity_retriever';

const createMockEntityRecord = (type: string, name: string) => ({
  '@timestamp': '2025-01-01T00:00:00Z',
  entity: { name, type, id: `${type}-${name}` },
  [type]: { name },
});

describe('EntityRetriever', () => {
  let retriever: EntityRetriever;
  const logger = loggingSystemMock.createLogger();
  const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
  const spaceId = 'default';

  beforeEach(() => {
    jest.clearAllMocks();
    retriever = createEntityRetriever({ esClient, logger, spaceId });
  });

  describe('fetchAllEntities', () => {
    it('fetches entities from user, host, and service indices', async () => {
      const userRecord = createMockEntityRecord('user', 'alice');
      const hostRecord = createMockEntityRecord('host', 'server-01');
      const serviceRecord = createMockEntityRecord('service', 'web-api');

      esClient.search
        .mockResolvedValueOnce({
          hits: { hits: [{ _source: userRecord, sort: ['2025-01-01', 'id1'] }] },
        } as never)
        .mockResolvedValueOnce({
          hits: { hits: [{ _source: hostRecord, sort: ['2025-01-01', 'id2'] }] },
        } as never)
        .mockResolvedValueOnce({
          hits: { hits: [{ _source: serviceRecord, sort: ['2025-01-01', 'id3'] }] },
        } as never);

      const result = await retriever.fetchAllEntities();

      expect(result).toHaveLength(3);
      expect(result[0].type).toBe('user');
      expect(result[0].name).toBe('alice');
      expect(result[1].type).toBe('host');
      expect(result[1].name).toBe('server-01');
      expect(result[2].type).toBe('service');
      expect(result[2].name).toBe('web-api');

      expect(esClient.search).toHaveBeenCalledTimes(3);
      expect(esClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          index: expect.stringContaining('security_user_default'),
          ignore_unavailable: true,
          query: { match_all: {} },
        })
      );
      expect(esClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          index: expect.stringContaining('security_host_default'),
        })
      );
      expect(esClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          index: expect.stringContaining('security_service_default'),
        })
      );
    });

    it('returns empty array when no entities exist', async () => {
      esClient.search.mockResolvedValue({ hits: { hits: [] } } as never);

      const result = await retriever.fetchAllEntities();

      expect(result).toEqual([]);
    });

    it('paginates via search_after for large result sets', async () => {
      const batch1 = Array.from({ length: 1000 }, (_, i) => ({
        _source: createMockEntityRecord('user', `user-${i}`),
        sort: [`2025-01-01`, `id-${i}`],
      }));
      const batch2 = [
        {
          _source: createMockEntityRecord('user', 'user-last'),
          sort: ['2025-01-01', 'id-last'],
        },
      ];

      esClient.search
        .mockResolvedValueOnce({ hits: { hits: batch1 } } as never) // user page 1
        .mockResolvedValueOnce({ hits: { hits: batch2 } } as never) // user page 2
        .mockResolvedValueOnce({ hits: { hits: [] } } as never) // host
        .mockResolvedValueOnce({ hits: { hits: [] } } as never); // service

      const result = await retriever.fetchAllEntities();

      expect(result).toHaveLength(1001);
      expect(esClient.search).toHaveBeenCalledTimes(4);

      const secondCall = esClient.search.mock.calls[1][0] as Record<string, unknown>;
      expect(secondCall.search_after).toEqual(['2025-01-01', 'id-999']);
    });

    it('continues to the next entity type when one fails', async () => {
      esClient.search
        .mockRejectedValueOnce(new Error('user index not found'))
        .mockResolvedValueOnce({
          hits: {
            hits: [
              { _source: createMockEntityRecord('host', 'server-01'), sort: ['2025-01-01', 'id'] },
            ],
          },
        } as never)
        .mockResolvedValueOnce({ hits: { hits: [] } } as never); // service

      const result = await retriever.fetchAllEntities();

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('host');
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch user records')
      );
    });

    it('skips records without _source', async () => {
      esClient.search
        .mockResolvedValueOnce({
          hits: {
            hits: [
              { _source: createMockEntityRecord('user', 'alice'), sort: ['ts', 'id1'] },
              { _source: undefined, sort: ['ts', 'id2'] },
            ],
          },
        } as never)
        .mockResolvedValueOnce({ hits: { hits: [] } } as never) // host
        .mockResolvedValueOnce({ hits: { hits: [] } } as never); // service

      const result = await retriever.fetchAllEntities();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('alice');
    });
  });

  describe('fetchEntitiesByName', () => {
    it('fetches specific entities by type and name', async () => {
      const record = createMockEntityRecord('user', 'bob');

      esClient.search.mockResolvedValueOnce({
        hits: { hits: [{ _source: record }] },
      } as never);

      const result = await retriever.fetchEntitiesByName([
        { entityType: 'user', entityName: 'bob' },
      ]);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('bob');

      expect(esClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: { bool: { filter: [{ terms: { 'user.name': ['bob'] } }] } },
        })
      );
    });

    it('groups entities by type for efficient querying', async () => {
      esClient.search
        .mockResolvedValueOnce({
          hits: {
            hits: [
              { _source: createMockEntityRecord('user', 'alice') },
              { _source: createMockEntityRecord('user', 'bob') },
            ],
          },
        } as never)
        .mockResolvedValueOnce({
          hits: { hits: [{ _source: createMockEntityRecord('host', 'server-01') }] },
        } as never);

      const result = await retriever.fetchEntitiesByName([
        { entityType: 'user', entityName: 'alice' },
        { entityType: 'user', entityName: 'bob' },
        { entityType: 'host', entityName: 'server-01' },
      ]);

      expect(result).toHaveLength(3);
      expect(esClient.search).toHaveBeenCalledTimes(2);
    });

    it('returns empty array when input is empty', async () => {
      const result = await retriever.fetchEntitiesByName([]);

      expect(result).toEqual([]);
      expect(esClient.search).not.toHaveBeenCalled();
    });

    it('logs warning and continues when a query fails', async () => {
      esClient.search.mockRejectedValueOnce(new Error('index missing')).mockResolvedValueOnce({
        hits: { hits: [{ _source: createMockEntityRecord('host', 'srv') }] },
      } as never);

      const result = await retriever.fetchEntitiesByName([
        { entityType: 'user', entityName: 'alice' },
        { entityType: 'host', entityName: 'srv' },
      ]);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('srv');
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch user records by name')
      );
    });
  });

  describe('entityRecordToLeadEntity', () => {
    it('extracts type and name from the entity field', () => {
      const record = createMockEntityRecord('user', 'alice');
      const leadEntity = entityRecordToLeadEntity(record as never);

      expect(leadEntity.type).toBe('user');
      expect(leadEntity.name).toBe('alice');
      expect(leadEntity.record).toBe(record);
    });

    it('defaults to "unknown" when entity field is missing', () => {
      const result = entityRecordToLeadEntity({} as never);

      expect(result.type).toBe('unknown');
      expect(result.name).toBe('unknown');
    });

    it('defaults to "unknown" when entity fields are undefined', () => {
      const result = entityRecordToLeadEntity({ entity: {} } as never);

      expect(result.type).toBe('unknown');
      expect(result.name).toBe('unknown');
    });
  });
});
