/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import type { StatefulSearchBarProps } from '@kbn/unified-search-plugin/public';
import { DIGITAL_EXPERIENCE_FEATURE_ID } from '../../common/feature';
import { useKibanaServices } from '../hooks/use_kibana_services';
import { useTimeRange } from '../hooks/use_time_range';

type OnQuerySubmit = NonNullable<StatefulSearchBarProps['onQuerySubmit']>;

/** Date picker of the app, rendered by Unified Search so it follows Kibana's picker settings. */
export function TimeRangePicker({ onRefresh }: { onRefresh: () => void }) {
  const { unifiedSearch } = useKibanaServices();
  const { timeRange, setTimeRange } = useTimeRange();

  // `isUpdate` is false when the range did not change, which means Refresh was clicked.
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
      appName={DIGITAL_EXPERIENCE_FEATURE_ID}
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
