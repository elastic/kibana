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

  it('keeps the alerts and the first_seen of the entity inside the previous period', () => {
    const query = buildAlertBasedTilesQuery(INDEX, 'default', '30d', [], 'previous');
    expect(query).toContain(
      '| WHERE @timestamp >= NOW() - 60 days AND @timestamp < NOW() - 30 days'
    );
    expect(query).toContain(
      '| EVAL is_new = entity.lifecycle.first_seen >= NOW() - 60 days AND entity.lifecycle.first_seen < NOW() - 30 days'
    );
  });

  it('changes nothing but those two time conditions', () => {
    const current = buildAlertBasedTilesQuery(INDEX, 'default', '7d', ['| WHERE x'], 'current');
    const previous = buildAlertBasedTilesQuery(INDEX, 'default', '7d', ['| WHERE x'], 'previous');
    const withCurrentConditions = previous
      .replace(
        '@timestamp >= NOW() - 14 days AND @timestamp < NOW() - 7 days',
        '@timestamp >= NOW() - 7 days'
      )
      .replace(
        'entity.lifecycle.first_seen >= NOW() - 14 days AND entity.lifecycle.first_seen < NOW() - 7 days',
        'entity.lifecycle.first_seen >= NOW() - 7 days'
      );
    expect(withCurrentConditions).toBe(current);
  });
});
