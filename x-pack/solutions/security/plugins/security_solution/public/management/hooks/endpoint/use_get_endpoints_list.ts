/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import { useHttp } from '../../../common/lib/kibana';
import type { HostInfo, MetadataListResponse } from '../../../../common/endpoint/types';
import { HOST_METADATA_LIST_ROUTE } from '../../../../common/endpoint/constants';

type GetEndpointsListResponse = Array<{
  id: HostInfo['metadata']['agent']['id'];
  name: HostInfo['metadata']['host']['hostname'];
  selected: boolean;
}>;

export const PAGING_PARAMS = Object.freeze({
  default: 50,
  all: 10000,
});
/**
 * Get info for a security solution endpoint host using hostnames via kuery param
 * page and pageSize are fixed for showing 50 hosts at most on the 1st page
 * @param query
 * @param options
 */
export const useGetEndpointsList = ({
  searchString,
  selectedAgentIds,
  options = {},
}: {
  searchString: string;
  selectedAgentIds?: string[];
  options?: UseQueryOptions<GetEndpointsListResponse, IHttpFetchError>;
}): UseQueryResult<GetEndpointsListResponse, IHttpFetchError> => {
  const http = useHttp();
  const kuery = `united.endpoint.host.hostname:${searchString.length ? `*${searchString}` : ''}*`;
  let agentIdsKuery: string[] = [];
  if (selectedAgentIds) {
    agentIdsKuery = selectedAgentIds.map((id) => `united.endpoint.agent.id:"${id}"`);
  }

  return useQuery<GetEndpointsListResponse, IHttpFetchError>({
    queryKey: ['get-endpoints-list', kuery],
    ...options,
    queryFn: async () => {
      const metadataListResponse = await http.get<MetadataListResponse>(HOST_METADATA_LIST_ROUTE, {
        version: '2023-10-31',
        query: {
          page: 0,
          pageSize:
            // if the user has selected agents then search the whole index.
            // as selected host could be somewhere after the 50 that are shown
            // otherwise, limit the search to 50 hosts
            selectedAgentIds && selectedAgentIds.length > 0
              ? PAGING_PARAMS.all
              : PAGING_PARAMS.default,
          kuery: [...agentIdsKuery, kuery].join(' or '),
        },
      });

      // pick out the selected agents and push them to the top of the list
      const augmentedDataBasedOnSelectedAgents = metadataListResponse.data.reduce<{
        selected: GetEndpointsListResponse;
        rest: GetEndpointsListResponse;
      }>(
        (acc, list) => {
          const item = {
            id: list.metadata.agent.id,
            name: list.metadata.host.hostname,
          };
          if (selectedAgentIds?.includes(list.metadata.agent.id)) {
            acc.selected.push({
              ...item,
              selected: true,
            });
          } else {
            acc.rest.push({
              ...item,
              selected: false,
            });
          }
          return acc;
        },
        { selected: [], rest: [] }
      );

      let selectedAgentIdsCount = 0;
      if (selectedAgentIds) {
        selectedAgentIdsCount = selectedAgentIds.length;
      }

      // return 50 items max including the selected items
      // unless all 50 items are selected then increase the list length by 10
      return [
        ...augmentedDataBasedOnSelectedAgents.selected,
        ...augmentedDataBasedOnSelectedAgents.rest,
      ].slice(
        0,
        selectedAgentIdsCount >= PAGING_PARAMS.default
          ? selectedAgentIdsCount + 10
          : PAGING_PARAMS.default
      );
    },
  });
};
