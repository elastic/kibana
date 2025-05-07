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

export const useSelectDataView = () => {
  const dispatch = useDispatch();

  return useCallback(
    (params: {
      id?: string | null;
      /**
       * List of patterns that will be used to construct the adhoc data view when
       * .id param is not provided or the data view does not exist
       */
      fallbackPatterns?: string[];
      /**
       * Data view selection will be applied to the scopes listed here
       */
      scope: DataViewManagerScopeName[];
    }) => {
      dispatch(selectDataViewAsync(params));
    },
    [dispatch]
  );
};
