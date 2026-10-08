/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLSearchResponse } from '@kbn/es-types';
import {
  buildNewlyHighCriticalTrailingSeriesQuery,
  parseNewlyHighCriticalDots,
  trailingBoundaryRowsColumn,
  trailingNewlyHighCriticalColumn,
} from './tile_newly_high_critical_trailing_series_query';

const response = (row: Record<string, number | null>): ESQLSearchResponse =>
  ({
    columns: Object.keys(row).map((name) => ({ name, type: 'long' })),
    values: [Object.values(row)],
  } as unknown as ESQLSearchResponse);

describe('buildNewlyHighCriticalTrailingSeriesQuery', () => {
  it('reads the risk score index of the given space and maps the levels to numbers', () => {
    const query = buildNewlyHighCriticalTrailingSeriesQuery('my-space', '.entities-v1');
    expect(query).toContain('FROM risk-score.risk-score-my-space');
    expect(query).toContain(
      'level_num = CASE(risk_level == "Critical", 4, risk_level == "High", 3, risk_level == "Moderate", 2, risk_level == "Low", 1, 0)'
    );
  });

  it.each([
    ['24h', 49, 24],
    ['7d', 332, 28],
    ['30d', 1418, 30],
  ] as const)('reads %ih and returns %i dots for %s', (range, hours, dots) => {
    const query = buildNewlyHighCriticalTrailingSeriesQuery('default', '.entities-v1', range);
    expect(query).toContain(`| WHERE @timestamp >= NOW() - ${hours}h`);
    expect(query.match(/COUNT_DISTINCT\(effective_id\)/g)).toHaveLength(dots);
    expect(query.match(/ = COUNT\(bnd_/g)).toHaveLength(dots);
    expect(query.match(/ = MIN\(packed\) WHERE/g)).toHaveLength(2 * dots);
  });

  it('takes both levels of a dot from the same windows as the risk movers series', () => {
    const query = buildNewlyHighCriticalTrailingSeriesQuery('default', '.entities-v1', '24h');
    expect(query).toContain('cur_0 = MIN(packed) WHERE hours_ago >= 0 AND hours_ago <= 23');
    expect(query).toContain('bnd_0 = MIN(packed) WHERE hours_ago >= 24 AND hours_ago <= 25');
  });

  it('counts an entity that is High or Critical now and was not, or has no boundary level', () => {
    const query = buildNewlyHighCriticalTrailingSeriesQuery('default', '.entities-v1', '24h');
    expect(query).toContain(
      `${trailingNewlyHighCriticalColumn(
        2
      )} = COUNT_DISTINCT(effective_id) WHERE cur_2 % 8 >= 3 AND (bnd_2 IS NULL OR bnd_2 % 8 < 3)`
    );
    expect(query).toContain(`${trailingBoundaryRowsColumn(2)} = COUNT(bnd_2)`);
  });

  it('packs each level behind its age in seconds and picks the newest with a filtered MIN, not LAST', () => {
    const query = buildNewlyHighCriticalTrailingSeriesQuery('default', '.entities-v1', '30d');
    expect(query).toContain('| EVAL packed = seconds_ago * 8 + level_num');
    expect(query).not.toContain('LAST(');
  });

  it('applies the entity filters after the join and before the resolution dedupe', () => {
    const query = buildNewlyHighCriticalTrailingSeriesQuery('default', '.entities-v1', '24h', [
      '| WHERE entity.type == "host"',
    ]);
    const filterAt = query.indexOf('| WHERE entity.type == "host"');
    expect(filterAt).toBeGreaterThan(query.indexOf('| LOOKUP JOIN .entities-v1 ON entity.id'));
    expect(filterAt).toBeLessThan(query.indexOf('| EVAL effective_id'));
  });
});

describe('parseNewlyHighCriticalDots', () => {
  it('returns the dots oldest first, so the last value is the newest dot (0)', () => {
    const dots = parseNewlyHighCriticalDots(
      response({
        newly_high_critical_0: 7,
        boundary_rows_0: 10,
        newly_high_critical_1: 5,
        boundary_rows_1: 10,
        newly_high_critical_2: 3,
        boundary_rows_2: 10,
      }),
      '24h'
    );
    expect(dots.slice(-3)).toEqual([3, 5, 7]);
  });

  it('leaves out every dot with no boundary score, so history gaps do not show as spikes', () => {
    const row: Record<string, number> = {};
    for (let k = 0; k < 24; k++) {
      row[trailingNewlyHighCriticalColumn(k)] = 100 + k;
      row[trailingBoundaryRowsColumn(k)] = k < 3 ? 40 : 0;
    }
    expect(parseNewlyHighCriticalDots(response(row), '24h')).toEqual([102, 101, 100]);
  });

  it('returns no dots when no dot has a boundary score, or the response is empty', () => {
    expect(parseNewlyHighCriticalDots(response({ newly_high_critical_0: 9 }), '7d')).toEqual([]);
    expect(
      parseNewlyHighCriticalDots(
        { columns: [], values: [] } as unknown as ESQLSearchResponse,
        '30d'
      )
    ).toEqual([]);
  });

  it('counts a null value as 0 for a dot that has a boundary score', () => {
    const dots = parseNewlyHighCriticalDots(
      response({ newly_high_critical_0: null, boundary_rows_0: 2 }),
      '24h'
    );
    expect(dots).toEqual([0]);
  });
});
