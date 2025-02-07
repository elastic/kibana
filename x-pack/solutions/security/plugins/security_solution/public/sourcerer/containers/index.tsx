/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { sourcererSelectors } from '../store';
import type { SelectedDataView } from '../store/model';
import { SourcererScopeName } from '../store/model';
import { checkIfIndicesExist } from '../store/helpers';
import { getDataViewStateFromIndexFields } from '../../common/containers/source/use_data_view';
import type { State } from '../../common/store/types';
import { sortWithExcludesAtEnd } from '../../../common/utils/sourcerer';

export const useSourcererDataView = (
  scopeId: SourcererScopeName = SourcererScopeName.default
): SelectedDataView => {
  const kibanaDataViews = useSelector(sourcererSelectors.kibanaDataViews);
  const signalIndexName = useSelector(sourcererSelectors.signalIndexName);
  const defaultDataView = useSelector(sourcererSelectors.defaultDataView);
  const selectedDataViewId = useSelector((state: State) => {
    return sourcererSelectors.sourcererScopeSelectedDataViewId(state, scopeId);
  });
  const selectedDataView = useMemo(() => {
    return kibanaDataViews.find((dataView) => dataView.id === selectedDataViewId);
  }, [kibanaDataViews, selectedDataViewId]);
  const loading = useSelector((state: State) => {
    return sourcererSelectors.sourcererScopeIsLoading(state, scopeId);
  });
  const scopeSelectedPatterns = useSelector((state: State) => {
    return sourcererSelectors.sourcererScopeSelectedPatterns(state, scopeId);
  });

  const selectedPatterns = useMemo(
    () => sortWithExcludesAtEnd(scopeSelectedPatterns),
    [scopeSelectedPatterns]
  );

  const sourcererDataView = useMemo(() => {
    return {
      ...selectedDataView,
      dataView: {
        ...selectedDataView?.dataView,
        title: selectedPatterns.join(','),
        name: selectedDataView?.dataView?.name ?? selectedPatterns.join(','),
      },
    };
  }, [selectedDataView, selectedPatterns]);

  const indicesExist = useMemo(() => {
    if (loading || sourcererDataView.loading) {
      return true;
    } else {
      return checkIfIndicesExist({
        scopeId,
        signalIndexName,
        patternList: sourcererDataView.patternList ?? [],
        isDefaultDataViewSelected: sourcererDataView.id === defaultDataView.id,
      });
    }
  }, [
    defaultDataView.id,
    loading,
    scopeId,
    signalIndexName,
    sourcererDataView.id,
    sourcererDataView.loading,
    sourcererDataView.patternList,
  ]);

  const browserFields = useCallback(() => {
    const { browserFields: dataViewBrowserFields } = getDataViewStateFromIndexFields(
      sourcererDataView?.patternList?.join(',') || '',
      sourcererDataView.fields
    );
    return dataViewBrowserFields;
  }, [sourcererDataView.fields, sourcererDataView.patternList]);

  return useMemo(
    () => ({
      browserFields: browserFields(),
      dataViewId: sourcererDataView.id ?? null,
      indicesExist,
      loading: loading || !!sourcererDataView?.loading,
      // selected patterns in DATA_VIEW including filter
      selectedPatterns,
      sourcererDataView: sourcererDataView.dataView,
    }),
    [browserFields, sourcererDataView, selectedPatterns, indicesExist, loading]
  );
};
