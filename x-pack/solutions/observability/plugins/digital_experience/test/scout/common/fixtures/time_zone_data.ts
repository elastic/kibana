/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment-timezone';
import type { EsClient } from '@kbn/scout-oblt';

const INDEX = 'logs-generic.otel-default';

export const TIME_ZONE = 'America/New_York';

/** The environment of the page loads below, which no other mock data uses. */
export const TIME_ZONE_ENVIRONMENT = 'time-zone-test';

/** The application of the page loads below, which no other mock data uses. */
export const TIME_ZONE_APP = 'otel-clock';

/**
 * Page loads on either side of New York's local midnight and noon, by the local start of the
 * bucket each one falls in.
 */
export const LOCAL_PAGE_LOADS = {
  /** In January, where 30 days get 12-hour buckets. */
  halfDays: {
    '2021-01-10T00:00': ['2021-01-10T11:59'],
    '2021-01-10T12:00': ['2021-01-10T12:00', '2021-01-10T23:59'],
  },
  /** Around 2021-03-14, which has 23 hours in New York; 3 months get daily buckets. */
  days: {
    '2021-03-13T00:00': ['2021-03-13T23:59'],
    '2021-03-14T00:00': ['2021-03-14T00:00', '2021-03-14T23:59'],
    '2021-03-15T00:00': ['2021-03-15T00:00'],
  },
} as const;

const toEpoch = (localTime: string): number => {
  return moment.tz(localTime, TIME_ZONE).valueOf();
};

/** The page loads each bucket should count, by its key in epoch milliseconds. */
export const expectedCountsByKey = (
  pageLoadsByBucket: Readonly<Record<string, readonly string[]>>
): Map<number, number> => {
  return new Map(
    Object.entries(pageLoadsByBucket).map(([bucket, pageLoads]) => {
      return [toEpoch(bucket), pageLoads.length];
    })
  );
};

const documents = Object.values(LOCAL_PAGE_LOADS)
  .flatMap((pageLoadsByBucket) => {
    return Object.values(pageLoadsByBucket).flat();
  })
  .map((localTime, index) => {
    return {
      id: `dx-time-zone-${index}`,
      document: {
        '@timestamp': new Date(toEpoch(localTime)).toISOString(),
        event_name: 'browser.navigation_timing',
        resource: {
          attributes: {
            'service.name': TIME_ZONE_APP,
            'telemetry.sdk.language': 'webjs',
            'deployment.environment.name': TIME_ZONE_ENVIRONMENT,
          },
        },
        attributes: { 'url.full': `https://${TIME_ZONE_APP}.example.com/` },
      },
    };
  });

/** Deletes the time zone page loads by their ids, leaving the rest of the data stream. */
export const deleteTimeZoneData = async (esClient: EsClient): Promise<void> => {
  await esClient.deleteByQuery({
    index: INDEX,
    query: { ids: { values: documents.map(({ id }) => id) } },
    refresh: true,
    ignore_unavailable: true,
  });
};

/** Indexes the time zone page loads, replacing what an interrupted run left behind. */
export const ingestTimeZoneData = async (esClient: EsClient): Promise<void> => {
  // Data streams only accept `create`, which would keep a leftover document's old body.
  await deleteTimeZoneData(esClient);
  const { errors, items } = await esClient.bulk({
    refresh: 'wait_for',
    operations: documents.flatMap(({ id, document }) => {
      return [{ create: { _index: INDEX, _id: id } }, document];
    }),
  });
  const failure = items.find((item) => {
    return item.create?.error;
  });
  if (errors && failure) {
    throw new Error(`Could not ingest the time zone data: ${JSON.stringify(failure)}`);
  }
};
