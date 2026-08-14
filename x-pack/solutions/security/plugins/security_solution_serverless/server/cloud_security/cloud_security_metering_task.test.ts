/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Chance from 'chance';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';

import { getCloudProductTier } from './cloud_security_metering';
import {
  getCloudSecurityUsageRecord,
  getSearchQueryByCloudSecuritySolution,
} from './cloud_security_metering_task';

import type { ServerlessSecurityConfig } from '../config';

import type { ProductTier } from '../../common/product';
import { getCspmStateAggQuery } from './cspm_metering_state_query';
import {
  CLOUD_SECURITY_TASK_TYPE,
  CSPM,
  KSPM,
  CNVM,
  BILLABLE_ASSETS_CONFIG,
  CDR_METERING_STATE_INDEX,
  GCP_COMPUTE_INSTANCE_SUB_TYPE,
} from './constants';

const mockEsClient = elasticsearchServiceMock.createStart().client.asInternalUser;
const logger: ReturnType<typeof loggingSystemMock.createLogger> = loggingSystemMock.createLogger();
const chance = new Chance();

const cloudSecuritySolutions: Array<typeof CSPM | typeof KSPM> = [CSPM, KSPM];

describe('getCloudSecurityUsageRecord', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should return undefined if cloudSecuritySolution is missing', async () => {
    // Mock Elasticsearch search to throw an error
    mockEsClient.search.mockRejectedValue({});

    const projectId = chance.guid();
    const taskId = chance.guid();
    const cloudSecuritySolution = CSPM;

    const tier = 'essentials' as ProductTier;

    const result = await getCloudSecurityUsageRecord({
      esClient: mockEsClient,
      projectId,
      logger,
      taskId,
      lastSuccessfulReport: new Date(),
      cloudSecuritySolution,
      tier,
    });

    expect(result).toBeUndefined();
  });

  test.each(cloudSecuritySolutions)(
    'should return usageRecords with correct values for cspm and kspm when Elasticsearch response has aggregations',
    async (cloudSecuritySolution) => {
      // @ts-ignore
      mockEsClient.search.mockResolvedValueOnce({
        hits: { hits: [{ _id: 'someRecord', _index: 'mockIndex' }] }, // mocking for indexHasDataInDateRange
      });
      const randomIndex = Math.floor(
        Math.random() * BILLABLE_ASSETS_CONFIG[cloudSecuritySolution].values.length
      );
      const randomBillableAsset = BILLABLE_ASSETS_CONFIG[cloudSecuritySolution].values[randomIndex];

      // @ts-ignore
      mockEsClient.search.mockResolvedValueOnce({
        aggregations: {
          resource_sub_type: {
            buckets: [
              {
                key: randomBillableAsset,
                doc_count: 100,
                unique_assets: { value: 10 },
              },
              {
                key: 'not_billable_asset',
                doc_count: 50,
                unique_assets: { value: 11 },
              },
            ],
          },
          min_timestamp: {
            value_as_string: '2023-07-30T15:11:41.738Z',
          },
        },
      });

      const projectId = chance.guid();
      const taskId = chance.guid();

      const tier = 'essentials' as ProductTier;

      const result = await getCloudSecurityUsageRecord({
        esClient: mockEsClient,
        projectId,
        logger,
        taskId,
        lastSuccessfulReport: new Date(),
        cloudSecuritySolution,
        tier,
      });

      expect(result).toEqual([
        {
          id: expect.stringContaining(
            `${CLOUD_SECURITY_TASK_TYPE}_${cloudSecuritySolution}_${projectId}`
          ),
          usage_timestamp: '2023-07-30T15:11:41.738Z',
          creation_timestamp: expect.any(String), // Expect a valid ISO string
          usage: {
            type: CLOUD_SECURITY_TASK_TYPE,
            sub_type: cloudSecuritySolution,
            quantity: 10,
            period_seconds: expect.any(Number),
            metadata: {
              [randomBillableAsset]: '10',
              not_billable_asset: '11',
            },
          },
          source: {
            id: taskId,
            instance_group_id: projectId,
            metadata: {
              tier: 'essentials',
            },
          },
        },
      ]);
    }
  );

  it('should return usageRecords with correct values for cnvm when Elasticsearch response has aggregations', async () => {
    const cloudSecuritySolution = CNVM;

    // @ts-ignore
    mockEsClient.search.mockResolvedValueOnce({
      hits: { hits: [{ _id: 'someRecord', _index: 'mockIndex' }] }, // mocking for indexHasDataInDateRange
    });

    // @ts-ignore
    mockEsClient.search.mockResolvedValueOnce({
      aggregations: {
        unique_assets: {
          value: 10,
        },
        min_timestamp: {
          value_as_string: '2023-07-30T15:11:41.738Z',
        },
      },
    });

    const projectId = chance.guid();
    const taskId = chance.guid();

    const tier = 'essentials' as ProductTier;
    const result = await getCloudSecurityUsageRecord({
      esClient: mockEsClient,
      projectId,
      logger,
      taskId,
      lastSuccessfulReport: new Date(),
      cloudSecuritySolution,
      tier,
    });

    expect(result).toEqual([
      {
        id: expect.stringContaining(`${CLOUD_SECURITY_TASK_TYPE}_cnvm_${projectId}`),
        usage_timestamp: '2023-07-30T15:11:41.738Z',
        creation_timestamp: expect.any(String), // Expect a valid ISO string
        usage: {
          type: CLOUD_SECURITY_TASK_TYPE,
          sub_type: CNVM,
          quantity: 10,
          period_seconds: expect.any(Number),
        },
        source: {
          id: taskId,
          instance_group_id: projectId,
          metadata: {
            tier: 'essentials',
          },
        },
      },
    ]);
  });

  it('should return undefined when Elasticsearch response does not have aggregations', async () => {
    // @ts-ignore
    mockEsClient.search.mockResolvedValue({});

    const projectId = chance.guid();
    const taskId = chance.guid();
    const cloudSecuritySolution = CSPM;

    const tier = 'essentials' as ProductTier;

    const result = await getCloudSecurityUsageRecord({
      esClient: mockEsClient,
      projectId,
      logger,
      taskId,
      lastSuccessfulReport: new Date(),
      cloudSecuritySolution,
      tier,
    });

    expect(result).toBeUndefined();
  });

  it('should return undefined if an error occurs during Elasticsearch search', async () => {
    // Mock Elasticsearch search to throw an error
    mockEsClient.search.mockRejectedValue(new Error('Elasticsearch search error'));

    const projectId = chance.guid();
    const taskId = chance.guid();
    const cloudSecuritySolution = CSPM;

    const tier = 'essentials' as ProductTier;

    const result = await getCloudSecurityUsageRecord({
      esClient: mockEsClient,
      projectId,
      logger,
      taskId,
      lastSuccessfulReport: new Date(),
      cloudSecuritySolution,
      tier,
    });

    expect(result).toBeUndefined();
  });
});

describe('getSearchQueryByCloudSecuritySolution', () => {
  it('should return the correct search query for CSPM', () => {
    const result = getSearchQueryByCloudSecuritySolution('cspm');

    expect(result).toEqual({
      bool: {
        must: [
          {
            range: {
              '@timestamp': {
                gte: 'now-24h',
              },
            },
          },
          {
            term: {
              'rule.benchmark.posture_type': 'cspm',
            },
          },
        ],
      },
    });
  });

  it('should return the correct search query for KSPM', () => {
    const result = getSearchQueryByCloudSecuritySolution('kspm');

    expect(result).toEqual({
      bool: {
        must: [
          {
            range: {
              '@timestamp': {
                gte: 'now-24h',
              },
            },
          },
          {
            term: {
              'rule.benchmark.posture_type': 'kspm',
            },
          },
        ],
      },
    });
  });

  it('should return the correct search query for CNVM', () => {
    const result = getSearchQueryByCloudSecuritySolution(CNVM);

    expect(result).toEqual({
      bool: {
        must: [
          {
            range: {
              '@timestamp': {
                gte: 'now-24h',
              },
            },
          },
        ],
      },
    });
  });
});

describe('getCspmStateAggQuery', () => {
  const query = getCspmStateAggQuery();

  it('targets the metering state index with a size-0 aggregation search', () => {
    expect(query.index).toBe(CDR_METERING_STATE_INDEX);
    expect(query.size).toBe(0);
  });

  it('contains no scripts anywhere in the request', () => {
    expect(JSON.stringify(query)).not.toContain('script');
  });

  it('bills non-GCP sub_types on presence in the window only — unchanged semantics', () => {
    expect(query.query.bool.must).toEqual([
      { term: { posture_type: 'cspm' } },
      { range: { last_seen: { gte: 'now-24h' } } },
    ]);
    expect(query.query.bool.should[0]).toEqual({
      bool: {
        must_not: [{ term: { 'resource.sub_type': GCP_COMPUTE_INSTANCE_SUB_TYPE } }],
      },
    });
    expect(query.query.bool.minimum_should_match).toBe(1);
  });

  it('has exactly three OR-branches — a new one could only broaden billing', () => {
    expect(query.query.bool.should).toHaveLength(3);
  });

  it('scopes a sub_type that is actually in the CSPM billable asset list', () => {
    expect(BILLABLE_ASSETS_CONFIG[CSPM].values).toContain(GCP_COMPUTE_INSTANCE_SUB_TYPE);
  });

  it('requires two scans and a >=24h current run for RUNNING GCP instances', () => {
    expect(query.query.bool.should[1]).toEqual({
      bool: {
        must: [
          { term: { 'resource.sub_type': GCP_COMPUTE_INSTANCE_SUB_TYPE } },
          { range: { span_ms: { gt: 0 } } },
          { term: { 'latest.resource.lifecycle.status': 'RUNNING' } },
          { range: { 'latest.resource.lifecycle.last_started_at': { lte: 'now-24h' } } },
        ],
      },
    });
  });

  it('bills stopped GCP instances only in their stop window, after a >=24h run', () => {
    expect(query.query.bool.should[2]).toEqual({
      bool: {
        must: [
          { term: { 'resource.sub_type': GCP_COMPUTE_INSTANCE_SUB_TYPE } },
          { range: { span_ms: { gt: 0 } } },
          { range: { 'latest.resource.lifecycle.last_run_ms': { gte: 24 * 60 * 60 * 1000 } } },
          { range: { 'latest.resource.lifecycle.last_stopped_at': { gte: 'now-24h' } } },
        ],
        must_not: [{ term: { 'latest.resource.lifecycle.status': 'RUNNING' } }],
      },
    });
  });

  it('keeps the aggregation response shape of the legacy CSPM query', () => {
    expect(query.aggs.resource_sub_type.terms.field).toBe('resource.sub_type');
    expect(query.aggs.resource_sub_type.aggs.unique_assets.cardinality).toEqual({
      field: 'resource.id',
      precision_threshold: 40000,
    });
    expect(query.aggs.min_timestamp.min.field).toBe('last_seen');
  });
});

describe('should return the relevant product tier', () => {
  it('should return the relevant product tier for cloud product line', async () => {
    const serverlessSecurityConfig = {
      enabled: true,
      developer: {},
      productTypes: [
        { product_line: 'endpoint', product_tier: 'essentials' },
        { product_line: 'cloud', product_tier: 'complete' },
      ],
    } as unknown as ServerlessSecurityConfig;

    const tier = getCloudProductTier(serverlessSecurityConfig, logger);

    expect(tier).toBe('complete');
  });

  it('should return none tier in case cloud product line is missing ', async () => {
    const serverlessSecurityConfig = {
      enabled: true,
      developer: {},
      productTypes: [{ product_line: 'endpoint', product_tier: 'complete' }],
    } as unknown as ServerlessSecurityConfig;

    const tier = getCloudProductTier(serverlessSecurityConfig, logger);

    expect(tier).toBe('none');
  });
});
