/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useDataView } from './use_data_view';
import type { DataViewSpec, SharedDataViewSelectionState } from '../redux/types';
import { DataViewManagerScopeName } from '../constants';

export interface UseDataViewSpecResult {
  /**
   * DataViewSpec object for the current dataView
   */
  dataViewSpec: DataViewSpec;
  /**
   * Status of the dataView (can be the following values: 'pristine' | 'loading' | 'error' | 'ready')
   */
  status: SharedDataViewSelectionState['status'];
}

/**
 * Returns an object with the dataViewSpec and status values for the given scopeName.
 * IMPORTANT: If fields are not required, make sure to pass `includeFields = false`.
 */
export const useDataViewSpec = (
  scopeName: DataViewManagerScopeName = DataViewManagerScopeName.default,
  includeFields = true
): UseDataViewSpecResult => {
  const { dataView, status } = useDataView(scopeName);

  return useMemo(() => {
    // NOTE: remove this after we are ready for undefined (lazy) data view everywhere in the app
    // https://github.com/elastic/security-team/issues/11959
    if (!dataView) {
      return {
        dataViewSpec: {
          id: '',
          title: '',
        },
        status,
      };
    }

    return { dataViewSpec: dataView?.toSpec?.(includeFields), status };
  }, [dataView, includeFields, status]);
};
