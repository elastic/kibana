/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem, EuiText, useEuiTheme } from '@elastic/eui';
import { ENTITY_INVENTORY_APP_NAME } from '../constants';
import type { EntityInventorySearchSubmitPayload } from '../context/entity_inventory_search_context';
import { useEntityInventorySearch } from '../context/entity_inventory_search_context';
import { useEntityInventoryDataView } from '../hooks/use_entity_inventory_data_view';
import { useEntityInventoryKibana } from '../hooks/use_kibana';
import { MAX_TIME_RANGE_HINT, SEARCH_BAR_PLACEHOLDERS } from '../translations';

export const EntityInventorySearchBar = () => {
  const { euiTheme } = useEuiTheme();
  const {
    services: { unifiedSearch },
  } = useEntityInventoryKibana();
  const { entityType, query, filters, dateRange, setFilters, submit } = useEntityInventorySearch();
  const { dataView } = useEntityInventoryDataView();
  // SearchBar only resyncs its picker when the range props change, so remount it whenever the
  // committed range differs from the submitted one (e.g. a repeated over-limit pick).
  const [searchBarKey, setSearchBarKey] = useState(0);

  const onQuerySubmit = useCallback(
    ({ dateRange: submittedRange, query: submittedQuery }: EntityInventorySearchSubmitPayload) => {
      const committedRange = submit({ dateRange: submittedRange, query: submittedQuery });
      if (committedRange.from !== submittedRange.from || committedRange.to !== submittedRange.to) {
        setSearchBarKey((key) => key + 1);
      }
    },
    [submit]
  );

  const { SearchBar } = unifiedSearch.ui;

  return (
    <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
      <EuiFlexItem>
        <SearchBar
          key={searchBarKey}
          appName={ENTITY_INVENTORY_APP_NAME}
          dataTestSubj="entityInventorySearchBar"
          displayStyle="inPage"
          iconType="magnify"
          placeholder={SEARCH_BAR_PLACEHOLDERS[entityType]}
          indexPatterns={dataView ? [dataView] : undefined}
          useDefaultBehaviors={false}
          enableDateRangePicker={false}
          showDatePicker
          showFilterBar
          showQueryInput
          showQueryMenu
          showSubmitButton
          showSavedQueryControls={false}
          isAutoRefreshDisabled
          isRefreshPaused
          query={query}
          filters={filters}
          dateRangeFrom={dateRange.from}
          dateRangeTo={dateRange.to}
          onQuerySubmit={onQuerySubmit}
          onFiltersUpdated={setFilters}
        />
      </EuiFlexItem>
      <EuiFlexItem
        grow={false}
        css={css`
          justify-content: center;
          min-height: ${euiTheme.size.xxl};
        `}
      >
        <EuiText size="xs" color="subdued" data-test-subj="entityInventoryMaxTimeRangeHint">
          {MAX_TIME_RANGE_HINT}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
