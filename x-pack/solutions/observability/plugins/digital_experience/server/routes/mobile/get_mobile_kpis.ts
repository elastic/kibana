/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import {
  MOBILE_KPI_STATS,
  getMobileTimeBucket,
  getPreviousPeriod,
  mobilePanelDiscoverEsql,
  mobilePanelEsql,
  toComparedValue,
} from '../../../common/mobile_panel';
import type { MobilePanelFilters } from '../../../common/mobile_panel';
import type { MobileKpisResponse } from '../../../common/types/mobile';
import { runEsql, timeFilter } from '../applications/mobile/get_mobile_applications';
import { normalizeVersion } from '../applications/mobile/normalize_version';
import { toPlatforms } from '../applications/mobile/to_application';

export interface GetMobileKpisParams {
  esClient: ElasticsearchClient;
  filters: MobilePanelFilters;
  start: number;
  end: number;
  environment?: string;
  signal?: AbortSignal;
}

const toNumber = (value: unknown): number => (typeof value === 'number' ? value : 0);

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
  const statsQuery = mobilePanelEsql(filters, [MOBILE_KPI_STATS]);
  // The pickers list what the application reported, whatever the platform and release filters.
  const optionsQuery = mobilePanelEsql(application, [
    'STATS sessions = COUNT_DISTINCT(attributes.session.id) BY service.version, resource.attributes.telemetry.sdk.name',
    'LIMIT 1000',
  ]);

  const environmentsQuery = mobilePanelEsql(application, [
    'STATS docs = COUNT(*) BY service.environment',
    'SORT docs DESC',
    'LIMIT 100',
  ]);

  const [[current], [before], optionRows, environmentRows] = await Promise.all([
    runEsql(esClient, statsQuery, timeFilter(start, end, environment), signal),
    runEsql(esClient, statsQuery, timeFilter(previous.start, previous.end, environment), signal),
    runEsql(esClient, optionsQuery, timeFilter(start, end, environment), signal),
    runEsql(esClient, environmentsQuery, timeFilter(start, end, undefined), signal),
  ]);

  const sessionsByRelease = new Map<string, number>();
  optionRows.forEach((row) => {
    const version = row['service.version'];
    if (typeof version === 'string' && normalizeVersion(version)) {
      const name = normalizeVersion(version);
      sessionsByRelease.set(name, (sessionsByRelease.get(name) ?? 0) + toNumber(row.sessions));
    }
  });

  const errorRateOf = (row: typeof current | undefined): number | null =>
    row && toNumber(row.sessions) > 0 ? toNumber(row.exceptions) / toNumber(row.sessions) : null;
  const countOf = (row: typeof current | undefined, field: 'sessions' | 'users'): number | null =>
    row ? toNumber(row[field]) : null;

  return {
    hasData: toNumber(current?.docs) > 0,
    sessions: toComparedValue(countOf(current, 'sessions'), countOf(before, 'sessions')),
    users: toComparedValue(countOf(current, 'users'), countOf(before, 'users')),
    // A crash isn't defined yet (#64) and session start doesn't reach the SDKs: not enough data.
    crashFreeSessions: toComparedValue(null, null),
    errorRate: toComparedValue(errorRateOf(current), errorRateOf(before)),
    platforms: toPlatforms(optionRows.map((row) => row['resource.attributes.telemetry.sdk.name'])),
    releases: [...sessionsByRelease].sort(([, a], [, b]) => b - a).map(([name]) => name),
    environments: environmentRows.flatMap((row) =>
      typeof row['service.environment'] === 'string' ? [row['service.environment']] : []
    ),
    bucket,
    esql: mobilePanelDiscoverEsql({ ...application, platform, release }, bucket, environment),
  };
};
