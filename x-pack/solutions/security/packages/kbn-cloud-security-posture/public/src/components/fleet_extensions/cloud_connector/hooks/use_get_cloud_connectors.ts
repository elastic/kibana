/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import type { CloudConnectorSO, CloudConnectorListOptions } from '@kbn/fleet-plugin/common/types';
import { CLOUD_CONNECTOR_API_ROUTES } from '@kbn/fleet-plugin/common/constants';
import type { HttpStart } from '@kbn/core/public';

interface UseGetCloudConnectorsOptions {
  options?: CloudConnectorListOptions;
  enabled?: boolean;
  http: HttpStart;
}

interface CloudConnectorsResponse {
  items: CloudConnectorSO[];
  total: number;
  page: number;
  perPage: number;
}

const fetchCloudConnectors = async (
  http: HttpStart,
  options?: CloudConnectorListOptions
): Promise<CloudConnectorsResponse> => {
  const queryParams = new URLSearchParams();

  if (options?.page !== undefined) {
    queryParams.append('page', options.page.toString());
  }

  if (options?.perPage !== undefined) {
    queryParams.append('perPage', options.perPage.toString());
  }

  const url = `${CLOUD_CONNECTOR_API_ROUTES.LIST_PATTERN}${
    queryParams.toString() ? `?${queryParams.toString()}` : ''
  }`;

  return http.get<CloudConnectorsResponse>(url);
};

export const useGetCloudConnectors = ({
  options,
  enabled = true,
  http,
}: UseGetCloudConnectorsOptions) => {
  return useQuery(['cloud-connectors', options], () => fetchCloudConnectors(http, options), {
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
};
