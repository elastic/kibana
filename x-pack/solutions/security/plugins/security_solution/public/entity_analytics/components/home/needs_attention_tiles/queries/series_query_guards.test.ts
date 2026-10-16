/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimeRange } from '../../entities_grid/common';
import {
  buildAlertBasedTilesSeriesQuery,
  severeAlertsSeriesColumn,
  watchlistedSeriesColumn,
} from './entities_with_alerts_series_query';
import { buildAlertBasedTilesQuery } from './entities_with_alerts_query';
import {
  anomaliesSeriesColumn,
  buildEntitiesWithAnomaliesSeriesQuery,
} from './entities_with_anomalies_series_query';
import { buildEntitiesWithAnomaliesCountQuery } from './entities_with_anomalies_query';
import { buildNewEntitySeriesQuery, newEntitySeriesColumn } from './new_entity_series_query';
import { buildNewEntityCountQuery } from './new_entity_query';
import {
  buildRiskTilesSeriesQuery,
  newlyHighCriticalSeriesColumn,
  riskMoversSeriesColumn,
} from './risk_series_query';
import { getSeriesWindow } from './tile_series_window';

/*
 * What the Elasticsearch suites cannot see, because the query text is all that differs:
 * - COUNT_DISTINCT is exact below about 3,000 values, and the series fixtures are far smaller.
 * - The entity filters must sit after the join the count puts them after, or the fields they read
 *   are not there yet, and the fixtures run no filters.
 */

const INDEX = '.entities-v1';
const NAMESPACE = 'default';
const JOBS = ['job_a', 'job_b'];
const RANGES: readonly TimeRange[] = ['24h', '7d', '30d'];
const FILTERS = ['| WHERE entity.risk.calculated_level == "High"'];

describe('series queries count exactly, with one column per dot', () => {
  it.each(RANGES)('for %s', (range) => {
    const { dots } = getSeriesWindow(range);
    const series = [
      {
        query: buildAlertBasedTilesSeriesQuery(INDEX, NAMESPACE, range),
        columns: [severeAlertsSeriesColumn, watchlistedSeriesColumn],
      },
      {
        query: buildEntitiesWithAnomaliesSeriesQuery(INDEX, range, [], JOBS),
        columns: [anomaliesSeriesColumn],
      },
      {
        query: buildNewEntitySeriesQuery(INDEX, range),
        columns: [newEntitySeriesColumn],
      },
      {
        query: buildRiskTilesSeriesQuery(NAMESPACE, INDEX, range),
        columns: [riskMoversSeriesColumn, newlyHighCriticalSeriesColumn],
      },
    ];
    series.forEach(({ query, columns }) => {
      expect(query).not.toContain('COUNT_DISTINCT');
      columns.forEach((column) => {
        for (let k = 0; k < dots; k++) {
          expect(query).toContain(`${column(k)} = COUNT(`);
        }
        expect(query).not.toContain(`${column(dots)} =`);
      });
    });
  });
});

describe('series queries apply the entity filters where the count does', () => {
  const lookupJoinTo = (end: string) => (query: string) =>
    query.slice(query.indexOf('| LOOKUP JOIN'), query.indexOf(end));

  it.each([
    {
      tile: 'alert based',
      series: buildAlertBasedTilesSeriesQuery(INDEX, NAMESPACE, '7d', FILTERS),
      count: buildAlertBasedTilesQuery(INDEX, NAMESPACE, '7d', FILTERS),
      shared: lookupJoinTo('| EVAL is_watchlisted'),
    },
    {
      tile: 'anomalies',
      series: buildEntitiesWithAnomaliesSeriesQuery(INDEX, '7d', FILTERS, JOBS),
      count: buildEntitiesWithAnomaliesCountQuery(INDEX, '7d', FILTERS, JOBS),
      shared: lookupJoinTo('| EVAL effective_id'),
    },
    {
      tile: 'new entity',
      series: buildNewEntitySeriesQuery(INDEX, '7d', FILTERS),
      count: buildNewEntityCountQuery(INDEX, '7d', FILTERS),
      shared: (query: string) =>
        query.slice(query.indexOf('| WHERE entity.risk'), query.indexOf('| EVAL effective_id')),
    },
  ])('for the $tile tile', ({ series, count, shared }) => {
    expect(shared(series)).toContain(FILTERS[0]);
    expect(shared(series)).toBe(shared(count));
  });
});
