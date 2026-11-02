/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { withSpan } from '@kbn/apm-utils';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { ApplicationOverviewResponse } from '../../../../common/types/overview';
import { sortEnvironments } from '../../../lib/helpers/environment';
import { pickerEnvironments } from '../../../lib/otel/environments';
import { OVERVIEW_SEARCH_SPAN_NAME } from '../constants';
import type { OverviewSearchParams } from './search_requests';
import { logsSearch, spansSearch } from './search_requests';
import type { OverviewLogsAggregations, OverviewSpansAggregations } from './search_responses';
import { toOverview } from './to_overview';

interface GetOtelOverviewParams extends OverviewSearchParams {
  esClient: ElasticsearchClient;
  /** Cancels the searches, e.g. when the HTTP request is aborted. */
  signal?: AbortSignal;
}

const searchOtelOverview = async ({
  esClient,
  signal,
  ...searchParams
}: GetOtelOverviewParams): Promise<ApplicationOverviewResponse> => {
  // In parallel, unlike the Applications list: both searches filter on the same application, so
  // neither needs the other's result.
  const [logsResponse, spansResponse] = await Promise.all([
    esClient.search(logsSearch(searchParams), { signal }),
    esClient.search(spansSearch(searchParams), { signal }),
  ]);

  const logs = logsResponse.aggregations as unknown as OverviewLogsAggregations | undefined;
  const spans = spansResponse.aggregations as unknown as OverviewSpansAggregations | undefined;

  return {
    overview: toOverview(searchParams.serviceName, logs, spans),
    environments: sortEnvironments(pickerEnvironments(logs)),
  };
};

/** The Overview of one EDOT Browser application (`telemetry.sdk.language: webjs`). */
export const getOtelOverview = (
  params: GetOtelOverviewParams
): Promise<ApplicationOverviewResponse> =>
  // Traced like the Applications list searches.
  withSpan(OVERVIEW_SEARCH_SPAN_NAME, () => searchOtelOverview(params));
