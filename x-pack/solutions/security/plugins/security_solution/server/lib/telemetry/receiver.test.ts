/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { TelemetryReceiver } from './receiver';
import type { TelemetryQueryConfiguration } from './types';
import type { ElasticsearchClient } from '@kbn/core/server';

describe('TelemetryReceiver', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let receiver: TelemetryReceiver;
  let mockEsClient: jest.Mocked<ElasticsearchClient>;

  const createMockQueryConfig = (excludeValue: boolean): TelemetryQueryConfiguration => ({
    pageSize: 500,
    maxResponseSize: 10 * 1024 * 1024,
    maxCompressedResponseSize: 8 * 1024 * 1024,
    excludeColdAndFrozenTiers: async () => excludeValue,
  });

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    receiver = new TelemetryReceiver(logger);

    mockEsClient = {
      search: jest.fn().mockResolvedValue({ hits: { hits: [] } }),
    } as unknown as jest.Mocked<ElasticsearchClient>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('tierFilter', () => {
    it('should return tier exclusion filter when excludeColdAndFrozenTiers returns true', async () => {
      const mockQueryConfig = createMockQueryConfig(true);
      // eslint-disable-next-line dot-notation
      receiver['queryConfig'] = mockQueryConfig;

      const result = await receiver.tierFilter();

      expect(result).toEqual([
        {
          bool: {
            must_not: {
              terms: {
                _tier: ['data_frozen', 'data_cold'],
              },
            },
          },
        },
      ]);
    });

    it('should return empty array when excludeColdAndFrozenTiers returns false', async () => {
      const mockQueryConfig = createMockQueryConfig(false);
      // eslint-disable-next-line dot-notation
      receiver['queryConfig'] = mockQueryConfig;

      const result = await receiver.tierFilter();

      expect(result).toEqual([]);
    });

    it('should return empty array when queryConfig is undefined', async () => {
      // eslint-disable-next-line dot-notation
      receiver['queryConfig'] = undefined;

      const result = await receiver.tierFilter();

      expect(result).toEqual([]);
    });

    it('should handle async function returning undefined', async () => {
      const mockQueryConfig = {
        pageSize: 500,
        maxResponseSize: 1000000,
        maxCompressedResponseSize: 500000,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        excludeColdAndFrozenTiers: async () => undefined as any,
      };
      // eslint-disable-next-line dot-notation
      receiver['queryConfig'] = mockQueryConfig;

      const result = await receiver.tierFilter();

      expect(result).toEqual([]);
    });
  });

  describe('fetchTimelineEvents', () => {
    beforeEach(() => {
      // eslint-disable-next-line dot-notation
      receiver['_esClient'] = mockEsClient;
      // eslint-disable-next-line dot-notation
      receiver['alertsIndex'] = 'alerts-test';
    });

    it('should include tier filter in query when filtering is enabled', async () => {
      const mockQueryConfig = createMockQueryConfig(true);
      // eslint-disable-next-line dot-notation
      receiver['queryConfig'] = mockQueryConfig;

      await receiver.fetchTimelineEvents(['entity-id-1', 'entity-id-2']);

      expect(mockEsClient.search).toHaveBeenCalledTimes(1);
      const queryArg = mockEsClient.search.mock.calls[0][0];

      expect(queryArg?.query?.bool?.filter).not.toBeFalsy();
      // eslint-disable-next-line @typescript-eslint/no-extra-non-null-assertion, @typescript-eslint/no-explicit-any
      const filter = queryArg?.query?.bool?.filter!! as any[];
      expect(filter).toHaveLength(3);
      expect(filter[2]).toEqual({
        bool: {
          must_not: {
            terms: {
              _tier: ['data_frozen', 'data_cold'],
            },
          },
        },
      });
    });

    it('should NOT include tier filter when filtering is disabled', async () => {
      const mockQueryConfig = createMockQueryConfig(false);
      // eslint-disable-next-line dot-notation
      receiver['queryConfig'] = mockQueryConfig;

      await receiver.fetchTimelineEvents(['entity-id-1']);

      expect(mockEsClient.search).toHaveBeenCalledTimes(1);
      const queryArg = mockEsClient.search.mock.calls[0][0];

      expect(queryArg?.query?.bool?.filter).not.toBeFalsy();
      // eslint-disable-next-line @typescript-eslint/no-extra-non-null-assertion, @typescript-eslint/no-explicit-any
      const filter = queryArg?.query?.bool?.filter!! as any[];
      expect(filter).toHaveLength(2);
      expect(filter[0].terms['process.entity_id']).toEqual(['entity-id-1']);
      expect(filter[1].term['event.category']).toEqual('process');
    });

    it('should call tierFilter before constructing query', async () => {
      const mockQueryConfig = createMockQueryConfig(true);
      // eslint-disable-next-line dot-notation
      receiver['queryConfig'] = mockQueryConfig;

      const tierFilterSpy = jest.spyOn(receiver, 'tierFilter');

      await receiver.fetchTimelineEvents(['entity-id-1']);

      expect(tierFilterSpy).toHaveBeenCalledTimes(1);
    });

    it('should log debug info with tier filters', async () => {
      const mockQueryConfig = createMockQueryConfig(true);
      // eslint-disable-next-line dot-notation
      receiver['queryConfig'] = mockQueryConfig;

      await receiver.fetchTimelineEvents(['entity-id-1']);

      expect(logger.debug).toHaveBeenCalledWith(
        'Fetching timeline events for node IDs',
        expect.objectContaining({
          tierFilters: expect.any(Array),
        })
      );
    });

    it('should spread tier filter correctly into existing filters', async () => {
      const mockQueryConfig = createMockQueryConfig(true);
      // eslint-disable-next-line dot-notation
      receiver['queryConfig'] = mockQueryConfig;

      await receiver.fetchTimelineEvents(['id1', 'id2']);

      const queryArg = mockEsClient.search.mock.calls[0][0];
      // eslint-disable-next-line @typescript-eslint/no-extra-non-null-assertion, @typescript-eslint/no-explicit-any
      const filters = queryArg?.query?.bool?.filter!! as any[];

      expect(filters[0]).toEqual({ terms: { 'process.entity_id': ['id1', 'id2'] } });
      expect(filters[1]).toEqual({ term: { 'event.category': 'process' } });
      expect(filters[2].bool.must_not.terms._tier).toEqual(['data_frozen', 'data_cold']);
    });

    it('should handle multiple node IDs with tier filtering', async () => {
      const mockQueryConfig = createMockQueryConfig(true);
      // eslint-disable-next-line dot-notation
      receiver['queryConfig'] = mockQueryConfig;

      const nodeIds = ['id1', 'id2', 'id3', 'id4', 'id5'];
      await receiver.fetchTimelineEvents(nodeIds);

      const queryArg = mockEsClient.search.mock.calls[0][0];

      // eslint-disable-next-line @typescript-eslint/no-extra-non-null-assertion, @typescript-eslint/no-explicit-any
      const filters = queryArg?.query?.bool?.filter!! as any[];
      expect(filters[0].terms['process.entity_id']).toEqual(nodeIds);
      expect(filters).toHaveLength(3);
    });
  });
});
