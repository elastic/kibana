/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { castArray, omit } from 'lodash';
import type { TracedElasticsearchClient } from '@kbn/traced-es-client';
import {
  CRASH_DELAY_MS,
  CRASH_NEW_LOOKBACK_DAYS,
  crashEvents,
  withCrashFingerprint,
  withCrashGroupHistory,
  withCrashGroupStats,
  withCrashReleaseCounts,
  withCrashTypes,
  type CrashGroupHistoryRow,
  type CrashGroupRow,
  type CrashReleaseRow,
} from '../../../../common/mobile/crash_groups';
import { RESULT_COLUMNS } from '../../../../common/mobile/fields';
import { mobilePanelQuery, type MobilePanelFilters } from '../../../../common/mobile/filters';
import type { FacetBucket } from '../../../../common/sessions';
import type { MobileCrashGroup } from '../../../../common/types/mobile';
import { runEsql, timeFilter } from '../../../lib/esql';
import { withLatestReleases } from '../../../lib/mobile/queries';
import { toRelease } from '../../../lib/mobile/rows';

const DAY_MS = 24 * 60 * 60 * 1000;

interface LatestReleaseRow {
  [RESULT_COLUMNS.latestRelease]?: string | null;
}

export interface GetCrashGroupsParams {
  esClient: TracedElasticsearchClient;
  filters: MobilePanelFilters;
  start: number;
  end: number;
  environment?: string;
}

const toCrashGroup = (
  row: CrashGroupRow,
  history: CrashGroupHistoryRow | undefined,
  newInRelease: string | null
): MobileCrashGroup => ({
  fingerprint: row[RESULT_COLUMNS.fingerprint],
  type: row[RESULT_COLUMNS.exceptionType] ?? null,
  message: row[RESULT_COLUMNS.message] ?? null,
  users: row[RESULT_COLUMNS.users],
  events: row[RESULT_COLUMNS.events],
  sessions: row[RESULT_COLUMNS.sessions],
  // The lookback reaches at least as far back as the range, on every release.
  firstSeen: history
    ? {
        time: history[RESULT_COLUMNS.firstSeen],
        release: history[RESULT_COLUMNS.firstRelease] ?? null,
      }
    : { time: row[RESULT_COLUMNS.firstSeen], release: row[RESULT_COLUMNS.firstRelease] ?? null },
  lastSeen: {
    time: row[RESULT_COLUMNS.lastSeen],
    release: row[RESULT_COLUMNS.lastRelease] ?? null,
  },
  newInRelease,
});

/**
 * An application's crash groups in the range, the most affected users first. Each group's first
 * crash is looked for in the lookback, and the group is marked new when only the newest release
 * crashed that way in it, whatever the release filter. Groups of EDOT iOS reports are never marked
 * new: their fingerprint changes with every build.
 */
export const getCrashGroups = async ({
  esClient,
  filters,
  start,
  end,
  environment,
}: GetCrashGroupsParams): Promise<MobileCrashGroup[]> => {
  const rows = await runEsql<CrashGroupRow>(
    esClient,
    'get_mobile_crash_groups',
    withCrashGroupStats(withCrashFingerprint(crashEvents({ ...filters, start, end }))),
    timeFilter(start, end + CRASH_DELAY_MS, environment)
  );
  if (rows.length === 0) {
    return [];
  }

  // A group the newest release brought can't be told apart on that release alone.
  const allReleases = omit(filters, 'release');
  // The whole range too, so a group the range shows on an older release is never new.
  const lookbackStart = Math.min(start, end - CRASH_NEW_LOOKBACK_DAYS * DAY_MS);
  const [historyRows, [latest]] = await Promise.all([
    runEsql<CrashGroupHistoryRow>(
      esClient,
      'get_mobile_crash_group_history',
      withCrashGroupHistory(
        withCrashFingerprint(
          // Only the crashes that can be in the listed groups are fingerprinted, over 30 days.
          withCrashTypes(
            crashEvents({ ...allReleases, start: lookbackStart, end }),
            rows.map((row) => row[RESULT_COLUMNS.exceptionType] ?? null)
          )
        ),
        rows.map((row) => row[RESULT_COLUMNS.fingerprint])
      ),
      timeFilter(lookbackStart, end + CRASH_DELAY_MS, environment)
    ),
    runEsql<LatestReleaseRow>(
      esClient,
      'get_mobile_latest_release',
      withLatestReleases(mobilePanelQuery(allReleases)),
      timeFilter(lookbackStart, end, environment)
    ),
  ]);

  const latestRelease = latest?.[RESULT_COLUMNS.latestRelease] ?? null;
  const historyByFingerprint = new Map(
    historyRows.map((row) => [row[RESULT_COLUMNS.fingerprint], row])
  );
  return rows.map((row) => {
    const history = historyByFingerprint.get(row[RESULT_COLUMNS.fingerprint]);
    const releases = castArray(history?.[RESULT_COLUMNS.releases] ?? []);
    // An EDOT iOS report's fingerprint has offsets that change with every build, so each build's
    // crashes would look new; those groups get no badge until frames are readable (#75).
    const isNew =
      !row[RESULT_COLUMNS.iosReports] &&
      latestRelease !== null &&
      releases.length === 1 &&
      releases[0] === latestRelease;
    return toCrashGroup(row, history, isNew ? latestRelease : null);
  });
};

/**
 * The releases that crashed in the range, whatever the release filter, most crashes first: what
 * the Crashes tab's release picker lists, as its filter is on the release that crashed.
 */
export const getCrashReleases = async ({
  esClient,
  filters,
  start,
  end,
  environment,
}: GetCrashGroupsParams): Promise<FacetBucket[]> => {
  const rows = await runEsql<CrashReleaseRow>(
    esClient,
    'get_mobile_crash_releases',
    withCrashReleaseCounts(crashEvents({ ...omit(filters, 'release'), start, end })),
    timeFilter(start, end + CRASH_DELAY_MS, environment)
  );
  return rows.flatMap((row) => {
    const release = toRelease(row[RESULT_COLUMNS.release]);
    return release ? [{ key: release, count: row[RESULT_COLUMNS.events] }] : [];
  });
};
