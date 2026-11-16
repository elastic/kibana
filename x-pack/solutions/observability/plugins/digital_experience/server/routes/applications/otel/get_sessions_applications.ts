/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { withSpan } from '@kbn/apm-utils';
import { bucketKeys } from '../../../lib/helpers/aggregations';
import { withNotDefined } from '../../../lib/helpers/environment';
import { SESSIONS_SEARCH_SPAN_NAME } from '../constants';
import type { SourceApplications } from '../types';
import type { GetOtelApplicationsParams } from './get_otel_applications';
import { sessionsSearch } from './sessions_search_requests';
import type { SessionsAggregations } from './sessions_search_responses';
import {
  toSessionsApplication,
  toSessionsTimeSeries,
  toStartedSessionsTimeSeries,
} from './sessions_to_application';

/**
 * EDOT Browser applications and their metrics from the sessions index, in one search. It reads what
 * the current user can read there, so it fails for a user without access to the index.
 */
export const getSessionsApplications = ({
  esClient,
  signal,
  ...searchParams
}: GetOtelApplicationsParams): Promise<SourceApplications> =>
  withSpan(SESSIONS_SEARCH_SPAN_NAME, async () => {
    const response = await esClient.search(sessionsSearch(searchParams), { signal });
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
      sessionsOverTime: toStartedSessionsTimeSeries(aggregations?.inEnvironment),
    };
  });
