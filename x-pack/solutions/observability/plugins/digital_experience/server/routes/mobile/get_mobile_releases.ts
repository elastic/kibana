/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sortBy } from 'lodash';
import type { TracedElasticsearchClient } from '@kbn/traced-es-client';
import { RESULT_COLUMNS } from '../../../common/mobile/fields';
import { mobilePanelQuery, type MobilePanelFilters } from '../../../common/mobile/filters';
import {
  MIN_BUCKET_SESSIONS,
  MIN_RELEASE_SESSIONS,
  OTHER_RELEASE_KEY,
  TOP_RELEASES,
  withReleaseFirstSeen,
  withReleaseSeries,
  withReleaseTotals,
  type ReleaseFirstSeenRow,
  type ReleaseSeriesRow,
  type ReleaseTotalsRow,
} from '../../../common/mobile/releases';
import type {
  MobileReleaseMarker,
  MobileReleaseRow,
  MobileReleaseSeries,
  MobileReleasesResponse,
} from '../../../common/types/mobile';
import { runEsql, timeFilter } from '../../lib/esql';
import { getHistogramInterval } from '../../lib/helpers/time_series';
import { withReleaseCounts } from '../../lib/mobile/queries';
import type { ReleaseRow } from '../../lib/mobile/rows';

export interface GetMobileReleasesParams {
  esClient: TracedElasticsearchClient;
  filters: MobilePanelFilters;
  start: number;
  end: number;
  environment?: string;
}

/** How far before the range a release's first document is looked for. */
const FIRST_SEEN_LOOKBACK_MS = 30 * 24 * 60 * 60 * 1000;

const errorRateOf = (sessions: number, exceptions: number): number | null =>
  sessions > 0 ? exceptions / sessions : null;

/**
 * The release health of an application: its top releases by sessions and "Other", their totals
 * and trends, and where each top release first appears in the range.
 */
export const getMobileReleases = async ({
  esClient,
  filters,
  start,
  end,
  environment,
}: GetMobileReleasesParams): Promise<MobileReleasesResponse> => {
  const histogram = { interval: getHistogramInterval(start, end), start, end };
  // A new query each time: `pipe` adds to the query it's called on.
  const query = () => mobilePanelQuery(filters);

  const topRows = await runEsql<ReleaseRow>(
    esClient,
    'get_mobile_release_top',
    withReleaseCounts(query(), TOP_RELEASES),
    timeFilter(start, end, environment)
  );
  const top = topRows.flatMap(({ [RESULT_COLUMNS.release]: release }) =>
    release ? [release] : []
  );
  if (top.length === 0) {
    return { histogram, releases: [], series: [], markers: [] };
  }

  const [totalRows, seriesRows, firstSeenRows] = await Promise.all([
    runEsql<ReleaseTotalsRow>(
      esClient,
      'get_mobile_release_totals',
      withReleaseTotals(query(), top),
      timeFilter(start, end, environment)
    ),
    runEsql<ReleaseSeriesRow>(
      esClient,
      'get_mobile_release_series',
      withReleaseSeries(query(), top, histogram.interval),
      timeFilter(start, end, environment)
    ),
    runEsql<ReleaseFirstSeenRow>(
      esClient,
      'get_mobile_release_first_seen',
      withReleaseFirstSeen(query(), top),
      timeFilter(start - FIRST_SEEN_LOOKBACK_MS, end, environment)
    ),
  ]);

  const rows: MobileReleaseRow[] = totalRows.map((row) => {
    const release = row[RESULT_COLUMNS.releaseGroup] ?? OTHER_RELEASE_KEY;
    const sessions = row[RESULT_COLUMNS.sessions] ?? 0;
    return {
      release,
      isOther: release === OTHER_RELEASE_KEY,
      sessions,
      users: row[RESULT_COLUMNS.users] ?? 0,
      errorRate:
        sessions >= MIN_RELEASE_SESSIONS
          ? errorRateOf(sessions, row[RESULT_COLUMNS.exceptions] ?? 0)
          : null,
    };
  });
  // Most sessions first, "Other" always last.
  const releases = sortBy(rows, [({ isOther }) => isOther, ({ sessions }) => -sessions]);

  const series: MobileReleaseSeries[] = releases.map(({ release, isOther }) => ({
    release,
    isOther,
    points: sortBy(
      seriesRows
        .filter((row) => (row[RESULT_COLUMNS.releaseGroup] ?? OTHER_RELEASE_KEY) === release)
        .map((row) => {
          const sessions = row[RESULT_COLUMNS.sessions] ?? 0;
          return {
            timestamp: Date.parse(row[RESULT_COLUMNS.bucket]),
            sessions,
            // A bucket with few sessions swings from 0 to a spike on one exception.
            errorRate:
              sessions >= MIN_BUCKET_SESSIONS
                ? errorRateOf(sessions, row[RESULT_COLUMNS.exceptions] ?? 0)
                : null,
          };
        }),
      'timestamp'
    ),
  }));

  const markers: MobileReleaseMarker[] = sortBy(
    firstSeenRows.map((row) => ({
      release: row[RESULT_COLUMNS.release],
      firstSeen: Date.parse(row[RESULT_COLUMNS.firstSeen]),
    })),
    'firstSeen'
  ).filter(({ firstSeen }) => firstSeen >= start);

  return { histogram, releases, series, markers };
};
