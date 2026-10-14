/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildNewlyHighCriticalSeriesQuery,
  buildRiskMoversSeriesQuery,
  newlyHighCriticalSeriesColumn,
  riskMoversSeriesColumn,
} from './risk_series_query';

const INDEX = '.entities-v1';

describe('risk tile series queries', () => {
  it('names the column of dot k for each tile', () => {
    expect(riskMoversSeriesColumn(2)).toBe('risk_movers_2');
    expect(newlyHighCriticalSeriesColumn(2)).toBe('newly_high_critical_2');
  });

  describe.each([
    ['Risk movers', buildRiskMoversSeriesQuery, riskMoversSeriesColumn],
    ['Newly high/critical', buildNewlyHighCriticalSeriesQuery, newlyHighCriticalSeriesColumn],
  ])('%s', (_name, build, column) => {
    it('has one exact column per dot, with no COUNT_DISTINCT', () => {
      const query = build('default', INDEX, '24h');
      for (let k = 0; k < 24; k++) {
        expect(query).toContain(`${column(k)} = COUNT(flag_${k})`);
      }
      expect(query).not.toContain(`${column(24)} =`);
      expect(query).not.toContain('COUNT_DISTINCT');
    });

    it('reads the value at each moment the dots need, and nothing else', () => {
      const query = build('default', INDEX, '7d');
      // 28 dots need 56 moments, one every 6 hours.
      for (let slot = 0; slot < 56; slot++) {
        expect(query).toContain(`value_at_${slot} = MAX(slot_value) WHERE slot == ${slot}`);
      }
      expect(query).not.toContain('value_at_56 =');
      expect(query).toContain('| WHERE @timestamp >= NOW() - 332h');
      expect(query).toContain('| WHERE hours_back % 6 < 2');
    });

    it('takes the last value of each entity and moment with an unfiltered LAST', () => {
      const query = build('default', INDEX, '24h');
      expect(query).toContain('| STATS slot_value = LAST(');
      expect(query).toContain('BY entity_euid, slot');
      // A LAST with a WHERE filter on the aggregate returned different counts on every run on a
      // 20,000-entity store, so no LAST may carry one.
      expect(query).not.toMatch(/LAST\([^)]*\)\s+WHERE/);
    });

    it('puts a doc in every moment whose two-hour window holds it', () => {
      const overlapping = build('default', INDEX, '24h');
      expect(overlapping).toContain(
        '| EVAL slot = MV_DEDUPE(MV_APPEND(hours_back / 1, (hours_back - 1) / 1))'
      );
      expect(overlapping).toContain('| MV_EXPAND slot');
      expect(overlapping).toContain('| WHERE slot >= 0 AND hours_back <= slot * 1 + 1');
      const sparse = build('default', INDEX, '30d');
      expect(sparse).toContain('hours_back <= slot * 24 + 1');
    });

    it('compares each dot with the value one range earlier', () => {
      const query = build('default', INDEX, '24h');
      // Dot 0 compares now (slot 0) with 24 hours back (slot 24).
      expect(query).toContain('value_at_0');
      expect(query).toContain('value_at_24');
      expect(query).toContain('value_at_23');
      expect(query).toContain('value_at_47');
      expect(query).not.toContain('value_at_48');
    });

    it('joins only the entities that count in some dot, then applies the name and filters', () => {
      const filters = ['| WHERE entity.risk.calculated_level == "High"'];
      const query = build('default', INDEX, '24h', filters);
      const anyFlag = query.indexOf('| WHERE flag_0 IS NOT NULL OR flag_1 IS NOT NULL');
      const lookup = query.indexOf(`| LOOKUP JOIN ${INDEX} ON entity.id`);
      expect(anyFlag).toBeGreaterThan(-1);
      expect(lookup).toBeGreaterThan(anyFlag);
      expect(query.indexOf('| WHERE entity.name IS NOT NULL')).toBeGreaterThan(lookup);
      expect(query.indexOf(filters[0])).toBeGreaterThan(lookup);
      expect(query).toContain('BY effective_id');
    });
  });

  it('counts a mover when the score rose by 10 points, and ignores a missing score', () => {
    expect(buildRiskMoversSeriesQuery('default', INDEX, '24h')).toContain(
      'flag_0 = CASE(value_at_0 - value_at_24 >= 10, 1, null)'
    );
  });

  it('counts an entity newly high or critical, also when it had no level before', () => {
    expect(buildNewlyHighCriticalSeriesQuery('default', INDEX, '24h')).toContain(
      'flag_0 = CASE(value_at_0 >= 3 AND (value_at_24 IS NULL OR value_at_0 > value_at_24), 1, null)'
    );
  });
});
