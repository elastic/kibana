/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rumAppsSpanFromPoints, rumSpanDomain, rumSpanHasOutsideData } from './rum_span';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const now = Date.parse('2026-08-20T00:00:00.000Z');
const rangeFrom = now - DAY;
const rangeTo = now;

describe('rumSpanHasOutsideData', () => {
  it('is false when every session falls inside the selection', () => {
    expect(
      rumSpanHasOutsideData(
        [
          { timestamp: rangeFrom + HOUR, sessions: 4 },
          { timestamp: rangeFrom + 2 * HOUR, sessions: 1 },
        ],
        rangeFrom,
        rangeTo
      )
    ).toBe(false);
  });

  it('is true when a bucket sits before the selection', () => {
    expect(
      rumSpanHasOutsideData([{ timestamp: rangeFrom - 3 * DAY, sessions: 12 }], rangeFrom, rangeTo)
    ).toBe(true);
  });

  it('ignores empty buckets outside the selection', () => {
    expect(
      rumSpanHasOutsideData([{ timestamp: rangeFrom - DAY, sessions: 0 }], rangeFrom, rangeTo)
    ).toBe(false);
  });
});

describe('rumSpanDomain', () => {
  it('extends the selection so older traffic and the empty window share one axis', () => {
    expect(
      rumSpanDomain([{ timestamp: rangeFrom - 7 * DAY, sessions: 3 }], rangeFrom, rangeTo)
    ).toEqual({ fromMs: rangeFrom - 7 * DAY, toMs: rangeTo });
  });

  it('returns null when there are no points', () => {
    expect(rumSpanDomain([], rangeFrom, rangeTo)).toBeNull();
  });
});

describe('rumAppsSpanFromPoints', () => {
  it('flags outside data and fills domain bounds', () => {
    const points = [{ timestamp: rangeFrom - DAY, sessions: 8 }];
    expect(rumAppsSpanFromPoints(points, rangeFrom, rangeTo)).toEqual({
      points,
      hasData: true,
      domainFrom: rangeFrom - DAY,
      domainTo: rangeTo,
      selectionFrom: rangeFrom,
      selectionTo: rangeTo,
    });
  });
});
