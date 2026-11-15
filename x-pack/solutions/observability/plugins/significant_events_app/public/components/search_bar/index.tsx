/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { StatefulSearchBarProps } from '@kbn/unified-search-plugin/public';
import { useKibana } from '../../hooks/use_kibana';
import { useTimeRange } from '../../hooks/use_time_range';
import { useTimeRangeUpdate } from '../../hooks/use_time_range_update';
import { useTimefilter } from '../../hooks/use_timefilter';

export type SignificantEventsSearchBarProps = Omit<StatefulSearchBarProps, 'appName'>;

export function SignificantEventsSearchBar({
  onQuerySubmit,
  ...props
}: SignificantEventsSearchBarProps) {
  const { unifiedSearch } = useKibana().dependencies.start;
  const { rangeFrom, rangeTo } = useTimeRange();
  const { updateTimeRange } = useTimeRangeUpdate();
  const { refresh } = useTimefilter();

  return (
    <unifiedSearch.ui.SearchBar
      appName="significantEventsApp"
      showDatePicker={false}
      showFilterBar={false}
      showQueryMenu={false}
      showQueryInput={false}
      submitButtonStyle="iconOnly"
      displayStyle="inPage"
      disableQueryLanguageSwitcher
      query={undefined}
      isAutoRefreshDisabled={true}
      onQuerySubmit={({ dateRange, query }, isUpdate) => {
        if (dateRange) {
          updateTimeRange(dateRange);
        }
        if (!isUpdate) {
          refresh();
        }
        onQuerySubmit?.({ dateRange, query }, isUpdate);
      }}
      dateRangeFrom={rangeFrom}
      dateRangeTo={rangeTo}
      {...props}
    />
  );
}
