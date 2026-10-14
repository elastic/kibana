/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimeRange } from '../../entities_grid/common';
import { buildAlertBasedTilesQuery } from './entities_with_alerts_query';

const INDEX = '.entities-v1';

describe('buildAlertBasedTilesQuery for the previous period', () => {
  it.each(['24h', '7d', '30d'] as TimeRange[])(
    'builds the same query when the current period is passed explicitly for %s',
    (range) => {
      expect(buildAlertBasedTilesQuery(INDEX, 'default', range, [], 'current')).toBe(
        buildAlertBasedTilesQuery(INDEX, 'default', range)
      );
    }
  );

  it('keeps the alerts inside the previous period', () => {
    const query = buildAlertBasedTilesQuery(INDEX, 'default', '30d', [], 'previous');
    expect(query).toContain(
      '| WHERE @timestamp >= NOW() - 60 days AND @timestamp < NOW() - 30 days'
    );
  });

  // The last STATS is the tile aggregate; everything before it is shared with the current period.
  const upToTileCounts = (query: string) => query.slice(0, query.lastIndexOf('| STATS'));

  it('changes nothing before the counts but the time condition', () => {
    const current = buildAlertBasedTilesQuery(INDEX, 'default', '7d', ['| WHERE x'], 'current');
    const previous = buildAlertBasedTilesQuery(INDEX, 'default', '7d', ['| WHERE x'], 'previous');
    const withCurrentCondition = previous.replace(
      '@timestamp >= NOW() - 14 days AND @timestamp < NOW() - 7 days',
      '@timestamp >= NOW() - 7 days'
    );
    expect(upToTileCounts(withCurrentCondition)).toBe(upToTileCounts(current));
  });

  it('counts only: the previous period leaves out the entity id lists the current one returns', () => {
    const current = buildAlertBasedTilesQuery(INDEX, 'default', '7d', [], 'current');
    const previous = buildAlertBasedTilesQuery(INDEX, 'default', '7d', [], 'previous');
    expect(current).toContain('VALUES(severe_id)');
    expect(current).toContain('VALUES(watchlisted_id)');
    expect(previous).not.toContain('VALUES');
    expect(previous).not.toContain('entity_ids');
    expect(previous).toContain('severe_alerts_count      = COUNT(severe_id)');
    expect(previous).toContain('watchlisted_count        = COUNT(watchlisted_id)');
  });
});
