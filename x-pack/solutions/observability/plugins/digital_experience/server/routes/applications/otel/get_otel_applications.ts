/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { withSpan } from '@kbn/apm-utils';
import type { ElasticsearchClient } from '@kbn/core/server';
import { withNotDefined } from '../../../lib/helpers/environment';
import { SEARCH_SPAN_NAMES } from '../constants';
import type { SourceApplications } from '../types';
import type { SearchParams } from './search_requests';
import { logsSearch, spansSearch } from './search_requests';
import type { LogsBucket, SearchAggregations, SpansBucket } from './search_responses';
import { environmentsOf, toApplication } from './to_application';

interface GetOtelApplicationsParams extends SearchParams {
  esClient: ElasticsearchClient;
  /** Cancels the searches, e.g. when the HTTP request is aborted. */
  signal?: AbortSignal;
}

const searchOtelApplications = async ({
  esClient,
  signal,
  ...searchParams
}: GetOtelApplicationsParams): Promise<SourceApplications> => {
  const [logsResponse, spansResponse] = await Promise.all([
    esClient.search(logsSearch(searchParams), { signal }),
    esClient.search(spansSearch(searchParams), { signal }),
  ]);
  const logs = logsResponse.aggregations as unknown as SearchAggregations<LogsBucket> | undefined;
  const spans = spansResponse.aggregations as unknown as
    | SearchAggregations<SpansBucket>
    | undefined;

  // The logs define the applications; spans only add their HTTP requests.
  const spansByService = new Map(
    (spans?.inEnvironment.applications.buckets ?? []).map((bucket) => [bucket.key, bucket])
  );
  const applications = (logs?.inEnvironment.applications.buckets ?? []).map((bucket) =>
    toApplication(bucket, spansByService.get(bucket.key))
  );

  const notDefinedCount =
    (logs?.environmentNotDefined.doc_count ?? 0) + (spans?.environmentNotDefined.doc_count ?? 0);

  return {
    applications,
    environments: withNotDefined(environmentsOf(logs, spans), notDefinedCount),
  };
};

/** EDOT Browser applications (`telemetry.sdk.language: webjs`) with their metrics. */
export const getOtelApplications = (
  params: GetOtelApplicationsParams
): Promise<SourceApplications> =>
  // Traced like the Classic searches, which APMEventClient wraps in a span.
  withSpan(SEARCH_SPAN_NAMES.otel, () => searchOtelApplications(params));
