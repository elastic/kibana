/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Chance from 'chance';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';

import type { CloudSetup } from '@kbn/cloud-plugin/server';

import { cloudSecurityMetringCallback, getCloudProductTier } from './cloud_security_metering';
import {
  getAssetAggByCloudSecuritySolution,
  getAssetAggQueryByCloudSecuritySolution,
  getCloudSecurityUsageRecord,
  getSearchQueryByCloudSecuritySolution,
} from './cloud_security_metering_task';

import type { ServerlessSecurityConfig } from '../config';
import type { MeteringCallbackInput } from '../types';

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
  METERING_CONFIGS,
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

      if (cloudSecuritySolution === CSPM) {
        // CSPM alone probes the metering state index; an empty probe keeps this case on the legacy query
        // @ts-ignore
        mockEsClient.search.mockResolvedValueOnce({ hits: { hits: [] } });
      }

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

  it('has exactly four OR-branches — a new one could only broaden billing', () => {
    expect(query.query.bool.should).toHaveLength(4);
  });

  it('scopes a sub_type that is actually in the CSPM billable asset list', () => {
    expect(BILLABLE_ASSETS_CONFIG[CSPM].values).toContain(GCP_COMPUTE_INSTANCE_SUB_TYPE);
  });

  it('never reads a lifecycle status field — running-ness is derived', () => {
    // The state index cannot carry status: see metering_state_transform.ts.
    // If a status term reappears here it will silently match nothing, because
    // the transform stopped writing that field.
    expect(JSON.stringify(query)).not.toContain('status');
  });

  it('requires two scans and a >=24h run for GCP instances that never stopped', () => {
    expect(query.query.bool.should[1]).toEqual({
      bool: {
        must: [
          { term: { 'resource.sub_type': GCP_COMPUTE_INSTANCE_SUB_TYPE } },
          { range: { span_ms: { gt: 0 } } },
          { exists: { field: 'last_started_at' } },
          { range: { last_started_at: { lte: 'now-24h' } } },
        ],
        must_not: [{ exists: { field: 'last_stopped_at' } }],
      },
    });
  });

  it('bills a restarted-and-running GCP instance via a negative run duration', () => {
    // last_run_ms = last_stopped_at - last_started_at, so a start AFTER the
    // last stop is negative. This is the only signal that separates a running
    // restarted instance from a stopped one.
    expect(query.query.bool.should[2]).toEqual({
      bool: {
        must: [
          { term: { 'resource.sub_type': GCP_COMPUTE_INSTANCE_SUB_TYPE } },
          { range: { span_ms: { gt: 0 } } },
          { range: { last_run_ms: { lt: 0 } } },
          { range: { last_started_at: { lte: 'now-24h' } } },
        ],
      },
    });
  });

  it('bills stopped GCP instances only in their stop window, after a >=24h run', () => {
    expect(query.query.bool.should[3]).toEqual({
      bool: {
        must: [
          { term: { 'resource.sub_type': GCP_COMPUTE_INSTANCE_SUB_TYPE } },
          { range: { span_ms: { gt: 0 } } },
          { range: { last_run_ms: { gte: 24 * 60 * 60 * 1000 } } },
          { range: { last_stopped_at: { gte: 'now-24h' } } },
        ],
      },
    });
  });

  it('keeps the running and stopped branches mutually exclusive', () => {
    // A restarted instance has a stop on record, so branch 1 (must_not exists
    // last_stopped_at) cannot also match it; and its negative last_run_ms
    // cannot satisfy branch 3's `gte GCP_MIN_RUN_MS`. Without that, one
    // instance could be counted through two branches.
    const [, neverStopped, restarted, stopped] = query.query.bool.should;
    expect(neverStopped.bool.must_not).toEqual([{ exists: { field: 'last_stopped_at' } }]);
    expect(restarted.bool.must).toContainEqual({ range: { last_run_ms: { lt: 0 } } });
    expect(stopped.bool.must).toContainEqual({
      range: { last_run_ms: { gte: 24 * 60 * 60 * 1000 } },
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

describe('CSPM state-index selection', () => {
  const stateAggregations = {
    resource_sub_type: {
      buckets: [{ key: 'aws-s3', doc_count: 100, unique_assets: { value: 10 } }],
    },
    min_timestamp: { value: 1690729901738, value_as_string: '2023-07-30T15:11:41.738Z' },
  };

  // What ES returns when the billing query matches nothing: no buckets and a
  // min_timestamp with no value_as_string.
  const zeroMatchAggregations = {
    resource_sub_type: { buckets: [] },
    min_timestamp: { value: null },
  };

  const probeHit = { hits: { hits: [{ _id: 'stateDoc', _index: CDR_METERING_STATE_INDEX }] } };
  const probeEmpty = { hits: { hits: [] } };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('bills CSPM from the metering state index when the probe finds fresh state data', async () => {
    // @ts-ignore
    mockEsClient.search.mockResolvedValueOnce(probeHit);
    // @ts-ignore
    mockEsClient.search.mockResolvedValueOnce({ aggregations: stateAggregations });

    const result = await getAssetAggByCloudSecuritySolution(mockEsClient, CSPM, logger);

    expect(mockEsClient.search).toHaveBeenCalledTimes(2);
    expect(mockEsClient.search.mock.calls[1][0]).toEqual(
      expect.objectContaining({ index: CDR_METERING_STATE_INDEX })
    );
    expect(mockEsClient.search.mock.calls[1][0]).toEqual(getCspmStateAggQuery());
    expect(result).toEqual(stateAggregations);
    expect(logger.debug).toHaveBeenCalledWith('CSPM metering path: state-index');
  });

  it('falls back to the legacy CSPM query when the state index has no fresh data', async () => {
    // @ts-ignore
    mockEsClient.search.mockResolvedValueOnce(probeEmpty);
    // @ts-ignore
    mockEsClient.search.mockResolvedValueOnce({ aggregations: stateAggregations });

    const result = await getAssetAggByCloudSecuritySolution(mockEsClient, CSPM, logger);

    expect(mockEsClient.search).toHaveBeenCalledTimes(2);
    expect(mockEsClient.search.mock.calls[1][0]).toEqual(
      expect.objectContaining({ index: METERING_CONFIGS[CSPM].index })
    );
    expect(mockEsClient.search.mock.calls[1][0]).toEqual(
      getAssetAggQueryByCloudSecuritySolution(CSPM)
    );
    expect(result).toEqual(stateAggregations);
    expect(logger.debug).toHaveBeenCalledWith('CSPM metering path: legacy');
  });

  it('falls back to the legacy CSPM query when the state index does not exist', async () => {
    // 404 is ignored on the probe, so the response has no hits at all
    // @ts-ignore
    mockEsClient.search.mockResolvedValueOnce({});
    // @ts-ignore
    mockEsClient.search.mockResolvedValueOnce({ aggregations: stateAggregations });

    const result = await getAssetAggByCloudSecuritySolution(mockEsClient, CSPM, logger);

    expect(mockEsClient.search).toHaveBeenCalledTimes(2);
    expect(mockEsClient.search.mock.calls[1][0]).toEqual(
      getAssetAggQueryByCloudSecuritySolution(CSPM)
    );
    expect(result).toEqual(stateAggregations);
  });

  it('falls back to the legacy CSPM query when the probe itself fails', async () => {
    // Failing open: a probe error must never skip a billing cycle
    mockEsClient.search.mockRejectedValueOnce(new Error('state index probe failed'));
    // @ts-ignore
    mockEsClient.search.mockResolvedValueOnce({ aggregations: stateAggregations });

    const result = await getAssetAggByCloudSecuritySolution(mockEsClient, CSPM, logger);

    expect(mockEsClient.search).toHaveBeenCalledTimes(2);
    expect(mockEsClient.search.mock.calls[1][0]).toEqual(
      getAssetAggQueryByCloudSecuritySolution(CSPM)
    );
    expect(result).toEqual(stateAggregations);
  });

  it('returns undefined instead of throwing when the state query matches nothing', async () => {
    // @ts-ignore
    mockEsClient.search.mockResolvedValueOnce(probeHit);
    // @ts-ignore
    mockEsClient.search.mockResolvedValueOnce({ aggregations: zeroMatchAggregations });

    await expect(
      getAssetAggByCloudSecuritySolution(mockEsClient, CSPM, logger)
    ).resolves.toBeUndefined();
    expect(mockEsClient.search).toHaveBeenCalledTimes(2);
  });

  it('does not apply the empty-result guard to the legacy path', async () => {
    // The guard is state-path-only on purpose: the legacy query keeps its
    // pre-existing behavior of returning whatever aggregations ES produced,
    // bit-identical to what ships today. Removing `useStateIndex &&` from the
    // guard would silently change legacy billing, and this test catches that.
    // @ts-ignore
    mockEsClient.search.mockResolvedValueOnce(probeEmpty);
    // @ts-ignore
    mockEsClient.search.mockResolvedValueOnce({ aggregations: zeroMatchAggregations });

    const result = await getAssetAggByCloudSecuritySolution(mockEsClient, CSPM, logger);

    expect(result).toEqual(zeroMatchAggregations);
  });

  it('never probes the state index for KSPM', async () => {
    // @ts-ignore
    mockEsClient.search.mockResolvedValueOnce({ aggregations: stateAggregations });

    const result = await getAssetAggByCloudSecuritySolution(mockEsClient, KSPM, logger);

    expect(mockEsClient.search).toHaveBeenCalledTimes(1);
    expect(mockEsClient.search.mock.calls[0][0]).toEqual(
      expect.objectContaining({ index: METERING_CONFIGS[KSPM].index })
    );
    expect(result).toEqual(stateAggregations);
    // No path selection happens for KSPM, so there is nothing to report
    expect(logger.debug).not.toHaveBeenCalled();
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

describe('cloudSecurityMetringCallback', () => {
  const buildInput = (config: ServerlessSecurityConfig): MeteringCallbackInput => ({
    esClient: mockEsClient,
    cloudSetup: { serverless: { projectId: 'project-id' } } as CloudSetup,
    logger,
    taskId: 'task-id',
    lastSuccessfulReport: new Date(),
    signal: new AbortController().signal,
    config,
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should return no records if cloud product line is missing', async () => {
    const result = await cloudSecurityMetringCallback(
      buildInput({
        productTypes: [{ product_line: 'endpoint', product_tier: 'complete' }],
      } as unknown as ServerlessSecurityConfig)
    );

    expect(result).toEqual({ records: [] });
    expect(mockEsClient.search).not.toHaveBeenCalled();
  });

  it('should collect usage for CSPM, KSPM and CNVM', async () => {
    mockEsClient.search.mockResolvedValue({
      hits: { hits: [] },
    } as never);

    await cloudSecurityMetringCallback(
      buildInput({
        productTypes: [{ product_line: 'cloud', product_tier: 'complete' }],
        cloudSecurityMetering: { cspm: { enabled: true } },
      } as unknown as ServerlessSecurityConfig)
    );

    expect(mockEsClient.search).toHaveBeenCalledTimes(3);
  });

  it('should skip CSPM usage when CSPM metering is disabled', async () => {
    mockEsClient.search.mockResolvedValue({
      hits: { hits: [] },
    } as never);

    await cloudSecurityMetringCallback(
      buildInput({
        productTypes: [{ product_line: 'cloud', product_tier: 'complete' }],
        cloudSecurityMetering: { cspm: { enabled: false } },
      } as unknown as ServerlessSecurityConfig)
    );

    expect(mockEsClient.search).toHaveBeenCalledTimes(2);
  });
});
