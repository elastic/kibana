/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import {
  EXCEPTIONS_METRIC,
  MOBILE_FIELDS,
  SESSIONS_METRIC,
  USERS_METRIC,
  getMobileTimeBucket,
  getPreviousPeriod,
  mobilePanelDiscoverEsql,
  mobilePanelEsql,
  mobileStats,
  toComparedValue,
} from '../../../common/mobile_panel';
import type { MobilePanelFilters } from '../../../common/mobile_panel';
import type { MobileKpisResponse } from '../../../common/types/mobile';
import { getMappedMobileFields, hasMobileData, runEsql, timeFilter } from '../../lib/mobile/esql';
import { environmentsCommands, releasesCommands } from '../../lib/mobile/queries';
import {
  rankReleases,
  toEnvironments,
  toNumber,
  toPlatforms,
  toRelease,
} from '../../lib/mobile/rows';
import type { EsqlRow } from '../../services/sessions/summary_documents';

export interface GetMobileKpisParams {
  esClient: ElasticsearchClient;
  filters: MobilePanelFilters;
  start: number;
  end: number;
  environment?: string;
  signal?: AbortSignal;
}

/** Distinct raw versions listed for the release picker. */
const MAX_RELEASE_ROWS = 1000;

const errorRateOf = (row: EsqlRow | undefined): number | null =>
  row && toNumber(row.sessions) > 0 ? toNumber(row.exceptions) / toNumber(row.sessions) : null;

const countOf = (row: EsqlRow | undefined, field: 'sessions' | 'users'): number | null =>
  row ? toNumber(row[field]) : null;

/** The KPI row of an application: the period's values against the period of equal length before. */
export const getMobileKpis = async ({
  esClient,
  filters,
  start,
  end,
  environment,
  signal,
}: GetMobileKpisParams): Promise<MobileKpisResponse> => {
  const mapped = await getMappedMobileFields(esClient, signal);
  const previous = getPreviousPeriod(start, end);
  const bucket = getMobileTimeBucket(start, end);
  const esql = mobilePanelDiscoverEsql(filters, mapped, { bucket, environment });
  if (!hasMobileData(mapped)) {
    const noValue = toComparedValue(null, null);
    return {
      hasData: false,
      sessions: noValue,
      users: noValue,
      crashFreeSessions: noValue,
      errorRate: noValue,
      platforms: [],
      releases: [],
      environments: [],
      bucket,
      esql,
    };
  }

  const { platform, release, ...application } = filters;
  const statsQuery = mobilePanelEsql(
    filters,
    mapped,
    mobileStats([SESSIONS_METRIC, USERS_METRIC, EXCEPTIONS_METRIC], mapped)
  );
  // The pickers list what the application reported, whatever the platform and release filters.
  const releaseCommands = releasesCommands(mapped, { limit: MAX_RELEASE_ROWS });
  const releasesQuery = releaseCommands && mobilePanelEsql(application, mapped, releaseCommands);
  const platformsQuery = mobilePanelEsql(application, mapped, [
    `STATS docs = COUNT(*) BY ${MOBILE_FIELDS.sdkName}`,
  ]);
  const environmentsQuery = mobilePanelEsql(application, mapped, environmentsCommands(mapped));

  const [[current], [before], releaseRows, platformRows, environmentRows] = await Promise.all([
    runEsql(esClient, statsQuery, timeFilter(start, end, environment), signal),
    runEsql(esClient, statsQuery, timeFilter(previous.start, previous.end, environment), signal),
    releasesQuery
      ? runEsql(esClient, releasesQuery, timeFilter(start, end, environment), signal)
      : Promise.resolve([]),
    runEsql(esClient, platformsQuery, timeFilter(start, end, environment), signal),
    runEsql(esClient, environmentsQuery, timeFilter(start, end, undefined), signal),
  ]);

  return {
    hasData: toNumber(current?.docs) > 0,
    sessions: toComparedValue(countOf(current, 'sessions'), countOf(before, 'sessions')),
    users: toComparedValue(countOf(current, 'users'), countOf(before, 'users')),
    // A crash isn't defined yet (#64) and session start doesn't reach the SDKs: not enough data.
    crashFreeSessions: toComparedValue(null, null),
    errorRate: toComparedValue(errorRateOf(current), errorRateOf(before)),
    platforms: toPlatforms(platformRows.map((row) => row[MOBILE_FIELDS.sdkName])),
    releases: rankReleases(releaseRows.map(toRelease)),
    environments: toEnvironments(environmentRows, mapped),
    bucket,
    esql,
  };
};
