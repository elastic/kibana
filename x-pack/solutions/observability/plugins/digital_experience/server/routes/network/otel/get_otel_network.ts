/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { withSpan } from '@kbn/apm-utils';
import type { ApplicationNetworkResponse } from '../../../../common/types/network';
import { sortEnvironments } from '../../../lib/helpers/environment';
import type { SearchContext } from '../../../lib/helpers/search';
import { searchAggregations } from '../../../lib/helpers/search';
import { pickerEnvironments } from '../../../lib/otel/environments';
import type { ApplicationSearchParams } from '../../application_tab_route';
import { NETWORK_SEARCH_SPAN_NAME } from '../constants';
import { httpRequestsSearch, resourcesSearch } from './search_requests';
import type { HttpRequestsAggregations, ResourcesAggregations } from './search_responses';
import { toHttpRequests, toSlowestResources } from './to_network';

/** The HTTP requests and slowest resources of one EDOT Browser application, for its Network tab. */
export const getOtelNetwork = ({
  esClient,
  signal,
  ...searchParams
}: ApplicationSearchParams & SearchContext): Promise<ApplicationNetworkResponse> => {
  return withSpan(NETWORK_SEARCH_SPAN_NAME, async () => {
    const context = { esClient, signal };
    const [resources, requests] = await Promise.all([
      searchAggregations<ResourcesAggregations>(context, resourcesSearch(searchParams)),
      searchAggregations<HttpRequestsAggregations>(context, httpRequestsSearch(searchParams)),
    ]);

    return {
      serviceName: searchParams.serviceName,
      httpRequests: toHttpRequests(requests),
      slowestResources: toSlowestResources(resources),
      environments: sortEnvironments(pickerEnvironments(resources)),
    };
  });
};
