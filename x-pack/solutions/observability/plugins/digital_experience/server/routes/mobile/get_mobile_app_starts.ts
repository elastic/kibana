/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { keyBy, sortBy, sortedUniq } from 'lodash';
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
import { getBucketTimestamps } from '../../lib/mobile/bucket_timestamps';

export interface GetMobileAppStartsParams {
  esClient: TracedElasticsearchClient;
  filters: MobilePanelFilters;
  start: number;
  end: number;
  environment?: string;
  /** The time zone of the series' buckets. */
  timeZone: string;
}

const NO_STARTS = { avg: null, count: 0 };

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
  const [rows, bucketTimestamps] = await Promise.all([
    runEsql<AppStartSeriesRow>(
      esClient,
      'get_mobile_app_starts',
      withAppStartSeries(mobilePanelQuery(filters), histogram.interval),
      timeFilter(start, end, environment),
      timeZone
    ),
    getBucketTimestamps({
      esClient,
      operationName: 'get_mobile_app_start_buckets',
      start,
      end,
      interval: histogram.interval,
      timeZone,
    }),
  ]);
  if (rows.length === 0) {
    return { histogram, points: [] };
  }

  const points = rows.map(
    (row): MobileAppStartPoint => ({
      timestamp: Date.parse(row[RESULT_COLUMNS.bucket]),
      cold: toAppStart(row, 'cold'),
      warm: toAppStart(row, 'warm'),
    })
  );
  const byTimestamp = keyBy(points, 'timestamp');
  // Every bucket, so the charts leave a gap where there were no starts
  const timestamps = sortedUniq(
    sortBy([...bucketTimestamps, ...points.map(({ timestamp }) => timestamp)])
  );
  return {
    histogram,
    points: timestamps.map(
      (timestamp) => byTimestamp[timestamp] ?? { timestamp, cold: NO_STARTS, warm: NO_STARTS }
    ),
  };
};
