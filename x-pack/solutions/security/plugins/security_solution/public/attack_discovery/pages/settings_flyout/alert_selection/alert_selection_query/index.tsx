/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSuperUpdateButtonProps, OnTimeChangeProps } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiSuperDatePicker, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { FilterManager } from '@kbn/data-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { Filter, Query } from '@kbn/es-query';
import { debounce } from 'lodash/fp';
import React, { useCallback, useMemo } from 'react';
import { PageScope } from '../../../../../data_view_manager/constants';
import { useKibana } from '../../../../../common/lib/kibana';
import { getCommonTimeRanges } from '../helpers/get_common_time_ranges';
import type { AlertsSelectionSettings } from '../../types';
import { useDataView } from '../../../../../data_view_manager/hooks/use_data_view';

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

  const { dataView, status } = useDataView(PageScope.alerts);
  const isLoadingIndexPattern = status !== 'ready';

  // create a container for the alerts `DataView`, as required by the search bar:
  const indexPatterns: DataView[] = useMemo(
    () => (dataView ? [dataView] : NO_INDEX_PATTERNS),
    [dataView]
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

          .kbnQueryBar__wrap {
            height: ${euiTheme.size.xxl};
          }

          && .kbnQueryBar__textarea {
            height: ${euiTheme.size.xxl};
            min-height: ${euiTheme.size.xxl};
            padding-bottom: 10px;
            padding-top: 10px;
          }

          .kbnQueryBar__textareaWrap > .euiFormControlLayoutIcons {
            max-height: ${euiTheme.size.xxl};
          }

          .kbnQueryBar__filterButtonGroup .kbnFilterButtonGroup {
            align-items: center;
            display: flex;
            height: ${euiTheme.size.xxl};
          }

          .kbnQueryBar__filterButtonGroup .euiButtonIcon {
            align-items: center;
            background-color: ${euiTheme.colors.lightestShade};
            block-size: ${euiTheme.size.xxl};
            display: inline-flex;
            inline-size: ${euiTheme.size.xxl};
            justify-content: center;
          }

          && .kbnQueryBar__filterButtonGroup [data-test-subj='showQueryBarMenu'] {
            color: ${euiTheme.colors.textSubdued};
          }

          && .kbnQueryBar__filterButtonGroup [data-test-subj='addFilter'] {
            color: ${euiTheme.colors.emptyShade};
            position: relative;
          }

          && .kbnQueryBar__filterButtonGroup [data-test-subj='addFilter']::before {
            background-color: ${euiTheme.colors.primary};
            block-size: ${euiTheme.size.base};
            border-radius: 50%;
            content: '';
            inline-size: ${euiTheme.size.base};
            inset: 0;
            margin: auto;
            pointer-events: none;
            position: absolute;
          }

          &&
            .kbnQueryBar__filterButtonGroup
            [data-test-subj='addFilter']
            svg[data-icon-type='plusInCircleFilled']
            path:nth-of-type(2) {
            display: none;
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

          [data-test-subj='alertSelectionDatePicker'] .euiFormControlLayout__prepend {
            background-color: ${euiTheme.colors.lightestShade};
          }

          [data-test-subj='alertSelectionDatePicker']
            .euiFormControlLayout__prepend
            button.euiFormPrepend {
            background-color: ${euiTheme.colors.lightestShade};
          }
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
