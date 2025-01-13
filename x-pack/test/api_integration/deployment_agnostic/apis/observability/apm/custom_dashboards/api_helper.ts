/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ApmApiProvider } from '../../../../services/apm_api';

export type ApmApiClient = ReturnType<typeof ApmApiProvider>;

export async function getServiceDashboardApi(
  apmApiClient: ApmApiClient,
  serviceName: string,
  start: string,
  end: string
) {
  return apmApiClient.writeUser({
    endpoint: 'GET /internal/apm/services/{serviceName}/dashboards',
    params: {
      path: { serviceName },
      query: {
        start: new Date(start).toISOString(),
        end: new Date(end).toISOString(),
      },
    },
  });
}

export async function getLinkServiceDashboardApi({
  dashboardSavedObjectId,
  apmApiClient,
  customDashboardId,
  kuery,
  serviceFiltersEnabled,
}: {
  apmApiClient: ApmApiClient;
  dashboardSavedObjectId: string;
  customDashboardId?: string;
  kuery: string;
  serviceFiltersEnabled: boolean;
}) {
  const response = await apmApiClient.writeUser({
    endpoint: 'POST /internal/apm/custom-dashboard',
    params: {
      query: {
        customDashboardId,
      },
      body: {
        dashboardSavedObjectId,
        kuery,
        serviceEnvironmentFilterEnabled: serviceFiltersEnabled,
        serviceNameFilterEnabled: serviceFiltersEnabled,
      },
    },
  });
  return response;
}

export async function deleteAllServiceDashboard(
  apmApiClient: ApmApiClient,
  serviceName: string,
  start: string,
  end: string
) {
  return await getServiceDashboardApi(apmApiClient, serviceName, start, end).then((response) => {
    const promises = response.body.serviceDashboards.map((item) => {
      if (item.id) {
        return apmApiClient.writeUser({
          endpoint: 'DELETE /internal/apm/custom-dashboard',
          params: { query: { customDashboardId: item.id } },
        });
      }
    });
    return Promise.all(promises);
  });
}
