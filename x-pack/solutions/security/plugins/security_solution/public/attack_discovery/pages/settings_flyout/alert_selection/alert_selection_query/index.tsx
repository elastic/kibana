/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OnTimeChangeProps } from '@elastic/eui';
import { EuiSuperDatePicker, EuiSpacer } from '@elastic/eui';
import { css } from '@emotion/react';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { Filter, Query } from '@kbn/es-query';
import { debounce } from 'lodash/fp';
import React, { useCallback, useMemo } from 'react';

import { useKibana } from '../../../../../common/lib/kibana';
import { getCommonTimeRanges } from '../helpers/get_common_time_ranges';
import { useSourcererDataView } from '../../../../../sourcerer/containers';
import { SourcererScopeName } from '../../../../../sourcerer/store/model';
import * as i18n from '../translations';
import { useDataView } from '../use_data_view';

export const MAX_ALERTS = 500;
export const MIN_ALERTS = 50;
export const STEP = 50;
export const NO_INDEX_PATTERNS: DataView[] = [];

interface Props {
  end: string;
  filters: Filter[];
  query: Query;
  setEnd: React.Dispatch<React.SetStateAction<string>>;
  setFilters: React.Dispatch<React.SetStateAction<Filter[]>>;
  setQuery: React.Dispatch<React.SetStateAction<Query>>;
  setStart: React.Dispatch<React.SetStateAction<string>>;
  start: string;
}

const AlertSelectionQueryComponent: React.FC<Props> = ({
  end,
  filters,
  query,
  setEnd,
  setFilters,
  setQuery,
  setStart,
  start,
}) => {
  const {
    unifiedSearch: {
      ui: { SearchBar },
    },
  } = useKibana().services;

  // get the sourcerer `DataViewSpec` for alerts:
  const { sourcererDataView, loading: isLoadingIndexPattern } = useSourcererDataView(
    SourcererScopeName.detections
  );

  // create a `DataView` from the `DataViewSpec`:
  const alertsDataView = useDataView({
    dataViewSpec: sourcererDataView,
    loading: isLoadingIndexPattern,
  });

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
      if (unSubmittedQuery != null) {
        const newUnSubmittedQuery: Query = {
          query: unSubmittedQuery,
          language: 'kuery',
        };

        setQuery(newUnSubmittedQuery); // <-- set the query to the unsubmitted query
      }

      setStart(startDate);
      setEnd(endDate);
    },
    [setEnd, setQuery, setStart, unSubmittedQuery]
  );

  /**
   * `onFiltersUpdated` is called by the `SearchBar` when the filters, (which
   * appear belew the `SearchBar` input), are updated.
   */
  const onFiltersUpdated = useCallback(
    (newFilters: Filter[]) => {
      setFilters(newFilters);
    },
    [setFilters]
  );

  /**
   * `onQuerySubmit` is called by the `SearchBar` when the user presses `Enter`
   */
  const onQuerySubmit = useCallback(
    ({ query: newQuery }: { query?: Query | undefined }) => {
      if (newQuery != null) {
        setQuery(newQuery);
      }
    },
    [setQuery]
  );

  return (
    <>
      <div
        css={css`
          .uniSearchBar {
            padding: 0;
          }
        `}
        data-test-subj="alertSelectionQuery"
      >
        <SearchBar
          appName="siem"
          data-test-subj="alertSelectionSearchBar"
          indexPatterns={indexPatterns}
          filters={filters}
          showDatePicker={false}
          showFilterBar={true}
          showQueryInput={true}
          showSubmitButton={false}
          isLoading={isLoadingIndexPattern}
          onFiltersUpdated={onFiltersUpdated}
          onQueryChange={({ query: debouncedQuery }) => {
            debouncedOnQueryChange(debouncedQuery?.query);
          }}
          onQuerySubmit={onQuerySubmit}
          placeholder={i18n.FILTER_YOUR_DATA}
          query={query}
        />
      </div>

      <EuiSpacer size="xs" />
      <EuiSpacer size="s" />

      <EuiSuperDatePicker
        commonlyUsedRanges={commonlyUsedRanges}
        data-test-subj="alertSelectionDatePicker"
        end={end}
        isDisabled={false}
        onTimeChange={onTimeChange}
        showUpdateButton="iconOnly"
        start={start}
      />
    </>
  );
};

AlertSelectionQueryComponent.displayName = 'AlertSelectionQuery';

export const AlertSelectionQuery = React.memo(AlertSelectionQueryComponent);
