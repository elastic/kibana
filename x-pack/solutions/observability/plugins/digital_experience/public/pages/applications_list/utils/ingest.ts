/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { orderBy, sum, sumBy } from 'lodash';
import type { ApplicationSource, ApplicationType } from '../../../../common/types/applications';
import type {
  ApplicationsIngestResponse,
  IngestOverTime,
  IngestPoint,
} from '../../../../common/types/applications_ingest';

/** The applications the chart stacks; the rest are one series. */
export const TOP_INGEST_SERIES = 10;

/** The id of the series of the applications not stacked on their own. */
export const OTHER_INGEST_SERIES = '__other__';

interface IngestKeyFields {
  serviceName: string;
  applicationType: ApplicationType;
  source: ApplicationSource;
}

const ingestKey = ({ applicationType, source, serviceName }: IngestKeyFields) =>
  `${applicationType}:${source}:${serviceName}`;

/** The estimated bytes of each application of the response. */
export type IngestLookup = ReadonlyMap<string, number>;

export const toIngestLookup = ({ applications }: ApplicationsIngestResponse): IngestLookup =>
  new Map(applications.map((application) => [ingestKey(application), application.bytes]));

/** An application's estimated bytes; `undefined` without an estimate, or while it loads. */
export const ingestOf = (
  lookup: IngestLookup | undefined,
  application: IngestKeyFields
): number | undefined => lookup?.get(ingestKey(application));

/** The estimated bytes of the given applications; `null` when none of them has an estimate. */
export const totalIngest = (
  lookup: IngestLookup | undefined,
  applications: readonly IngestKeyFields[]
): number | null => {
  const estimates = applications
    .map((application) => ingestOf(lookup, application))
    .filter((bytes): bytes is number => bytes !== undefined);
  return estimates.length > 0 ? sum(estimates) : null;
};

/** One bar segment of the chart: a series' bytes in one bucket. */
export interface IngestChartPoint {
  timestamp: number;
  bytes: number;
  /** The application, or `OTHER_INGEST_SERIES`. */
  series: string;
}

const sumPoints = (pointLists: IngestPoint[][]): IngestPoint[] => {
  const byTimestamp = new Map<number, number>();
  for (const points of pointLists) {
    for (const { timestamp, bytes } of points) {
      byTimestamp.set(timestamp, (byTimestamp.get(timestamp) ?? 0) + bytes);
    }
  }
  return [...byTimestamp].map(([timestamp, bytes]) => ({ timestamp, bytes }));
};

/**
 * The chart's series, of one source or both: the 10 applications with the most ingest, and the
 * rest as "Other". Each source sends its 10 top ones, so the 10 top of both are among them. An
 * application of both sources is one series, as the chart is about volume, not the source.
 */
export const ingestChartPoints = (
  { series, other }: IngestOverTime,
  source: ApplicationSource | undefined
): IngestChartPoint[] => {
  const sources: ApplicationSource[] = source ? [source] : ['otel', 'classic'];
  const bySeries = new Map<string, IngestPoint[][]>();
  for (const { serviceName, source: seriesSource, points } of series) {
    if (sources.includes(seriesSource)) {
      bySeries.set(serviceName, [...(bySeries.get(serviceName) ?? []), points]);
    }
  }
  const ranked = orderBy(
    [...bySeries].map(([serviceName, pointLists]) => {
      const points = sumPoints(pointLists);
      return { serviceName, points, bytes: sumBy(points, 'bytes') };
    }),
    ['bytes', 'serviceName'],
    ['desc', 'asc']
  );
  const top = ranked.slice(0, TOP_INGEST_SERIES);
  const rest = sumPoints([
    ...ranked.slice(TOP_INGEST_SERIES).map(({ points }) => points),
    ...sources.map((name) => other[name]),
  ]);

  return [
    ...top.flatMap(({ serviceName, points }) =>
      points.map(({ timestamp, bytes }) => ({ timestamp, bytes, series: serviceName }))
    ),
    ...(rest.some(({ bytes }) => bytes > 0)
      ? rest.map(({ timestamp, bytes }) => ({ timestamp, bytes, series: OTHER_INGEST_SERIES }))
      : []),
  ];
};
