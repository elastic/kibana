/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IngestOverTime } from '../../../../common/types/applications_ingest';
import {
  OTHER_INGEST_SERIES,
  TOP_INGEST_SERIES,
  ingestChartPoints,
  ingestOf,
  toIngestLookup,
  totalIngest,
} from './ingest';

const histogram = { interval: { value: 60, unit: 's' as const }, start: 0, end: 120_000 };

const points = (first: number, second: number) => [
  { timestamp: 0, bytes: first },
  { timestamp: 60_000, bytes: second },
];

describe('ingest lookup', () => {
  const lookup = toIngestLookup({
    applications: [
      { serviceName: 'shop', applicationType: 'web', source: 'otel', bytes: 10 },
      { serviceName: 'shop', applicationType: 'web', source: 'classic', bytes: 20 },
      { serviceName: 'shop', applicationType: 'mobile', source: 'otel', bytes: 30 },
    ],
    overTime: { histogram, series: [], other: { otel: [], classic: [] } },
    missingPrivileges: false,
    hasFailures: false,
  });

  it('keeps apart an application of each type and source', () => {
    expect(
      ingestOf(lookup, { serviceName: 'shop', applicationType: 'web', source: 'classic' })
    ).toBe(20);
    expect(
      ingestOf(lookup, { serviceName: 'shop', applicationType: 'mobile', source: 'otel' })
    ).toBe(30);
    expect(
      ingestOf(undefined, { serviceName: 'shop', applicationType: 'web', source: 'otel' })
    ).toBe(undefined);
  });

  it('totals the applications with an estimate, and is null without any', () => {
    expect(
      totalIngest(lookup, [
        { serviceName: 'shop', applicationType: 'web', source: 'otel' },
        { serviceName: 'shop', applicationType: 'web', source: 'classic' },
        { serviceName: 'other', applicationType: 'web', source: 'otel' },
      ])
    ).toBe(30);
    expect(
      totalIngest(lookup, [{ serviceName: 'other', applicationType: 'web', source: 'otel' }])
    ).toBeNull();
  });
});

describe('ingestChartPoints', () => {
  it('stacks the series of the source and its other', () => {
    const overTime: IngestOverTime = {
      histogram,
      series: [
        { serviceName: 'shop', source: 'otel', points: points(5, 6) },
        { serviceName: 'legacy', source: 'classic', points: points(1, 1) },
      ],
      other: { otel: points(2, 0), classic: points(3, 3) },
    };

    expect(ingestChartPoints(overTime, 'otel')).toEqual([
      { timestamp: 0, bytes: 5, series: 'shop' },
      { timestamp: 60_000, bytes: 6, series: 'shop' },
      { timestamp: 0, bytes: 2, series: OTHER_INGEST_SERIES },
      { timestamp: 60_000, bytes: 0, series: OTHER_INGEST_SERIES },
    ]);
  });

  it(`keeps the ${TOP_INGEST_SERIES} largest of both sources, one series per name, and adds the rest to other`, () => {
    const series = Array.from({ length: TOP_INGEST_SERIES }, (_, rank) => ({
      serviceName: `app-${rank}`,
      source: 'otel' as const,
      points: points(100 + rank, 0),
    }));
    const overTime: IngestOverTime = {
      histogram,
      series: [
        ...series,
        // In both sources: one series with both sources' bytes.
        { serviceName: 'app-0', source: 'classic', points: points(1000, 0) },
        { serviceName: 'smallest', source: 'classic', points: points(1, 0) },
      ],
      other: { otel: points(10, 0), classic: points(20, 0) },
    };

    const chart = ingestChartPoints(overTime, undefined);
    const names = [...new Set(chart.map(({ series: name }) => name))];

    expect(names).toHaveLength(TOP_INGEST_SERIES + 1);
    expect(names[0]).toBe('app-0');
    expect(names).not.toContain('smallest');
    expect(chart).toContainEqual({ timestamp: 0, bytes: 1100, series: 'app-0' });
    expect(chart).toContainEqual({ timestamp: 0, bytes: 1 + 10 + 20, series: OTHER_INGEST_SERIES });
  });

  it('has no other series when the top ones are all the ingest', () => {
    const overTime: IngestOverTime = {
      histogram,
      series: [{ serviceName: 'shop', source: 'otel', points: points(5, 6) }],
      other: { otel: points(0, 0), classic: [] },
    };

    expect(
      ingestChartPoints(overTime, undefined).some(({ series }) => series === OTHER_INGEST_SERIES)
    ).toBe(false);
  });
});
