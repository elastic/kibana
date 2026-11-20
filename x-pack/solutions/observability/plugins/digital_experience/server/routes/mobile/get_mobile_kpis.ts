/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TracedElasticsearchClient } from '@kbn/traced-es-client';
import {
  getMobileTimeBucket,
  getPreviousPeriod,
  mobilePanelDiscoverEsql,
  mobilePanelQuery,
  toComparedValue,
  withKpiStats,
} from '../../../common/mobile_panel';
import type { MobilePanelFilters } from '../../../common/mobile_panel';
import type { MobileKpisResponse } from '../../../common/types/mobile';
import { runMobileEsql, timeFilter } from '../../lib/mobile/esql';
import { withEnvironmentCounts, withReleaseCounts } from '../../lib/mobile/queries';
import { toEnvironments, toReleases } from '../../lib/mobile/rows';
import type { EnvironmentRow, ReleaseRow } from '../../lib/mobile/rows';

export interface GetMobileKpisParams {
  esClient: TracedElasticsearchClient;
  filters: MobilePanelFilters;
  start: number;
  end: number;
  environment?: string;
}

/** Releases listed in the release picker. */
const MAX_RELEASE_ROWS = 1000;

interface KpiRow {
  docs: number;
  sessions: number;
  users: number;
  exceptions: number;
}

const errorRateOf = (row: KpiRow | undefined): number | null =>
  row?.sessions ? (row.exceptions ?? 0) / row.sessions : null;

/** The KPI row of an application: the period's values against the period of equal length before. */
export const getMobileKpis = async ({
  esClient,
  filters,
  start,
  end,
  environment,
}: GetMobileKpisParams): Promise<MobileKpisResponse> => {
  const previous = getPreviousPeriod(start, end);
  const bucket = getMobileTimeBucket(start, end);
  const { release, ...application } = filters;
  const statsQuery = withKpiStats(mobilePanelQuery(filters));

  // The pickers list what the application reported on the platform, whatever the release filter.
  const [[current], [before], releaseRows, environmentRows] = await Promise.all([
    runMobileEsql<KpiRow>(
      esClient,
      'get_mobile_kpis',
      statsQuery,
      timeFilter(start, end, environment)
    ),
    runMobileEsql<KpiRow>(
      esClient,
      'get_mobile_kpis_previous',
      statsQuery,
      timeFilter(previous.start, previous.end, environment)
    ),
    runMobileEsql<ReleaseRow>(
      esClient,
      'get_mobile_releases',
      withReleaseCounts(mobilePanelQuery(application), MAX_RELEASE_ROWS),
      timeFilter(start, end, environment)
    ),
    runMobileEsql<EnvironmentRow>(
      esClient,
      'get_mobile_application_environments',
      withEnvironmentCounts(mobilePanelQuery(application)),
      timeFilter(start, end, undefined)
    ),
  ]);

  return {
    hasData: (current?.docs ?? 0) > 0,
    sessions: toComparedValue(current?.sessions ?? null, before?.sessions ?? null),
    users: toComparedValue(current?.users ?? null, before?.users ?? null),
    // A crash isn't defined yet (#64) and session start doesn't reach the SDKs: not enough data.
    crashFreeSessions: toComparedValue(null, null),
    errorRate: toComparedValue(errorRateOf(current), errorRateOf(before)),
    releases: toReleases(releaseRows),
    environments: toEnvironments(environmentRows),
    bucket,
    esql: mobilePanelDiscoverEsql(filters, { bucket, environment }),
  };
};
