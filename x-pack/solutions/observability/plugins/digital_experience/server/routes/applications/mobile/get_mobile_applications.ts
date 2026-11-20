/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { withSpan } from '@kbn/apm-utils';
import type { TracedElasticsearchClient } from '@kbn/traced-es-client';
import type { RESULT_COLUMNS } from '../../../../common/mobile/fields';
import { MOBILE_FIELDS } from '../../../../common/mobile/fields';
import { runMobileEsql, timeFilter } from '../../../lib/mobile/esql';
import { toEnvironments } from '../../../lib/mobile/rows';
import type { EnvironmentRow } from '../../../lib/mobile/rows';
import { MOBILE_SEARCH_SPAN_NAME } from '../constants';
import type { SourceApplications } from '../types';
import { applicationsQuery, environmentsQuery, latestReleasesQuery } from './queries';
import { toApplication } from './to_application';
import type { MobileApplicationRow } from './to_application';

const DAY_MS = 24 * 60 * 60 * 1000;

interface LatestReleaseRow {
  [MOBILE_FIELDS.serviceName]: string;
  [RESULT_COLUMNS.latestRelease]: string | null;
}

export interface GetMobileApplicationsParams {
  esClient: TracedElasticsearchClient;
  start: number;
  end: number;
  /** Only this environment's data when set. */
  environment?: string;
}

const searchMobileApplications = async ({
  esClient,
  start,
  end,
  environment,
}: GetMobileApplicationsParams): Promise<SourceApplications> => {
  const [applicationRows, environmentRows] = await Promise.all([
    runMobileEsql<MobileApplicationRow>(
      esClient,
      'get_mobile_applications',
      applicationsQuery(),
      timeFilter(start, end, environment)
    ),
    runMobileEsql<EnvironmentRow>(
      esClient,
      'get_mobile_environments',
      environmentsQuery(),
      timeFilter(start, end, undefined)
    ),
  ]);

  // Only for the listed applications, so each gets its latest release whatever the cap; that of
  // the last 24 hours of the range.
  const serviceNames = applicationRows.map((row) => row[MOBILE_FIELDS.serviceName]);
  const releaseRows =
    serviceNames.length > 0
      ? await runMobileEsql<LatestReleaseRow>(
          esClient,
          'get_mobile_latest_releases',
          latestReleasesQuery(serviceNames),
          timeFilter(Math.max(start, end - DAY_MS), end, environment)
        )
      : [];
  const latestByApplication = new Map(
    releaseRows.map((row) => [row[MOBILE_FIELDS.serviceName], row.latest_release ?? null])
  );

  return {
    applications: applicationRows.map((row) =>
      toApplication(row, {
        environments: [],
        latest: latestByApplication.get(row[MOBILE_FIELDS.serviceName]) ?? null,
      })
    ),
    environments: toEnvironments(environmentRows),
  };
};

/** EDOT Android and iOS applications (`telemetry.sdk.name` `android` or `iOS`) with their metrics. */
export const getMobileApplications = (
  params: GetMobileApplicationsParams
): Promise<SourceApplications> =>
  withSpan(MOBILE_SEARCH_SPAN_NAME, () => searchMobileApplications(params));
