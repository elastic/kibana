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
import type { SearchParams, SpansSearchParams } from './search_requests';
import { logsSearch, spansSearch } from './search_requests';
import type { LogsAggregations, SpansAggregations } from './search_responses';
import { toApplication } from './to_application';

interface GetOtelApplicationsParams extends SearchParams {
  esClient: ElasticsearchClient;
  /** Cancels the searches, e.g. when the HTTP request is aborted. */
  signal?: AbortSignal;
}

/** The HTTP requests of the given applications; none to search without applications. */
const searchSpans = async (
  esClient: ElasticsearchClient,
  params: SpansSearchParams,
  signal?: AbortSignal
): Promise<SpansAggregations | undefined> => {
  if (params.serviceNames.length === 0) {
    return undefined;
  }
  const response = await esClient.search(spansSearch(params), { signal });
  return response.aggregations as unknown as SpansAggregations | undefined;
};

const searchOtelApplications = async ({
  esClient,
  signal,
  ...searchParams
}: GetOtelApplicationsParams): Promise<SourceApplications> => {
  // Not in parallel: each search caps its applications, so the spans search reads only the ones the
  // logs search kept, or an application past the spans' cap would show no HTTP requests.
  const logsResponse = await esClient.search(logsSearch(searchParams), { signal });
  const logs = logsResponse.aggregations as unknown as LogsAggregations | undefined;
  const logsBuckets = logs?.inEnvironment.applications.buckets ?? [];

  const spans = await searchSpans(
    esClient,
    { ...searchParams, serviceNames: logsBuckets.map(({ key }) => key) },
    signal
  );

  const spansByService = new Map(
    (spans?.inEnvironment.applications.buckets ?? []).map((bucket) => [bucket.key, bucket])
  );
  const applications = logsBuckets.map((bucket) =>
    toApplication(bucket, spansByService.get(bucket.key))
  );

  return {
    applications,
    environments: pickerEnvironments(logs),
    pageLoadsOverTime: toTimeSeries(logs?.inEnvironment.pageLoadsOverTime?.histogram),
  };
};

/** EDOT Browser applications (`telemetry.sdk.language: webjs`) with their metrics. */
export const getOtelApplications = (
  params: GetOtelApplicationsParams
): Promise<SourceApplications> =>
  // Traced like the Classic searches, which APMEventClient wraps in a span.
  withSpan(SEARCH_SPAN_NAMES.otel, () => searchOtelApplications(params));
