/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  BOUNDARY_SLICE_HOURS,
  buildRiskMoversTrailingSeriesQuery,
  riskMoversTrailingFetchHours,
  trailingRiskMoversColumn,
} from './tile_risk_movers_trailing_series_query';

describe('buildRiskMoversTrailingSeriesQuery', () => {
  it('reads the risk score index of the given space', () => {
    expect(buildRiskMoversTrailingSeriesQuery('my-space', '.entities-v1')).toContain(
      'FROM risk-score.risk-score-my-space'
    );
  });

  it.each([
    ['24h', 49, 24, 1],
    ['7d', 332, 28, 6],
    ['30d', 1418, 30, 24],
  ] as const)('reads %ih and returns %i dots for %s (%ih steps)', (range, hours, dots, step) => {
    expect(riskMoversTrailingFetchHours(range)).toBe(hours);
    const query = buildRiskMoversTrailingSeriesQuery('default', '.entities-v1', range);
    expect(query).toContain(`| WHERE @timestamp >= NOW() - ${hours}h`);
    expect(query.match(/COUNT_DISTINCT\(effective_id\)/g)).toHaveLength(dots);
    expect(query.match(/ = MIN\(packed\) WHERE/g)).toHaveLength(2 * dots);
    expect(query).toContain(`cur_1 = MIN(packed) WHERE hours_ago >= ${step} AND `);
  });

  it('takes the current score from the selected range ending k steps back', () => {
    const query = buildRiskMoversTrailingSeriesQuery('default', '.entities-v1', '24h');
    expect(query).toContain('cur_0 = MIN(packed) WHERE hours_ago >= 0 AND hours_ago <= 23');
    expect(query).toContain('cur_5 = MIN(packed) WHERE hours_ago >= 5 AND hours_ago <= 28');
  });

  it('takes the boundary score from the buffer right before the start of that range', () => {
    expect(BOUNDARY_SLICE_HOURS).toBe(2);
    const query = buildRiskMoversTrailingSeriesQuery('default', '.entities-v1', '24h');
    expect(query).toContain('bnd_0 = MIN(packed) WHERE hours_ago >= 24 AND hours_ago <= 25');
    expect(query).toContain('bnd_5 = MIN(packed) WHERE hours_ago >= 29 AND hours_ago <= 30');

    const sevenDays = buildRiskMoversTrailingSeriesQuery('default', '.entities-v1', '7d');
    expect(sevenDays).toContain('bnd_1 = MIN(packed) WHERE hours_ago >= 174 AND hours_ago <= 175');
  });

  it('counts an entity for a dot only when both scores exist and the score rose by 10 or more', () => {
    const query = buildRiskMoversTrailingSeriesQuery('default', '.entities-v1', '24h');
    expect(query).toContain(
      `${trailingRiskMoversColumn(
        3
      )} = COUNT_DISTINCT(effective_id) WHERE cur_3 IS NOT NULL AND bnd_3 IS NOT NULL AND (cur_3 - FLOOR(cur_3 / 1073741824.0) * 1073741824.0) - (bnd_3 - FLOOR(bnd_3 / 1073741824.0) * 1073741824.0) >= 83886080.0`
    );
  });

  it('packs each score behind its age in seconds and picks the newest with a filtered MIN, not LAST', () => {
    const query = buildRiskMoversTrailingSeriesQuery('default', '.entities-v1', '30d');
    expect(query).toContain(
      '| EVAL packed = seconds_ago * 1073741824.0 + ROUND(risk_score * 8388608.0)'
    );
    expect(query).not.toContain('LAST(');
  });

  it('keeps the packed value exact: the longest range stays below 2^53', () => {
    const longestAgeSeconds = riskMoversTrailingFetchHours('30d') * 3600;
    expect(longestAgeSeconds * 1073741824 + 100 * 8388608).toBeLessThan(2 ** 53);
    expect(100 * 8388608).toBeLessThan(1073741824);
  });

  it('joins the entity store, applies the entity filters, then dedupes by resolution', () => {
    const query = buildRiskMoversTrailingSeriesQuery('default', '.entities-v1', '24h', [
      '| WHERE entity.type == "host"',
    ]);
    const joinAt = query.indexOf('| LOOKUP JOIN .entities-v1 ON entity.id');
    const filterAt = query.indexOf('| WHERE entity.type == "host"');
    expect(joinAt).toBeGreaterThan(query.indexOf('BY entity_euid'));
    expect(filterAt).toBeGreaterThan(joinAt);
    expect(filterAt).toBeLessThan(query.indexOf('| EVAL effective_id'));
  });
});
