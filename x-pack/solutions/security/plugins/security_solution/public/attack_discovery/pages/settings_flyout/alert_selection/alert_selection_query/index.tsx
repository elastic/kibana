/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OnTimeChangeProps, EuiSuperUpdateButtonProps } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiSuperDatePicker, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { FilterManager } from '@kbn/data-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { Filter, Query } from '@kbn/es-query';
import { debounce } from 'lodash/fp';
import React, { useCallback, useMemo } from 'react';

import { useIsExperimentalFeatureEnabled } from '../../../../../common/hooks/use_experimental_features';
import { useKibana } from '../../../../../common/lib/kibana';
import { getCommonTimeRanges } from '../helpers/get_common_time_ranges';
import { useSourcererDataView } from '../../../../../sourcerer/containers';
import { SourcererScopeName } from '../../../../../sourcerer/store/model';
import { useCreateDataView } from '../../../../../common/hooks/use_create_data_view';
import type { AlertsSelectionSettings } from '../../types';
import { useDataView } from '../../../../../data_view_manager/hooks/use_data_view';

export const MAX_ALERTS = 500;
export const MIN_ALERTS = 50;
export const STEP = 50;
export const NO_INDEX_PATTERNS: DataView[] = [];

const updateButtonProps: EuiSuperUpdateButtonProps = {
  fill: false,
};

interface Props {
  filterManager: FilterManager;
  onSettingsChanged?: (settings: AlertsSelectionSettings) => void;
  settings: AlertsSelectionSettings;
}

const AlertSelectionQueryComponent: React.FC<Props> = ({
  filterManager,
  onSettingsChanged,
  settings,
}) => {
  const {
    unifiedSearch: {
      ui: { SearchBar },
    },
  } = useKibana().services;
  const { euiTheme } = useEuiTheme();

  const newDataViewPickerEnabled = useIsExperimentalFeatureEnabled('newDataViewPickerEnabled');
  const { dataView: experimentalDataView, status } = useDataView(SourcererScopeName.detections);

  // get the sourcerer `DataViewSpec` for alerts:
  const { sourcererDataView: oldSourcererDataViewSpec, loading: oldIsLoadingIndexPattern } =
    useSourcererDataView(SourcererScopeName.detections);

  // create a `DataView` from the `DataViewSpec`:
  const { dataView: oldDataView, loading: oldIsLoadingDataView } = useCreateDataView({
    dataViewSpec: oldSourcererDataViewSpec,
    loading: oldIsLoadingIndexPattern,
    skip: newDataViewPickerEnabled, // skip data view creation if the new data view picker is enabled
  });

  const alertsDataView = newDataViewPickerEnabled ? experimentalDataView : oldDataView;
  const isLoadingIndexPattern = newDataViewPickerEnabled
    ? status !== 'ready'
    : oldIsLoadingDataView;

  // create a container for the alerts `DataView`, as required by the search bar:
  const indexPatterns: DataView[] = useMemo(
    () => (alertsDataView ? [alertsDataView] : NO_INDEX_PATTERNS),
    [alertsDataView]
  );

  // Users accumulate an "unsubmitted" query as they type in the search bar,
  // but have not pressed the 'Enter' key to submit the query, (which would
  // call `onQuerySubmit`).
  //
  // This unsubmitted query is stored in `unSubmittedQuery`.
  //
  // To match the behavior of Discover, `setQuery` must be called with the
  // `unSubmittedQuery` query when:
  //
  // 1) The user selects a new time range
  // 2) The user clicks the refresh button
  //
  // Also to match the behavior of Discover, we must NOT call `setQuery` with
  // the `unSubmittedQuery` query when the user clicks the `Save` button.
  const [unSubmittedQuery, setUnSubmittedQuery] = React.useState<Query['query'] | undefined>(
    undefined
  );

  /**
   * `debouncedOnQueryChange` is called by the `SearchBar` as the user types in the input
   */
  const debouncedOnQueryChange = useCallback((inputQuery: Query['query'] | undefined) => {
    const debouncedFunction = debounce(100, (debouncedQuery: Query['query'] | undefined) => {
      setUnSubmittedQuery(debouncedQuery);
    });

    return debouncedFunction(inputQuery);
  }, []);

  // get the common time ranges for the date picker:
  const commonlyUsedRanges = useMemo(() => getCommonTimeRanges(), []);

  /**
   * `onTimeChange` is called by the `EuiSuperDatePicker` when the user:
   * 1) selects a new time range
   * 2) clicks the refresh button
   */
  const onTimeChange = useCallback(
    ({ start: startDate, end: endDate }: OnTimeChangeProps) => {
      const query =
        unSubmittedQuery != null
          ? {
              query: unSubmittedQuery, // <-- set the query to the unsubmitted query
              language: 'kuery',
            }
          : settings.query;
      const updatedSettings = {
        ...settings,
        end: endDate,
        start: startDate,
        query,
      };
      onSettingsChanged?.(updatedSettings);
    },
    [onSettingsChanged, settings, unSubmittedQuery]
  );

  /**
   * `onFiltersUpdated` is called by the `SearchBar` when the filters, (which
   * appear below the `SearchBar` input), are updated.
   */
  const onFiltersUpdated = useCallback(
    (newFilters: Filter[]) => {
      filterManager.setFilters(newFilters);
    },
    [filterManager]
  );

  /**
   * `onQuerySubmit` is called by the `SearchBar` when the user presses `Enter`
   */
  const onQuerySubmit = useCallback(
    ({ query: newQuery }: { query?: Query | undefined }) => {
      if (newQuery != null) {
        onSettingsChanged?.({
          ...settings,
          query: newQuery,
        });
      }
    },
    [onSettingsChanged, settings]
  );

  return (
    <EuiFlexGroup
      css={css`
        gap: ${euiTheme.size.s};
      `}
      data-test-subj="alertSelectionQuery"
      gutterSize="none"
      wrap={true}
    >
      <EuiFlexItem
        css={css`
          .uniSearchBar {
            padding: 0;
          }
        `}
        grow={2}
      >
        <SearchBar
          appName="siem"
          data-test-subj="alertSelectionSearchBar"
          indexPatterns={indexPatterns}
          filters={settings.filters}
          showDatePicker={false}
          showFilterBar={true}
          showQueryInput={true}
          showSavedQueryControls={false}
          showSubmitButton={false}
          isLoading={isLoadingIndexPattern}
          onFiltersUpdated={onFiltersUpdated}
          onQueryChange={({ query: debouncedQuery }) => {
            debouncedOnQueryChange(debouncedQuery?.query);
          }}
          onQuerySubmit={onQuerySubmit}
          query={settings.query}
        />
      </EuiFlexItem>

      <EuiFlexItem
        css={css`
          min-width: 308px;
        `}
        grow={1}
      >
        <EuiSuperDatePicker
          commonlyUsedRanges={commonlyUsedRanges}
          data-test-subj="alertSelectionDatePicker"
          end={settings.end}
          isDisabled={false}
          onTimeChange={onTimeChange}
          showUpdateButton="iconOnly"
          start={settings.start}
          updateButtonProps={updateButtonProps}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

AlertSelectionQueryComponent.displayName = 'AlertSelectionQuery';

export const AlertSelectionQuery = React.memo(AlertSelectionQueryComponent);
