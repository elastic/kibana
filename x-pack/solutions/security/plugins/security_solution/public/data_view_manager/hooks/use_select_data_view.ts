/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useDispatch } from 'react-redux';
import { useCallback } from 'react';
import type { DataViewManagerScopeName } from '../constants';
import { selectDataViewAsync } from '../redux/actions';

interface UseSelectDataViewParams {
  /**
   * Data view id, if empty - you have to specify fallbackPatterns instead
   */
  id?: string | null;
  /**
   * List of patterns that will be used to construct the adhoc data view when
   * .id param is not provided or the data view does not exist
   */
  fallbackPatterns?: string[];
  /**
   * Data view selection will be applied to the scopes listed here
   */
  scope: DataViewManagerScopeName;
}

/**
 * This hook wraps the dispatch call that updates the redux store with new data view selection.
 * It is the recommended entry point for altering the data view selection.
 * Manual action dispatches are not required and should be avoided outside of the data view manager scope.
 * Note: it will not select anything if neither params.id or params.fallbackPatterns are set.
 */
export const useSelectDataView = () => {
  const dispatch = useDispatch();

  return useCallback(
    (params: UseSelectDataViewParams) => {
      if (!(params.id || params.fallbackPatterns?.length)) {
        return;
      }

      dispatch(selectDataViewAsync(params));
    },
    [dispatch]
  );
};
