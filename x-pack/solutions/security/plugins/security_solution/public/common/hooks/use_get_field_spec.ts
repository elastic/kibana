/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { SourcererScopeName } from '../../sourcerer/store/model';
import { sourcererSelectors } from '../../sourcerer/store';
import type { State } from '../store';

export const useGetFieldSpec = (scopeId: SourcererScopeName) => {
  const kibanaDataViews = useSelector(sourcererSelectors.kibanaDataViews);

  const scopedDataViewId = useSelector((state: State) =>
    sourcererSelectors.sourcererScopeSelectedDataViewId(state, scopeId)
  );
  const scopedDataView = useMemo(
    () => kibanaDataViews.find((dv) => dv.id === scopedDataViewId),
    [kibanaDataViews, scopedDataViewId]
  );

  // we retrieve the default data view to be used in Timeline for some specific situations
  const fallbackDefaultDataViewId = useSelector((state: State) =>
    sourcererSelectors.sourcererScopeSelectedDataViewId(state, SourcererScopeName.default)
  );
  const fallbackDefaultDataView = useMemo(
    () => kibanaDataViews.find((dv) => dv.id === fallbackDefaultDataViewId),
    [fallbackDefaultDataViewId, kibanaDataViews]
  );

  // for Threshold, New Terms and Suppressed Timelines, when users click on Investigate in Timeline, the dataView is undefined.
  // Falling back to the default dataView makes the cell actions working
  const dataView = useMemo(
    () =>
      !scopedDataView && scopeId === SourcererScopeName.timeline
        ? fallbackDefaultDataView
        : scopedDataView,
    [fallbackDefaultDataView, scopeId, scopedDataView]
  );

  return useCallback(
    (fieldName: string) => {
      const fields = dataView?.fields;
      return fields && fields[fieldName];
    },
    [dataView?.fields]
  );
};
