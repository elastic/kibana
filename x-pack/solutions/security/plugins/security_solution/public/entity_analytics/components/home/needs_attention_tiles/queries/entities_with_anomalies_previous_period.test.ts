/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimeRange } from '../../entities_grid/common';
import { buildEntitiesWithAnomaliesCountQuery } from './entities_with_anomalies_query';

const INDEX = '.entities-v1';
const JOBS = ['job_a', 'job_b'];

describe('buildEntitiesWithAnomaliesCountQuery for the previous period', () => {
  it.each(['24h', '7d', '30d'] as TimeRange[])(
    'builds the same query when the current period is passed explicitly for %s',
    (range) => {
      expect(buildEntitiesWithAnomaliesCountQuery(INDEX, range, [], JOBS, 'current')).toBe(
        buildEntitiesWithAnomaliesCountQuery(INDEX, range, [], JOBS)
      );
    }
  );

  it('keeps the anomaly records inside the previous period, with the job filter', () => {
    const query = buildEntitiesWithAnomaliesCountQuery(INDEX, '30d', [], JOBS, 'previous');
    expect(query).toContain(
      '@timestamp >= NOW() - 60 days AND @timestamp < NOW() - 30 days AND job_id IN ("job_a", "job_b")'
    );
  });

  it('changes nothing but the time condition', () => {
    const filters = ['| WHERE x'];
    const current = buildEntitiesWithAnomaliesCountQuery(INDEX, '7d', filters, JOBS, 'current');
    const previous = buildEntitiesWithAnomaliesCountQuery(INDEX, '7d', filters, JOBS, 'previous');
    expect(
      previous.replace(
        '@timestamp >= NOW() - 14 days AND @timestamp < NOW() - 7 days',
        '@timestamp >= NOW() - 7 days'
      )
    ).toBe(current);
  });
});
