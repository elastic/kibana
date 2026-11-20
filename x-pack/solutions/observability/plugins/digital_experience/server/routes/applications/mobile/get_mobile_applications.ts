/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { withSpan } from '@kbn/apm-utils';
import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';
import { environmentFilter } from '../../../lib/helpers/environment';
import { ENVIRONMENT_FIELDS } from '../../../lib/otel/queries';
import { toEsqlRows } from '../../../services/sessions/summary_documents';
import type { EsqlRow } from '../../../services/sessions/summary_documents';
import { SEARCH_SPAN_NAMES } from '../constants';
import type { SourceApplications } from '../types';
import { applicationsQuery, environmentsQuery, releasesQuery } from './queries';
import { latestRelease, toApplication } from './to_application';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface GetMobileApplicationsParams {
  esClient: ElasticsearchClient;
  start: number;
  end: number;
  /** Only this environment's data when set. */
  environment?: string;
  signal?: AbortSignal;
}

const MISSING_DATA = /Unknown (index|column)/;

/**
 * Whether ES|QL rejected the query because no readable index exists or maps a field it reads, e.g.
 * a cluster without mobile data; unlike a search, which answers with nothing.
 */
export const isMissingDataError = (error: unknown): boolean => {
  const { type, reason } =
    (error as { meta?: { body?: { error?: { type?: string; reason?: string } } } })?.meta?.body
      ?.error ?? {};
  return type === 'verification_exception' && MISSING_DATA.test(reason ?? '');
};

/** The rows of an ES|QL query, none when there is no data to read it from. */
export const runEsql = async (
  esClient: ElasticsearchClient,
  query: string,
  filter: estypes.QueryDslQueryContainer,
  signal?: AbortSignal
): Promise<EsqlRow[]> => {
  try {
    return toEsqlRows(
      await esClient.esql.query({ query, filter, allow_partial_results: true }, { signal })
    );
  } catch (error) {
    if (isMissingDataError(error)) {
      return [];
    }
    throw error;
  }
};

export const timeFilter = (
  start: number,
  end: number,
  environment: string | undefined
): estypes.QueryDslQueryContainer => ({
  bool: {
    filter: [
      { range: { '@timestamp': { gte: start, lte: end, format: 'epoch_millis' } } },
      environmentFilter(ENVIRONMENT_FIELDS, environment),
    ],
  },
});

const searchMobileApplications = async ({
  esClient,
  start,
  end,
  environment,
  signal,
}: GetMobileApplicationsParams): Promise<SourceApplications> => {
  const filter = timeFilter(start, end, environment);
  // The latest release is the one of the last 24 hours of the range.
  const releasesFilter = timeFilter(Math.max(start, end - DAY_MS), end, environment);

  const [applicationRows, releaseRows, environmentRows] = await Promise.all([
    runEsql(esClient, applicationsQuery(), filter, signal),
    runEsql(esClient, releasesQuery(), releasesFilter, signal),
    runEsql(esClient, environmentsQuery(), timeFilter(start, end, undefined), signal),
  ]);

  const releasesByService = new Map<string, Array<{ version: string | null; sessions: number }>>();
  releaseRows.forEach((row) => {
    const serviceName = String(row['service.name']);
    const releases = releasesByService.get(serviceName) ?? [];
    releases.push({
      version: typeof row['service.version'] === 'string' ? row['service.version'] : null,
      sessions: typeof row.sessions === 'number' ? row.sessions : 0,
    });
    releasesByService.set(serviceName, releases);
  });

  return {
    applications: applicationRows.map((row) =>
      toApplication(row, {
        environments: [],
        latest: latestRelease(releasesByService.get(String(row['service.name'])) ?? []),
      })
    ),
    environments: environmentRows.flatMap((row) => {
      const name = row['service.environment'];
      return typeof name === 'string' ? [name] : [];
    }),
    pageLoadsOverTime: [],
    sessionsOverTime: null,
  };
};

/** EDOT Android and iOS applications (`telemetry.sdk.name` `android` or `iOS`) with their metrics. */
export const getMobileApplications = (
  params: GetMobileApplicationsParams
): Promise<SourceApplications> =>
  withSpan(SEARCH_SPAN_NAMES.mobile, () => searchMobileApplications(params));
