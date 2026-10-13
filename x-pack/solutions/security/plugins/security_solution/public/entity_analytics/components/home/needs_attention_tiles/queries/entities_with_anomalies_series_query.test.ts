/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEntitiesWithAnomaliesCountQuery } from './entities_with_anomalies_query';
import {
  anomaliesSeriesColumn,
  buildEntitiesWithAnomaliesSeriesQuery,
} from './entities_with_anomalies_series_query';

const INDEX = '.entities-v1';
const JOBS = ['job_a', 'job_b'];

describe('buildEntitiesWithAnomaliesSeriesQuery', () => {
  it('names the column of dot k', () => {
    expect(anomaliesSeriesColumn(2)).toBe('anomalies_2');
  });

  it('has one exact column per dot, with no COUNT_DISTINCT', () => {
    const query = buildEntitiesWithAnomaliesSeriesQuery(INDEX, '24h', [], JOBS);
    for (let k = 0; k < 24; k++) {
      expect(query).toContain(`${anomaliesSeriesColumn(k)} = COUNT(${anomaliesSeriesColumn(k)})`);
    }
    expect(query).not.toContain(`${anomaliesSeriesColumn(24)} =`);
    expect(query).not.toContain('COUNT_DISTINCT');
  });

  it('keeps the earliest bucket of each resolved entity inside the window of every dot', () => {
    const query = buildEntitiesWithAnomaliesSeriesQuery(INDEX, '7d', [], JOBS);
    expect(query).toContain('anomalies_3 = MIN(bucket) WHERE bucket >= 3 AND bucket <= 30');
    expect(query).toContain('BY effective_id');
  });

  it('numbers records by their time, reading back far enough, grouped by bucket and entity id', () => {
    const query = buildEntitiesWithAnomaliesSeriesQuery(INDEX, '30d', [], JOBS);
    expect(query).toContain('NOW() - 1416h');
    expect(query).toContain('| EVAL bucket = DATE_DIFF("hour", @timestamp, NOW()) / 24');
    expect(query).toContain('| STATS BY bucket, derived_euids');
  });

  it('starts with the same stages as the count, with the same record and job rules', () => {
    const filters = ['| WHERE entity.risk.calculated_level == "High"'];
    const series = buildEntitiesWithAnomaliesSeriesQuery(INDEX, '7d', filters, JOBS);
    const count = buildEntitiesWithAnomaliesCountQuery(INDEX, '7d', filters, JOBS);
    const sharedTail = (query: string) =>
      query.slice(query.indexOf('| LOOKUP JOIN'), query.indexOf('| EVAL effective_id'));
    const jobRule = (query: string) => query.split('\n').find((line) => line.includes('job_id'));
    expect(sharedTail(series)).toBe(sharedTail(count));
    expect(sharedTail(series)).toContain(filters[0]);
    expect(jobRule(series)).toContain('job_id IN ("job_a", "job_b")');
    expect(jobRule(series)?.split(' AND ').pop()).toBe(jobRule(count)?.split(' AND ').pop());
  });
});
