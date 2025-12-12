/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSuperDatePicker,
  EuiButton,
  EuiFilterGroup,
  EuiFilterButton,
} from '@elastic/eui';
import type {
  OnRefreshChangeProps,
  DurationRange,
} from '@elastic/eui/src/components/date_picker/types';
import type { OnTimeChangeProps, OnRefreshProps } from '@elastic/eui';
import type { Query, TimeRange } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { usePluginContext } from '../../../hooks/use_plugin_context';

const COMMONLY_USED_RANGES: DurationRange[] = [
  {
    start: 'now-15m',
    end: 'now',
    label: i18n.translate('xpack.kubernetesPoc.searchBar.commonlyUsedRanges.last15Minutes', {
      defaultMessage: 'Last 15 minutes',
    }),
  },
  {
    start: 'now-1h',
    end: 'now',
    label: i18n.translate('xpack.kubernetesPoc.searchBar.commonlyUsedRanges.last1Hour', {
      defaultMessage: 'Last 1 hour',
    }),
  },
  {
    start: 'now-3h',
    end: 'now',
    label: i18n.translate('xpack.kubernetesPoc.searchBar.commonlyUsedRanges.last3Hours', {
      defaultMessage: 'Last 3 hours',
    }),
  },
  {
    start: 'now-24h',
    end: 'now',
    label: i18n.translate('xpack.kubernetesPoc.searchBar.commonlyUsedRanges.last24Hours', {
      defaultMessage: 'Last 24 hours',
    }),
  },
  {
    start: 'now-7d',
    end: 'now',
    label: i18n.translate('xpack.kubernetesPoc.searchBar.commonlyUsedRanges.last7Days', {
      defaultMessage: 'Last 7 days',
    }),
  },
];

const DEFAULT_TIME_RANGE: TimeRange = {
  from: 'now-15m',
  to: 'now',
};

export interface KubernetesSearchBarProps {
  /** Placeholder text for the search input */
  placeholder?: string;
  /** Initial time range */
  initialTimeRange?: TimeRange;
  /** Callback when search is submitted (Update button clicked) */
  onQuerySubmit?: (payload: { query?: Query; dateRange: TimeRange }) => void;
  /** Callback when refresh button is clicked (re-fetch with current time range) */
  onRefresh?: (dateRange: TimeRange) => void;
  /** Callback when time range changes in the picker (before submit) */
  onTimeRangeChange?: (dateRange: TimeRange) => void;
  /** Show the filter button group */
  showFilterButtons?: boolean;
  /** Whether the search bar is loading */
  isLoading?: boolean;
  /** The currently applied time range (used to detect pending changes) */
  appliedTimeRange?: TimeRange;
}

export const KubernetesSearchBar: React.FC<KubernetesSearchBarProps> = ({
  placeholder,
  initialTimeRange = DEFAULT_TIME_RANGE,
  onQuerySubmit,
  onRefresh,
  onTimeRangeChange,
  showFilterButtons = false,
  isLoading = false,
  appliedTimeRange,
}) => {
  const { plugins } = usePluginContext();
  const { unifiedSearch } = plugins;
  const { SearchBar } = unifiedSearch.ui;

  const [dateRange, setDateRange] = useState<TimeRange>(initialTimeRange);
  const [isPaused, setIsPaused] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(10000);

  // Determine if there are pending time range changes that haven't been applied
  const hasPendingChanges = useMemo(() => {
    if (!appliedTimeRange) return false;
    return dateRange.from !== appliedTimeRange.from || dateRange.to !== appliedTimeRange.to;
  }, [dateRange, appliedTimeRange]);

  const searchBarPlaceholder = useMemo(
    () =>
      placeholder ??
      i18n.translate('xpack.kubernetesPoc.searchBar.placeholder', {
        defaultMessage: 'Search hosts (E.g. cloud.provider:gcp AND os.type:linux)',
      }),
    [placeholder]
  );

  const handleTimeChange = useCallback(
    ({ start, end, isInvalid }: OnTimeChangeProps) => {
      if (!isInvalid) {
        const newDateRange = { from: start, to: end };
        setDateRange(newDateRange);
        onTimeRangeChange?.(newDateRange);
      }
    },
    [onTimeRangeChange]
  );

  const handleRefresh = useCallback(
    ({ start, end }: OnRefreshProps) => {
      onRefresh?.({ from: start, to: end });
    },
    [onRefresh]
  );

  const handleRefreshChange = useCallback(
    ({ isPaused: newIsPaused, refreshInterval: newRefreshInterval }: OnRefreshChangeProps) => {
      setIsPaused(newIsPaused);
      setRefreshInterval(newRefreshInterval);

      if (!newIsPaused) {
        // When auto refresh is enabled, force end to 'now'
        setDateRange((prev) => ({ ...prev, to: 'now' }));
      }
    },
    []
  );

  const handleQuerySubmit = useCallback(
    ({ query, dateRange: newDateRange }: { query?: Query; dateRange: TimeRange }) => {
      onQuerySubmit?.({ query, dateRange: newDateRange });
    },
    [onQuerySubmit]
  );

  const handleRefreshClick = useCallback(() => {
    onRefresh?.(dateRange);
  }, [onRefresh, dateRange]);

  const handleUpdateClick = useCallback(() => {
    onQuerySubmit?.({ dateRange });
  }, [onQuerySubmit, dateRange]);

  const handleButtonClick = useCallback(() => {
    if (hasPendingChanges) {
      handleUpdateClick();
    } else {
      handleRefreshClick();
    }
  }, [hasPendingChanges, handleUpdateClick, handleRefreshClick]);

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
      {/* Filter buttons on the left */}
      {showFilterButtons && (
        <EuiFlexItem grow={false}>
          <EuiFilterGroup compressed>
            <EuiFilterButton iconType="filter" hasActiveFilters={false} numActiveFilters={0}>
              {i18n.translate('xpack.kubernetesPoc.searchBar.addFilter', {
                defaultMessage: 'Add filter',
              })}
            </EuiFilterButton>
          </EuiFilterGroup>
        </EuiFlexItem>
      )}

      {/* Search bar */}
      <EuiFlexItem grow>
        <SearchBar
          appName="kubernetesPoc"
          displayStyle="inPage"
          iconType="search"
          placeholder={searchBarPlaceholder}
          showDatePicker={false}
          showSubmitButton={false}
          showFilterBar={false}
          showQueryInput
          showQueryMenu={false}
          onQuerySubmit={handleQuerySubmit}
          isLoading={isLoading}
        />
      </EuiFlexItem>

      {/* Date picker */}
      <EuiFlexItem grow={false}>
        <EuiSuperDatePicker
          start={dateRange.from}
          end={dateRange.to}
          isPaused={isPaused}
          refreshInterval={refreshInterval}
          onTimeChange={handleTimeChange}
          onRefresh={handleRefresh}
          onRefreshChange={handleRefreshChange}
          commonlyUsedRanges={COMMONLY_USED_RANGES}
          showUpdateButton={false}
          width="auto"
          compressed
        />
      </EuiFlexItem>

      {/* Refresh/Update button */}
      <EuiFlexItem grow={false}>
        <EuiButton
          data-test-subj="kubernetesPocKubernetesSearchBarRefreshButton"
          iconType={hasPendingChanges ? 'kqlFunction' : 'refresh'}
          onClick={handleButtonClick}
          isLoading={isLoading}
          size="s"
          color={hasPendingChanges ? 'success' : 'primary'}
          fill={false}
        >
          {hasPendingChanges
            ? i18n.translate('xpack.kubernetesPoc.searchBar.update', {
                defaultMessage: 'Update',
              })
            : i18n.translate('xpack.kubernetesPoc.searchBar.refresh', {
                defaultMessage: 'Refresh',
              })}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
