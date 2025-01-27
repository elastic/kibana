/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useMemo, useEffect } from 'react';

import { HttpSetup } from '@kbn/core/public';
import { useKibana } from '../utils/kibana_react';

type DataFetcher<T, R> = (params: T, ctrl: AbortController, http: HttpSetup) => Promise<R>;

export const useDataFetcher = <ApiCallParams, AlertDataType>({
  paramsForApiCall,
  initialDataState,
  executeApiCall,
  shouldExecuteApiCall,
}: {
  paramsForApiCall: ApiCallParams;
  initialDataState: AlertDataType;
  executeApiCall: DataFetcher<ApiCallParams, AlertDataType>;
  shouldExecuteApiCall: (params: ApiCallParams) => boolean;
}) => {
  const { http } = useKibana().services;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [data, setData] = useState<AlertDataType>(initialDataState);

  const { fetch, cancel } = useMemo(() => {
    const abortController = new AbortController();
    let isCanceled = false;

    return {
      fetch: async () => {
        if (shouldExecuteApiCall(paramsForApiCall)) {
          setError(false);
          setLoading(true);

          try {
            const results = await executeApiCall(paramsForApiCall, abortController, http);
            if (!isCanceled) {
              setLoading(false);
              setData(results);
            }
          } catch (e) {
            setError(true);
            setLoading(false);
          }
        }
      },
      cancel: () => {
        isCanceled = true;
        abortController.abort();
      },
    };
  }, [executeApiCall, http, paramsForApiCall, shouldExecuteApiCall]);

  useEffect(() => {
    fetch();

    return () => {
      cancel();
    };
  }, [fetch, cancel]);

  return {
    data,
    loading,
    error,
  };
};
