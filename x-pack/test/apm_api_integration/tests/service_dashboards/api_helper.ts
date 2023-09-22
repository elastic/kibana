/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DashboardTypeEnum } from '@kbn/apm-plugin/common/service_dashboards';
import { ApmApiClient } from '../../common/config';

export async function getServiceDashboardApi(apmApiClient: ApmApiClient, serviceName: string) {
  return apmApiClient.writeUser({
    endpoint: 'GET /internal/apm/services/{serviceName}/dashboards',
    params: {
      path: { serviceName },
    },
  });
}

export async function getLinkServiceDashboardApi({
  dashboardSavedObjectId,
  dashboardTitle,
  apmApiClient,
  serviceDashboardId,
  serviceName,
  kuery,
  linkTo,
  useContextFilter,
}: {
  apmApiClient: ApmApiClient;
  dashboardSavedObjectId: string;
  dashboardTitle: string;
  serviceDashboardId?: string;
  serviceName: string;
  kuery: string;
  linkTo: DashboardTypeEnum;
  useContextFilter: boolean;
}) {
  const response = await apmApiClient.writeUser({
    endpoint: 'POST /internal/apm/service-dashboard',
    params: {
      query: {
        serviceDashboardId,
      },
      body: {
        dashboardSavedObjectId,
        dashboardTitle,
        kuery,
        serviceName,
        useContextFilter,
        linkTo,
      },
    },
  });
  return response;
}

export async function deleteAllServiceDashboard(apmApiClient: ApmApiClient, serviceName: string) {
  return await getServiceDashboardApi(apmApiClient, serviceName).then((response) => {
    const promises = response.body.serviceDashboards.map((item) => {
      if (item.id) {
        return apmApiClient.writeUser({
          endpoint: 'DELETE /internal/apm/service-dashboard',
          params: { query: { serviceDashboardId: item.id } },
        });
      }
    });
    return Promise.all(promises);
  });
}
