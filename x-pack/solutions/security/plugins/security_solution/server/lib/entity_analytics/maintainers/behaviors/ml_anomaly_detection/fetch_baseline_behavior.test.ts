/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { MlPluginSetup } from '@kbn/ml-plugin/server';
import type { MlDetector } from '@elastic/elasticsearch/lib/api/types';
import {
  clearJobConfigCacheForTest,
  fetchBaselineBehavior,
  getBaselineConfigs,
  getJobConfig,
  type JobConfig,
} from './fetch_baseline_behavior';
import {
  makeAnomaly,
  makeEsSearchResponse,
  makeMetricSearchResponse,
  makeRareBucket,
} from './test_helpers';

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
      influencers: ['user.name', 'source.ip'],
    });
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

const makeJobConfig = (detectors: MlDetector[]): JobConfig => ({
  sourceIndex: ['logs-*'],
  datafeedQuery: { match_all: {} },
  detectors,
  influencers: [],
});

describe('getBaselineConfigs', () => {
  describe('rare detector', () => {
    it('returns a config using by_field_name as targetField and exclusionValues from anomalies', () => {
      const job = makeJobConfig([{ function: 'rare', by_field_name: 'source.ip' }]);
      const anomalies = [makeAnomaly({ byFieldName: 'source.ip', byFieldValue: 'evil-ip' })];

      const [config] = getBaselineConfigs(job, anomalies, 'user');

      expect(config).toMatchObject({
        detectorIndex: 0,
        func: 'rare',
        targetField: 'source.ip',
        exclusionValues: ['evil-ip'],
        groupFields: [],
      });
    });

    it('collects and deduplicates exclusionValues across multiple anomaly records', () => {
      const job = makeJobConfig([{ function: 'rare', by_field_name: 'source.ip' }]);
      const anomalies = [
        makeAnomaly({ byFieldValue: 'ip-1' }),
        makeAnomaly({ byFieldValue: 'ip-1' }),
        makeAnomaly({ byFieldValue: 'ip-2' }),
      ];

      const [config] = getBaselineConfigs(job, anomalies, 'user');

      expect(config.exclusionValues).toEqual(['ip-1', 'ip-2']);
    });

    it('returns empty exclusionValues when no anomaly has a byFieldValue', () => {
      const job = makeJobConfig([{ function: 'rare', by_field_name: 'source.ip' }]);
      const anomalies = [makeAnomaly({ byFieldValue: undefined })];

      const [config] = getBaselineConfigs(job, anomalies, 'user');

      expect(config.exclusionValues).toEqual([]);
    });

    it('skips the detector when by_field_name is absent', () => {
      const job = makeJobConfig([{ function: 'rare' }]);

      expect(getBaselineConfigs(job, [makeAnomaly()], 'user')).toHaveLength(0);
    });
  });

  describe('non-rare detector functions', () => {
    it('collects field_name, by_field_name, over_field_name, partition_field_name as groupFields', () => {
      const job = makeJobConfig([
        {
          function: 'high_distinct_count',
          field_name: 'process.name',
          by_field_name: 'department',
          over_field_name: 'source.ip',
          partition_field_name: 'team',
        },
      ]);

      const [config] = getBaselineConfigs(job, [makeAnomaly()], 'user');

      expect(config).toMatchObject({
        func: 'high_distinct_count',
        targetField: null,
        exclusionValues: [],
        groupFields: ['process.name', 'department', 'source.ip', 'team'],
      });
    });

    it('omits undefined dimensional fields from groupFields', () => {
      const job = makeJobConfig([{ function: 'high_mean', by_field_name: 'department' }]);

      const [config] = getBaselineConfigs(job, [makeAnomaly()], 'user');

      expect(config.groupFields).toEqual(['department']);
    });

    it('excludes only fields prefixed with the entityType from groupFields', () => {
      const job = makeJobConfig([
        {
          function: 'high_distinct_count',
          by_field_name: 'user.name',
          over_field_name: 'host.name',
          partition_field_name: 'source.ip',
        },
      ]);

      const [config] = getBaselineConfigs(job, [makeAnomaly()], 'user');

      expect(config.groupFields).toEqual(['host.name', 'source.ip']);
    });

    it('includes the detector with empty groupFields when all dimensional fields are filtered out', () => {
      const job = makeJobConfig([{ function: 'high_mean', by_field_name: 'user.name' }]);
      const [config] = getBaselineConfigs(job, [makeAnomaly()], 'user');

      expect(config).toMatchObject({ groupFields: [], groupFieldValues: {} });
    });

    it('captures by/over/partition field values from anomalies into groupFieldValues', () => {
      const job = makeJobConfig([
        {
          function: 'high_count',
          by_field_name: 'department',
          over_field_name: 'source.ip',
          partition_field_name: 'team',
        },
      ]);
      const anomaly = makeAnomaly({
        byFieldValue: 'engineering',
        overFieldValue: '1.2.3.4',
        partitionFieldValue: 'backend',
      });

      const [config] = getBaselineConfigs(job, [anomaly], 'user');

      expect(config.groupFieldValues).toEqual({
        department: ['engineering'],
        'source.ip': ['1.2.3.4'],
        team: ['backend'],
      });
    });

    it('deduplicates groupFieldValues across multiple anomaly records', () => {
      const job = makeJobConfig([
        { function: 'high_count', by_field_name: 'department', over_field_name: 'source.ip' },
      ]);
      const anomalies = [
        makeAnomaly({ byFieldValue: 'engineering', overFieldValue: '1.2.3.4' }),
        makeAnomaly({ byFieldValue: 'engineering', overFieldValue: '5.6.7.8' }),
        makeAnomaly({ byFieldValue: 'finance', overFieldValue: '1.2.3.4' }),
      ];

      const [config] = getBaselineConfigs(job, anomalies, 'user');

      expect(config.groupFieldValues).toEqual({
        department: ['engineering', 'finance'],
        'source.ip': ['1.2.3.4', '5.6.7.8'],
      });
    });

    it('omits field_name from groupFieldValues (only by/over/partition carry values)', () => {
      const job = makeJobConfig([
        { function: 'high_sum', field_name: 'bytes', by_field_name: 'department' },
      ]);
      const anomaly = makeAnomaly({ byFieldValue: 'engineering' });

      const [config] = getBaselineConfigs(job, [anomaly], 'user');

      expect(config.groupFields).toContain('bytes');
      expect(config.groupFieldValues).toEqual({ department: ['engineering'] });
      expect(config.groupFieldValues).not.toHaveProperty('bytes');
    });

    it('excludes values for fields filtered out by the entityType prefix rule', () => {
      const job = makeJobConfig([
        {
          function: 'high_count',
          by_field_name: 'user.name',
          over_field_name: 'source.ip',
        },
      ]);
      const anomaly = makeAnomaly({ byFieldValue: 'alice', overFieldValue: '1.2.3.4' });

      const [config] = getBaselineConfigs(job, [anomaly], 'user');

      expect(config.groupFields).toEqual(['source.ip']);
      expect(config.groupFieldValues).toEqual({ 'source.ip': ['1.2.3.4'] });
      expect(config.groupFieldValues).not.toHaveProperty('user.name');
    });

    it('returns empty groupFieldValues when no anomaly carries by/over/partition values', () => {
      const job = makeJobConfig([{ function: 'high_sum', field_name: 'bytes' }]);

      const [config] = getBaselineConfigs(job, [makeAnomaly()], 'user');

      expect(config.groupFieldValues).toEqual({});
    });
  });

  describe('multi-detector jobs', () => {
    it('returns one config per detector', () => {
      const job = makeJobConfig([
        { function: 'rare', by_field_name: 'source.ip' },
        {
          function: 'high_distinct_count',
          field_name: 'destination.port',
          by_field_name: 'host.name',
        },
        { function: 'high_count', field_name: 'destination.ip' },
      ]);
      const anomalies = [
        makeAnomaly({ detectorIndex: 0, _id: '1' }),
        makeAnomaly({
          detectorIndex: 0,
          recordScore: 85,
          timestamp: 2000,
          actual: 0.02,
          typical: 0.5,
          _id: '2',
        }),
        makeAnomaly({ detectorIndex: 1, _id: '3' }),
        makeAnomaly({ detectorIndex: 2, _id: '4' }),
      ];

      const configs = getBaselineConfigs(job, anomalies, 'user');

      expect(configs).toHaveLength(3);
      expect(configs).toEqual([
        {
          anomalies: [
            {
              _id: '1',
              actual: 5,
              detectorIndex: 0,
              entityId: 'user:alice',
              jobId: 'security-job-1',
              recordScore: 75,
              timestamp: 1778241600000,
              typical: 1,
            },
            {
              _id: '2',
              actual: 0.02,
              detectorIndex: 0,
              entityId: 'user:alice',
              jobId: 'security-job-1',
              recordScore: 85,
              timestamp: 2000,
              typical: 0.5,
            },
          ],
          detectorIndex: 0,
          exclusionValues: [],
          func: 'rare',
          groupFields: [],
          groupFieldValues: {},
          targetField: 'source.ip',
        },
        {
          anomalies: [
            {
              _id: '3',
              actual: 5,
              detectorIndex: 1,
              entityId: 'user:alice',
              jobId: 'security-job-1',
              recordScore: 75,
              timestamp: 1778241600000,
              typical: 1,
            },
          ],
          detectorIndex: 1,
          exclusionValues: [],
          func: 'high_distinct_count',
          groupFields: ['destination.port', 'host.name'],
          groupFieldValues: { 'host.name': [] },
          targetField: null,
        },
        {
          anomalies: [
            {
              _id: '4',
              actual: 5,
              detectorIndex: 2,
              entityId: 'user:alice',
              jobId: 'security-job-1',
              recordScore: 75,
              timestamp: 1778241600000,
              typical: 1,
            },
          ],
          detectorIndex: 2,
          exclusionValues: [],
          func: 'high_count',
          groupFields: ['destination.ip'],
          groupFieldValues: {},
          targetField: null,
        },
      ]);
    });

    it('groups each detector anomalies independently', () => {
      const job = makeJobConfig([
        { function: 'rare', by_field_name: 'source.ip' },
        { function: 'rare', by_field_name: 'process.name' },
      ]);
      const anomalies = [
        makeAnomaly({ detectorIndex: 0, byFieldValue: 'evil-ip', _id: '1' }),
        makeAnomaly({ detectorIndex: 1, byFieldValue: 'malware.exe', _id: '2' }),
      ];

      const configs = getBaselineConfigs(job, anomalies, 'user');

      expect(configs).toEqual([
        {
          anomalies: [
            {
              _id: '1',
              actual: 5,
              byFieldValue: 'evil-ip',
              detectorIndex: 0,
              entityId: 'user:alice',
              jobId: 'security-job-1',
              recordScore: 75,
              timestamp: 1778241600000,
              typical: 1,
            },
          ],
          detectorIndex: 0,
          exclusionValues: ['evil-ip'],
          func: 'rare',
          groupFields: [],
          groupFieldValues: {},
          targetField: 'source.ip',
        },
        {
          anomalies: [
            {
              _id: '2',
              actual: 5,
              byFieldValue: 'malware.exe',
              detectorIndex: 1,
              entityId: 'user:alice',
              jobId: 'security-job-1',
              recordScore: 75,
              timestamp: 1778241600000,
              typical: 1,
            },
          ],
          detectorIndex: 1,
          exclusionValues: ['malware.exe'],
          func: 'rare',
          groupFields: [],
          groupFieldValues: {},
          targetField: 'process.name',
        },
      ]);
    });
  });

  it('skips a detector whose index has no entry in job.detectors', () => {
    const job = makeJobConfig([{ function: 'rare', by_field_name: 'source.ip' }]);
    const anomalies = [makeAnomaly({ detectorIndex: 99 })];

    expect(getBaselineConfigs(job, anomalies, 'user')).toHaveLength(0);
  });

  it('returns empty array for an empty anomalies list', () => {
    const job = makeJobConfig([{ function: 'rare', by_field_name: 'source.ip' }]);

    expect(getBaselineConfigs(job, [], 'user')).toHaveLength(0);
  });
});

describe('fetchBaselineBehavior', () => {
  let mockEsSearch: jest.Mock;
  let esClient: ElasticsearchClient;

  const defaultOpts = {
    abortSignal: new AbortController().signal,
    entityId: 'user:alice',
    entityType: 'user' as const,
    jobId: 'test-job',
  };

  beforeEach(() => {
    mockEsSearch = jest.fn().mockResolvedValue(makeEsSearchResponse([]));
    esClient = { search: mockEsSearch } as unknown as ElasticsearchClient;
  });

  it('returns null for empty anomalies', async () => {
    const result = await fetchBaselineBehavior({
      ...defaultOpts,
      anomalies: [],
      esClient,
      logger,
      ml: mockMl,
      soClient,
    });

    expect(result).toBeNull();
    expect(mockEsSearch).not.toHaveBeenCalled();
  });

  it('returns null when job config is not found', async () => {
    mockJobsFn.mockResolvedValueOnce({ jobs: [] });

    const result = await fetchBaselineBehavior({
      ...defaultOpts,
      anomalies: [makeAnomaly()],
      esClient,
      logger,
      ml: mockMl,
      soClient,
    });

    expect(result).toBeNull();
    expect(mockEsSearch).not.toHaveBeenCalled();
  });

  it('returns null when sourceIndex is empty', async () => {
    mockJobsFn.mockResolvedValueOnce({
      jobs: [makeJob({ datafeed_config: { indices: [], query: {} } })],
    });

    const result = await fetchBaselineBehavior({
      ...defaultOpts,
      anomalies: [makeAnomaly()],
      esClient,
      logger,
      ml: mockMl,
      soClient,
    });

    expect(result).toBeNull();
  });

  it('returns null when detectors list is empty', async () => {
    mockJobsFn.mockResolvedValueOnce({
      jobs: [makeJob({ analysis_config: { detectors: [], influencers: [] } })],
    });

    const result = await fetchBaselineBehavior({
      ...defaultOpts,
      anomalies: [makeAnomaly()],
      esClient,
      logger,
      ml: mockMl,
      soClient,
    });

    expect(result).toBeNull();
  });

  it('still queries ES when all detector fields are filtered out by the entityType prefix', async () => {
    mockJobsFn.mockResolvedValueOnce({
      jobs: [
        makeJob({
          analysis_config: {
            detectors: [{ function: 'high_mean', by_field_name: 'user.name' }],
            influencers: [],
          },
        }),
      ],
    });

    const result = await fetchBaselineBehavior({
      ...defaultOpts,
      anomalies: [makeAnomaly()],
      esClient,
      logger,
      ml: mockMl,
      soClient,
    });

    expect(mockEsSearch).toHaveBeenCalled();
    expect(result).toEqual([{ value: '', doc_count: 0, topHits: [] }]);
  });

  describe('rare detector', () => {
    beforeEach(() => {
      mockJobsFn.mockResolvedValue({
        jobs: [
          makeJob({
            analysis_config: {
              detectors: [{ function: 'rare', by_field_name: 'source.ip' }],
              influencers: [],
            },
          }),
        ],
      });
    });

    it('returns baseline buckets mapped from the aggregation response', async () => {
      const hit = { _source: { 'source.ip': '10.0.0.1' } };
      mockEsSearch.mockResolvedValueOnce(
        makeEsSearchResponse([makeRareBucket('10.0.0.1', 5, [hit])])
      );

      const result = await fetchBaselineBehavior({
        ...defaultOpts,
        anomalies: [makeAnomaly({ byFieldValue: 'evil-ip' })],
        esClient,
        logger,
        ml: mockMl,
        soClient,
      });

      expect(result).toEqual([{ value: '10.0.0.1', doc_count: 5, topHits: [hit] }]);

      const [searchBody] = mockEsSearch.mock.calls[0];
      expect(searchBody).toMatchSnapshot();
    });

    it('issues a terms agg query with must_not exclusion for anomalous values', async () => {
      await fetchBaselineBehavior({
        ...defaultOpts,
        anomalies: [makeAnomaly({ byFieldValue: 'evil-ip', timestamp: 1_000_000 })],
        esClient,
        logger,
        ml: mockMl,
        soClient,
      });

      const [searchBody] = mockEsSearch.mock.calls[0];
      expect(searchBody.aggs.baseline.terms.field).toBe('source.ip');
      expect(searchBody.query.bool.must_not).toEqual([
        { terms: { _tier: ['data_cold', 'data_frozen'] } },
        { terms: { 'source.ip': ['evil-ip'] } },
      ]);
      expect(searchBody.query.bool.filter).toContainEqual(
        expect.objectContaining({
          range: expect.objectContaining({
            '@timestamp': expect.objectContaining({ lt: 1_000_000 }),
          }),
        })
      );
    });

    it('still includes tier exclusion in must_not when there are no anomalous values', async () => {
      await fetchBaselineBehavior({
        ...defaultOpts,
        anomalies: [makeAnomaly({ byFieldValue: undefined })],
        esClient,
        logger,
        ml: mockMl,
        soClient,
      });

      const [searchBody] = mockEsSearch.mock.calls[0];
      expect(searchBody.query.bool.must_not).toEqual([
        { terms: { _tier: ['data_cold', 'data_frozen'] } },
      ]);
    });

    it('returns empty baseline (not null) when ES search throws', async () => {
      mockEsSearch.mockRejectedValueOnce(new Error('cluster unavailable'));

      const result = await fetchBaselineBehavior({
        ...defaultOpts,
        anomalies: [makeAnomaly()],
        esClient,
        logger,
        ml: mockMl,
        soClient,
      });

      expect(result).toEqual([]);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('cluster unavailable'));
    });
  });

  describe('non-rare detector', () => {
    beforeEach(() => {
      mockJobsFn.mockResolvedValue({
        jobs: [
          makeJob({
            analysis_config: {
              detectors: [
                {
                  function: 'high_distinct_count',
                  field_name: 'process.name',
                  by_field_name: 'dept',
                },
              ],
              influencers: [],
            },
          }),
        ],
      });
    });

    it('adds filters for groupFields and issues a sample_hits agg', async () => {
      await fetchBaselineBehavior({
        ...defaultOpts,
        anomalies: [makeAnomaly({ timestamp: 2_000_000 })],
        esClient,
        logger,
        ml: mockMl,
        soClient,
      });

      const [searchBody] = mockEsSearch.mock.calls[0];
      expect(searchBody.aggs.sample_hits.top_hits).toBeDefined();
      expect(searchBody.query.bool.filter).toContainEqual(
        expect.objectContaining({
          range: expect.objectContaining({
            '@timestamp': expect.objectContaining({ lt: 2_000_000 }),
          }),
        })
      );
    });

    it('uses terms filter for by/over/partition fields with known anomalous values', async () => {
      await fetchBaselineBehavior({
        ...defaultOpts,
        anomalies: [makeAnomaly({ byFieldValue: 'engineering' })],
        esClient,
        logger,
        ml: mockMl,
        soClient,
      });

      const [searchBody] = mockEsSearch.mock.calls[0];
      expect(searchBody.query.bool.filter).toContainEqual({ terms: { dept: ['engineering'] } });
    });

    it('falls back to exists filter for fields without known anomalous values', async () => {
      await fetchBaselineBehavior({
        ...defaultOpts,
        anomalies: [makeAnomaly()],
        esClient,
        logger,
        ml: mockMl,
        soClient,
      });

      const [searchBody] = mockEsSearch.mock.calls[0];
      // process.name is field_name (no dimensional values) → exists
      expect(searchBody.query.bool.filter).toContainEqual({ exists: { field: 'process.name' } });
      // dept is by_field_name with no anomaly value → exists
      expect(searchBody.query.bool.filter).toContainEqual({ exists: { field: 'dept' } });
    });

    it('returns top hits from sample_hits aggregation', async () => {
      const hit = { _source: { dept: 'engineering', 'process.name': 'python' } };
      mockEsSearch.mockResolvedValueOnce(makeMetricSearchResponse([hit]));

      const result = await fetchBaselineBehavior({
        ...defaultOpts,
        anomalies: [makeAnomaly()],
        esClient,
        logger,
        ml: mockMl,
        soClient,
      });

      expect(result).toEqual([{ value: '', doc_count: 0, topHits: [hit] }]);

      const [searchBody] = mockEsSearch.mock.calls[0];
      expect(searchBody).toMatchSnapshot();
    });
  });

  describe('influencers as sourceIncludes', () => {
    it('passes influencers as _source includes when defined', async () => {
      await fetchBaselineBehavior({
        ...defaultOpts,
        anomalies: [makeAnomaly()],
        esClient,
        logger,
        ml: mockMl,
        soClient,
      });

      const [searchBody] = mockEsSearch.mock.calls[0];
      expect(searchBody.aggs.baseline.aggs.sample_hits.top_hits._source).toEqual({
        includes: ['user.name', 'source.ip'],
      });
    });

    it('omits _source when influencers list is empty', async () => {
      mockJobsFn.mockResolvedValueOnce({
        jobs: [
          makeJob({
            analysis_config: {
              detectors: [{ function: 'rare', by_field_name: 'source.ip' }],
              influencers: [],
            },
          }),
        ],
      });

      await fetchBaselineBehavior({
        ...defaultOpts,
        anomalies: [makeAnomaly()],
        esClient,
        logger,
        ml: mockMl,
        soClient,
      });

      const [searchBody] = mockEsSearch.mock.calls[0];
      expect(searchBody.aggs.baseline.aggs.sample_hits.top_hits._source).toBeUndefined();
    });
  });

  it('flattens baseline buckets from multiple detector configs', async () => {
    mockJobsFn.mockResolvedValueOnce({
      jobs: [
        makeJob({
          analysis_config: {
            detectors: [
              { function: 'rare', by_field_name: 'source.ip' },
              { function: 'rare', by_field_name: 'process.name' },
            ],
            influencers: [],
          },
        }),
      ],
    });
    mockEsSearch
      .mockResolvedValueOnce(makeEsSearchResponse([makeRareBucket('1.2.3.4', 3)]))
      .mockResolvedValueOnce(makeEsSearchResponse([makeRareBucket('malware.exe', 1)]));

    const result = await fetchBaselineBehavior({
      ...defaultOpts,
      anomalies: [makeAnomaly({ detectorIndex: 0 }), makeAnomaly({ detectorIndex: 1 })],
      esClient,
      logger,
      ml: mockMl,
      soClient,
    });

    expect(result).toHaveLength(2);
    expect(result?.map((b) => b.value)).toEqual(['1.2.3.4', 'malware.exe']);
  });
});
