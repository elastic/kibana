/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import type { CloudConnector, CloudConnectorListOptions } from '@kbn/fleet-plugin/public';
import { CLOUD_CONNECTOR_API_ROUTES } from '@kbn/fleet-plugin/public';
import type { CoreStart, HttpStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';

const fetchCloudConnectors = async (
  http: HttpStart,
  options?: CloudConnectorListOptions
): Promise<CloudConnector[]> => {
  const queryParams = new URLSearchParams();

  if (options?.page !== undefined) {
    queryParams.append('page', options.page.toString());
  }

  if (options?.perPage !== undefined) {
    queryParams.append('perPage', options.perPage.toString());
  }

  const url = `${CLOUD_CONNECTOR_API_ROUTES.LIST_PATTERN}`;

  return http
    .get<{ items: CloudConnector[] }>(url)
    .then((res: { items: CloudConnector[] }) => res.items);
};

export const useGetCloudConnectors = () => {
  const CLOUD_CONNECTOR_QUERY_KEY = 'get-cloud-connectors';
  const { http } = useKibana<CoreStart>().services;
  return useQuery([CLOUD_CONNECTOR_QUERY_KEY], () => fetchCloudConnectors(http), {
    enabled: true,
  });
};
