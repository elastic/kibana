/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityStoreEuid } from '@kbn/entity-store/public';
import {
  buildAlertBasedTilesTrailingSeriesQuery,
  trailingAlertsColumn,
  trailingWatchlistedColumn,
} from './entities_with_alerts_trailing_series_query';

const mockEuid = {
  esql: {
    getFieldEvaluations: () => undefined,
    getEuidEvaluation: (_type: string, varName: string) => `${varName} = "mock_euid"`,
  },
} as unknown as EntityStoreEuid;

describe('buildAlertBasedTilesTrailingSeriesQuery', () => {
  it('queries the alerts index for the given space', () => {
    const query = buildAlertBasedTilesTrailingSeriesQuery(mockEuid, '.entities-v1', 'my-space');
    expect(query).toContain('FROM .alerts-security.alerts-my-space');
  });

  it.each([
    ['24h', 47, 24, 1],
    ['7d', 330, 28, 6],
    ['30d', 1416, 30, 24],
  ] as const)(
    'reads %ih and returns %i dots for each tile, grouped by %ih buckets, for %s',
    (range, hours, dots, step) => {
      const query = buildAlertBasedTilesTrailingSeriesQuery(
        mockEuid,
        '.entities-v1',
        'default',
        range
      );
      expect(query).toContain(`| WHERE @timestamp >= NOW() - ${hours}h`);
      expect(query).toContain(
        `| STATS BY bucket = DATE_DIFF("hour", @timestamp, NOW()) / ${step}, _ea_entity_id`
      );
      expect(query.match(/COUNT_DISTINCT\(effective_id\)/g)).toHaveLength(dots);
      expect(query.match(/COUNT_DISTINCT\(watchlisted_effective_id\)/g)).toHaveLength(dots);
    }
  );

  it('gives each dot the buckets of its own trailing window', () => {
    const query = buildAlertBasedTilesTrailingSeriesQuery(
      mockEuid,
      '.entities-v1',
      'default',
      '7d'
    );
    expect(query).toContain(
      `${trailingAlertsColumn(0)} = COUNT_DISTINCT(effective_id) WHERE bucket >= 0 AND bucket <= 27`
    );
    expect(query).toContain(
      `${trailingAlertsColumn(5)} = COUNT_DISTINCT(effective_id) WHERE bucket >= 5 AND bucket <= 32`
    );
    expect(query).toContain(
      `${trailingWatchlistedColumn(
        27
      )} = COUNT_DISTINCT(watchlisted_effective_id) WHERE bucket >= 27 AND bucket <= 54`
    );
  });

  it('deduplicates per bucket and entity before the LOOKUP JOIN, then renames to entity.id', () => {
    const query = buildAlertBasedTilesTrailingSeriesQuery(mockEuid, '.entities-v1', 'default');
    const statsIdx = query.indexOf('| STATS BY bucket');
    const renameIdx = query.indexOf('| RENAME _ea_entity_id AS `entity.id`');
    const joinIdx = query.indexOf('| LOOKUP JOIN .entities-v1');
    expect(statsIdx).toBeGreaterThan(-1);
    expect(renameIdx).toBeGreaterThan(statsIdx);
    expect(joinIdx).toBeGreaterThan(renameIdx);
  });

  it('counts resolved entities and masks non-watchlisted rows like the tile query', () => {
    const query = buildAlertBasedTilesTrailingSeriesQuery(mockEuid, '.entities-v1', 'default');
    expect(query).toContain(
      '| EVAL effective_id = COALESCE(`entity.relationships.resolution.resolved_to`, entity.id)'
    );
    expect(query).toContain(
      '| EVAL watchlisted_effective_id = CASE(entity.attributes.watchlists IS NOT NULL, effective_id, null)'
    );
  });

  it('does not return entity ids or group the final STATS', () => {
    const query = buildAlertBasedTilesTrailingSeriesQuery(mockEuid, '.entities-v1', 'default');
    expect(query).not.toContain('VALUES(');
    expect(query.split('| STATS\n')[1]).not.toContain(' BY ');
  });

  it('applies entity filter clauses after the LOOKUP JOIN and before the aggregation', () => {
    const filter = '| WHERE entity.type == "user"';
    const query = buildAlertBasedTilesTrailingSeriesQuery(
      mockEuid,
      '.entities-v1',
      'default',
      '24h',
      [filter]
    );
    expect(query.indexOf(filter)).toBeGreaterThan(query.indexOf('| LOOKUP JOIN'));
    expect(query.indexOf(filter)).toBeLessThan(query.indexOf('| STATS\n'));
  });
});
