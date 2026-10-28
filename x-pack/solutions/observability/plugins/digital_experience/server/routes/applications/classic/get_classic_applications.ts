/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { APMEventClient } from '@kbn/apm-data-access-plugin/server';
import { bucketKeys } from '../../../lib/helpers/aggregations';
import { withNotDefined } from '../../../lib/helpers/environment';
import { toTimeSeries } from '../../../lib/helpers/time_series';
import { SEARCH_SPAN_NAMES } from '../constants';
import type { SourceApplications } from '../types';
import type { SearchParams } from './search_requests';
import { classicSearch } from './search_requests';
import type { SearchAggregations } from './search_responses';
import { toApplication } from './to_application';

interface GetClassicApplicationsParams extends SearchParams {
  apmEventClient: APMEventClient;
}

/** Classic RUM applications (rum-js and js-base agents) with their metrics. */
export const getClassicApplications = async ({
  apmEventClient,
  ...searchParams
}: GetClassicApplicationsParams): Promise<SourceApplications> => {
  const response = await apmEventClient.search(
    SEARCH_SPAN_NAMES.classic,
    classicSearch(searchParams)
  );
  const aggregations = response.aggregations as unknown as SearchAggregations | undefined;

  return {
    applications: (aggregations?.inEnvironment.applications.buckets ?? []).map(toApplication),
    environments: withNotDefined(
      bucketKeys(aggregations?.environments),
      aggregations?.environmentNotDefined.doc_count ?? 0
    ),
    pageLoadsOverTime: toTimeSeries(aggregations?.inEnvironment.pageLoadsOverTime?.histogram),
  };
};
