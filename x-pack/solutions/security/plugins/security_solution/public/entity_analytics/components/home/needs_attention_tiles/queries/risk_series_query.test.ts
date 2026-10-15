/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildRiskTilesSeriesQuery,
  newlyHighCriticalSeriesColumn,
  riskMoversSeriesColumn,
} from './risk_series_query';
import { RISK_MOVER_MIN_SCORE_CHANGE } from './risk_history';

const INDEX = '.entities-v1';

describe('risk tiles series query', () => {
  it('names the column of dot k for each tile', () => {
    expect(riskMoversSeriesColumn(2)).toBe('risk_movers_2');
    expect(newlyHighCriticalSeriesColumn(2)).toBe('newly_high_critical_2');
  });

  it('has one exact column per dot and tile, with no COUNT_DISTINCT', () => {
    const query = buildRiskTilesSeriesQuery('default', INDEX, '24h');
    for (let k = 0; k < 24; k++) {
      expect(query).toContain(`${riskMoversSeriesColumn(k)} = COUNT(mover_flag_${k})`);
      expect(query).toContain(`${newlyHighCriticalSeriesColumn(k)} = COUNT(newly_high_flag_${k})`);
    }
    expect(query).not.toContain(`${riskMoversSeriesColumn(24)} =`);
    expect(query).not.toContain(`${newlyHighCriticalSeriesColumn(24)} =`);
    expect(query).not.toContain('COUNT_DISTINCT');
  });

  it('scans the risk index once for both tiles', () => {
    const query = buildRiskTilesSeriesQuery('default', INDEX, '30d');
    expect(query.match(/^FROM /gm)).toHaveLength(1);
    expect(query).toContain('FROM risk-score.risk-score-default');
    // Both values are read from each doc in the same pass.
    expect(query).toContain('| EVAL risk_score = ');
    expect(query).toContain('level_num = CASE(');
  });

  it('reads the score and the level at each moment the dots need, and nothing else', () => {
    const query = buildRiskTilesSeriesQuery('default', INDEX, '7d');
    // 28 dots need 56 moments, one every 6 hours.
    for (let slot = 0; slot < 56; slot++) {
      expect(query).toContain(`score_at_${slot} = MAX(slot_score) WHERE slot == ${slot}`);
      expect(query).toContain(`level_at_${slot} = MAX(slot_level) WHERE slot == ${slot}`);
    }
    expect(query).not.toContain('score_at_56 =');
    expect(query).not.toContain('level_at_56 =');
    expect(query).toContain('| WHERE @timestamp >= NOW() - 332h');
    expect(query).toContain('| WHERE hours_back % 6 < 2');
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

  it('puts a doc in every moment whose two-hour window holds it', () => {
    const overlapping = buildRiskTilesSeriesQuery('default', INDEX, '24h');
    expect(overlapping).toContain(
      '| EVAL slot = MV_DEDUPE(MV_APPEND(hours_back / 1, (hours_back - 1) / 1))'
    );
    expect(overlapping).toContain('| MV_EXPAND slot');
    expect(overlapping).toContain('| WHERE slot >= 0 AND hours_back <= slot * 1 + 1');
    const sparse = buildRiskTilesSeriesQuery('default', INDEX, '30d');
    expect(sparse).toContain('hours_back <= slot * 24 + 1');
  });

  it('compares each dot with the value one range earlier', () => {
    const query = buildRiskTilesSeriesQuery('default', INDEX, '24h');
    // Dot 0 compares now (slot 0) with 24 hours back (slot 24).
    ['score_at_0', 'score_at_24', 'score_at_23', 'score_at_47'].forEach((column) =>
      expect(query).toContain(column)
    );
    expect(query).not.toContain('score_at_48');
    expect(query).not.toContain('level_at_48');
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
    expect(query).toContain('BY effective_id');
  });

  it('counts a mover when the score rose by 10 points, and ignores a missing score', () => {
    expect(buildRiskTilesSeriesQuery('default', INDEX, '24h')).toContain(
      `mover_flag_0 = CASE(score_at_0 - score_at_24 >= ${RISK_MOVER_MIN_SCORE_CHANGE}, 1, null)`
    );
  });

  it('counts an entity newly high or critical, also when it had no level before', () => {
    expect(buildRiskTilesSeriesQuery('default', INDEX, '24h')).toContain(
      'newly_high_flag_0 = CASE(level_at_0 >= 3 AND (level_at_24 IS NULL OR level_at_0 > level_at_24), 1, null)'
    );
  });
});
