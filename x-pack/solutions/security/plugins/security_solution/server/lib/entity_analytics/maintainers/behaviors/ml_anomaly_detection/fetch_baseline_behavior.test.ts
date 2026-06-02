/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { MlPluginSetup } from '@kbn/ml-plugin/server';
import {
  clearJobConfigCacheForTest,
  fetchBaselineBehavior,
  getJobConfig,
} from './fetch_baseline_behavior';
import { makeAnomaly, makeMsearchResponse } from './test_helpers';

jest.mock('@kbn/entity-store/common/euid_helpers', () => ({
  euid: {
    painless: {
      getEuidRuntimeMapping: jest.fn().mockReturnValue({ type: 'keyword', script: { source: '' } }),
    },
  },
}));

const MOCK_CURRENT_TIME = 1778241600000; // 2026-05-08T12:00:00.000Z

const soClient = savedObjectsClientMock.create();
let logger: ReturnType<typeof loggingSystemMock.createLogger>;
let mockJobsFn: jest.Mock;
let mockMl: MlPluginSetup;

const makeJob = (overrides: Record<string, unknown> = {}) => ({
  datafeed_config: {
    indices: ['logs-*'],
    query: { bool: { filter: [{ term: { 'event.action': 'authentication' } }] } },
  },
  analysis_config: {
    detectors: [{ function: 'rare', by_field_name: 'source.ip', detector_index: 0 }],
    influencers: ['user.name', 'source.ip'],
  },
  ...overrides,
});

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(MOCK_CURRENT_TIME);
  jest.clearAllMocks();
  clearJobConfigCacheForTest();
  logger = loggingSystemMock.createLogger();
  mockJobsFn = jest.fn().mockResolvedValue({ jobs: [makeJob()] });
  mockMl = {
    anomalyDetectorsProvider: jest.fn().mockReturnValue({ jobs: mockJobsFn }),
  } as unknown as MlPluginSetup;
});

afterEach(() => {
  jest.useRealTimers();
});

describe('getJobConfig', () => {
  it('returns extracted config when job is found', async () => {
    const result = await getJobConfig({ ml: mockMl, jobId: 'test-job', soClient, logger });

    expect(result).toEqual({
      sourceIndex: ['logs-*'],
      datafeedQuery: { bool: { filter: [{ term: { 'event.action': 'authentication' } }] } },
      detectors: [{ function: 'rare', by_field_name: 'source.ip', detector_index: 0 }],
      bucketSpanMs: 3600000, // default 1h – makeJob has no bucket_span
    });
  });

  it('parses bucket_span into milliseconds', async () => {
    mockJobsFn.mockResolvedValueOnce({
      jobs: [
        makeJob({
          analysis_config: {
            detectors: [{ function: 'rare', by_field_name: 'source.ip' }],
            bucket_span: '15m',
          },
        }),
      ],
    });

    const result = await getJobConfig({ ml: mockMl, jobId: 'test-job', soClient, logger });

    expect(result?.bucketSpanMs).toBe(900000); // 15 * 60 * 1000
  });

  it('falls back to 1h when bucket_span is absent', async () => {
    const result = await getJobConfig({ ml: mockMl, jobId: 'test-job', soClient, logger });

    expect(result?.bucketSpanMs).toBe(3600000);
  });

  it('falls back to 1h and logs a warning when bucket_span cannot be parsed', async () => {
    mockJobsFn.mockResolvedValueOnce({
      jobs: [makeJob({ analysis_config: { detectors: [], bucket_span: 'not-a-duration' } })],
    });

    const result = await getJobConfig({ ml: mockMl, jobId: 'test-job', soClient, logger });

    expect(result?.bucketSpanMs).toBe(3600000);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Invalid bucket_span'));
  });

  it('falls back to match_all when datafeed query is absent', async () => {
    mockJobsFn.mockResolvedValueOnce({
      jobs: [makeJob({ datafeed_config: { indices: ['logs-*'] } })],
    });

    const result = await getJobConfig({ ml: mockMl, jobId: 'test-job', soClient, logger });

    expect(result?.datafeedQuery).toEqual({ match_all: {} });
  });

  it('returns null when the job list is empty', async () => {
    mockJobsFn.mockResolvedValueOnce({ jobs: [] });

    const result = await getJobConfig({ ml: mockMl, jobId: 'missing-job', soClient, logger });

    expect(result).toBeNull();
  });

  it('returns null and logs a warning when the ML provider throws', async () => {
    mockJobsFn.mockRejectedValueOnce(new Error('cluster unavailable'));

    const result = await getJobConfig({ ml: mockMl, jobId: 'bad-job', soClient, logger });

    expect(result).toBeNull();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Failed to load job config for bad-job')
    );
  });

  it('returns the cached result on a second call without querying ML again', async () => {
    await getJobConfig({ ml: mockMl, jobId: 'cached-job', soClient, logger });
    await getJobConfig({ ml: mockMl, jobId: 'cached-job', soClient, logger });

    expect(mockJobsFn).toHaveBeenCalledTimes(1);
  });

  it('caches null on error so subsequent calls do not retry', async () => {
    mockJobsFn.mockRejectedValueOnce(new Error('timeout'));

    await getJobConfig({ ml: mockMl, jobId: 'error-job', soClient, logger });
    const secondResult = await getJobConfig({ ml: mockMl, jobId: 'error-job', soClient, logger });

    expect(secondResult).toBeNull();
    expect(mockJobsFn).toHaveBeenCalledTimes(1);
  });

  it('caches null when job list is empty', async () => {
    mockJobsFn.mockResolvedValueOnce({ jobs: [] });

    await getJobConfig({ ml: mockMl, jobId: 'empty-job', soClient, logger });
    await getJobConfig({ ml: mockMl, jobId: 'empty-job', soClient, logger });

    expect(mockJobsFn).toHaveBeenCalledTimes(1);
  });
});

describe('fetchBaselineBehavior', () => {
  let mockEsMsearch: jest.Mock;
  let esClient: ElasticsearchClient;

  const defaultOpts = {
    abortSignal: new AbortController().signal,
    entityId: 'user:alice',
    entityType: 'user' as const,
    jobId: 'test-job',
  };

  beforeEach(() => {
    mockEsMsearch = jest.fn().mockResolvedValue(makeMsearchResponse([]));
    esClient = { msearch: mockEsMsearch } as unknown as ElasticsearchClient;
  });

  it('returns empty array for empty anomalies', async () => {
    const result = await fetchBaselineBehavior({
      ...defaultOpts,
      anomalies: [],
      esClient,
      logger,
      ml: mockMl,
      soClient,
    });

    expect(result).toEqual([]);
    expect(mockEsMsearch).not.toHaveBeenCalled();
  });

  it('returns anomalies as is when job config is not found', async () => {
    mockJobsFn.mockResolvedValueOnce({ jobs: [] });
    const anomalies = [makeAnomaly()];

    const result = await fetchBaselineBehavior({
      ...defaultOpts,
      anomalies,
      esClient,
      logger,
      ml: mockMl,
      soClient,
    });

    expect(result).toEqual(anomalies);
    expect(mockEsMsearch).not.toHaveBeenCalled();
  });

  it('returns anomalies as is when sourceIndex is empty', async () => {
    mockJobsFn.mockResolvedValueOnce({
      jobs: [makeJob({ datafeed_config: { indices: [], query: {} } })],
    });
    const anomalies = [makeAnomaly()];

    const result = await fetchBaselineBehavior({
      ...defaultOpts,
      anomalies,
      esClient,
      logger,
      ml: mockMl,
      soClient,
    });

    expect(result).toEqual(anomalies);
    expect(mockEsMsearch).not.toHaveBeenCalled();
  });

  it('returns anomalies as is when detectors list is empty', async () => {
    mockJobsFn.mockResolvedValueOnce({
      jobs: [makeJob({ analysis_config: { detectors: [] } })],
    });
    const anomalies = [makeAnomaly()];

    const result = await fetchBaselineBehavior({
      ...defaultOpts,
      anomalies,
      esClient,
      logger,
      ml: mockMl,
      soClient,
    });

    expect(result).toEqual(anomalies);
    expect(mockEsMsearch).not.toHaveBeenCalled();
  });

  describe('rare detector', () => {
    beforeEach(() => {
      mockJobsFn.mockResolvedValue({
        jobs: [
          makeJob({
            analysis_config: {
              detectors: [{ function: 'rare', by_field_name: 'source.ip' }],
            },
          }),
        ],
      });
    });

    it('returns an enriched anomaly with baseline values and anomalous value count', async () => {
      const anomaly = makeAnomaly({ byFieldName: 'source.ip', byFieldValue: 'evil-ip' });
      mockEsMsearch.mockResolvedValueOnce(
        makeMsearchResponse([
          {
            aggregations: {
              baseline: { buckets: [{ key: '10.0.0.1', doc_count: 5 }] },
              anomaly: { doc_count: 3 },
            },
          },
        ])
      );

      const result = await fetchBaselineBehavior({
        ...defaultOpts,
        anomalies: [anomaly],
        esClient,
        logger,
        ml: mockMl,
        soClient,
      });

      expect(result).toEqual([
        {
          ...anomaly,
          baselineValues: ['10.0.0.1'],
          anomalousValue: 'evil-ip',
          anomalousValueCount: 3,
        },
      ]);
    });

    it('sends one search pair (header + body) per anomaly in the msearch request', async () => {
      const anomalies = [
        makeAnomaly({ _id: 'a1', byFieldValue: 'ip-1' }),
        makeAnomaly({ _id: 'a2', byFieldValue: 'ip-2' }),
      ];
      mockEsMsearch.mockResolvedValueOnce(
        makeMsearchResponse([
          { aggregations: { baseline: { buckets: [] }, anomaly: { doc_count: 0 } } },
          { aggregations: { baseline: { buckets: [] }, anomaly: { doc_count: 0 } } },
        ])
      );

      await fetchBaselineBehavior({
        ...defaultOpts,
        anomalies,
        esClient,
        logger,
        ml: mockMl,
        soClient,
      });

      const { searches } = mockEsMsearch.mock.calls[0][0];
      // Two anomalies → two header+body pairs = 4 items
      expect(searches).toHaveLength(4);
      expect(searches[0]).toEqual({});
      expect(searches[2]).toEqual({});
    });

    it('excludes the anomalous by_field_value from the baseline terms agg', async () => {
      const anomaly = makeAnomaly({ byFieldName: 'source.ip', byFieldValue: 'evil-ip' });
      mockEsMsearch.mockResolvedValueOnce(
        makeMsearchResponse([
          { aggregations: { baseline: { buckets: [] }, anomaly: { doc_count: 0 } } },
        ])
      );

      await fetchBaselineBehavior({
        ...defaultOpts,
        anomalies: [anomaly],
        esClient,
        logger,
        ml: mockMl,
        soClient,
      });

      const { searches } = mockEsMsearch.mock.calls[0][0];
      const body = searches[1];
      expect(body.aggs.baseline.terms.exclude).toEqual(['evil-ip']);
      expect(body.aggs.anomaly.filter).toEqual({ term: { 'source.ip': 'evil-ip' } });
    });

    it('includes tier exclusion in must_not', async () => {
      mockEsMsearch.mockResolvedValueOnce(
        makeMsearchResponse([
          { aggregations: { baseline: { buckets: [] }, anomaly: { doc_count: 0 } } },
        ])
      );

      await fetchBaselineBehavior({
        ...defaultOpts,
        anomalies: [makeAnomaly({ byFieldName: 'source.ip' })],
        esClient,
        logger,
        ml: mockMl,
        soClient,
      });

      const { searches } = mockEsMsearch.mock.calls[0][0];
      expect(searches[1].query.bool.must_not).toEqual([
        { terms: { _tier: ['data_cold', 'data_frozen'] } },
      ]);
    });

    it('applies the timestamp range filter using bucketSpanMs as the upper bound', async () => {
      const anomaly = makeAnomaly({ timestamp: 1_000_000 });
      mockEsMsearch.mockResolvedValueOnce(
        makeMsearchResponse([
          { aggregations: { baseline: { buckets: [] }, anomaly: { doc_count: 0 } } },
        ])
      );

      await fetchBaselineBehavior({
        ...defaultOpts,
        anomalies: [anomaly],
        esClient,
        logger,
        ml: mockMl,
        soClient,
      });

      const { searches } = mockEsMsearch.mock.calls[0][0];
      const timestampRange = searches[1].query.bool.filter.find(
        (f: unknown) => typeof f === 'object' && f !== null && 'range' in f
      ) as { range: { '@timestamp': { lte: number; gte: string } } };
      // lte = anomaly.timestamp + defaultBucketSpanMs (3600000)
      expect(timestampRange.range['@timestamp'].lte).toBe(1_000_000 + 3_600_000);
      expect(timestampRange.range['@timestamp'].gte).toBe('now-90d');
    });

    it('returns the original anomaly without enrichment when msearch throws', async () => {
      const anomaly = makeAnomaly({ byFieldValue: 'evil-ip' });
      mockEsMsearch.mockRejectedValueOnce(new Error('cluster unavailable'));

      const result = await fetchBaselineBehavior({
        ...defaultOpts,
        anomalies: [anomaly],
        esClient,
        logger,
        ml: mockMl,
        soClient,
      });

      expect(result).toEqual([anomaly]);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('cluster unavailable'));
    });

    it('msearch request matches snapshot', async () => {
      const anomaly = makeAnomaly({ byFieldName: 'source.ip', byFieldValue: 'evil-ip' });
      mockEsMsearch.mockResolvedValueOnce(
        makeMsearchResponse([
          { aggregations: { baseline: { buckets: [] }, anomaly: { doc_count: 0 } } },
        ])
      );

      await fetchBaselineBehavior({
        ...defaultOpts,
        anomalies: [anomaly],
        esClient,
        logger,
        ml: mockMl,
        soClient,
      });

      expect(mockEsMsearch.mock.calls[0][0]).toMatchSnapshot();
    });
  });

  describe('time_of_day detector', () => {
    beforeEach(() => {
      mockJobsFn.mockResolvedValue({
        jobs: [
          makeJob({
            analysis_config: {
              detectors: [{ function: 'time_of_day' }],
            },
          }),
        ],
      });
    });

    it('returns enriched anomaly with typical as baseline and actual as anomalous value', async () => {
      // actual = 43200 → 12:00:00 (seconds since midnight)
      const anomaly = makeAnomaly({ actual: 43200, typical: 36000 });
      mockEsMsearch.mockResolvedValueOnce(
        makeMsearchResponse([{ aggregations: { time_bucket: { doc_count: 10 } } }])
      );

      const result = await fetchBaselineBehavior({
        ...defaultOpts,
        anomalies: [anomaly],
        esClient,
        logger,
        ml: mockMl,
        soClient,
      });

      expect(result).toEqual([
        { ...anomaly, baselineValues: [36000], anomalousValue: 43200, anomalousValueCount: 10 },
      ]);
    });

    it('filters the time_bucket agg by hour_of_day derived from actual', async () => {
      // actual = 43200 → hour = Math.floor(43200 / 3600) = 12
      const anomaly = makeAnomaly({ actual: 43200 });
      mockEsMsearch.mockResolvedValueOnce(
        makeMsearchResponse([{ aggregations: { time_bucket: { doc_count: 0 } } }])
      );

      await fetchBaselineBehavior({
        ...defaultOpts,
        anomalies: [anomaly],
        esClient,
        logger,
        ml: mockMl,
        soClient,
      });

      const { searches } = mockEsMsearch.mock.calls[0][0];
      expect(searches[1].aggs.time_bucket.filter).toEqual({ term: { hour_of_day: 12 } });
    });

    it('includes hour_of_day and day_of_week runtime mappings', async () => {
      mockEsMsearch.mockResolvedValueOnce(
        makeMsearchResponse([{ aggregations: { time_bucket: { doc_count: 0 } } }])
      );

      await fetchBaselineBehavior({
        ...defaultOpts,
        anomalies: [makeAnomaly()],
        esClient,
        logger,
        ml: mockMl,
        soClient,
      });

      const { searches } = mockEsMsearch.mock.calls[0][0];
      expect(searches[1].runtime_mappings.hour_of_day).toBeDefined();
      expect(searches[1].runtime_mappings.day_of_week).toBeDefined();
    });

    it('msearch request matches snapshot', async () => {
      // actual = 43200 → 12:00:00 (hour_of_day = 12)
      const anomaly = makeAnomaly({ actual: 43200, typical: 36000 });
      mockEsMsearch.mockResolvedValueOnce(
        makeMsearchResponse([{ aggregations: { time_bucket: { doc_count: 0 } } }])
      );

      await fetchBaselineBehavior({
        ...defaultOpts,
        anomalies: [anomaly],
        esClient,
        logger,
        ml: mockMl,
        soClient,
      });

      expect(mockEsMsearch.mock.calls[0][0]).toMatchSnapshot();
    });
  });

  describe('time_of_week detector', () => {
    beforeEach(() => {
      mockJobsFn.mockResolvedValue({
        jobs: [
          makeJob({
            analysis_config: {
              detectors: [{ function: 'time_of_week' }],
            },
          }),
        ],
      });
    });

    it('filters the time_bucket agg by day_of_week and hour_of_day', async () => {
      // actual = 259200 → 3 full days from Sunday midnight (Wednesday, hour 0)
      // anomalousDay = Math.floor(259200 / 86400) = 3
      // anomalousHour = Math.floor((259200 % 86400) / 3600) = 0
      const anomaly = makeAnomaly({ actual: 259200 });
      mockEsMsearch.mockResolvedValueOnce(
        makeMsearchResponse([{ aggregations: { time_bucket: { doc_count: 7 } } }])
      );

      await fetchBaselineBehavior({
        ...defaultOpts,
        anomalies: [anomaly],
        esClient,
        logger,
        ml: mockMl,
        soClient,
      });

      const { searches } = mockEsMsearch.mock.calls[0][0];
      expect(searches[1].aggs.time_bucket.filter).toEqual({
        bool: {
          filter: [{ term: { day_of_week: 3 } }, { term: { hour_of_day: 0 } }],
        },
      });
    });

    it('returns anomalousValueCount from the time_bucket doc_count', async () => {
      const anomaly = makeAnomaly({ actual: 259200, typical: 0 });
      mockEsMsearch.mockResolvedValueOnce(
        makeMsearchResponse([{ aggregations: { time_bucket: { doc_count: 7 } } }])
      );

      const result = await fetchBaselineBehavior({
        ...defaultOpts,
        anomalies: [anomaly],
        esClient,
        logger,
        ml: mockMl,
        soClient,
      });

      expect(result).toEqual([
        { ...anomaly, baselineValues: [0], anomalousValue: 259200, anomalousValueCount: 7 },
      ]);
    });
  });

  describe('metric (default) detector', () => {
    beforeEach(() => {
      mockJobsFn.mockResolvedValue({
        jobs: [
          makeJob({
            analysis_config: {
              detectors: [{ function: 'high_mean', by_field_name: 'bytes' }],
            },
          }),
        ],
      });
    });

    it('does not call msearch', async () => {
      await fetchBaselineBehavior({
        ...defaultOpts,
        anomalies: [makeAnomaly()],
        esClient,
        logger,
        ml: mockMl,
        soClient,
      });

      expect(mockEsMsearch).not.toHaveBeenCalled();
    });

    it('returns anomalousValue equal to actual and baselineValues equal to [typical]', async () => {
      const anomaly = makeAnomaly({ actual: 100, typical: 10 });

      const result = await fetchBaselineBehavior({
        ...defaultOpts,
        anomalies: [anomaly],
        esClient,
        logger,
        ml: mockMl,
        soClient,
      });

      expect(result).toEqual([{ ...anomaly, anomalousValue: 100, baselineValues: [10] }]);
    });
  });

  it('routes anomalies to different handlers based on detector function and flattens results', async () => {
    mockJobsFn.mockResolvedValueOnce({
      jobs: [
        makeJob({
          analysis_config: {
            detectors: [
              { function: 'rare', by_field_name: 'source.ip' },
              { function: 'high_mean', field_name: 'bytes' },
            ],
          },
        }),
      ],
    });
    // rare anomaly → msearch; metric anomaly → no msearch
    const rareAnomaly = makeAnomaly({
      detectorIndex: 0,
      byFieldName: 'source.ip',
      byFieldValue: '1.2.3.4',
    });
    const metricAnomaly = makeAnomaly({ detectorIndex: 1, actual: 200, typical: 50 });

    mockEsMsearch.mockResolvedValueOnce(
      makeMsearchResponse([
        {
          aggregations: {
            baseline: { buckets: [{ key: '9.9.9.9', doc_count: 2 }] },
            anomaly: { doc_count: 1 },
          },
        },
      ])
    );

    const result = await fetchBaselineBehavior({
      ...defaultOpts,
      anomalies: [rareAnomaly, metricAnomaly],
      esClient,
      logger,
      ml: mockMl,
      soClient,
    });

    // msearch called once for the rare detector group only
    expect(mockEsMsearch).toHaveBeenCalledTimes(1);

    // both results returned
    expect(result).toHaveLength(2);
    const byId = Object.fromEntries((result ?? []).map((r) => [r.detectorIndex, r]));
    expect(byId[0].baselineValues).toEqual(['9.9.9.9']);
    expect(byId[1].anomalousValue).toBe(200);
    expect(byId[1].baselineValues).toEqual([50]);
  });

  it('groups anomalies for the same detector into a single msearch call', async () => {
    mockJobsFn.mockResolvedValueOnce({
      jobs: [
        makeJob({
          analysis_config: {
            detectors: [{ function: 'rare', by_field_name: 'source.ip' }],
          },
        }),
      ],
    });
    const anomalies = [
      makeAnomaly({ _id: 'a1', byFieldValue: 'ip-1', detectorIndex: 0 }),
      makeAnomaly({ _id: 'a2', byFieldValue: 'ip-2', detectorIndex: 0 }),
    ];
    mockEsMsearch.mockResolvedValueOnce(
      makeMsearchResponse([
        { aggregations: { baseline: { buckets: [] }, anomaly: { doc_count: 0 } } },
        { aggregations: { baseline: { buckets: [] }, anomaly: { doc_count: 0 } } },
      ])
    );

    await fetchBaselineBehavior({
      ...defaultOpts,
      anomalies,
      esClient,
      logger,
      ml: mockMl,
      soClient,
    });

    // Both anomalies in a single msearch call → 4 items (2 header+body pairs)
    expect(mockEsMsearch).toHaveBeenCalledTimes(1);
    expect(mockEsMsearch.mock.calls[0][0].searches).toHaveLength(4);
  });
});
