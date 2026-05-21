/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { getQuality } from './get_quality';

const esClient = {
  search: jest.fn(),
} as unknown as ElasticsearchClient;
const logger = { error: jest.fn(), warn: jest.fn(), info: jest.fn() } as unknown as Logger;

const makeSearchHit = (indexName: string, incompatibleFieldCount = 0) => ({
  _source: {
    indexName,
    incompatibleFieldCount,
    batchId: 'b1',
    isCheckAll: false,
    checkedAt: Date.now(),
    docsCount: 100,
    totalFieldCount: 50,
    ecsFieldCount: 48,
    customFieldCount: 2,
    sameFamilyFieldCount: 0,
    sameFamilyFields: [],
    sameFamilyFieldItems: [],
    incompatibleFieldMappingItems: [],
    incompatibleFieldValueItems: [],
    unallowedMappingFields: [],
    unallowedValueFields: [],
    sizeInBytes: 1024,
    markdownComments: [],
    ecsVersion: '8.11.0',
    error: null,
  },
});

const mockSearchResponse = (hits: ReturnType<typeof makeSearchHit>[]) => {
  (esClient.search as jest.Mock).mockResolvedValueOnce({
    hits: { hits },
  });
};

describe('getQuality', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('status', () => {
    it('returns noData when there are no quality results', async () => {
      mockSearchResponse([]);
      const result = await getQuality({ esClient, logger });
      expect(result.status).toBe('noData');
    });

    it('returns healthy when all checked indices are compatible', async () => {
      mockSearchResponse([makeSearchHit('logs-endpoint.events-default', 0)]);
      const result = await getQuality({ esClient, logger });
      expect(result.status).toBe('healthy');
    });

    it('returns actionsRequired when any index has incompatible fields', async () => {
      mockSearchResponse([
        makeSearchHit('logs-endpoint.events-default', 0),
        makeSearchHit('logs-cloud.asset-default', 3),
      ]);
      const result = await getQuality({ esClient, logger });
      expect(result.status).toBe('actionsRequired');
    });
  });

  describe('items', () => {
    it('deduplicates results by indexName, keeping the first (most recent) occurrence', async () => {
      mockSearchResponse([
        makeSearchHit('logs-endpoint.events-default', 5),
        makeSearchHit('logs-endpoint.events-default', 0), // duplicate — should be dropped
        makeSearchHit('logs-cloud.asset-default', 0),
      ]);
      const result = await getQuality({ esClient, logger });
      expect(result.items).toHaveLength(2);
      expect(result.items[0].indexName).toBe('logs-endpoint.events-default');
      expect(result.items[0].incompatibleFieldCount).toBe(5); // keeps first hit
    });
  });

  describe('actionableFindings', () => {
    it('emits one finding per incompatible index', async () => {
      mockSearchResponse([
        makeSearchHit('logs-endpoint.events-default', 3),
        makeSearchHit('logs-cloud.asset-default', 0),
        makeSearchHit('logs-identity.auth-default', 7),
      ]);
      const result = await getQuality({ esClient, logger });
      expect(result.actionableFindings).toHaveLength(2);
      const resources = result.actionableFindings.map((f) => f.resource);
      expect(resources).toContain('logs-endpoint.events-default');
      expect(resources).toContain('logs-identity.auth-default');
    });

    it('finding message includes indexName and incompatible count', async () => {
      mockSearchResponse([makeSearchHit('logs-endpoint.events-default', 4)]);
      const result = await getQuality({ esClient, logger });
      expect(result.actionableFindings[0].message).toContain('logs-endpoint.events-default');
      expect(result.actionableFindings[0].message).toContain('4');
    });

    it('returns no findings when esClient throws (graceful degradation)', async () => {
      (esClient.search as jest.Mock).mockRejectedValueOnce(new Error('ES unavailable'));
      const result = await getQuality({ esClient, logger });
      expect(result.status).toBe('noData');
      expect(result.actionableFindings).toHaveLength(0);
    });
  });
});
