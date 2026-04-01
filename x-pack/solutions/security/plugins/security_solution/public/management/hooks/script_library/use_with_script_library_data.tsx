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

  // Re-check if data exists when list is empty and not loading
  useEffect(() => {
    if (!doesDataExist) return;
    if (isMounted() && !isLoadingListData && !listDataError && listData && listData.total === 0) {
      verifyDataExists();
    }
  }, [isMounted, doesDataExist, isLoadingListData, listDataError, listData, verifyDataExists]);

  return useMemo(
    () => ({
      doesDataExist,
      isPageInitializing,
      ...listDataRequest,
    }),
    [doesDataExist, isPageInitializing, listDataRequest]
  );
};
