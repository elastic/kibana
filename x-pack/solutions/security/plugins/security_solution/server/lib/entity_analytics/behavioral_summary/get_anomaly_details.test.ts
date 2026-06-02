/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import type { EnrichedAnomalyRecord } from '../maintainers/behaviors/ml_anomaly_detection/types';
import type { JobConfig } from './get_anomaly_details';
import { getAnomaliesFromDetailsIndex, parseAnomalySearchResponse } from './get_anomaly_details';

const makeHit = (source: EnrichedAnomalyRecord): SearchHit<EnrichedAnomalyRecord> => ({
  _index: '.ds-.entity_analytics.ml-ad-jobs-latest-default',
  _id: 'hit_id',
  _source: source,
});

const baseSource: EnrichedAnomalyRecord = {
  entity: { id: 'user:carol.davis@local', type: 'user' },
  anomaly: {
    _id: 'auth_rare_hour_for_a_user_ea_record_1',
    job_id: 'auth_rare_hour_for_a_user_ea',
    detector_index: 0,
    detector_function: 'time_of_day',
    field_name: undefined,
    timestamp: 1778888700000,
    record_score: 42.525888538027154,
    actual: 86371,
    typical: 83787.046875,
    by_field_name: 'user.name',
    by_field_value: 'carol.davis',
    over_field_name: undefined,
    over_field_value: undefined,
    partition_field_name: undefined,
    partition_field_value: undefined,
    baseline_values: [15578.625],
  },
};

const emptyJobConfigs = new Map<string, JobConfig>();

describe('parseAnomalySearchResponse', () => {
  it('returns empty array for empty hits', () => {
    expect(parseAnomalySearchResponse({ hits: [], jobConfigs: emptyJobConfigs })).toEqual([]);
  });

  it('returns empty array when _source is missing', () => {
    const hit: SearchHit<EnrichedAnomalyRecord> = {
      _index: '.ds-test',
      _id: 'hit_id',
    };
    expect(parseAnomalySearchResponse({ hits: [hit], jobConfigs: emptyJobConfigs })).toEqual([]);
  });

  it('maps _source to AnomalySummaryEntry', () => {
    const result = parseAnomalySearchResponse({
      hits: [makeHit(baseSource)],
      jobConfigs: emptyJobConfigs,
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      jobId: 'auth_rare_hour_for_a_user_ea',
      detectorIndex: 0,
      detectorFunction: 'time_of_day',
      fieldName: null,
      byFieldName: 'user.name',
      byFieldValue: 'carol.davis',
      overFieldName: null,
      overFieldValue: null,
      partitionFieldName: null,
      partitionFieldValue: null,
      recordScore: 42.525888538027154,
      timestamp: new Date(1778888700000).toISOString(),
      actual: [86371],
      typical: [83787.046875],
    });
  });

  it('maps baseline_values to baselineValues as strings', () => {
    const result = parseAnomalySearchResponse({
      hits: [makeHit(baseSource)],
      jobConfigs: emptyJobConfigs,
    });
    expect(result[0].baselineValues).toEqual(['15578.625']);
  });

  it('returns empty baselineValues when baseline_values is absent', () => {
    const source: EnrichedAnomalyRecord = {
      ...baseSource,
      anomaly: { ...baseSource.anomaly, baseline_values: undefined },
    };
    const result = parseAnomalySearchResponse({
      hits: [makeHit(source)],
      jobConfigs: emptyJobConfigs,
    });
    expect(result[0].baselineValues).toEqual([]);
  });

  it('maps null by_field_name and by_field_value when absent', () => {
    const source: EnrichedAnomalyRecord = {
      ...baseSource,
      anomaly: {
        ...baseSource.anomaly,
        by_field_name: undefined,
        by_field_value: undefined,
      },
    };
    const result = parseAnomalySearchResponse({
      hits: [makeHit(source)],
      jobConfigs: emptyJobConfigs,
    });
    expect(result[0].byFieldName).toBeNull();
    expect(result[0].byFieldValue).toBeNull();
  });

  it('returns empty actual/typical arrays when values are absent', () => {
    const source: EnrichedAnomalyRecord = {
      ...baseSource,
      anomaly: { ...baseSource.anomaly, actual: undefined, typical: undefined },
    };
    const result = parseAnomalySearchResponse({
      hits: [makeHit(source)],
      jobConfigs: emptyJobConfigs,
    });
    expect(result[0].actual).toEqual([]);
    expect(result[0].typical).toEqual([]);
  });

  it('converts anomalous_value to string', () => {
    const source: EnrichedAnomalyRecord = {
      ...baseSource,
      anomaly: { ...baseSource.anomaly, anomalous_value: 85920 },
    };
    const result = parseAnomalySearchResponse({
      hits: [makeHit(source)],
      jobConfigs: emptyJobConfigs,
    });
    expect(result[0].anomalousValue).toBe('85920');
  });

  it('processes multiple hits and returns one entry per hit', () => {
    const source2: EnrichedAnomalyRecord = {
      ...baseSource,
      anomaly: {
        ...baseSource.anomaly,
        _id: 'pad_windows_rare_region_name_by_user_ea_record_2',
        job_id: 'pad_windows_rare_region_name_by_user_ea',
        record_score: 25.803091,
      },
    };
    const result = parseAnomalySearchResponse({
      hits: [makeHit(baseSource), makeHit(source2)],
      jobConfigs: emptyJobConfigs,
    });
    expect(result).toHaveLength(2);
    expect(result[0].jobId).toBe('auth_rare_hour_for_a_user_ea');
    expect(result[1].jobId).toBe('pad_windows_rare_region_name_by_user_ea');
  });

  it('populates jobName, threatTactics, and threatTechniques from jobConfigs', () => {
    const jobConfigs = new Map<string, JobConfig>([
      [
        'auth_rare_hour_for_a_user_ea',
        {
          jobName: 'Rare Hour For A User',
          threatTactics: ['Initial Access'],
          threatTechniques: ['Valid Accounts'],
        },
      ],
    ]);
    const result = parseAnomalySearchResponse({ hits: [makeHit(baseSource)], jobConfigs });
    expect(result[0].jobName).toBe('Rare Hour For A User');
    expect(result[0].threatTactics).toEqual(['Initial Access']);
    expect(result[0].threatTechniques).toEqual(['Valid Accounts']);
  });

  it('falls back to null jobName and undefined threat fields when job is not in jobConfigs', () => {
    const result = parseAnomalySearchResponse({
      hits: [makeHit(baseSource)],
      jobConfigs: emptyJobConfigs,
    });
    expect(result[0].jobName).toBeNull();
    expect(result[0].threatTactics).toBeUndefined();
    expect(result[0].threatTechniques).toBeUndefined();
  });
});

describe('getAnomaliesFromDetailsIndex', () => {
  const mockSearch = jest.fn().mockResolvedValue({ hits: { hits: [] } });
  const esClient = { search: mockSearch } as unknown as ElasticsearchClient;
  const logger = { error: jest.fn() } as unknown as Logger;
  const soClient = {} as unknown as SavedObjectsClientContract;

  const baseParams = {
    entityId: 'user:carol.davis@local',
    esClient,
    logger,
    namespace: 'default',
    soClient,
  };

  beforeEach(() => {
    mockSearch.mockClear();
  });

  it('uses default sort (@timestamp desc) when sort is not provided', async () => {
    await getAnomaliesFromDetailsIndex(baseParams);
    expect(mockSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        sort: [{ 'anomaly.timestamp': { order: 'desc' } }],
      })
    );
  });

  it('maps @timestamp to anomaly.timestamp', async () => {
    await getAnomaliesFromDetailsIndex({
      ...baseParams,
      sort: [{ field: '@timestamp', order: 'asc' }],
    });
    expect(mockSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        sort: [{ 'anomaly.timestamp': { order: 'asc' } }],
      })
    );
  });

  it('maps record_score to anomaly.record_score', async () => {
    await getAnomaliesFromDetailsIndex({
      ...baseParams,
      sort: [{ field: 'record_score', order: 'desc' }],
    });
    expect(mockSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        sort: [{ 'anomaly.record_score': { order: 'desc' } }],
      })
    );
  });

  it('maps job_id to anomaly.job_id', async () => {
    await getAnomaliesFromDetailsIndex({
      ...baseParams,
      sort: [{ field: 'job_id', order: 'asc' }],
    });
    expect(mockSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        sort: [{ 'anomaly.job_id': { order: 'asc' } }],
      })
    );
  });

  it('preserves order of multiple sort criteria', async () => {
    await getAnomaliesFromDetailsIndex({
      ...baseParams,
      sort: [
        { field: 'record_score', order: 'desc' },
        { field: '@timestamp', order: 'asc' },
      ],
    });
    expect(mockSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        sort: [
          { 'anomaly.record_score': { order: 'desc' } },
          { 'anomaly.timestamp': { order: 'asc' } },
        ],
      })
    );
  });
});
