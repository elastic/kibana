/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { withSpan } from '@kbn/apm-utils';
import type { ElasticsearchClient } from '@kbn/core/server';
import { toTimeSeries } from '../../../lib/helpers/time_series';
import { pickerEnvironments } from '../../../lib/otel/environments';
import { SEARCH_SPAN_NAMES } from '../constants';
import type { SourceApplications } from '../types';
import type { SearchParams } from './search_requests';
import { logsSearch, spansSearch } from './search_requests';
import type { LogsAggregations, SpansAggregations } from './search_responses';
import { toApplication } from './to_application';

export interface GetOtelApplicationsParams extends SearchParams {
  esClient: ElasticsearchClient;
  /** Cancels the searches, e.g. when the HTTP request is aborted. */
  signal?: AbortSignal;
}

const searchOtelApplications = async ({
  esClient,
  signal,
  ...searchParams
}: GetOtelApplicationsParams): Promise<SourceApplications> => {
  // Not in parallel: the logs search caps its applications, and the spans search reads those by name
  // and fills the rest of the cap with the applications that only have HTTP requests.
  const logsResponse = await esClient.search(logsSearch(searchParams), { signal });
  const logs = logsResponse.aggregations as unknown as LogsAggregations | undefined;
  const logsBuckets = logs?.inEnvironment.applications.buckets ?? [];

  const spansResponse = await esClient.search(
    spansSearch({ ...searchParams, serviceNames: logsBuckets.map(({ key }) => key) }),
    { signal }
  );
  const spans = spansResponse.aggregations as unknown as SpansAggregations | undefined;

  const spansByService = new Map(
    (spans?.inEnvironment.inLogs?.buckets ?? []).map((bucket) => [bucket.key, bucket])
  );
  const applications = [
    ...logsBuckets.map((bucket) =>
      toApplication(bucket.key, bucket, spansByService.get(bucket.key))
    ),
    ...(spans?.inEnvironment.spansOnly?.buckets ?? []).map((bucket) =>
      toApplication(bucket.key, undefined, bucket)
    ),
  ];

  return {
    applications,
    environments: pickerEnvironments(logs, spans?.picker),
    pageLoadsOverTime: toTimeSeries(logs?.inEnvironment.pageLoadsOverTime?.histogram),
    sessionsOverTime: null,
  };
};

/** EDOT Browser applications (`telemetry.sdk.language: webjs`) with their metrics. */
export const getOtelApplications = (
  params: GetOtelApplicationsParams
): Promise<SourceApplications> =>
  // Traced like the Classic searches, which APMEventClient wraps in a span.
  withSpan(SEARCH_SPAN_NAMES.otel, () => searchOtelApplications(params));
