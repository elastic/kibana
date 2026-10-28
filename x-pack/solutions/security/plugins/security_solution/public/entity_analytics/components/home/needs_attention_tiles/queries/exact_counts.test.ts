/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimeRange } from '../../entities_grid/common';
import { buildAlertBasedTilesQuery } from './entities_with_alerts_query';
import { buildEntitiesWithAnomaliesCountQuery } from './entities_with_anomalies_query';
import { buildNewlyHighCriticalCountQuery } from './tile_newly_high_critical_query';
import { buildRiskMoversCountQuery } from './tile_risk_movers_query';

const INDEX = '.entities-v1';
const RANGES: TimeRange[] = ['24h', '7d', '30d'];

/** The final aggregation of a query: everything after its last `| STATS`. */
const finalStats = (query: string) => query.slice(query.lastIndexOf('| STATS'));

/*
 * COUNT_DISTINCT is approximate above about 3,000 values. These tile queries reduce to one row per
 * entity before the last aggregation, so a plain COUNT of those rows is exact.
 */
describe('exact tile counts', () => {
  describe.each(['current', 'previous'] as const)('for the %s period', (period) => {
    it.each(RANGES)('counts the alert based tiles with a plain COUNT for %s', (range) => {
      const query = buildAlertBasedTilesQuery(INDEX, 'default', range, [], period);
      const last = finalStats(query);
      expect(last).not.toContain('COUNT_DISTINCT');
      expect(last).toContain('severe_alerts_count      = COUNT(severe_id)');
      expect(last).toContain('watchlisted_count        = COUNT(watchlisted_id)');
    });

    it('keeps one row per resolved entity before the alert based tile counts', () => {
      const query = buildAlertBasedTilesQuery(INDEX, 'default', '7d', [], period);
      const perEntity = query.indexOf('BY effective_id');
      expect(perEntity).toBeGreaterThan(-1);
      expect(perEntity).toBeLessThan(query.lastIndexOf('| STATS'));
    });

    it.each(RANGES)('counts the entities with anomalies with a plain COUNT for %s', (range) => {
      const query = buildEntitiesWithAnomaliesCountQuery(INDEX, range, [], ['job_a'], period);
      expect(query).not.toContain('COUNT_DISTINCT');
      expect(finalStats(query)).toContain('value = COUNT(effective_id)');
    });

    it.each([
      ['risk movers', buildRiskMoversCountQuery],
      ['newly high/critical', buildNewlyHighCriticalCountQuery],
    ] as const)('counts %s with a plain COUNT over one row per resolved entity', (_name, build) => {
      RANGES.forEach((range) => {
        const query = build('default', INDEX, range, [], period);
        expect(query).not.toContain('COUNT_DISTINCT');
        // The current period also returns the entity ids for the table filter; the previous only counts.
        expect(query).toContain(
          period === 'current'
            ? '| STATS BY effective_id\n| STATS value = COUNT(effective_id), entity_ids = VALUES(effective_id)'
            : '| STATS BY effective_id\n| STATS value = COUNT(effective_id)'
        );
      });
    });

    it('reduces the anomalies to one row per resolved entity before counting', () => {
      const query = buildEntitiesWithAnomaliesCountQuery(INDEX, '7d', [], ['job_a'], period);
      expect(query).toContain('| STATS BY effective_id\n| STATS value = COUNT(effective_id)');
    });
  });
});
