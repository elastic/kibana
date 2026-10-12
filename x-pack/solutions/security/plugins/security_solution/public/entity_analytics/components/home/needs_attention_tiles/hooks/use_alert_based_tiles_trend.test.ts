/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLSearchResponse } from '@kbn/es-types';
import { parseAlertBasedTilesTrend } from './use_alert_based_tiles_trend';

const response = (columns: string[], row: Array<number | null>): ESQLSearchResponse =>
  ({
    columns: columns.map((name) => ({ name, type: 'long' })),
    values: [row],
  } as unknown as ESQLSearchResponse);

describe('parseAlertBasedTilesTrend', () => {
  it('returns the dots oldest first, so the last value is the newest dot (0)', () => {
    const columns = ['alerts_0', 'alerts_1', 'alerts_2', 'watchlisted_0', 'watchlisted_1'];
    const { alerts, watchlisted } = parseAlertBasedTilesTrend(
      response(columns, [10, 20, 30, 1, 2]),
      '24h'
    );
    expect(alerts).toHaveLength(24);
    expect(alerts.slice(-3)).toEqual([30, 20, 10]);
    expect(watchlisted.slice(-2)).toEqual([2, 1]);
  });

  it.each([
    ['24h', 24],
    ['7d', 28],
    ['30d', 30],
  ] as const)('returns %s dots for each tile (%i)', (range, dots) => {
    const { alerts, watchlisted } = parseAlertBasedTilesTrend(response([], []), range);
    expect(alerts).toHaveLength(dots);
    expect(watchlisted).toHaveLength(dots);
  });

  it('counts a missing column as 0', () => {
    const { alerts } = parseAlertBasedTilesTrend(response(['alerts_0'], [7]), '24h');
    expect(alerts[alerts.length - 1]).toBe(7);
    expect(alerts.slice(0, -1).every((value) => value === 0)).toBe(true);
  });

  it('counts a null value as 0', () => {
    const { alerts } = parseAlertBasedTilesTrend(
      response(['alerts_0', 'alerts_1'], [null, 4]),
      '24h'
    );
    expect(alerts.slice(-2)).toEqual([4, 0]);
  });

  it('returns all zeros for an empty response', () => {
    const { alerts, watchlisted } = parseAlertBasedTilesTrend(
      { columns: [], values: [] } as unknown as ESQLSearchResponse,
      '30d'
    );
    expect(alerts.every((value) => value === 0)).toBe(true);
    expect(watchlisted.every((value) => value === 0)).toBe(true);
  });
});
