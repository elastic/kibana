/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityStoreEuid } from '@kbn/entity-store/common/euid_helpers';
import {
  buildEntitiesWithAnomaliesTrailingSeriesQuery,
  trailingAnomaliesColumn,
} from './entities_with_anomalies_trailing_series_query';

const mockEuid = {
  esql: {
    getFieldEvaluations: () => undefined,
    getEuidEvaluation: (_type: string, varName: string) => `${varName} = "mock_euid"`,
  },
} as unknown as EntityStoreEuid;

describe('buildEntitiesWithAnomaliesTrailingSeriesQuery', () => {
  it('reads interim-free anomaly records from the shared anomalies index', () => {
    const query = buildEntitiesWithAnomaliesTrailingSeriesQuery(mockEuid, '.entities-v1');
    expect(query).toContain('FROM .ml-anomalies-shared*');
    expect(query).toContain(
      'result_type == "record" AND is_interim == false AND record_score >= 1'
    );
  });

  it.each([
    ['24h', 47, 24, 1],
    ['7d', 330, 28, 6],
    ['30d', 1416, 30, 24],
  ] as const)('reads %ih and returns %i dots in %ih steps for %s', (range, hours, dots, step) => {
    const query = buildEntitiesWithAnomaliesTrailingSeriesQuery(mockEuid, '.entities-v1', range);
    expect(query).toContain(`@timestamp >= NOW() - ${hours}h`);
    expect(query).toContain(
      `| STATS BY bucket = DATE_DIFF("hour", @timestamp, NOW()) / ${step}, derived_euids`
    );
    expect(query.match(/COUNT_DISTINCT\(effective_id\)/g)).toHaveLength(dots);
  });

  it('gives each dot the buckets of its own trailing window', () => {
    const query = buildEntitiesWithAnomaliesTrailingSeriesQuery(mockEuid, '.entities-v1', '7d');
    expect(query).toContain(
      `${trailingAnomaliesColumn(
        0
      )} = COUNT_DISTINCT(effective_id) WHERE bucket >= 0 AND bucket <= 27`
    );
    expect(query).toContain(
      `${trailingAnomaliesColumn(
        27
      )} = COUNT_DISTINCT(effective_id) WHERE bucket >= 27 AND bucket <= 54`
    );
  });

  it('restricts the records to the installed jobs when there are any', () => {
    const withJobs = buildEntitiesWithAnomaliesTrailingSeriesQuery(
      mockEuid,
      '.entities-v1',
      '24h',
      [],
      ['job_a', 'job_b']
    );
    expect(withJobs).toContain('AND job_id IN ("job_a", "job_b")');
    expect(buildEntitiesWithAnomaliesTrailingSeriesQuery(mockEuid, '.entities-v1')).not.toContain(
      'job_id IN'
    );
  });

  it('applies the entity filters after the join and before the resolution dedupe', () => {
    const query = buildEntitiesWithAnomaliesTrailingSeriesQuery(mockEuid, '.entities-v1', '24h', [
      '| WHERE entity.type == "host"',
    ]);
    const filterAt = query.indexOf('| WHERE entity.type == "host"');
    expect(filterAt).toBeGreaterThan(query.indexOf('| LOOKUP JOIN .entities-v1 ON entity.id'));
    expect(filterAt).toBeLessThan(query.indexOf('| EVAL effective_id'));
  });
});
