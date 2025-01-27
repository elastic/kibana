/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo, useCallback } from 'react';

import type { DataViewBase, Filter, Query } from '@kbn/es-query';
import type { FilterManager } from '@kbn/data-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { SearchBarProps } from '@kbn/unified-search-plugin/public';
import { SearchBar } from '@kbn/unified-search-plugin/public';

export interface FilterBarComponentProps {
  dataTestSubj?: string;
  indexPattern: DataViewBase;
  isLoading?: boolean;
  isRefreshPaused?: boolean;
  filterQuery: Query;
  filterManager: FilterManager;
  filters: Filter[];
  refreshInterval?: number;
  displayStyle?: SearchBarProps['displayStyle'];
}

export const FilterBar = memo<FilterBarComponentProps>(
  ({
    indexPattern,
    isLoading = false,
    isRefreshPaused,
    filterQuery,
    filterManager,
    filters,
    refreshInterval,
    dataTestSubj,
    displayStyle,
  }) => {
    const onFiltersUpdated = useCallback(
      (newFilters: Filter[]) => {
        filterManager.setFilters(newFilters);
      },
      [filterManager]
    );

    const indexPatterns = useMemo(() => [indexPattern], [indexPattern]);

    return (
      <SearchBar
        showSubmitButton={false}
        filters={filters}
        indexPatterns={indexPatterns as DataView[]}
        isLoading={isLoading}
        isRefreshPaused={isRefreshPaused}
        query={filterQuery}
        onFiltersUpdated={onFiltersUpdated}
        refreshInterval={refreshInterval}
        showAutoRefreshOnly={false}
        showFilterBar={true}
        showDatePicker={false}
        showQueryInput={false}
        showSaveQuery={false}
        dataTestSubj={dataTestSubj}
        displayStyle={displayStyle}
      />
    );
  }
);

FilterBar.displayName = 'FilterBar';
