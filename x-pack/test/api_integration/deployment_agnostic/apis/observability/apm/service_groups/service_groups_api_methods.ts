/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ApmApiClient } from '../../../../services/apm_api';

export async function getServiceGroupsApi(apmApiClient: ApmApiClient) {
  return apmApiClient.writeUser({
    endpoint: 'GET /internal/apm/service-groups',
  });
}

export async function createServiceGroupApi({
  apmApiClient,
  serviceGroupId,
  groupName,
  kuery,
  description,
  color,
}: {
  apmApiClient: ApmApiClient;
  serviceGroupId?: string;
  groupName: string;
  kuery: string;
  description?: string;
  color?: string;
}) {
  const response = await apmApiClient.writeUser({
    endpoint: 'POST /internal/apm/service-group',
    params: {
      query: {
        serviceGroupId,
      },
      body: {
        groupName,
        kuery,
        description,
        color,
      },
    },
  });
  return response;
}

export async function getServiceGroupCounts(apmApiClient: ApmApiClient) {
  return apmApiClient.readUser({
    endpoint: 'GET /internal/apm/service-group/counts',
  });
}

export async function deleteAllServiceGroups(apmApiClient: ApmApiClient) {
  return await getServiceGroupsApi(apmApiClient).then((response) => {
    const promises = response.body.serviceGroups.map((item) => {
      if (item.id) {
        return apmApiClient.writeUser({
          endpoint: 'DELETE /internal/apm/service-group',
          params: { query: { serviceGroupId: item.id } },
        });
      }
    });
    return Promise.all(promises);
  });
}
