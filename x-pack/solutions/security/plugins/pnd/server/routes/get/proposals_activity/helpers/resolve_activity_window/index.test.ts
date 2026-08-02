/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PND_ACTIVITY_BUCKET_COUNT, PND_ACTIVITY_BUCKET_MS, resolveActivityWindow } from '.';

/** 2026-08-06T14:37:21.123Z — deliberately not on an hour boundary. */
const NOW = Date.parse('2026-08-06T14:37:21.123Z');

describe('resolveActivityWindow', () => {
  it('anchors the newest bucket on the hour containing `now`', () => {
    expect(new Date(resolveActivityWindow(NOW).end).toISOString()).toEqual(
      '2026-08-06T14:00:00.000Z'
    );
  });

  it('walks back 23 whole hours for the oldest bucket', () => {
    expect(new Date(resolveActivityWindow(NOW).start).toISOString()).toEqual(
      '2026-08-05T15:00:00.000Z'
    );
  });

  it('spans exactly the bucket count when the two ends are walked an hour at a time', () => {
    const { end, start } = resolveActivityWindow(NOW);

    expect((end - start) / PND_ACTIVITY_BUCKET_MS + 1).toEqual(PND_ACTIVITY_BUCKET_COUNT);
  });

  it('leaves an exact hour boundary alone rather than rounding it away', () => {
    const onTheHour = Date.parse('2026-08-06T14:00:00.000Z');

    expect(resolveActivityWindow(onTheHour).end).toEqual(onTheHour);
  });

  it('produces the same window for every instant inside one hour', () => {
    const lateInTheHour = Date.parse('2026-08-06T14:59:59.999Z');

    expect(resolveActivityWindow(lateInTheHour)).toEqual(resolveActivityWindow(NOW));
  });

  it('caps the series at the 24 buckets the response contract allows', () => {
    expect(PND_ACTIVITY_BUCKET_COUNT).toEqual(24);
  });

  it('buckets one hour of milliseconds', () => {
    expect(PND_ACTIVITY_BUCKET_MS).toEqual(60 * 60 * 1000);
  });
});
