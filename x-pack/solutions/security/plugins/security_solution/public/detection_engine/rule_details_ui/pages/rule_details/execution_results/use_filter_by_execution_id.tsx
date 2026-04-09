/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useRef } from 'react';
import { useDispatch } from 'react-redux';
import moment from 'moment';
import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { Filter, Query } from '@kbn/es-query';
import { buildFilter, FILTERS } from '@kbn/es-query';
import { toMountPoint } from '@kbn/react-kibana-mount';

import { PageScope } from '../../../../../data_view_manager/constants';
import { useIsExperimentalFeatureEnabled } from '../../../../../common/hooks/use_experimental_features';
import { dataViewSpecToViewBase } from '../../../../../common/lib/kuery';
import { InputsModelId } from '../../../../../common/store/inputs/constants';
import { useSourcererDataView } from '../../../../../sourcerer/containers';
import { useAppToasts } from '../../../../../common/hooks/use_app_toasts';
import { useDeepEqualSelector } from '../../../../../common/hooks/use_selector';
import { useKibana } from '../../../../../common/lib/kibana';
import { inputsSelectors } from '../../../../../common/store';
import {
  setAbsoluteRangeDatePicker,
  setFilterQuery,
  setRelativeRangeDatePicker,
  setSearchBarFilter,
} from '../../../../../common/store/inputs/actions';
import type {
  AbsoluteTimeRange,
  RelativeTimeRange,
} from '../../../../../common/store/inputs/model';
import { isAbsoluteTimeRange, isRelativeTimeRange } from '../../../../../common/store/inputs/model';
import { useDataView } from '../../../../../data_view_manager/hooks/use_data_view';
import * as i18n from './translations';

const EXECUTION_UUID_FIELD_NAME = 'kibana.alert.rule.execution.uuid';

interface CachedGlobalQueryState {
  filters: Filter[];
  query: Query;
  timerange: AbsoluteTimeRange | RelativeTimeRange;
}

export const useFilterByExecutionId = (selectAlertsTab: () => void) => {
  const startServices = useKibana().services;
  const {
    data: {
      query: { filterManager },
    },
  } = startServices;

  const dispatch = useDispatch();
  const { sourcererDataView: oldSourcererDataView } = useSourcererDataView(PageScope.alerts);
  const newDataViewPickerEnabled = useIsExperimentalFeatureEnabled('newDataViewPickerEnabled');
  const { dataView: experimentalDataView } = useDataView(PageScope.alerts);
  const { addError, addSuccess, remove } = useAppToasts();

  const getGlobalFiltersQuerySelector = useMemo(
    () => inputsSelectors.globalFiltersQuerySelector(),
    []
  );
  const getGlobalQuerySelector = useMemo(() => inputsSelectors.globalQuerySelector(), []);
  const timerange = useDeepEqualSelector(inputsSelectors.globalTimeRangeSelector);
  const query = useDeepEqualSelector(getGlobalQuerySelector);
  const filters = useDeepEqualSelector(getGlobalFiltersQuerySelector);

  const cachedGlobalQueryState = useRef<CachedGlobalQueryState>({ filters, query, timerange });
  const successToastId = useRef('');

  const uuidDataViewField = useMemo(
    () =>
      newDataViewPickerEnabled
        ? experimentalDataView.fields?.getByName(EXECUTION_UUID_FIELD_NAME)
        : oldSourcererDataView.fields?.[EXECUTION_UUID_FIELD_NAME],
    [experimentalDataView, newDataViewPickerEnabled, oldSourcererDataView.fields]
  );

  const resetGlobalQueryState = useCallback(() => {
    if (isAbsoluteTimeRange(cachedGlobalQueryState.current.timerange)) {
      dispatch(
        setAbsoluteRangeDatePicker({
          id: InputsModelId.global,
          from: cachedGlobalQueryState.current.timerange.from,
          to: cachedGlobalQueryState.current.timerange.to,
        })
      );
    } else if (isRelativeTimeRange(cachedGlobalQueryState.current.timerange)) {
      dispatch(
        setRelativeRangeDatePicker({
          id: InputsModelId.global,
          from: cachedGlobalQueryState.current.timerange.from,
          fromStr: cachedGlobalQueryState.current.timerange.fromStr,
          to: cachedGlobalQueryState.current.timerange.to,
          toStr: cachedGlobalQueryState.current.timerange.toStr,
        })
      );
    }
    dispatch(
      setFilterQuery({
        id: InputsModelId.global,
        query: cachedGlobalQueryState.current.query.query,
        language: cachedGlobalQueryState.current.query.language,
      })
    );
    // Using filterManager directly as dispatch(setSearchBarFilter()) was not replacing filters
    filterManager.removeAll();
    filterManager.addFilters(cachedGlobalQueryState.current.filters);
    remove(successToastId.current);
  }, [dispatch, filterManager, remove]);

  return useCallback(
    (executionId: string, executionStart: string) => {
      const dataViewAsViewBase = newDataViewPickerEnabled
        ? experimentalDataView
        : dataViewSpecToViewBase(oldSourcererDataView);

      if (uuidDataViewField == null || !dataViewAsViewBase) {
        addError(i18n.ACTIONS_FIELD_NOT_FOUND_ERROR, {
          title: i18n.ACTIONS_FIELD_NOT_FOUND_ERROR_TITLE,
        });
        return;
      }

      cachedGlobalQueryState.current = { filters, query, timerange };
      const filter = buildFilter(
        dataViewAsViewBase,
        uuidDataViewField,
        FILTERS.PHRASE,
        false,
        false,
        executionId,
        null
      );
      dispatch(
        setAbsoluteRangeDatePicker({
          id: InputsModelId.global,
          from: moment(executionStart).subtract(1, 'days').toISOString(),
          to: moment(executionStart).add(1, 'days').toISOString(),
        })
      );
      filterManager.removeAll();
      filterManager.addFilters(filter);
      dispatch(
        setSearchBarFilter({ id: InputsModelId.global, filters: filterManager.getFilters() })
      );
      dispatch(setFilterQuery({ id: InputsModelId.global, query: '', language: 'kuery' }));
      selectAlertsTab();
      successToastId.current = addSuccess(
        {
          title: i18n.ACTIONS_SEARCH_FILTERS_HAVE_BEEN_UPDATED_TITLE,
          text: toMountPoint(
            <>
              <p>{i18n.ACTIONS_SEARCH_FILTERS_HAVE_BEEN_UPDATED_DESCRIPTION}</p>
              <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiButton size="s" onClick={resetGlobalQueryState}>
                    {i18n.ACTIONS_SEARCH_FILTERS_HAVE_BEEN_UPDATED_RESTORE_BUTTON}
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </>,
            startServices
          ),
        },
        { toastLifeTimeMs: 10 * 60 * 1000 }
      ).id;
    },
    [
      newDataViewPickerEnabled,
      experimentalDataView,
      oldSourcererDataView,
      uuidDataViewField,
      filters,
      query,
      timerange,
      dispatch,
      filterManager,
      selectAlertsTab,
      addSuccess,
      resetGlobalQueryState,
      startServices,
      addError,
    ]
  );
};
