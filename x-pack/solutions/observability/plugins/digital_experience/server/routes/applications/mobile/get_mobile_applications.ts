/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { withSpan } from '@kbn/apm-utils';
import type { ElasticsearchClient } from '@kbn/core/server';
import { MOBILE_FIELDS } from '../../../../common/mobile_panel';
import { runEsql, timeFilter } from '../../../lib/mobile/esql';
import { toEnvironments } from '../../../lib/mobile/rows';
import { SEARCH_SPAN_NAMES } from '../constants';
import type { SourceApplications } from '../types';
import { applicationsQuery, environmentsQuery, latestReleasesQuery } from './queries';
import { toApplication } from './to_application';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface GetMobileApplicationsParams {
  esClient: ElasticsearchClient;
  start: number;
  end: number;
  /** Only this environment's data when set. */
  environment?: string;
  signal?: AbortSignal;
}

const searchMobileApplications = async ({
  esClient,
  start,
  end,
  environment,
  signal,
}: GetMobileApplicationsParams): Promise<SourceApplications> => {
  const [applicationRows, environmentRows] = await Promise.all([
    runEsql(esClient, applicationsQuery(), timeFilter(start, end, environment), signal),
    runEsql(esClient, environmentsQuery(), timeFilter(start, end, undefined), signal),
  ]);

  // Only for the listed applications, so each gets its latest release whatever the cap; that of
  // the last 24 hours of the range.
  const serviceNames = applicationRows.map((row) => String(row[MOBILE_FIELDS.serviceName]));
  const releaseRows =
    serviceNames.length > 0
      ? await runEsql(
          esClient,
          latestReleasesQuery(serviceNames),
          timeFilter(Math.max(start, end - DAY_MS), end, environment),
          signal
        )
      : [];
  const latestByService = new Map(
    releaseRows.map((row) => [String(row[MOBILE_FIELDS.serviceName]), row.latest_release])
  );

  return {
    applications: applicationRows.map((row) => {
      const latest = latestByService.get(String(row[MOBILE_FIELDS.serviceName]));
      return toApplication(row, {
        environments: [],
        latest: typeof latest === 'string' ? latest : null,
      });
    }),
    environments: toEnvironments(environmentRows),
  };
};

/** EDOT Android and iOS applications (`telemetry.sdk.name` `android` or `iOS`) with their metrics. */
export const getMobileApplications = (
  params: GetMobileApplicationsParams
): Promise<SourceApplications> =>
  withSpan(SEARCH_SPAN_NAMES.mobile, () => searchMobileApplications(params));
