/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { getContinuity } from './get_continuity';
import { fetchPipelines } from '../fetchers';

jest.mock('../fetchers', () => ({
  fetchPipelines: jest.fn(),
}));

const mockFetchPipelines = fetchPipelines as jest.Mock;

const esClient = {} as ElasticsearchClient;
const logger = { error: jest.fn(), warn: jest.fn(), info: jest.fn() } as unknown as Logger;

const makePipeline = (overrides = {}) => ({
  name: 'my-pipeline',
  indices: ['logs-endpoint.events-000001'],
  docsCount: 1000,
  failedDocsCount: 0,
  statsAvailable: true,
  ...overrides,
});

describe('getContinuity', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('status', () => {
    it('returns noData when fetchPipelines returns an empty array', async () => {
      mockFetchPipelines.mockResolvedValueOnce([]);
      const result = await getContinuity({ esClient, isServerless: false, logger });
      expect(result.status).toBe('noData');
    });

    it('returns healthy when pipelines exist but none have critical failure rates', async () => {
      mockFetchPipelines.mockResolvedValueOnce([
        makePipeline({ docsCount: 100, failedDocsCount: 0 }),
      ]);
      const result = await getContinuity({ esClient, isServerless: false, logger });
      expect(result.status).toBe('healthy');
    });

    it('returns actionsRequired when a pipeline exceeds the critical failure rate threshold', async () => {
      // 5% failure rate — above the 1% threshold
      mockFetchPipelines.mockResolvedValueOnce([
        makePipeline({ docsCount: 100, failedDocsCount: 5 }),
      ]);
      const result = await getContinuity({ esClient, isServerless: false, logger });
      expect(result.status).toBe('actionsRequired');
    });

    it('does not flag pipelines where statsAvailable is false', async () => {
      mockFetchPipelines.mockResolvedValueOnce([
        makePipeline({ statsAvailable: false, docsCount: 100, failedDocsCount: 99 }),
      ]);
      const result = await getContinuity({ esClient, isServerless: false, logger });
      expect(result.status).toBe('healthy');
      expect(result.actionableFindings).toHaveLength(0);
    });
  });

  describe('items', () => {
    it('returns all raw pipelines regardless of category', async () => {
      const pipelines = [
        makePipeline({ name: 'p1', indices: ['logs-endpoint-000001'] }),
        makePipeline({ name: 'p2', indices: ['.internal-kibana-task-000001'] }),
      ];
      mockFetchPipelines.mockResolvedValueOnce(pipelines);
      const result = await getContinuity({ esClient, isServerless: false, logger });
      expect(result.items).toHaveLength(2);
    });
  });

  describe('actionableFindings', () => {
    it('emits one finding per pipeline with a critical failure rate', async () => {
      mockFetchPipelines.mockResolvedValueOnce([
        makePipeline({ name: 'bad-pipeline', docsCount: 100, failedDocsCount: 10 }),
        makePipeline({ name: 'good-pipeline', docsCount: 100, failedDocsCount: 0 }),
      ]);
      const result = await getContinuity({ esClient, isServerless: false, logger });
      expect(result.actionableFindings).toHaveLength(1);
      expect(result.actionableFindings[0].resource).toBe('bad-pipeline');
      expect(result.actionableFindings[0].severity).toBe('CRITICAL');
    });

    it('finding message includes the pipeline name and counts', async () => {
      mockFetchPipelines.mockResolvedValueOnce([
        makePipeline({ name: 'my-pipeline', docsCount: 200, failedDocsCount: 10 }),
      ]);
      const result = await getContinuity({ esClient, isServerless: false, logger });
      expect(result.actionableFindings[0].message).toContain('my-pipeline');
      expect(result.actionableFindings[0].message).toContain('10');
    });
  });
});
