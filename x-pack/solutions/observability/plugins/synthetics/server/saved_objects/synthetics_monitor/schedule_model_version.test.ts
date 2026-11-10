/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { backfillScheduleInterval } from './schedule_model_version';

describe('backfillScheduleInterval', () => {
  const backfill = (schedule?: { number: string; unit?: string }) =>
    backfillScheduleInterval(
      { id: 'mon-1', type: 'synthetics-monitor', attributes: { schedule } } as never,
      {} as never
    );

  it('stores seconds and minutes as a duration in seconds', () => {
    expect(backfill({ number: '10', unit: 's' }).attributes).toEqual({
      schedule_interval_seconds: 10,
    });
    expect(backfill({ number: '10', unit: 'm' }).attributes).toEqual({
      schedule_interval_seconds: 600,
    });
    expect(backfill({ number: '5', unit: 'm' }).attributes).toEqual({
      schedule_interval_seconds: 300,
    });
  });

  it('treats a missing unit as minutes and skips a unit it cannot convert', () => {
    expect(backfill(undefined).attributes).toEqual({});
    expect(backfill({ number: '10' }).attributes).toEqual({ schedule_interval_seconds: 600 });
    expect(backfill({ number: '10', unit: 'h' }).attributes).toEqual({});
  });
});
