/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useEffect, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { isLogicalAndField } from '../../../../../../../common/constants';
import { MonitorFiltersResult } from '../../../../../../../common/runtime_types';
import {
  MonitorFilterState,
  selectMonitorFiltersAndQueryState,
  setOverviewPageStateAction,
  updateManagementPageStateAction,
  fetchMonitorFiltersAction,
  selectMonitorFilterOptions,
  selectOverviewState,
} from '../../../../state';
import { useSyntheticsRefreshContext } from '../../../../contexts';
import { SyntheticsUrlParams } from '../../../../utils/url_params';
import { useUrlParams } from '../../../../hooks';
import {
  getMonitorFilterFields,
  getSyntheticsFilterKeyForLabel,
  SyntheticsMonitorFilterChangeHandler,
  SyntheticsMonitorFilterField,
} from '../../../../utils/filters/filter_fields';

export const useFilters = (): MonitorFiltersResult | null => {
  const dispatch = useDispatch();
  const filtersData = useSelector(selectMonitorFilterOptions);
  const { lastRefresh } = useSyntheticsRefreshContext();
  const {
    pageState: { showFromAllSpaces },
  } = useSelector(selectOverviewState);

  useEffect(() => {
    dispatch(
      fetchMonitorFiltersAction.get({
        showFromAllSpaces,
      })
    );
  }, [lastRefresh, dispatch, showFromAllSpaces]);

  return filtersData;
};

type FilterFieldWithQuery = SyntheticsMonitorFilterField | 'query';

export function useMonitorFiltersState() {
  const [getUrlParams, updateUrlParams] = useUrlParams();
  const urlParams = getUrlParams();

  const filterFieldsWithQuery: FilterFieldWithQuery[] = useMemo(() => {
    const filterFields = getMonitorFilterFields();
    return [...filterFields, 'query'];
  }, []);

  const dispatch = useDispatch();
  const { useLogicalAndFor } = urlParams;

  useEffect(() => {
    dispatch(
      setOverviewPageStateAction({
        useLogicalAndFor,
      })
    );
    dispatch(
      updateManagementPageStateAction({
        useLogicalAndFor,
      })
    );
  }, [dispatch, useLogicalAndFor]);

  const serializeFilterValue = useCallback(
    (field: FilterFieldWithQuery, selectedValues: string[] | undefined) => {
      if (field === 'query') {
        return selectedValues?.length ? selectedValues.toString() : undefined;
      }

      return selectedValues && selectedValues.length > 0
        ? JSON.stringify(
            selectedValues.map((value) => getSyntheticsFilterKeyForLabel(value, field))
          )
        : undefined;
    },
    []
  );

  const serializeStateValues = useCallback(
    (state: MonitorFilterState) => {
      return filterFieldsWithQuery.reduce(
        (acc, cur) => ({
          ...acc,
          [cur]: serializeFilterValue(
            cur as SyntheticsMonitorFilterField,
            state[cur as SyntheticsMonitorFilterField]
          ),
        }),
        {}
      );
    },
    [filterFieldsWithQuery, serializeFilterValue]
  );

  const handleFilterChange: SyntheticsMonitorFilterChangeHandler = useCallback(
    (
      field: SyntheticsMonitorFilterField,
      selectedValues: string[] | undefined,
      isLogicalAND?: boolean
    ) => {
      const newUrlParams: Partial<Record<SyntheticsMonitorFilterField, string>> = {
        [field]: serializeFilterValue(field, selectedValues),
      };

      if (isLogicalAndField(field)) {
        const currentUseLogicalAndFor = urlParams.useLogicalAndFor || [];
        newUrlParams.useLogicalAndFor = serializeFilterValue(
          'useLogicalAndFor',
          // When all the values are deselected remove the useLogicalAndFor for the field
          isLogicalAND && selectedValues?.length
            ? [...currentUseLogicalAndFor, field]
            : currentUseLogicalAndFor.filter((item: string) => item !== field)
        );
      }
      // Update url to reflect the changed filter
      updateUrlParams(newUrlParams);
    },
    [serializeFilterValue, updateUrlParams, urlParams.useLogicalAndFor]
  );

  const reduxState = useSelector(selectMonitorFiltersAndQueryState);
  const reduxStateSnapshot = JSON.stringify(serializeStateValues(reduxState));
  const urlState = filterFieldsWithQuery.reduce(
    (acc, cur) => ({ ...acc, [cur]: urlParams[cur as keyof SyntheticsUrlParams] }),
    {}
  );
  const urlStateSerializedSnapshot = JSON.stringify(serializeStateValues(urlState));

  const isUrlHydratedFromRedux = useRef(false);
  useEffect(() => {
    if (urlStateSerializedSnapshot !== reduxStateSnapshot) {
      if (
        urlStateSerializedSnapshot === '{}' &&
        reduxStateSnapshot !== '{}' &&
        !isUrlHydratedFromRedux.current
      ) {
        // Hydrate url only during initialization
        updateUrlParams(serializeStateValues(reduxState));
      } else {
        dispatch(updateManagementPageStateAction(urlState));
        dispatch(setOverviewPageStateAction(urlState));
      }
    }
    isUrlHydratedFromRedux.current = true;

    // Only depend on the serialized snapshot
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlStateSerializedSnapshot, reduxStateSnapshot]);

  return { handleFilterChange, filterState: reduxState };
}
