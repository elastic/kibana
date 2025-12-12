/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MetricsAPIResponse, MetricsAPIRequest } from '@kbn/metrics-data-access-plugin/common';
import type { ESSearchClient } from '@kbn/metrics-data-access-plugin/server';
import { fetchMetrics } from '@kbn/metrics-data-access-plugin/server';

const handleResponse =
  (client: ESSearchClient, options: MetricsAPIRequest, previousResponse?: MetricsAPIResponse) =>
  async (resp: MetricsAPIResponse): Promise<MetricsAPIResponse> => {
    const combinedResponse = previousResponse
      ? {
          ...previousResponse,
          series: [...previousResponse.series, ...resp.series],
          info: resp.info,
        }
      : resp;
    if (resp.info.afterKey) {
      return fetchMetrics(client, { ...options, afterKey: resp.info.afterKey }).then(
        handleResponse(client, options, combinedResponse)
      );
    }
    return combinedResponse;
  };

export const queryAllData = (client: ESSearchClient, options: MetricsAPIRequest) => {
  return fetchMetrics(client, options).then(handleResponse(client, options));
};
