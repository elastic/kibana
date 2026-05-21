/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import type { EnrichedAnomalyRecord } from '../maintainers/behaviors/ml_anomaly_detection/types';
import { parseAnomalySearchResponse } from './get_anomaly_details';

const makeHit = (
  source: EnrichedAnomalyRecord,
  overrides?: Partial<EnrichedAnomalyRecord['anomaly']>
): SearchHit<EnrichedAnomalyRecord> => {
  const mergedSource = overrides
    ? { ...source, anomaly: { ...source.anomaly, ...overrides } }
    : source;
  return {
    _index: '.ds-.entity_analytics.ml-ad-jobs-latest-default',
    _id: 'hit_id',
    inner_hits: {
      most_recent: {
        hits: {
          total: { value: 1, relation: 'eq' },
          hits: [{ _index: '.ds-test', _id: 'inner_id', _source: mergedSource }],
        },
      },
    },
  };
};

const baseSource: EnrichedAnomalyRecord = {
  entity: { id: 'user:carol.davis@local', type: 'user' },
  anomaly: {
    _id: 'auth_rare_hour_for_a_user_ea_record_1',
    job_id: 'auth_rare_hour_for_a_user_ea',
    detector_index: 0,
    detector_function: 'time_of_day',
    timestamp: 1778888700000,
    record_score: 42.525888538027154,
    actual: 86371,
    typical: 83787.046875,
    by_field_name: 'user.name',
    by_field_value: 'carol.davis',
  },
  baseline: [
    {
      value: '',
      doc_count: 0,
      top_hits: [
        { _index: '.ds-logs', _id: 'log1', _score: 0, _source: { host: { name: 'WIN-APP01' } } },
      ],
    },
  ],
};

describe('parseAnomalySearchResponse', () => {
  it('returns empty array for empty hits', () => {
    expect(parseAnomalySearchResponse([])).toEqual([]);
  });

  it('returns empty array when inner_hits is missing', () => {
    const hit: SearchHit<EnrichedAnomalyRecord> = {
      _index: '.ds-test',
      _id: 'hit_id',
    };
    expect(parseAnomalySearchResponse([hit])).toEqual([]);
  });

  it('returns empty array when most_recent inner hit has no source', () => {
    const hit: SearchHit<EnrichedAnomalyRecord> = {
      _index: '.ds-test',
      _id: 'hit_id',
      inner_hits: {
        most_recent: {
          hits: {
            total: { value: 0, relation: 'eq' },
            hits: [],
          },
        },
      },
    };
    expect(parseAnomalySearchResponse([hit])).toEqual([]);
  });

  it('maps inner_hits source to AnomalySummaryEntry', () => {
    const result = parseAnomalySearchResponse([makeHit(baseSource)]);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      jobId: 'auth_rare_hour_for_a_user_ea',
      detectorIndex: 0,
      byFieldName: 'user.name',
      byFieldValue: 'carol.davis',
      recordScore: 42.525888538027154,
      timestamp: new Date(1778888700000).toISOString(),
      actual: [86371],
      typical: [83787.046875],
    });
  });

  it('maps baseline buckets correctly', () => {
    const result = parseAnomalySearchResponse([makeHit(baseSource)]);
    expect(result[0].baseline).toEqual([
      {
        value: '',
        docCount: 0,
        topHits: baseSource.baseline[0].top_hits,
      },
    ]);
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
    const result = parseAnomalySearchResponse([makeHit(source)]);
    expect(result[0].byFieldName).toBeNull();
    expect(result[0].byFieldValue).toBeNull();
  });

  it('returns empty actual/typical arrays when values are absent', () => {
    const source: EnrichedAnomalyRecord = {
      ...baseSource,
      anomaly: { ...baseSource.anomaly, actual: undefined, typical: undefined },
    };
    const result = parseAnomalySearchResponse([makeHit(source)]);
    expect(result[0].actual).toEqual([]);
    expect(result[0].typical).toEqual([]);
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
      baseline: [],
    };
    const result = parseAnomalySearchResponse([makeHit(baseSource), makeHit(source2)]);
    expect(result).toHaveLength(2);
    expect(result[0].jobId).toBe('auth_rare_hour_for_a_user_ea');
    expect(result[1].jobId).toBe('pad_windows_rare_region_name_by_user_ea');
  });
});
