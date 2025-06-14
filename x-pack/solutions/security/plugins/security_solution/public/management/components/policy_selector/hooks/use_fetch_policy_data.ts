/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryResult } from '@tanstack/react-query';
import type { GetPackagePoliciesResponse } from '@kbn/fleet-plugin/common';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import { useMemo } from 'react';
import { chunk } from 'lodash';
import type { PolicyData } from '../../../../../common/endpoint/types';
import type { PolicySelectorProps } from '..';
import { useFetchIntegrationPolicyList } from '../../../hooks/policy/use_fetch_integration_policy_list';
import { useBulkFetchFleetIntegrationPolicies } from '../../../hooks/policy/use_bulk_fetch_fleet_integration_policies';

/**
 * Hook for use in the PolicySelector component. It normalizes the retrieval of data between
 * just fetching the regular list of policies -OR- bulk retrieving a list of policy by IDs.
 *
 * The primary goal of this hook is to efficiently manage the display of selected policies, which
 * uses the Bulk Get Package Policies API from fleet which does not have support for pagination.
 */
export const useFetchPolicyData = (
  queryOptions: PolicySelectorProps['queryOptions'] & { page: number },
  selectedPolicyIds: PolicySelectorProps['selectedPolicyIds'],
  mode: 'full-list' | 'selected-list'
): Pick<
  UseQueryResult<GetPackagePoliciesResponse, IHttpFetchError>,
  'data' | 'isFetching' | 'isLoading' | 'error'
> => {
  const selectedPoliciesPagination: string[][] = useMemo(() => {
    if (mode === 'selected-list') {
      return chunk(selectedPolicyIds, queryOptions?.perPage ?? 20);
    }

    return [];
  }, [mode, queryOptions?.perPage, selectedPolicyIds]);

  const bulkFetchPage = useMemo(() => {
    return selectedPoliciesPagination[queryOptions.page - 1] ? queryOptions.page : 1;
  }, [queryOptions.page, selectedPoliciesPagination]);

  const fetchListResult = useFetchIntegrationPolicyList<PolicyData>(queryOptions, {
    keepPreviousData: true,
    enabled: mode === 'full-list',
  });

  const bulkFetchResult = useBulkFetchFleetIntegrationPolicies(
    { ids: selectedPoliciesPagination[bulkFetchPage - 1] ?? [] },
    {
      keepPreviousData: true,
      enabled: mode === 'selected-list',
    }
  );

  return useMemo(() => {
    if (mode === 'selected-list') {
      return {
        data: bulkFetchResult.data
          ? {
              items: bulkFetchResult.data.items,
              total: selectedPolicyIds.length,
              perPage: queryOptions.perPage ?? 20,
              page: bulkFetchPage,
            }
          : undefined,
        isFetching: bulkFetchResult.isFetching,
        isLoading: bulkFetchResult.isLoading,
        error: bulkFetchResult.error,
      };
    }

    return {
      data: fetchListResult.data,
      isFetching: fetchListResult.isFetching,
      isLoading: fetchListResult.isLoading,
      error: fetchListResult.error,
    };
  }, [
    bulkFetchPage,
    bulkFetchResult.data,
    bulkFetchResult.error,
    bulkFetchResult.isFetching,
    bulkFetchResult.isLoading,
    fetchListResult.data,
    fetchListResult.error,
    fetchListResult.isFetching,
    fetchListResult.isLoading,
    mode,
    queryOptions.perPage,
    selectedPolicyIds.length,
  ]);
};
