/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import {
  MOBILE_FIELDS,
  MOBILE_KPI_STATS,
  createParamValues,
  getMobileTimeBucket,
  getPreviousPeriod,
  mobilePanelDiscoverEsql,
  mobilePanelEsql,
  toComparedValue,
} from '../../../common/mobile_panel';
import type { EsqlQuery, MobilePanelFilters } from '../../../common/mobile_panel';
import type { MobileKpisResponse } from '../../../common/types/mobile';
import { runEsql, timeFilter } from '../../lib/mobile/esql';
import { environmentsCommands, releasesCommands } from '../../lib/mobile/queries';
import { toEnvironments, toNumber, toPlatforms, toReleases } from '../../lib/mobile/rows';
import type { EsqlRow } from '../../services/sessions/summary_documents';

export interface GetMobileKpisParams {
  esClient: ElasticsearchClient;
  filters: MobilePanelFilters;
  start: number;
  end: number;
  environment?: string;
  signal?: AbortSignal;
}

/** Releases listed in the release picker. */
const MAX_RELEASE_ROWS = 1000;

/** A panel query over `filters`, its values as params. */
const panelQuery = (filters: MobilePanelFilters, commands: string[]): EsqlQuery => {
  const values = createParamValues();
  return { query: mobilePanelEsql(filters, values, commands), params: values.params };
};

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
  const previous = getPreviousPeriod(start, end);
  const bucket = getMobileTimeBucket(start, end);
  const { platform, release, ...application } = filters;
  const statsQuery = panelQuery(filters, [MOBILE_KPI_STATS]);
  // The pickers list what the application reported, whatever the platform and release filters.
  const releasesQuery = panelQuery(application, releasesCommands(MAX_RELEASE_ROWS));
  const platformsQuery = panelQuery(application, [
    `STATS docs = COUNT(*) BY ${MOBILE_FIELDS.sdkName}`,
  ]);
  const environmentsQuery = panelQuery(application, environmentsCommands());

  const [[current], [before], releaseRows, platformRows, environmentRows] = await Promise.all([
    runEsql(esClient, statsQuery, timeFilter(start, end, environment), signal),
    runEsql(esClient, statsQuery, timeFilter(previous.start, previous.end, environment), signal),
    runEsql(esClient, releasesQuery, timeFilter(start, end, environment), signal),
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
    releases: toReleases(releaseRows),
    environments: toEnvironments(environmentRows),
    bucket,
    esql: mobilePanelDiscoverEsql(filters, { bucket, environment }),
  };
};
