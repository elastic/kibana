/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildAlertBasedTilesSeriesQuery,
  severeAlertsSeriesColumn,
  watchlistedSeriesColumn,
} from './entities_with_alerts_series_query';
import { buildAlertBasedTilesQuery } from './entities_with_alerts_query';

const INDEX = '.entities-v1';

describe('buildAlertBasedTilesSeriesQuery', () => {
  it('names the columns of dot k for each tile', () => {
    expect(severeAlertsSeriesColumn(3)).toBe('severe_alerts_3');
    expect(watchlistedSeriesColumn(3)).toBe('watchlisted_3');
  });

  it('has one exact column per dot and tile, with no COUNT_DISTINCT', () => {
    const query = buildAlertBasedTilesSeriesQuery(INDEX, 'default', '7d');
    for (let k = 0; k < 28; k++) {
      expect(query).toContain(
        `${severeAlertsSeriesColumn(k)} = COUNT(${severeAlertsSeriesColumn(k)})`
      );
      expect(query).toContain(
        `${watchlistedSeriesColumn(k)} = COUNT(${watchlistedSeriesColumn(k)})`
      );
    }
    expect(query).not.toContain('COUNT_DISTINCT');
    expect(query).not.toContain(`${severeAlertsSeriesColumn(28)} =`);
  });

  it('keeps the earliest bucket of each entity inside the window of every dot', () => {
    const query = buildAlertBasedTilesSeriesQuery(INDEX, 'default', '24h');
    expect(query).toContain(
      'severe_alerts_0 = MIN(bucket) WHERE has_severe_alert AND bucket >= 0 AND bucket <= 23'
    );
    expect(query).toContain(
      'watchlisted_5 = MIN(bucket) WHERE is_watchlisted AND bucket >= 5 AND bucket <= 28'
    );
    expect(query).toContain('BY effective_id');
  });

  it('reads the alerts back far enough and numbers them in steps from NOW()', () => {
    const query = buildAlertBasedTilesSeriesQuery(INDEX, 'default', '30d');
    expect(query).toContain('| WHERE @timestamp >= NOW() - 1416h');
    expect(query).toContain('| EVAL bucket = DATE_DIFF("hour", @timestamp, NOW()) / 24');
  });

  it('starts with the same stages as the count, so the two cannot drift apart', () => {
    const filters = ['| WHERE entity.risk.calculated_level == "High"'];
    const series = buildAlertBasedTilesSeriesQuery(INDEX, 'default', '7d', filters);
    const count = buildAlertBasedTilesQuery(INDEX, 'default', '7d', filters);
    const lookupJoin = (query: string) =>
      query.slice(query.indexOf('| LOOKUP JOIN'), query.indexOf('| EVAL is_watchlisted'));
    expect(lookupJoin(series)).toBe(lookupJoin(count));
    expect(series).toContain(filters[0]);
  });
});
