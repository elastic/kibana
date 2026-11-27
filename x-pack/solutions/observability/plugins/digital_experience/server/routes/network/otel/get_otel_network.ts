/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApplicationNetworkResponse } from '../../../../common/types/network';
import { sortEnvironments } from '../../../lib/helpers/environment';
import { pickerEnvironments } from '../../../lib/otel/environments';
import type { ApplicationSearch } from '../../application_tab_route';
import {
  NETWORK_HTTP_REQUESTS_SEARCH_SPAN_NAME,
  NETWORK_RESOURCES_SEARCH_SPAN_NAME,
} from '../constants';
import { httpRequestsSearch, resourcesSearch } from './search_requests';
import { toHttpRequests, toSlowestResources } from './to_network';

/** The HTTP requests and slowest resources of one EDOT Browser application, for its Network tab. */
export const getOtelNetwork = async ({
  esClient,
  ...searchParams
}: ApplicationSearch): Promise<ApplicationNetworkResponse> => {
  const [{ aggregations: resources }, { aggregations: requests }] = await Promise.all([
    esClient.search(NETWORK_RESOURCES_SEARCH_SPAN_NAME, resourcesSearch(searchParams)),
    esClient.search(NETWORK_HTTP_REQUESTS_SEARCH_SPAN_NAME, httpRequestsSearch(searchParams)),
  ]);

  return {
    serviceName: searchParams.serviceName,
    httpRequests: toHttpRequests(requests),
    slowestResources: toSlowestResources(resources),
    // Browser logs and client spans can each hold an environment the other lacks.
    environments: sortEnvironments([
      ...pickerEnvironments(resources),
      ...pickerEnvironments(requests),
    ]),
  };
};
