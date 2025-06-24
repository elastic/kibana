/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useContext } from 'react';
import { DataViewContext } from '../containers/SafeDataViewProvider';
import { type DataViewManagerScopeName } from '../constants';

/**
 * Returns data view that is guaranteed to be set,
 * allowing you to skip the status check (if its loading or not).
 * The only catch is that it can only be used inside the DataViewProvider (you can have many on the page).
 */
export const useDataViewSafe = (scope: DataViewManagerScopeName) => {
  const scopes = useContext(DataViewContext);

  if (!scopes) {
    throw new Error('You can only use useDataViewSafe inside DataViewProvider');
  }

  if (!scopes.scopes.includes(scope)) {
    throw new Error(
      'No safeguards exist for requested scope, make sure it is configured where DataViewProvider is called'
    );
  }

  const dataViewIndex = scopes.scopes.indexOf(scope);
  const dataView = scopes.results[dataViewIndex].dataView;

  if (!dataView) {
    throw new Error(
      'Missing data view. This error should not occur (earlier conditions should fire or the fallback should be still rendered instead)'
    );
  }

  return dataView;
};
