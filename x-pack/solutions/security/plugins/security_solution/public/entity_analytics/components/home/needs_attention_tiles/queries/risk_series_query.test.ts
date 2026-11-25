/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRiskTilesSeriesQuery } from './risk_series_query';
import { RISK_MOVER_MIN_SCORE_CHANGE } from './risk_history';

const INDEX = '.entities-v1';

/*
 * Only what the Elasticsearch suite cannot see: how many times the history is scanned, the shape
 * of the LASTs, where the join sits, and three rules its fixture never reaches (a rise of exactly
 * 10 points, a doc that belongs to two overlapping moments, the two hours kept before a moment).
 */
describe('risk tiles series query', () => {
  it('counts a mover when the score rose by 10 points, and ignores a missing score', () => {
    expect(buildRiskTilesSeriesQuery('default', INDEX, '24h')).toContain(
      `mover_flag_0 = CASE(score_at_0 - score_at_6 >= ${RISK_MOVER_MIN_SCORE_CHANGE}, 1, null)`
    );
  });

  it('reads back 310 hours for 7d and keeps only the docs in the two hours before a moment a dot needs', () => {
    const query = buildRiskTilesSeriesQuery('default', INDEX, '7d');
    expect(query).toContain('| WHERE @timestamp >= NOW() - 310h');
    expect(query).not.toContain('hours_back %');
  });

  it('reads only the two-hour window of each moment, as plain time ranges before any EVAL', () => {
    const query = buildRiskTilesSeriesQuery('default', INDEX, '7d');
    const windows = query.match(
      /\(@timestamp > NOW\(\) - \d+h AND @timestamp <= NOW\(\) - \d+h\)/g
    );
    // One window per moment: the end and the start of each of the 6 dots.
    expect(windows).toHaveLength(12);
    expect(windows?.[0]).toBe('(@timestamp > NOW() - 2h AND @timestamp <= NOW() - 0h)');
    expect(windows?.[11]).toBe('(@timestamp > NOW() - 310h AND @timestamp <= NOW() - 308h)');
    expect(query.indexOf(windows?.[0] ?? '')).toBeLessThan(query.indexOf('| EVAL'));
  });

  it('puts a doc in the moment whose two-hour window holds it', () => {
    const query = buildRiskTilesSeriesQuery('default', INDEX, '24h');
    expect(query).toContain(
      '| EVAL slot = MV_DEDUPE(MV_APPEND(hours_back / 4, (hours_back - 1) / 4))'
    );
    expect(query).toContain('| WHERE slot >= 0 AND hours_back <= slot * 4 + 1');
  });

  it('scans the risk index once for both tiles', () => {
    const query = buildRiskTilesSeriesQuery('default', INDEX, '30d');
    expect(query.match(/^FROM /gm)).toHaveLength(1);
    expect(query).toContain('FROM risk-score.risk-score-default');
  });

  it('takes the last score and level of each entity and moment with unfiltered LASTs', () => {
    const query = buildRiskTilesSeriesQuery('default', INDEX, '24h');
    expect(query).toContain(
      '| STATS slot_score = LAST(risk_score, @timestamp), slot_level = LAST(level_num, @timestamp) BY entity_euid, slot'
    );
    // A LAST with a WHERE filter on the aggregate returned different counts on every run on a
    // 20,000-entity store, so no LAST may carry one.
    expect(query).not.toMatch(/LAST\([^)]*\)\s+WHERE/);
  });

  it('joins only the entities that count in some dot of either tile, then applies the name and filters', () => {
    const filters = ['| WHERE entity.risk.calculated_level == "High"'];
    const query = buildRiskTilesSeriesQuery('default', INDEX, '24h', filters);
    const anyFlag = query.indexOf(
      '| WHERE mover_flag_0 IS NOT NULL OR newly_high_flag_0 IS NOT NULL OR mover_flag_1 IS NOT NULL'
    );
    const lookup = query.indexOf(`| LOOKUP JOIN ${INDEX} ON entity.id`);
    expect(anyFlag).toBeGreaterThan(-1);
    expect(lookup).toBeGreaterThan(anyFlag);
    expect(query.indexOf('| WHERE entity.name IS NOT NULL')).toBeGreaterThan(lookup);
    expect(query.indexOf(filters[0])).toBeGreaterThan(lookup);
  });
});
