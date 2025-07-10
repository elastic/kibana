/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import type { FieldSpec } from '@kbn/data-plugin/common';
import { sourcererSelectors } from '../store';
import type { SelectedDataView, SourcererDataView, RunTimeMappings } from '../store/model';
import { SourcererScopeName } from '../store/model';
import { checkIfIndicesExist } from '../store/helpers';
import { getDataViewStateFromIndexFields } from '../../common/containers/source/use_data_view';
import { useFetchIndex } from '../../common/containers/source';
import type { State } from '../../common/store/types';
import { sortWithExcludesAtEnd } from '../../../common/utils/sourcerer';
import { useIsExperimentalFeatureEnabled } from '../../common/hooks/use_experimental_features';

export const useSourcererDataView = (
  scopeId: SourcererScopeName = SourcererScopeName.default
): SelectedDataView => {
  const newDataViewPickerEnabled = useIsExperimentalFeatureEnabled('newDataViewPickerEnabled');

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
  const missingPatterns = useSelector((state: State) => {
    return sourcererSelectors.sourcererScopeMissingPatterns(state, scopeId);
  });

  const selectedPatterns = useMemo(
    () => sortWithExcludesAtEnd(scopeSelectedPatterns),
    [scopeSelectedPatterns]
  );

  const [legacyPatterns, setLegacyPatterns] = useState<string[]>([]);

  const [indexPatternsLoading, fetchIndexReturn] = useFetchIndex(legacyPatterns);

  const legacyDataView: Omit<SourcererDataView, 'id'> & { id: string | null } = useMemo(
    () => ({
      ...fetchIndexReturn,
      dataView: fetchIndexReturn.dataView,
      runtimeMappings: (fetchIndexReturn.dataView?.runtimeFieldMap as RunTimeMappings) ?? {},
      title: fetchIndexReturn.dataView?.title ?? '',
      id: fetchIndexReturn.dataView?.id ?? null,
      loading: indexPatternsLoading,
      patternList: fetchIndexReturn.indexes,
      indexFields: fetchIndexReturn.indexPatterns.fields as FieldSpec[],
      fields: fetchIndexReturn.dataView?.fields,
    }),
    [fetchIndexReturn, indexPatternsLoading]
  );

  useEffect(() => {
    if (newDataViewPickerEnabled) {
      return;
    }

    if (selectedDataView == null || missingPatterns.length > 0) {
      // old way of fetching indices, legacy timeline
      setLegacyPatterns(selectedPatterns);
    } else if (legacyPatterns.length > 0) {
      // Only create a new array reference if legacyPatterns is not empty
      setLegacyPatterns([]);
    }
  }, [
    legacyPatterns.length,
    newDataViewPickerEnabled,
    missingPatterns,
    selectedDataView,
    selectedPatterns,
  ]);

  const sourcererDataView = useMemo(() => {
    const _dv =
      selectedDataView == null || missingPatterns.length > 0 ? legacyDataView : selectedDataView;
    // Make sure the title is up to date, so that the correct index patterns are used everywhere
    return {
      ..._dv,
      dataView: {
        ..._dv.dataView,
        title: selectedPatterns.join(','),
        name: selectedPatterns.join(','),
      },
    };
  }, [legacyDataView, missingPatterns.length, selectedDataView, selectedPatterns]);

  const indicesExist = useMemo(() => {
    if (loading || sourcererDataView.loading) {
      return true;
    } else {
      return checkIfIndicesExist({
        scopeId,
        signalIndexName,
        patternList: sourcererDataView.patternList,
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
      sourcererDataView.patternList.join(','),
      sourcererDataView.fields
    );
    return dataViewBrowserFields;
  }, [sourcererDataView.fields, sourcererDataView.patternList]);

  return useMemo(
    () => ({
      browserFields: browserFields(),
      dataViewId: sourcererDataView.id,
      indicesExist,
      loading: loading || sourcererDataView.loading,
      // selected patterns in DATA_VIEW including filter
      selectedPatterns,
      sourcererDataView: sourcererDataView.dataView,
    }),
    [browserFields, sourcererDataView, selectedPatterns, indicesExist, loading]
  );
};
