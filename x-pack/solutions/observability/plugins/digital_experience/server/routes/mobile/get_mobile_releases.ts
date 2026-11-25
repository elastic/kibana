/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { groupBy, keyBy, orderBy, sortBy, sortedUniq } from 'lodash';
import type { TracedElasticsearchClient } from '@kbn/traced-es-client';
import { RESULT_COLUMNS } from '../../../common/mobile/fields';
import { mobilePanelQuery, type MobilePanelFilters } from '../../../common/mobile/filters';
import {
  MIN_BUCKET_SESSIONS,
  MIN_RELEASE_SESSIONS,
  OTHER_RELEASE_KEY,
  TOP_RELEASES,
  withOtherReleaseStats,
  withReleaseSeries,
  withReleaseStats,
  withReleasesSeen,
  type OtherReleaseStatsRow,
  type ReleaseSeenRow,
  type ReleaseSeriesRow,
  type ReleaseStatsRow,
} from '../../../common/mobile/releases';
import type {
  MobileReleaseMarker,
  MobileReleasePoint,
  MobileReleaseRow,
  MobileReleaseSeries,
  MobileReleasesResponse,
} from '../../../common/types/mobile';
import { runEsql, timeFilter } from '../../lib/esql';
import { getBucketTimestamps, getHistogramInterval } from '../../lib/helpers/time_series';

export interface GetMobileReleasesParams {
  esClient: TracedElasticsearchClient;
  filters: MobilePanelFilters;
  start: number;
  end: number;
  environment?: string;
  /** The time zone of the series' buckets. */
  timeZone: string;
}

/** A release seen this long before the range gets no marker. */
const FIRST_SEEN_LOOKBACK_MS = 30 * 24 * 60 * 60 * 1000;

interface ReleaseDetails {
  otherRows: OtherReleaseStatsRow[];
  seriesRows: ReleaseSeriesRow[];
  seenRows: ReleaseSeenRow[];
}

interface ReleaseRows extends ReleaseDetails {
  statsRows: ReleaseStatsRow[];
}

const NO_DETAILS: ReleaseDetails = { otherRows: [], seriesRows: [], seenRows: [] };

const errorRateOf = (sessions: number, exceptions: number): number | null =>
  sessions > 0 ? exceptions / sessions : null;

/** The release health of an application: its top releases and "Other", their trends and markers. */
export const getMobileReleases = async ({
  esClient,
  filters,
  start,
  end,
  environment,
  timeZone,
}: GetMobileReleasesParams): Promise<MobileReleasesResponse> => {
  const histogram = { interval: getHistogramInterval(start, end), start, end };
  // A new query each time: `pipe` adds to the query it's called on.
  const query = () => mobilePanelQuery(filters);

  const rangeFilter = timeFilter(start, end, environment);
  const statsOf = (limit: number) =>
    runEsql<ReleaseStatsRow>(
      esClient,
      'get_mobile_release_stats',
      withReleaseStats(query(), limit),
      rangeFilter
    );

  const detailsOf = async (releases: string[], hasOther: boolean): Promise<ReleaseDetails> => {
    const [otherRows, seriesRows, seenRows] = await Promise.all([
      hasOther
        ? runEsql<OtherReleaseStatsRow>(
            esClient,
            'get_mobile_release_other_stats',
            withOtherReleaseStats(query(), releases),
            rangeFilter
          )
        : [],
      runEsql<ReleaseSeriesRow>(
        esClient,
        'get_mobile_release_series',
        withReleaseSeries(query(), releases, histogram.interval),
        rangeFilter,
        timeZone
      ),
      // Before the range only: the stats query has their first document in it
      runEsql<ReleaseSeenRow>(
        esClient,
        'get_mobile_release_seen_before',
        withReleasesSeen(query(), releases),
        timeFilter(start - FIRST_SEEN_LOOKBACK_MS, start, environment)
      ),
    ]);
    return { otherRows, seriesRows, seenRows };
  };

  // The release filter is the only group, so every query runs at once
  const fetchRelease = async (release: string): Promise<ReleaseRows> => {
    const [statsRows, details] = await Promise.all([statsOf(1), detailsOf([release], false)]);
    return { statsRows, ...details };
  };

  // One more than the top releases tells whether any are left for "Other"
  const fetchTopReleases = async (): Promise<ReleaseRows> => {
    const rows = await statsOf(TOP_RELEASES + 1);
    const statsRows = rows.slice(0, TOP_RELEASES);
    if (statsRows.length === 0) {
      return { statsRows, ...NO_DETAILS };
    }
    const releases = statsRows.map(({ [RESULT_COLUMNS.release]: release }) => release);
    return { statsRows, ...(await detailsOf(releases, rows.length > TOP_RELEASES)) };
  };

  const { statsRows, otherRows, seriesRows, seenRows } = filters.release
    ? await fetchRelease(filters.release)
    : await fetchTopReleases();
  if (statsRows.length === 0) {
    return { histogram, releases: [], series: [], markers: [] };
  }

  const toRow = (release: string, kpis: OtherReleaseStatsRow): MobileReleaseRow => {
    const sessions = kpis[RESULT_COLUMNS.sessions] ?? 0;
    return {
      release,
      isOther: release === OTHER_RELEASE_KEY,
      sessions,
      users: kpis[RESULT_COLUMNS.users] ?? 0,
      errorRate:
        sessions >= MIN_RELEASE_SESSIONS
          ? errorRateOf(sessions, kpis[RESULT_COLUMNS.exceptions] ?? 0)
          : null,
    };
  };
  const rows = [
    ...statsRows.map((row) => toRow(row[RESULT_COLUMNS.release], row)),
    ...otherRows.map((row) => toRow(OTHER_RELEASE_KEY, row)),
  ];
  // The stats query's order, so equal releases keep their order and colours; "Other" last
  const releases = orderBy(rows, ['isOther', 'sessions', 'release'], ['asc', 'desc', 'desc']);

  // TBUCKET leaves out empty buckets, which the charts would draw across, so fill them
  const pointRows = seriesRows.map((row) => {
    const sessions = row[RESULT_COLUMNS.sessions] ?? 0;
    const point: MobileReleasePoint = {
      timestamp: Date.parse(row[RESULT_COLUMNS.bucket]),
      sessions,
      // A bucket with few sessions swings from 0 to a spike on one exception.
      errorRate:
        sessions >= MIN_BUCKET_SESSIONS
          ? errorRateOf(sessions, row[RESULT_COLUMNS.exceptions] ?? 0)
          : null,
    };
    return { release: row[RESULT_COLUMNS.releaseGroup] ?? OTHER_RELEASE_KEY, point };
  });
  const timestamps =
    pointRows.length === 0
      ? []
      : sortedUniq(
          sortBy([
            ...getBucketTimestamps(start, end, histogram.interval, timeZone),
            ...pointRows.map(({ point }) => point.timestamp),
          ])
        );
  const pointsByRelease = groupBy(pointRows, 'release');

  const series: MobileReleaseSeries[] = releases.map(({ release, isOther }) => {
    const byTimestamp = keyBy(
      (pointsByRelease[release] ?? []).map(({ point }) => point),
      'timestamp'
    );
    return {
      release,
      isOther,
      points: timestamps.map(
        (timestamp) => byTimestamp[timestamp] ?? { timestamp, sessions: 0, errorRate: null }
      ),
    };
  });

  // The first document in the range, unless the release has one before it
  const seenBefore = new Set(seenRows.map(({ [RESULT_COLUMNS.release]: release }) => release));
  const markers: MobileReleaseMarker[] = sortBy(
    statsRows
      .filter(({ [RESULT_COLUMNS.release]: release }) => !seenBefore.has(release))
      .map((row) => ({
        release: row[RESULT_COLUMNS.release],
        firstSeen: Date.parse(row[RESULT_COLUMNS.firstSeen]),
      })),
    'firstSeen'
  );

  return { histogram, releases, series, markers };
};
