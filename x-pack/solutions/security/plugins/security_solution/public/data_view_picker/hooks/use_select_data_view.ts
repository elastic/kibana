/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useDispatch } from 'react-redux';
import { useCallback } from 'react';
import type { DataViewPickerScopeName } from '../constants';
import { selectDataViewAsync } from '../redux/actions';

export const useSelectDataView = () => {
  const dispatch = useDispatch();

  return useCallback(
    (params: { id?: string | null; patterns?: string[]; scope: DataViewPickerScopeName[] }) => {
      dispatch(selectDataViewAsync(params));
    },
    [dispatch]
  );
};
