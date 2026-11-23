/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { compact } from 'lodash';
import type { TracedElasticsearchClient } from '@kbn/traced-es-client';
import { mobilePanelDiscoverEsql } from '../../../common/mobile/discover';
import { RESULT_COLUMNS } from '../../../common/mobile/fields';
import { mobilePanelQuery, type MobilePanelFilters } from '../../../common/mobile/filters';
import {
  getPreviousPeriod,
  toComparedValue,
  withKpiStats,
  type KpiRow,
} from '../../../common/mobile/kpis';
import type { MobileKpisResponse } from '../../../common/types/mobile';
import { runEsql, timeFilter } from '../../lib/esql';
import { withEnvironmentCounts, withOsCounts, withReleaseCounts } from '../../lib/mobile/queries';
import { toEnvironments, toOsNames, toPlatforms, toReleases } from '../../lib/mobile/rows';
import type { EnvironmentRow, OsRow, ReleaseRow } from '../../lib/mobile/rows';

export interface GetMobileKpisParams {
  esClient: TracedElasticsearchClient;
  filters: MobilePanelFilters;
  start: number;
  end: number;
  environment?: string;
}

/** Releases listed in the release picker. */
const MAX_RELEASE_ROWS = 1000;

/** A KPI of the row; `null` without data, when the row or its column is missing. */
const kpiOf = (row: KpiRow | undefined, column: keyof KpiRow): number | null =>
  row?.[column] ?? null;

const errorRateOf = (row: KpiRow | undefined): number | null => {
  const sessions = kpiOf(row, RESULT_COLUMNS.sessions);
  return sessions ? (kpiOf(row, RESULT_COLUMNS.exceptions) ?? 0) / sessions : null;
};

/**
 * The KPI row of an application: the period's values against the period of equal length before.
 * The route adds whether the user reads every index.
 */
export const getMobileKpis = async ({
  esClient,
  filters,
  start,
  end,
  environment,
}: GetMobileKpisParams): Promise<Omit<MobileKpisResponse, 'isPartial'>> => {
  const previous = getPreviousPeriod(start, end);
  const { release, osName, ...application } = filters;
  const statsQuery = withKpiStats(mobilePanelQuery(filters));

  // The pickers list what the application reported, whatever their own filter: the releases on the
  // selected OS, the OS names on any release.
  const [[current], [before], releaseRows, osRows, environmentRows] = await Promise.all([
    runEsql<KpiRow>(esClient, 'get_mobile_kpis', statsQuery, timeFilter(start, end, environment)),
    runEsql<KpiRow>(
      esClient,
      'get_mobile_kpis_previous',
      statsQuery,
      timeFilter(previous.start, previous.end, environment)
    ),
    runEsql<ReleaseRow>(
      esClient,
      'get_mobile_releases',
      withReleaseCounts(mobilePanelQuery({ ...application, osName }), MAX_RELEASE_ROWS),
      timeFilter(start, end, environment)
    ),
    runEsql<OsRow>(
      esClient,
      'get_mobile_os_names',
      withOsCounts(mobilePanelQuery(application)),
      timeFilter(start, end, environment)
    ),
    runEsql<EnvironmentRow>(
      esClient,
      'get_mobile_application_environments',
      withEnvironmentCounts(mobilePanelQuery(application)),
      timeFilter(start, end, undefined)
    ),
  ]);

  return {
    hasData: (kpiOf(current, RESULT_COLUMNS.docs) ?? 0) > 0,
    sessions: toComparedValue(
      kpiOf(current, RESULT_COLUMNS.sessions),
      kpiOf(before, RESULT_COLUMNS.sessions)
    ),
    users: toComparedValue(
      kpiOf(current, RESULT_COLUMNS.users),
      kpiOf(before, RESULT_COLUMNS.users)
    ),
    errorRate: toComparedValue(errorRateOf(current), errorRateOf(before)),
    releases: toReleases(releaseRows),
    osNames: toOsNames(osRows),
    platforms: toPlatforms(
      compact(osRows.map(({ [RESULT_COLUMNS.platform]: platform }) => platform))
    ),
    environments: toEnvironments(environmentRows),
    esql: mobilePanelDiscoverEsql(filters, { environment }),
  };
};
