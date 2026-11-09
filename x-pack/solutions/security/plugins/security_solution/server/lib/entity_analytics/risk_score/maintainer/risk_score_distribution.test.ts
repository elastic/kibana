/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { ElasticsearchClient } from '@kbn/core/server';
import { EntityType } from '../../../../../common/entity_analytics/types';
import {
  getRiskScoreBaseDistribution,
  getRiskScoreResolutionDistribution,
} from './risk_score_distribution';

describe('getRiskScoreBaseDistribution', () => {
  let esClient: ElasticsearchClient;
  const logger = loggingSystemMock.createLogger();

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createScopedClusterClient().asCurrentUser;
    jest.clearAllMocks();
  });

  it('maps band counts and percentiles from aggregations', async () => {
    (esClient.search as jest.Mock).mockResolvedValue({
      aggregations: {
        bands: {
          buckets: [
            { key: 'Critical', doc_count: 1 },
            { key: 'High', doc_count: 2 },
            { key: 'Moderate', doc_count: 3 },
            { key: 'Low', doc_count: 4 },
            { key: 'Unknown', doc_count: 5 },
          ],
        },
        normPercentiles: { values: { '50.0': 42.5, '90.0': 91 } },
      },
    });

    const result = await getRiskScoreBaseDistribution({
      esClient,
      namespace: 'default',
      entityType: EntityType.host,
      calculationRunId: 'run-1',
      logger,
    });

    expect(result).toEqual({
      Critical: 1,
      High: 2,
      Moderate: 3,
      Low: 4,
      Unknown: 5,
      normP50: 42.5,
      normP90: 91,
    });
  });

  it('ignores unexpected band keys and omits percentiles when total is zero', async () => {
    (esClient.search as jest.Mock).mockResolvedValue({
      aggregations: {
        bands: {
          buckets: [{ key: 'Severe', doc_count: 9 }],
        },
        normPercentiles: { values: { '50.0': 50, '90.0': 90 } },
      },
    });

    const result = await getRiskScoreBaseDistribution({
      esClient,
      namespace: 'default',
      entityType: EntityType.host,
      calculationRunId: 'run-1',
      logger,
    });

    expect(result).toEqual({ Critical: 0, High: 0, Moderate: 0, Low: 0, Unknown: 0 });
  });

  it('omits percentiles when the aggregation returns non-numeric values', async () => {
    (esClient.search as jest.Mock).mockResolvedValue({
      aggregations: {
        bands: {
          buckets: [{ key: 'Critical', doc_count: 2 }],
        },
        normPercentiles: { values: { '50.0': 'NaN', '90.0': 88.5 } },
      },
    });

    const result = await getRiskScoreBaseDistribution({
      esClient,
      namespace: 'default',
      entityType: EntityType.host,
      calculationRunId: 'run-1',
      logger,
    });

    expect(result).toEqual({
      Critical: 2,
      High: 0,
      Moderate: 0,
      Low: 0,
      Unknown: 0,
      normP90: 88.5,
    });
  });

  it('returns undefined and logs when the search fails', async () => {
    (esClient.search as jest.Mock).mockRejectedValue(new Error('index_closed'));

    const result = await getRiskScoreBaseDistribution({
      esClient,
      namespace: 'default',
      entityType: EntityType.user,
      calculationRunId: 'run-1',
      logger,
    });

    expect(result).toBeUndefined();
    expect(logger.warn).toHaveBeenCalledWith(
      'Failed to read base risk score distribution: index_closed'
    );
  });

  it('returns undefined when the response has no aggregations', async () => {
    (esClient.search as jest.Mock).mockResolvedValue({});

    const result = await getRiskScoreBaseDistribution({
      esClient,
      namespace: 'default',
      entityType: EntityType.host,
      calculationRunId: 'run-1',
      logger,
    });

    expect(result).toBeUndefined();
  });

  it('returns zero distribution when aggregations has no bands', async () => {
    (esClient.search as jest.Mock).mockResolvedValue({ aggregations: {} });

    const result = await getRiskScoreBaseDistribution({
      esClient,
      namespace: 'default',
      entityType: EntityType.host,
      calculationRunId: 'run-1',
      logger,
    });

    expect(result).toEqual({ Critical: 0, High: 0, Moderate: 0, Low: 0, Unknown: 0 });
  });

  it('returns zero distribution when bands has no buckets', async () => {
    (esClient.search as jest.Mock).mockResolvedValue({
      aggregations: { bands: {}, normPercentiles: { values: { '50.0': 60, '90.0': 90 } } },
    });

    const result = await getRiskScoreBaseDistribution({
      esClient,
      namespace: 'default',
      entityType: EntityType.host,
      calculationRunId: 'run-1',
      logger,
    });

    expect(result).toEqual({ Critical: 0, High: 0, Moderate: 0, Low: 0, Unknown: 0 });
  });

  it('skips a bucket with an undefined key', async () => {
    (esClient.search as jest.Mock).mockResolvedValue({
      aggregations: {
        bands: {
          buckets: [{ doc_count: 7 }, { key: 'High', doc_count: 3 }],
        },
        normPercentiles: { values: { '50.0': 50, '90.0': 90 } },
      },
    });

    const result = await getRiskScoreBaseDistribution({
      esClient,
      namespace: 'default',
      entityType: EntityType.host,
      calculationRunId: 'run-1',
      logger,
    });

    expect(result).toEqual({
      Critical: 0,
      High: 3,
      Moderate: 0,
      Low: 0,
      Unknown: 0,
      normP50: 50,
      normP90: 90,
    });
  });

  it('treats a null or undefined doc_count as zero', async () => {
    (esClient.search as jest.Mock).mockResolvedValue({
      aggregations: {
        bands: {
          buckets: [
            { key: 'Critical', doc_count: null },
            { key: 'High', doc_count: undefined },
            { key: 'Low', doc_count: 4 },
          ],
        },
        normPercentiles: { values: { '50.0': 30, '90.0': 70 } },
      },
    });

    const result = await getRiskScoreBaseDistribution({
      esClient,
      namespace: 'default',
      entityType: EntityType.host,
      calculationRunId: 'run-1',
      logger,
    });

    expect(result).toEqual({
      Critical: 0,
      High: 0,
      Moderate: 0,
      Low: 4,
      Unknown: 0,
      normP50: 30,
      normP90: 70,
    });
  });

  it('omits percentiles when normPercentiles is absent but total is positive', async () => {
    (esClient.search as jest.Mock).mockResolvedValue({
      aggregations: {
        bands: { buckets: [{ key: 'Critical', doc_count: 1 }] },
      },
    });

    const result = await getRiskScoreBaseDistribution({
      esClient,
      namespace: 'default',
      entityType: EntityType.host,
      calculationRunId: 'run-1',
      logger,
    });

    expect(result).toEqual({ Critical: 1, High: 0, Moderate: 0, Low: 0, Unknown: 0 });
  });

  it('queries by calculationRunId and base score_type on the correct index', async () => {
    (esClient.search as jest.Mock).mockResolvedValue({
      aggregations: {
        bands: { buckets: [] },
        normPercentiles: { values: {} },
      },
    });

    await getRiskScoreBaseDistribution({
      esClient,
      namespace: 'default',
      entityType: EntityType.host,
      calculationRunId: 'run-42',
      logger,
    });

    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 'risk-score.risk-score-default',
        query: {
          bool: {
            filter: [
              { term: { 'host.risk.calculation_run_id': 'run-42' } },
              expect.objectContaining({
                bool: expect.objectContaining({
                  should: expect.arrayContaining([{ term: { 'host.risk.score_type': 'base' } }]),
                }),
              }),
            ],
          },
        },
      })
    );
  });
});

describe('getRiskScoreResolutionDistribution', () => {
  let esClient: ElasticsearchClient;
  const logger = loggingSystemMock.createLogger();

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createScopedClusterClient().asCurrentUser;
    jest.clearAllMocks();
  });

  it('queries resolution scores for the calculation run and maps their bands', async () => {
    (esClient.search as jest.Mock).mockResolvedValue({
      aggregations: {
        bands: {
          buckets: [
            { key: 'Critical', doc_count: 2 },
            { key: 'High', doc_count: 1 },
          ],
        },
        normPercentiles: { values: { '50.0': 55, '90.0': 80 } },
      },
    });

    const result = await getRiskScoreResolutionDistribution({
      esClient,
      namespace: 'default',
      entityType: EntityType.user,
      calculationRunId: 'run-7',
      logger,
    });

    expect(result).toEqual({
      Critical: 2,
      High: 1,
      Moderate: 0,
      Low: 0,
      Unknown: 0,
      normP50: 55,
      normP90: 80,
    });
    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 'risk-score.risk-score-default',
        query: {
          bool: {
            filter: [
              { term: { 'user.risk.calculation_run_id': 'run-7' } },
              { term: { 'user.risk.score_type': 'resolution' } },
            ],
          },
        },
      })
    );
  });

  it('returns undefined when the response has no aggregations', async () => {
    (esClient.search as jest.Mock).mockResolvedValue({});

    const result = await getRiskScoreResolutionDistribution({
      esClient,
      namespace: 'default',
      entityType: EntityType.user,
      calculationRunId: 'run-7',
      logger,
    });

    expect(result).toBeUndefined();
  });

  it('returns zero distribution when bands has no buckets', async () => {
    (esClient.search as jest.Mock).mockResolvedValue({
      aggregations: { bands: {}, normPercentiles: { values: { '50.0': 55, '90.0': 80 } } },
    });

    const result = await getRiskScoreResolutionDistribution({
      esClient,
      namespace: 'default',
      entityType: EntityType.user,
      calculationRunId: 'run-7',
      logger,
    });

    expect(result).toEqual({ Critical: 0, High: 0, Moderate: 0, Low: 0, Unknown: 0 });
  });

  it('omits percentiles when normPercentiles is absent but total is positive', async () => {
    (esClient.search as jest.Mock).mockResolvedValue({
      aggregations: {
        bands: { buckets: [{ key: 'High', doc_count: 2 }] },
      },
    });

    const result = await getRiskScoreResolutionDistribution({
      esClient,
      namespace: 'default',
      entityType: EntityType.user,
      calculationRunId: 'run-7',
      logger,
    });

    expect(result).toEqual({ Critical: 0, High: 2, Moderate: 0, Low: 0, Unknown: 0 });
  });

  it('returns undefined and logs when the search fails', async () => {
    (esClient.search as jest.Mock).mockRejectedValue(new Error('shard_failed'));

    const result = await getRiskScoreResolutionDistribution({
      esClient,
      namespace: 'default',
      entityType: EntityType.user,
      calculationRunId: 'run-7',
      logger,
    });

    expect(result).toBeUndefined();
    expect(logger.warn).toHaveBeenCalledWith(
      'Failed to read resolution risk score distribution: shard_failed'
    );
  });
});
