/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TracedElasticsearchClient } from '@kbn/traced-es-client';
import {
  toAppStart,
  withAppStartSeries,
  type AppStartSeriesRow,
} from '../../../common/mobile/app_starts';
import { RESULT_COLUMNS } from '../../../common/mobile/fields';
import { mobilePanelQuery, type MobilePanelFilters } from '../../../common/mobile/filters';
import type { MobileAppStartPoint, MobileAppStartsResponse } from '../../../common/types/mobile';
import { runEsql, timeFilter } from '../../lib/esql';
import { getHistogramInterval } from '../../lib/helpers/time_series';
import {
  allBucketTimestamps,
  fillBuckets,
  getBucketTimestamps,
} from '../../lib/mobile/bucket_timestamps';

export interface GetMobileAppStartsParams {
  esClient: TracedElasticsearchClient;
  filters: MobilePanelFilters;
  start: number;
  end: number;
  environment?: string;
  /** The time zone of the series' buckets. */
  timeZone: string;
}

/** The average cold and warm start per bucket of the range, every bucket included. */
export const getMobileAppStarts = async ({
  esClient,
  filters,
  start,
  end,
  environment,
  timeZone,
}: GetMobileAppStartsParams): Promise<MobileAppStartsResponse> => {
  const histogram = { interval: getHistogramInterval(start, end), start, end };
  const rows = await runEsql<AppStartSeriesRow>(
    esClient,
    'get_mobile_app_starts',
    withAppStartSeries(mobilePanelQuery(filters), histogram.interval),
    timeFilter(start, end, environment),
    timeZone
  );
  // Most apps on SDKs without app starts stop here, without searching for the empty buckets
  if (rows.length === 0) {
    return { histogram, points: [] };
  }
  const bucketTimestamps = await getBucketTimestamps({
    esClient,
    operationName: 'get_mobile_app_start_buckets',
    start,
    end,
    interval: histogram.interval,
    timeZone,
  });

  const points = rows.map((row): MobileAppStartPoint => ({
    timestamp: Date.parse(row[RESULT_COLUMNS.bucket]),
    cold: toAppStart(row, 'cold'),
    warm: toAppStart(row, 'warm'),
  }));
  // Every bucket, so the charts leave a gap where there were no starts
  const timestamps = allBucketTimestamps(
    bucketTimestamps,
    points.map(({ timestamp }) => timestamp)
  );
  return {
    histogram,
    points: fillBuckets(points, timestamps, (timestamp) => ({
      timestamp,
      cold: toAppStart(undefined, 'cold'),
      warm: toAppStart(undefined, 'warm'),
    })),
  };
};
