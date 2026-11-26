/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sumBy } from 'lodash';
import type { TracedElasticsearchClient } from '@kbn/traced-es-client';
import {
  CRASH_BREAKDOWN_TOP,
  CRASH_DELAY_MS,
  crashEvents,
  withCrashBreakdown,
  withCrashFingerprint,
  withCrashGroup,
  withCrashTypes,
  withLatestCrash,
  type CrashBreakdownName,
  type CrashBreakdownRow,
  type LatestCrashRow,
} from '../../../../common/mobile/crash_groups';
import { MOBILE_FIELDS, RESULT_COLUMNS } from '../../../../common/mobile/fields';
import type { MobilePanelFilters } from '../../../../common/mobile/filters';
import {
  SESSION_EVENTS_BEFORE_CRASH,
  sessionEventsBefore,
  type SessionEventRow,
} from '../../../../common/mobile/session_events';
import { SESSIONS_MAX_SESSION_MS, type SessionTimelineEvent } from '../../../../common/sessions';
import type {
  CrashBreakdown,
  MobileCrash,
  MobileCrashGroupDetailResponse,
} from '../../../../common/types/mobile';
import { runEsql, timeFilter } from '../../../lib/esql';

export interface GetCrashGroupParams {
  esClient: TracedElasticsearchClient;
  filters: MobilePanelFilters;
  fingerprint: string;
  start: number;
  end: number;
  environment?: string;
}

const toBreakdown = (rows: CrashBreakdownRow[]): CrashBreakdown => {
  const top = rows
    // A missing or empty value is counted in "Other", not shown as a blank one.
    .filter((row) => row[RESULT_COLUMNS.value] != null && row[RESULT_COLUMNS.value] !== '')
    .slice(0, CRASH_BREAKDOWN_TOP)
    .map((row) => ({ key: String(row[RESULT_COLUMNS.value]), count: row[RESULT_COLUMNS.count] }));
  const total = rows[0]?.[RESULT_COLUMNS.total] ?? 0;
  return { top, other: total - sumBy(top, ({ count }) => count) };
};

const toCrash = (row: LatestCrashRow): MobileCrash => ({
  time: row[RESULT_COLUMNS.crashTime],
  reportedAt: row[RESULT_COLUMNS.reportedAt],
  type: row[RESULT_COLUMNS.exceptionType] ?? null,
  message: row[RESULT_COLUMNS.message] ?? null,
  stacktrace: row[RESULT_COLUMNS.stacktrace] ?? null,
  release: row[RESULT_COLUMNS.release] ?? null,
  osVersion: row[RESULT_COLUMNS.osVersion] ?? null,
  deviceModel: row[RESULT_COLUMNS.deviceModel] ?? null,
  sessionId: row[RESULT_COLUMNS.sessionId] ?? null,
});

/** A session event as the browser's timeline has it, offset from the first one listed. */
const toTimelineEvent = (row: SessionEventRow, firstMs: number): SessionTimelineEvent => ({
  kind: row[RESULT_COLUMNS.eventKind],
  name: row[RESULT_COLUMNS.name],
  timestamp: row['@timestamp'],
  offsetMs: Math.max(0, Date.parse(row['@timestamp']) - firstMs),
  page: row[RESULT_COLUMNS.page] ?? null,
  detail: row[RESULT_COLUMNS.detail] ?? null,
  // A browser's rage clicks; mobile taps are listed one by one.
  clickCount: null,
  stacktrace: row[RESULT_COLUMNS.stacktrace] ?? null,
  traceId: row[MOBILE_FIELDS.traceId] ?? null,
  spanId: row[MOBILE_FIELDS.spanId] ?? null,
  statusCode: row[RESULT_COLUMNS.statusCode] ?? null,
  durationMs: row[RESULT_COLUMNS.durationMs] ?? null,
});

/** The session events before a crash, oldest first. */
const getEventsBefore = async (
  esClient: TracedElasticsearchClient,
  serviceName: string,
  { sessionId, time }: MobileCrash
): Promise<SessionTimelineEvent[]> => {
  if (!sessionId) {
    return [];
  }
  const crashMs = Date.parse(time);
  const rows = await runEsql<SessionEventRow>(
    esClient,
    'get_mobile_crash_session_events',
    sessionEventsBefore({
      serviceName,
      sessionId,
      before: time,
      limit: SESSION_EVENTS_BEFORE_CRASH,
    }),
    timeFilter(crashMs - SESSIONS_MAX_SESSION_MS, crashMs, undefined)
  );
  const oldestFirst = [...rows].reverse();
  const firstMs = oldestFirst.length > 0 ? Date.parse(oldestFirst[0]['@timestamp']) : 0;
  return oldestFirst.map((row) => toTimelineEvent(row, firstMs));
};

/**
 * A crash group's detail in the range and filters: its latest crash, its crashes by release, OS
 * version and device model, and what the latest crash's session did before it.
 */
export const getCrashGroup = async ({
  esClient,
  filters,
  fingerprint,
  start,
  end,
  environment,
}: GetCrashGroupParams): Promise<Omit<MobileCrashGroupDetailResponse, 'isPartial'>> => {
  // `pipe` appends to the query it's called on, so each query starts from its own.
  const groupCrashes = (types?: ReadonlyArray<string | null>) => {
    const crashes = crashEvents({ ...filters, start, end });
    return withCrashGroup(
      withCrashFingerprint(types ? withCrashTypes(crashes, types) : crashes),
      fingerprint
    );
  };
  const filter = timeFilter(start, end + CRASH_DELAY_MS, environment);
  const [latestRow] = await runEsql<LatestCrashRow>(
    esClient,
    'get_mobile_crash_group_latest',
    withLatestCrash(groupCrashes()),
    filter
  );
  if (!latestRow) {
    const none: CrashBreakdown = { top: [], other: 0 };
    return {
      latestCrash: null,
      releases: none,
      osVersions: none,
      deviceModels: none,
      beforeCrash: [],
    };
  }
  const latestCrash = toCrash(latestRow);
  // The group's computed crashes have the latest one's type when its fingerprint was computed too,
  // so the breakdowns only fingerprint the crashes of that type, and the stored ones.
  const types = latestRow[RESULT_COLUMNS.storedFingerprint] ? undefined : [latestCrash.type];
  const breakdown = (name: CrashBreakdownName) =>
    runEsql<CrashBreakdownRow>(
      esClient,
      `get_mobile_crash_group_${name}`,
      withCrashBreakdown(groupCrashes(types), name),
      filter
    ).then(toBreakdown);

  const [releases, osVersions, deviceModels, beforeCrash] = await Promise.all([
    breakdown('releases'),
    breakdown('osVersions'),
    breakdown('deviceModels'),
    getEventsBefore(esClient, filters.serviceName, latestCrash),
  ]);
  return { latestCrash, releases, osVersions, deviceModels, beforeCrash };
};
