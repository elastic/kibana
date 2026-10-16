/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import type { StatefulSearchBarProps } from '@kbn/unified-search-plugin/public';
import { useKibanaServices } from '../hooks/use_kibana_services';
import { useTimeRange } from '../hooks/use_time_range';

type OnQuerySubmit = NonNullable<StatefulSearchBarProps['onQuerySubmit']>;

/**
 * Date picker of the app, rendered through Unified Search (date picker only) so it follows Kibana's
 * picker: quick ranges from advanced settings and the new date range picker behind its flag.
 */
export function TimeRangePicker({ onRefresh }: { onRefresh: () => void }) {
  const { unifiedSearch } = useKibanaServices();
  const { timeRange, setTimeRange } = useTimeRange();

  // Unified Search reports `isUpdate: false` when the range did not change, i.e. the Refresh button.
  const onQuerySubmit = useCallback<OnQuerySubmit>(
    ({ dateRange }, isUpdate) => {
      if (isUpdate) {
        setTimeRange({ rangeFrom: dateRange.from, rangeTo: dateRange.to });
        return;
      }
      onRefresh();
    },
    [setTimeRange, onRefresh]
  );

  return (
    <unifiedSearch.ui.SearchBar
      appName="digitalExperience"
      displayStyle="inPage"
      showDatePicker
      showQueryInput={false}
      showFilterBar={false}
      showQueryMenu={false}
      disableQueryLanguageSwitcher
      isAutoRefreshDisabled
      submitButtonStyle="iconOnly"
      dateRangeFrom={timeRange.rangeFrom}
      dateRangeTo={timeRange.rangeTo}
      onQuerySubmit={onQuerySubmit}
    />
  );
}
