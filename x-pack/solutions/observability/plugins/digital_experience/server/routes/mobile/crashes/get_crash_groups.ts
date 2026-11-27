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
  const lookbackCrashes = crashEvents({ ...allReleases, start: lookbackStart, end });
  // Only the crashes that can be in the listed groups are fingerprinted, over 30 days, unless a
  // group has a stored fingerprint: its type need not be its computed crashes'.
  const hasStoredFingerprints = rows.some((row) => row[RESULT_COLUMNS.storedFingerprints]);
  const historyRows = await runEsql<CrashGroupHistoryRow>(
    esClient,
    'get_mobile_crash_group_history',
    withCrashGroupHistory(
      withCrashFingerprint(
        hasStoredFingerprints
          ? lookbackCrashes
          : withCrashTypes(
              lookbackCrashes,
              rows.map((row) => row[RESULT_COLUMNS.exceptionType] ?? null)
            )
      ),
      rows.map((row) => row[RESULT_COLUMNS.fingerprint])
    ),
    timeFilter(lookbackStart, end + CRASH_DELAY_MS, environment)
  );
  const historyByFingerprint = new Map(
    historyRows.map((row) => [row[RESULT_COLUMNS.fingerprint], row])
  );
  // The one release a group crashed on in the lookback, when it can be new: an EDOT iOS report's
  // fingerprint has offsets that change with every build, so each build's crashes would look new
  // (#75), and a crash without a release could have been on an older one.
  const onlyReleaseOf = (row: CrashGroupRow): string | null => {
    const history = historyByFingerprint.get(row[RESULT_COLUMNS.fingerprint]);
    const releases = castArray(history?.[RESULT_COLUMNS.releases] ?? []);
    return !row[RESULT_COLUMNS.iosReports] &&
      !history?.[RESULT_COLUMNS.iosReports] &&
      !history?.[RESULT_COLUMNS.unversioned] &&
      releases.length === 1
      ? releases[0]
      : null;
  };

  // The newest release reads 30 days of every document, so only when a group can be new.
  const [latest] = rows.some((row) => onlyReleaseOf(row) !== null)
    ? await runEsql<LatestReleaseRow>(
        esClient,
        'get_mobile_latest_release',
        withLatestReleases(mobilePanelQuery(allReleases)),
        timeFilter(lookbackStart, end, environment)
      )
    : [];
  const latestRelease = latest?.[RESULT_COLUMNS.latestRelease] ?? null;
  return rows.map((row) => {
    const isNew = latestRelease !== null && onlyReleaseOf(row) === latestRelease;
    return toCrashGroup(
      row,
      historyByFingerprint.get(row[RESULT_COLUMNS.fingerprint]),
      isNew ? latestRelease : null
    );
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
