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

  const fallbackDefaultDataViewId = useSelector((state: State) =>
    sourcererSelectors.sourcererScopeSelectedDataViewId(state, SourcererScopeName.default)
  );
  const fallbackDefaultDataView = useMemo(
    () => kibanaDataViews.find((dv) => dv.id === fallbackDefaultDataViewId),
    [fallbackDefaultDataViewId, kibanaDataViews]
  );

  const dataView = useMemo(
    () => scopedDataView || fallbackDefaultDataView,
    [fallbackDefaultDataView, scopedDataView]
  );

  return useCallback(
    (fieldName: string) => {
      const fields = dataView?.fields;
      return fields && fields[fieldName];
    },
    [dataView?.fields]
  );
};
