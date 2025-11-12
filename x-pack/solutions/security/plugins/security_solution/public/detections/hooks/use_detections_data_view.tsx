/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { RunTimeMappings } from '@kbn/timelines-plugin/common/search_strategy';

import { useSourcererDataView } from '../../sourcerer/containers';
import type { SourcererScopeName } from '../../sourcerer/store/model';
import { useIsExperimentalFeatureEnabled } from '../../common/hooks/use_experimental_features';
import { useDataView } from '../../data_view_manager/hooks/use_data_view';

export const useDetectionsDataView = (scope: SourcererScopeName) => {
  const newDataViewPickerEnabled = useIsExperimentalFeatureEnabled('newDataViewPickerEnabled');

  const { sourcererDataView: oldSourcererDataViewSpec, loading: oldSourcererDataViewIsLoading } =
    useSourcererDataView(scope);
  // TODO rename to just dataView and status once we remove the newDataViewPickerEnabled feature flag
  const { dataView: experimentalDataView, status: experimentalDataViewStatus } = useDataView(scope);

  const isLoading: boolean = useMemo(
    () =>
      newDataViewPickerEnabled
        ? experimentalDataViewStatus === 'loading' || experimentalDataViewStatus === 'pristine'
        : oldSourcererDataViewIsLoading,
    [experimentalDataViewStatus, newDataViewPickerEnabled, oldSourcererDataViewIsLoading]
  );

  // TODO this will not be needed anymore once we remove the newDataViewPickerEnabled feature flag.
  //  We currently only need the runtimeMappings in the KPIsSection, so we can just pass down the dataView
  //  and extract the runtimeMappings from it there using experimentalDataView.getRuntimeMappings()
  const runtimeMappings: RunTimeMappings = useMemo(
    () =>
      newDataViewPickerEnabled
        ? (experimentalDataView?.getRuntimeMappings() as RunTimeMappings) ?? {} // TODO remove the ? as the dataView should never be undefined
        : (oldSourcererDataViewSpec?.runtimeFieldMap as RunTimeMappings) ?? {},
    [newDataViewPickerEnabled, experimentalDataView, oldSourcererDataViewSpec?.runtimeFieldMap]
  );

  const isDataViewInvalid: boolean = useMemo(
    () =>
      newDataViewPickerEnabled
        ? experimentalDataViewStatus === 'error' ||
          (experimentalDataViewStatus === 'ready' && !experimentalDataView.hasMatchedIndices())
        : !oldSourcererDataViewSpec ||
          !oldSourcererDataViewSpec.id ||
          !oldSourcererDataViewSpec.title,
    [
      experimentalDataView,
      experimentalDataViewStatus,
      newDataViewPickerEnabled,
      oldSourcererDataViewSpec,
    ]
  );

  return {
    isLoading,
    isDataViewInvalid,
    dataView: experimentalDataView,
    oldSourcererDataViewSpec,
    runtimeMappings,
  };
};
