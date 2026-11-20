/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { withSpan } from '@kbn/apm-utils';
import type { ElasticsearchClient } from '@kbn/core/server';
import { MOBILE_FIELDS } from '../../../../common/mobile_panel';
import {
  getMappedMobileFields,
  hasMobileData,
  runEsql,
  timeFilter,
} from '../../../lib/mobile/esql';
import { latestRelease, toEnvironments, toRelease } from '../../../lib/mobile/rows';
import type { EsqlRow } from '../../../services/sessions/summary_documents';
import { SEARCH_SPAN_NAMES } from '../constants';
import type { SourceApplications } from '../types';
import { applicationsQuery, environmentsQuery, releasesQuery } from './queries';
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

const NO_APPLICATIONS: SourceApplications = { applications: [], environments: [] };

const searchMobileApplications = async ({
  esClient,
  start,
  end,
  environment,
  signal,
}: GetMobileApplicationsParams): Promise<SourceApplications> => {
  const mapped = await getMappedMobileFields(esClient, signal);
  if (!hasMobileData(mapped)) {
    return NO_APPLICATIONS;
  }
  const releases = releasesQuery(mapped);
  // The latest release is the one of the last 24 hours of the range.
  const releasesFilter = timeFilter(Math.max(start, end - DAY_MS), end, environment);

  const [applicationRows, releaseRows, environmentRows] = await Promise.all([
    runEsql(esClient, applicationsQuery(mapped), timeFilter(start, end, environment), signal),
    releases ? runEsql(esClient, releases, releasesFilter, signal) : Promise.resolve([]),
    runEsql(esClient, environmentsQuery(mapped), timeFilter(start, end, undefined), signal),
  ]);

  const releasesByService = new Map<string, EsqlRow[]>();
  releaseRows.forEach((row) => {
    const serviceName = String(row[MOBILE_FIELDS.serviceName]);
    releasesByService.set(serviceName, [...(releasesByService.get(serviceName) ?? []), row]);
  });

  return {
    applications: applicationRows.map((row) =>
      toApplication(row, {
        environments: [],
        latest: latestRelease(
          (releasesByService.get(String(row[MOBILE_FIELDS.serviceName])) ?? []).map(toRelease)
        ),
      })
    ),
    environments: toEnvironments(environmentRows, mapped),
  };
};

/** EDOT Android and iOS applications (`telemetry.sdk.name` `android` or `iOS`) with their metrics. */
export const getMobileApplications = (
  params: GetMobileApplicationsParams
): Promise<SourceApplications> =>
  withSpan(SEARCH_SPAN_NAMES.mobile, () => searchMobileApplications(params));
