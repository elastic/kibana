/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TracedElasticsearchClient } from '@kbn/traced-es-client';
import { bucketKeys } from '../../../lib/helpers/aggregations';
import { withNotDefined } from '../../../lib/helpers/environment';
import { toTimeSeries } from '../../../lib/helpers/time_series';
import { SESSIONS_SEARCH_SPAN_NAME } from '../constants';
import type { SourceApplications } from '../types';
import type { SearchParams } from './search_requests';
import { sessionsSearch } from './sessions_search_requests';
import type { SessionsAggregations } from './sessions_search_responses';
import { toSessionsApplication, toSessionsTimeSeries } from './sessions_to_application';

/**
 * EDOT Browser applications and their metrics from the sessions index, in one search. It reads what
 * the current user can read there, so it fails for a user without access to the index.
 */
export const getSessionsApplications = async ({
  tracedEsClient,
  ...searchParams
}: SearchParams & {
  /** Searches as the current user and cancels with the HTTP request. */
  tracedEsClient: TracedElasticsearchClient;
}): Promise<SourceApplications> => {
  const response = await tracedEsClient.search(
    SESSIONS_SEARCH_SPAN_NAME,
    sessionsSearch(searchParams)
  );
  const aggregations = response.aggregations as unknown as SessionsAggregations | undefined;

  return {
    applications: (aggregations?.inEnvironment.applications.buckets ?? []).map(
      toSessionsApplication
    ),
    environments: withNotDefined(
      bucketKeys(aggregations?.environments),
      aggregations?.environmentNotDefined.doc_count ?? 0
    ),
    pageLoadsOverTime: toSessionsTimeSeries(aggregations?.inEnvironment),
    sessionsOverTime: toTimeSeries(aggregations?.inEnvironment.startedInRange.pageLoadsOverTime),
  };
};
