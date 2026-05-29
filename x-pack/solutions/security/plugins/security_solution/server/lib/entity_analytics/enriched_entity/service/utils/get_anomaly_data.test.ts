/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { elasticsearchServiceMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import type { Entity } from '@kbn/entity-store/common';
import type { ExperimentalFeatures } from '../../../../../../common';
import type { EnrichedAnomalyRecord } from '../../../maintainers/behaviors/ml_anomaly_detection/types';
import { getAnomalyData } from './get_anomaly_data';

const esClient = elasticsearchServiceMock.createScopedClusterClient().asCurrentUser;
const soClient = savedObjectsClientMock.create();

const makeEntity = (opts: { id?: string; type?: string; jobIds?: string[] }): Entity =>
  ({
    entity: {
      id: opts.id,
      EngineMetadata: { Type: opts.type },
      behaviors: opts.jobIds !== undefined ? { anomaly_job_ids: opts.jobIds } : undefined,
    },
  } as unknown as Entity);

const makeEnrichedRecord = (
  overrides: Partial<EnrichedAnomalyRecord['anomaly']> = {}
): EnrichedAnomalyRecord => ({
  entity: { id: 'user:alice', type: 'user' },
  anomaly: {
    _id: 'anomaly-1',
    job_id: 'security-job-1',
    job_name: 'Security Job One',
    detector_index: 0,
    timestamp: 1_700_000_000_000,
    record_score: 75,
    ...overrides,
  },
  baseline: [{ value: 'US', doc_count: 10, top_hits: [] }],
});

const makeSearchResponse = (records: EnrichedAnomalyRecord[]) =>
  ({
    hits: { hits: records.map((r) => ({ _source: r })) },
  } as unknown as SearchResponse<EnrichedAnomalyRecord>);

const experimentalFeaturesMaintainerOn = {
  entityAnalyticsMlJobBehaviorMaintainer: true,
} as unknown as ExperimentalFeatures;

const experimentalFeaturesMaintainerOff = {
  entityAnalyticsMlJobBehaviorMaintainer: false,
} as unknown as ExperimentalFeatures;

const makeMl = (
  jobs: Array<{ id: string; groups?: string[]; displayName?: string; description?: string }> = [],
  anomalies: unknown[] = []
) => {
  const mockGetAnomaliesTableData = jest.fn().mockResolvedValue({ anomalies, interval: 'auto' });
  return {
    jobServiceProvider: jest.fn().mockReturnValue({
      jobsSummary: jest.fn().mockResolvedValue(
        jobs.map((j) => ({
          id: j.id,
          groups: j.groups ?? ['security'],
          description: j.description ?? '',
          customSettings: j.displayName ? { security_app_display_name: j.displayName } : undefined,
        }))
      ),
    }),
    resultsServiceProvider: jest.fn().mockReturnValue({
      getAnomaliesTableData: mockGetAnomaliesTableData,
    }),
    _getAnomaliesTableData: mockGetAnomaliesTableData,
  };
};

const makeUiSettingsClient = (anomalyScore = 50) => ({
  get: jest.fn().mockResolvedValue(anomalyScore),
});

const baseOptions = {
  esClient,
  soClient,
  fromDate: 0,
  toDate: 1_700_000_000_000,
  namespace: 'default',
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getAnomalyData', () => {
  describe('when entities array is empty', () => {
    it('returns an empty array without any calls', async () => {
      const result = await getAnomalyData({
        ...baseOptions,
        entities: [],
        experimentalFeatures: experimentalFeaturesMaintainerOn,
        ml: makeMl() as never,
        uiSettingsClient: makeUiSettingsClient() as never,
      });

      expect(result).toEqual([]);
      expect(esClient.search).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Maintainer index path
  // ---------------------------------------------------------------------------

  describe('when entityAnalyticsMlJobBehaviorMaintainer is true', () => {
    it('returns empty array per entity when anomaly_job_ids is absent', async () => {
      const result = await getAnomalyData({
        ...baseOptions,
        entities: [makeEntity({ id: 'user:alice', type: 'user' })],
        experimentalFeatures: experimentalFeaturesMaintainerOn,
        ml: makeMl() as never,
        uiSettingsClient: makeUiSettingsClient() as never,
      });

      expect(esClient.search).not.toHaveBeenCalled();
      expect(result).toEqual([[]]);
    });

    it('returns empty array per entity when anomaly_job_ids is empty', async () => {
      const result = await getAnomalyData({
        ...baseOptions,
        entities: [makeEntity({ id: 'user:alice', type: 'user', jobIds: [] })],
        experimentalFeatures: experimentalFeaturesMaintainerOn,
        ml: makeMl() as never,
        uiSettingsClient: makeUiSettingsClient() as never,
      });

      expect(esClient.search).not.toHaveBeenCalled();
      expect(result).toEqual([[]]);
    });

    it('returns empty array per entity when entity id is missing', async () => {
      const result = await getAnomalyData({
        ...baseOptions,
        entities: [makeEntity({ type: 'user', jobIds: ['job-1'] })],
        experimentalFeatures: experimentalFeaturesMaintainerOn,
        ml: makeMl() as never,
        uiSettingsClient: makeUiSettingsClient() as never,
      });

      expect(esClient.search).not.toHaveBeenCalled();
      expect(result).toEqual([[]]);
    });

    it('queries the details index with the correct parameters', async () => {
      jest.mocked(esClient.search).mockResolvedValue(makeSearchResponse([]));

      await getAnomalyData({
        ...baseOptions,
        namespace: 'my-space',
        entities: [makeEntity({ id: 'user:alice', type: 'user', jobIds: ['job-1', 'job-2'] })],
        experimentalFeatures: experimentalFeaturesMaintainerOn,
        ml: makeMl() as never,
        uiSettingsClient: makeUiSettingsClient() as never,
      });

      expect(esClient.search).toHaveBeenCalledWith({
        index: '.entity_analytics.ml-ad-jobs-latest-my-space',
        ignore_unavailable: true,
        query: {
          bool: {
            filter: [
              { term: { 'entity.id': 'user:alice' } },
              { terms: { 'anomaly.job_id': ['job-1', 'job-2'] } },
            ],
          },
        },
        sort: [{ '@timestamp': 'desc' }],
        collapse: { field: 'anomaly.job_id' },
        size: 2,
      });
    });

    it('maps enriched records to AnomalyRecord correctly', async () => {
      const record = makeEnrichedRecord({ record_score: 88, by_field_value: 'Iran' });
      jest.mocked(esClient.search).mockResolvedValue(makeSearchResponse([record]));

      const result = await getAnomalyData({
        ...baseOptions,
        entities: [makeEntity({ id: 'user:alice', type: 'user', jobIds: ['security-job-1'] })],
        experimentalFeatures: experimentalFeaturesMaintainerOn,
        ml: makeMl() as never,
        uiSettingsClient: makeUiSettingsClient() as never,
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveLength(1);
      expect(result[0][0].job).toEqual({ name: 'Security Job One' });
      expect(result[0][0].source).toMatchObject({
        _id: 'anomaly-1',
        job_id: 'security-job-1',
        record_score: 88,
        by_field_value: 'Iran',
        baseline: [{ value: 'US', doc_count: 10, top_hits: [] }],
      });
      expect(result[0][0].source).not.toHaveProperty('job_name');
    });

    it('filters out hits with missing _source', async () => {
      jest.mocked(esClient.search).mockResolvedValue({
        hits: { hits: [{ _source: undefined }, { _source: makeEnrichedRecord() }] },
      } as unknown as SearchResponse<EnrichedAnomalyRecord>);

      const result = await getAnomalyData({
        ...baseOptions,
        entities: [makeEntity({ id: 'user:alice', type: 'user', jobIds: ['security-job-1'] })],
        experimentalFeatures: experimentalFeaturesMaintainerOn,
        ml: makeMl() as never,
        uiSettingsClient: makeUiSettingsClient() as never,
      });

      expect(result[0]).toHaveLength(1);
    });

    it('issues one search per entity and returns results in input order', async () => {
      const recordA = makeEnrichedRecord({ job_id: 'job-a', record_score: 90 });
      const recordB = makeEnrichedRecord({ job_id: 'job-b', record_score: 50 });
      jest
        .mocked(esClient.search)
        .mockResolvedValueOnce(makeSearchResponse([recordA]))
        .mockResolvedValueOnce(makeSearchResponse([recordB]));

      const result = await getAnomalyData({
        ...baseOptions,
        entities: [
          makeEntity({ id: 'user:alice', type: 'user', jobIds: ['job-a'] }),
          makeEntity({ id: 'user:bob', type: 'user', jobIds: ['job-b'] }),
        ],
        experimentalFeatures: experimentalFeaturesMaintainerOn,
        ml: makeMl() as never,
        uiSettingsClient: makeUiSettingsClient() as never,
      });

      expect(esClient.search).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(2);
      expect((result[0][0].source as Record<string, unknown>).record_score).toBe(90);
      expect((result[1][0].source as Record<string, unknown>).record_score).toBe(50);
    });
  });

  // ---------------------------------------------------------------------------
  // ML path
  // ---------------------------------------------------------------------------

  describe('when entityAnalyticsMlJobBehaviorMaintainer is false', () => {
    it('returns empty arrays when ml is not provided', async () => {
      const result = await getAnomalyData({
        ...baseOptions,
        entities: [makeEntity({ id: 'user:alice', type: 'user' })],
        experimentalFeatures: experimentalFeaturesMaintainerOff,
        ml: null,
        uiSettingsClient: makeUiSettingsClient() as never,
      });

      expect(result).toEqual([[]]);
      expect(esClient.search).not.toHaveBeenCalled();
    });

    it('returns empty array for entity missing id or type', async () => {
      const ml = makeMl([{ id: 'security-job-1' }]);

      const result = await getAnomalyData({
        ...baseOptions,
        entities: [makeEntity({ type: 'user' }), makeEntity({ id: 'user:alice' })],
        experimentalFeatures: experimentalFeaturesMaintainerOff,
        ml: ml as never,
        uiSettingsClient: makeUiSettingsClient() as never,
      });

      expect(result).toEqual([[], []]);
    });

    it('calls getAnomaliesTableData with the correct criteria for the entity', async () => {
      const ml = makeMl([{ id: 'security-job-1' }]);

      await getAnomalyData({
        ...baseOptions,
        entities: [makeEntity({ id: 'user:alice', type: 'user' })],
        experimentalFeatures: experimentalFeaturesMaintainerOff,
        ml: ml as never,
        uiSettingsClient: makeUiSettingsClient(50) as never,
      });

      expect(ml._getAnomaliesTableData).toHaveBeenCalledWith(
        ['security-job-1'],
        [{ fieldName: 'user.name', fieldValue: 'user:alice' }],
        [],
        'auto',
        expect.any(Array),
        0,
        1_700_000_000_000,
        expect.any(String),
        500,
        10,
        undefined
      );
    });

    it('maps anomaly results to AnomalyRecord using job metadata', async () => {
      const anomalySource = { record_score: 72, job_id: 'security-job-1' };
      const ml = makeMl(
        [
          {
            id: 'security-job-1',
            displayName: 'Unusual Login',
            description: 'Detects unusual logins',
          },
        ],
        [{ jobId: 'security-job-1', source: anomalySource }]
      );

      const result = await getAnomalyData({
        ...baseOptions,
        entities: [makeEntity({ id: 'user:alice', type: 'user' })],
        experimentalFeatures: experimentalFeaturesMaintainerOff,
        ml: ml as never,
        uiSettingsClient: makeUiSettingsClient() as never,
      });

      expect(result[0]).toHaveLength(1);
      expect(result[0][0].source).toEqual(anomalySource);
      expect(result[0][0].job).toEqual({
        name: 'Unusual Login',
        description: 'Detects unusual logins',
      });
    });

    it('excludes jobs that do not belong to the security group', async () => {
      const ml = makeMl(
        [{ id: 'other-job', groups: ['other-group'] }, { id: 'security-job-1' }],
        []
      );

      await getAnomalyData({
        ...baseOptions,
        entities: [makeEntity({ id: 'user:alice', type: 'user' })],
        experimentalFeatures: experimentalFeaturesMaintainerOff,
        ml: ml as never,
        uiSettingsClient: makeUiSettingsClient() as never,
      });

      const [calledJobIds] = ml._getAnomaliesTableData.mock.calls[0];
      expect(calledJobIds).toEqual(['security-job-1']);
      expect(calledJobIds).not.toContain('other-job');
    });

    it('uses job id as name fallback when security_app_display_name is absent', async () => {
      const ml = makeMl([{ id: 'security-job-1' }], [{ jobId: 'security-job-1', source: {} }]);

      const result = await getAnomalyData({
        ...baseOptions,
        entities: [makeEntity({ id: 'user:alice', type: 'user' })],
        experimentalFeatures: experimentalFeaturesMaintainerOff,
        ml: ml as never,
        uiSettingsClient: makeUiSettingsClient() as never,
      });

      expect(result[0][0].job.name).toBe('security-job-1');
    });
  });
});
