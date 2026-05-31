/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HostRef } from './types';
import { HOST_METADATA_LIST_ROUTE } from '../../../../common/endpoint/constants';
import type { MetadataListResponse } from '../../../../common/endpoint/types';
import { KibanaServices } from '../../../common/lib/kibana';

export interface ResolveHostOptions {
  searchString: string;
}

export const resolveHost = async ({ searchString }: ResolveHostOptions): Promise<HostRef[]> => {
  const trimmed = searchString.trim();
  if (!trimmed) {
    return [];
  }

  const http = KibanaServices.get().http;

  // Search by hostname using the endpoint metadata list API.
  const kuery = `united.endpoint.host.hostname:*${trimmed}*`;

  const response = await http.get<MetadataListResponse>(HOST_METADATA_LIST_ROUTE, {
    version: '2023-10-31',
    query: {
      page: 0,
      pageSize: 10,
      kuery,
    },
  });

  return response.data.map((hostInfo) => ({
    hostName: hostInfo.metadata.host.hostname,
    agentId: hostInfo.metadata.agent.id,
    isIsolated: hostInfo.metadata.Endpoint.state?.isolation ?? false,
  }));
};
