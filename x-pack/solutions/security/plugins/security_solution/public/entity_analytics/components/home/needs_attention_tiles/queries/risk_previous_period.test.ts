/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimeRange } from '../../entities_grid/common';
import { buildNewlyHighCriticalCountQuery } from './tile_newly_high_critical_query';
import { buildRiskMoversCountQuery } from './tile_risk_movers_query';
import { buildRiskHistoryReachesBackQuery } from './risk_previous_period';
import { RISK_MOVER_MIN_SCORE_CHANGE } from './risk_history';

const INDEX = '.entities-v1';
const RISK_INDEX = 'risk-score.risk-score-default';
const RANGES = [
  ['24h', 'NOW() - 2 days', 'NOW() - 1 days'],
  ['7d', 'NOW() - 14 days', 'NOW() - 7 days'],
  ['30d', 'NOW() - 60 days', 'NOW() - 30 days'],
] as const;

describe.each([
  ['risk movers', buildRiskMoversCountQuery],
  ['newly high/critical', buildNewlyHighCriticalCountQuery],
] as const)('%s for the previous period', (_name, build) => {
  it.each(['24h', '7d', '30d'] as TimeRange[])(
    'builds the same query when the current period is passed explicitly for %s',
    (range) => {
      expect(build('default', INDEX, range, [], 'current')).toBe(build('default', INDEX, range));
    }
  );

  it.each(RANGES)(
    'reads the risk history at the start and the end of the previous period for %s',
    (range, start, end) => {
      const query = build('default', INDEX, range, [], 'previous');
      expect(query).toContain(`@timestamp >= ${start} - 2 hours AND @timestamp <= ${start}`);
      expect(query).toContain(`@timestamp >= ${end} - 2 hours AND @timestamp <= ${end}`);
      expect(query.match(new RegExp(`FROM ${RISK_INDEX}`, 'g'))).toHaveLength(2);
    }
  );

  it('merges the two history branches by entity.id and reads no entity doc before the condition', () => {
    const query = build('default', INDEX, '7d', [], 'previous');
    const merge = query.indexOf('BY `entity.id`');
    const join = query.indexOf(`| LOOKUP JOIN ${INDEX} ON entity.id`);
    expect(query).not.toContain(`FROM ${INDEX}`);
    expect(merge).toBeGreaterThan(-1);
    expect(join).toBeGreaterThan(merge);
  });

  it('joins only the entities that qualify, then applies the filters and resolves aliases', () => {
    const filter = '| WHERE asset.criticality == "high_impact"';
    const query = build('default', INDEX, '7d', [filter], 'previous');
    expect(query.indexOf('| WHERE entity.name IS NOT NULL')).toBeGreaterThan(
      query.indexOf('| LOOKUP JOIN')
    );
    expect(query.indexOf(filter)).toBeGreaterThan(query.indexOf('| WHERE entity.name IS NOT NULL'));
    expect(query).toContain(
      '| EVAL effective_id = COALESCE(`entity.relationships.resolution.resolved_to`, entity.id)'
    );
    // The previous period only needs the count, not the entity ids.
    expect(query).not.toContain('VALUES');
    expect(query).not.toContain('entity_ids');
    expect(query.endsWith('| STATS value = COUNT(effective_id)')).toBe(true);
  });
});

describe('the previous-period conditions', () => {
  it('keeps the rule of the risk movers tile: a score up by 10 or more', () => {
    expect(buildRiskMoversCountQuery('default', INDEX, '7d', [], 'previous')).toContain(
      `| WHERE current_score - boundary_score >= ${RISK_MOVER_MIN_SCORE_CHANGE}`
    );
  });

  it('keeps the rule of the newly high/critical tile: High or Critical, and higher than before or new', () => {
    const query = buildNewlyHighCriticalCountQuery('default', INDEX, '7d', [], 'previous');
    expect(query).toContain(
      '| WHERE current_level_num >= 3 AND (boundary_level_num IS NULL OR current_level_num > boundary_level_num)'
    );
  });
});

describe('buildRiskHistoryReachesBackQuery', () => {
  it.each(RANGES)(
    'asks whether the risk history has docs before the start and before the end of the previous period for %s',
    (range, start, end) => {
      expect(buildRiskHistoryReachesBackQuery('default', range)).toBe(
        [
          `FROM ${RISK_INDEX}`,
          `| WHERE (@timestamp >= ${start} - 2 hours AND @timestamp <= ${start}) OR (@timestamp >= ${end} - 2 hours AND @timestamp <= ${end})`,
          `| EVAL in_start = @timestamp <= ${start}, in_end = @timestamp >= ${end} - 2 hours`,
          '| STATS has_start = MAX(in_start), has_end = MAX(in_end)',
          '| EVAL reaches_back = COALESCE(has_start, false) AND COALESCE(has_end, false)',
          '| KEEP reaches_back',
        ].join('\n')
      );
    }
  );
});
