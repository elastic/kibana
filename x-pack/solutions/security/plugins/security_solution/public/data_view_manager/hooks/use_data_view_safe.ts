/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useContext, useMemo } from 'react';
import { DataViewContext } from '../containers/SafeDataViewProvider';
import { type DataViewManagerScopeName } from '../constants';

/**
 * Returns data view instance that is guaranteed to be set (for the provided scope),
 * allowing you to skip the status check (if its loading or not).
 * The catch is that it can only be used inside the DataViewProvider (you can have many on the page).
 */
export const useDataViewSafe = (scope: DataViewManagerScopeName) => {
  const dataViewsPerScope = useContext(DataViewContext);

  if (!dataViewsPerScope) {
    throw new Error('You can only use useDataViewSafe inside DataViewProvider');
  }

  if (!(scope in dataViewsPerScope.results)) {
    throw new Error(
      'No safeguards exist for requested scope, make sure it is included in `scopes` property of the wrapping DataViewProvider'
    );
  }

  const dataView = useMemo(
    () => dataViewsPerScope.results[scope].dataView,
    [dataViewsPerScope.results, scope]
  );

  if (!dataView) {
    throw new Error(
      'Missing data view. This error should not occur (earlier conditions should fire or the fallback should be still rendered instead)'
    );
  }

  return dataView;
};
