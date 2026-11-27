/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mobilePanelQuery } from './filters';
import {
  MAX_APP_START_MS,
  appStartStats,
  toAppStart,
  withAppStartDurations,
  withAppStartSeries,
} from './app_starts';

const query = () => mobilePanelQuery({ serviceName: 'shop-mobile' });

const normalized = (text: string) => text.replace(/\s+/g, ' ');

describe('app start queries', () => {
  it('keeps a cold start, and only a cold one, in the cold column, read as a double', () => {
    const printed = normalized(withAppStartDurations(query()).print('basic'));

    // The type as a string, so a stream that maps it as a number doesn't fail the whole query
    expect(printed).toContain(
      'cold_start_ms = CASE(event_name == "elastic.app.start" AND TO_STRING(`attributes.start.type`) == "cold" AND TO_DOUBLE(`attributes.elastic.app.start.duration`) >= 0 AND TO_DOUBLE(`attributes.elastic.app.start.duration`) <= 60000, TO_DOUBLE(`attributes.elastic.app.start.duration`), NULL)'
    );
    expect(printed).toContain(
      'warm_start_ms = CASE(event_name == "elastic.app.start" AND TO_STRING(`attributes.start.type`) == "warm"'
    );
    // `hot` and starts without a type fall in neither column
    expect(printed).not.toContain('"hot"');
  });

  it('leaves out starts above the guard: a process started in the background', () => {
    expect(MAX_APP_START_MS).toBe(60_000);
  });

  it('averages and counts each start type', () => {
    const printed = withAppStartDurations(query()).pipe`STATS ${appStartStats()}`.print('basic');

    expect(printed).toContain(
      'STATS cold_start = AVG(cold_start_ms), cold_starts = COUNT(cold_start_ms), warm_start = AVG(warm_start_ms), warm_starts = COUNT(warm_start_ms)'
    );
  });

  it('buckets the app starts only, sorted and capped', () => {
    const printed = normalized(withAppStartSeries(query(), { value: 1, unit: 'd' }).print('basic'));

    expect(printed).toContain('| WHERE event_name == "elastic.app.start" | EVAL cold_start_ms');
    expect(printed).toContain('BY bucket = TBUCKET("1 day") | SORT bucket ASC | LIMIT 10000');
  });
});

describe('toAppStart', () => {
  it('reads the average and count of a start type', () => {
    expect(toAppStart({ cold_start: 1200, cold_starts: 3 }, 'cold')).toEqual({
      avg: 1200,
      count: 3,
    });
  });

  it('has no average without starts, nor without a row', () => {
    expect(toAppStart({ cold_start: 1200, cold_starts: 3 }, 'warm')).toEqual({
      avg: null,
      count: 0,
    });
    expect(toAppStart(undefined, 'cold')).toEqual({ avg: null, count: 0 });
  });
});
