/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryObserverResult, useQuery, type UseQueryOptions } from '@tanstack/react-query';
import type { PackagePolicy } from '@kbn/fleet-plugin/common';
import { packagePolicyRouteService } from '@kbn/fleet-plugin/common';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import type { BulkGetPackagePoliciesRequestBody } from '@kbn/fleet-plugin/common/types';
import type { GetBulkIntegrationPoliciesResponse } from './types';
import { useHttp } from '../../../common/lib/kibana';

/**
 * Retrieve multiple integration policies (aka: package policies) from fleet using their IDs
 * @param ids
 * @param ignoreMissing
 * @param options
 */
export const useBulkFetchFleetIntegrationPolicies = <T extends PackagePolicy = PackagePolicy>(
  { ids, ignoreMissing = true }: BulkGetPackagePoliciesRequestBody,
  options: UseQueryOptions<GetBulkIntegrationPoliciesResponse<T>, IHttpFetchError> = {}
): QueryObserverResult<GetBulkIntegrationPoliciesResponse<T>, IHttpFetchError> => {
  const http = useHttp();

  return useQuery<GetBulkIntegrationPoliciesResponse<T>, IHttpFetchError>({
    queryKey: ['bulkFetchFleetIntegrationPolicies', ids, ignoreMissing],
    refetchOnWindowFocus: false,
    ...options,
    queryFn: async () => {
      return http.post<GetBulkIntegrationPoliciesResponse<T>>(
        packagePolicyRouteService.getBulkGetPath(),
        {
          body: JSON.stringify({ ids, ignoreMissing }),
          version: '2023-10-31',
        }
      );
    },
  });
};
