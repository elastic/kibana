/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildNewEntityTrailingSeriesQuery,
  trailingNewEntityColumn,
} from './new_entity_trailing_series_query';

describe('buildNewEntityTrailingSeriesQuery', () => {
  it('reads the given entities index', () => {
    expect(buildNewEntityTrailingSeriesQuery('.entities-v1', '7d')).toContain('FROM .entities-v1');
  });

  it.each([
    ['24h', 47, 24, 1],
    ['7d', 330, 28, 6],
    ['30d', 1416, 30, 24],
  ] as const)('reads %ih and returns %i dots in %ih steps for %s', (range, hours, dots, step) => {
    const query = buildNewEntityTrailingSeriesQuery('.entities-v1', range);
    expect(query).toContain(
      `| WHERE entity.lifecycle.first_seen >= NOW() - ${hours}h AND entity.risk.calculated_score > 0`
    );
    expect(query).toContain(
      `| EVAL bucket = DATE_DIFF("hour", entity.lifecycle.first_seen, NOW()) / ${step}`
    );
    expect(query.match(/COUNT_DISTINCT\(effective_id\)/g)).toHaveLength(dots);
  });

  it('gives each dot the buckets of its own trailing window', () => {
    const query = buildNewEntityTrailingSeriesQuery('.entities-v1', '7d');
    expect(query).toContain(
      `${trailingNewEntityColumn(
        0
      )} = COUNT_DISTINCT(effective_id) WHERE bucket >= 0 AND bucket <= 27`
    );
    expect(query).toContain(
      `${trailingNewEntityColumn(
        27
      )} = COUNT_DISTINCT(effective_id) WHERE bucket >= 27 AND bucket <= 54`
    );
  });

  it('applies the entity filters and the resolution dedupe before counting', () => {
    const query = buildNewEntityTrailingSeriesQuery('.entities-v1', '24h', [
      '| WHERE entity.type == "host"',
    ]);
    const filterAt = query.indexOf('| WHERE entity.type == "host"');
    expect(filterAt).toBeGreaterThan(query.indexOf('| WHERE entity.lifecycle.first_seen'));
    expect(filterAt).toBeLessThan(query.indexOf('| EVAL effective_id'));
    expect(query).toContain('entity.relationships.resolution.resolved_to');
  });
});
