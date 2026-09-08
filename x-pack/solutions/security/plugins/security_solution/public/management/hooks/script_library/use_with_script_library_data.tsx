/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useState } from 'react';
import type { UseQueryResult } from '@kbn/react-query';
import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core-http-browser';
import { useIsMounted } from '@kbn/securitysolution-hook-utils';
import type { EndpointScriptListApiResponse } from '../../../../common/endpoint/types';
import {
  type AugmentedListScriptsRequestQuery,
  useGetEndpointScriptsList,
} from './use_get_scripts_list';

type WithScriptLibraryDataInterface = UseQueryResult<
  EndpointScriptListApiResponse,
  IHttpFetchError<ResponseErrorBody>
> & {
  /**
   * Indicates if the script library has any data at all (regardless of filters the user might have used)
   */
  doesDataExist: boolean;

  /**
   * Indicates if the script list is being fetched with no filter
   */
  isPageInitializing: boolean;
};

export const useWithScriptLibraryData = (
  queryParams: AugmentedListScriptsRequestQuery,
  options: Parameters<typeof useGetEndpointScriptsList>[1] = {}
): WithScriptLibraryDataInterface => {
  const isMounted = useIsMounted();
  const [isPageInitializing, setIsPageInitializing] = useState(true);

  // Query to check if scripts exist (unfiltered - no kuery parameter)
  const {
    data: hasDataResponse,
    isFetching: isLoadingHasData,
    refetch: verifyDataExists,
  } = useGetEndpointScriptsList(
    { page: 1, pageSize: 1 },
    {
      ...options,
      refetchOnWindowFocus: false,
    }
  );
  const doesDataExist = useMemo(() => (hasDataResponse?.total ?? 0) > 0, [hasDataResponse?.total]);

  // Query for filtered list data
  const listDataRequest = useGetEndpointScriptsList(queryParams, {
    ...options,
  });

  const { data: listData, isFetching: isLoadingListData, error: listDataError } = listDataRequest;

  useEffect(() => {
    if (isMounted()) {
      if (isPageInitializing && !isLoadingHasData) {
        setIsPageInitializing(false);
      }
    }
  }, [isLoadingHasData, isMounted, isPageInitializing]);

  // Keep the `doesDataExist` updated based on state transitions
  // Re-check if data exists when:
  // 1. List data becomes empty after previously having data (deletion)
  // 2. List data becomes non-empty after being empty (creation)
  useEffect(() => {
    const hasFilters = Boolean(
      queryParams?.os?.length ||
        queryParams?.fileType?.length ||
        queryParams?.category?.length ||
        queryParams?.searchTerms?.length
    );
    if (
      isMounted() &&
      !isLoadingListData &&
      !isLoadingHasData &&
      !listDataError &&
      !hasFilters &&
      // Flow when the last item on the list gets deleted, and list goes back to being empty
      ((listData && listData.total === 0 && doesDataExist) ||
        // Flow when the list starts off empty and the first item is added
        (listData && listData.total > 0 && !doesDataExist))
    ) {
      verifyDataExists();
    }
  }, [
    doesDataExist,
    isLoadingHasData,
    isLoadingListData,
    isMounted,
    listData,
    listDataError,
    queryParams?.category?.length,
    queryParams?.fileType?.length,
    queryParams?.os?.length,
    queryParams?.searchTerms?.length,
    verifyDataExists,
  ]);

  return useMemo(
    () => ({
      doesDataExist,
      isPageInitializing,
      ...listDataRequest,
    }),
    [doesDataExist, isPageInitializing, listDataRequest]
  );
};
