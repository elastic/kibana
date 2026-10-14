/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { getRetention } from './get_retention';
import { fetchRetention } from '../fetchers';

jest.mock('../fetchers', () => ({
  fetchRetention: jest.fn(),
}));

const mockFetchRetention = fetchRetention as jest.Mock;

const esClient = {} as ElasticsearchClient;
const logger = { error: jest.fn(), warn: jest.fn(), info: jest.fn() } as unknown as Logger;

const makeItem = (overrides = {}) => ({
  indexName: 'logs-cloud.stream',
  isDataStream: true,
  retentionType: 'ilm' as const,
  retentionPeriod: '400d',
  retentionDays: 400,
  policyName: 'my-policy',
  status: 'healthy' as const,
  ...overrides,
});

describe('getRetention', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('status', () => {
    it('returns noData when there are no items', async () => {
      mockFetchRetention.mockResolvedValueOnce({ items: [] });
      const result = await getRetention({ esClient, isServerless: false, logger });
      expect(result.status).toBe('noData');
    });

    it('returns healthy when all items are compliant', async () => {
      mockFetchRetention.mockResolvedValueOnce({ items: [makeItem()] });
      const result = await getRetention({ esClient, isServerless: false, logger });
      expect(result.status).toBe('healthy');
    });

    it('returns actionsRequired when any item is non-compliant', async () => {
      mockFetchRetention.mockResolvedValueOnce({
        items: [
          makeItem({ status: 'healthy' }),
          makeItem({ indexName: 'logs-network.dns', status: 'non-compliant', retentionDays: 30 }),
        ],
      });
      const result = await getRetention({ esClient, isServerless: false, logger });
      expect(result.status).toBe('actionsRequired');
    });
  });

  describe('items', () => {
    it('returns all raw retention items regardless of category', async () => {
      const items = [makeItem({ indexName: 'ds1' }), makeItem({ indexName: 'ds2' })];
      mockFetchRetention.mockResolvedValueOnce({ items });
      const result = await getRetention({ esClient, isServerless: false, logger });
      expect(result.items).toHaveLength(2);
    });
  });

  describe('actionableFindings', () => {
    it('emits one finding per non-compliant item', async () => {
      mockFetchRetention.mockResolvedValueOnce({
        items: [
          makeItem({ status: 'healthy' }),
          makeItem({ indexName: 'logs-network.dns', status: 'non-compliant', retentionDays: 30 }),
          makeItem({ indexName: 'logs-identity.auth', status: 'non-compliant', retentionDays: 90 }),
        ],
      });
      const result = await getRetention({ esClient, isServerless: false, logger });
      expect(result.actionableFindings).toHaveLength(2);
      const resources = result.actionableFindings.map((f) => f.resource);
      expect(resources).toContain('logs-network.dns');
      expect(resources).toContain('logs-identity.auth');
    });

    it('finding message includes retention period and 365-day threshold', async () => {
      mockFetchRetention.mockResolvedValueOnce({
        items: [
          makeItem({
            indexName: 'logs-network.dns',
            status: 'non-compliant',
            retentionDays: 30,
            retentionPeriod: '30d',
          }),
        ],
      });
      const result = await getRetention({ esClient, isServerless: false, logger });
      expect(result.actionableFindings[0].message).toContain('30d');
      expect(result.actionableFindings[0].message).toContain('365');
    });

    it('describes items with no explicit retention as having no retention policy', async () => {
      mockFetchRetention.mockResolvedValueOnce({
        items: [
          makeItem({
            status: 'non-compliant',
            retentionDays: null,
            retentionPeriod: null,
            retentionType: null,
          }),
        ],
      });
      const result = await getRetention({ esClient, isServerless: false, logger });
      expect(result.actionableFindings[0].message).toContain('no retention policy');
    });
  });
});
