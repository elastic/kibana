/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IHttpFetchError } from '@kbn/core-http-browser';
import type { UseQueryResult, UseQueryOptions } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { useHttp } from '../../../common/lib/kibana';
import { BASE_POLICY_RESPONSE_ROUTE } from '../../../../common/endpoint/constants';
import type { GetHostPolicyResponse } from '../../../../common/endpoint/types';

export function useGetEndpointPolicyResponse(
  selectedEndpoint: string,
  customQueryOptions?: UseQueryOptions<GetHostPolicyResponse, IHttpFetchError>
): UseQueryResult<GetHostPolicyResponse, IHttpFetchError> {
  const http = useHttp();
  return useQuery<GetHostPolicyResponse, IHttpFetchError>(
    ['getEndpointPolicyResponse', selectedEndpoint],
    () => {
      return http.get<GetHostPolicyResponse>(BASE_POLICY_RESPONSE_ROUTE, {
        version: '2023-10-31',
        query: { agentId: selectedEndpoint },
      });
    },
    customQueryOptions
  );
}
