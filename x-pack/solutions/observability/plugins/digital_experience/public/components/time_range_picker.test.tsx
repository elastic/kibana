/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render } from '@testing-library/react';
import type { StatefulSearchBarProps } from '@kbn/unified-search-plugin/public';
import { TimeRangePicker } from './time_range_picker';
import { useKibanaServices } from '../hooks/use_kibana_services';
import { useTimeRange } from '../hooks/use_time_range';

jest.mock('../hooks/use_kibana_services');
jest.mock('../hooks/use_time_range');

const SearchBar = jest.fn((_props: Partial<StatefulSearchBarProps>) => null);
const setTimeRange = jest.fn();
const onRefresh = jest.fn();

const renderPicker = () => {
  jest.mocked(useKibanaServices).mockReturnValue({
    unifiedSearch: { ui: { SearchBar } },
  } as unknown as ReturnType<typeof useKibanaServices>);
  jest.mocked(useTimeRange).mockReturnValue({
    timeRange: { rangeFrom: 'now-15m', rangeTo: 'now' },
    isTimeRangeInUrl: true,
    setTimeRange,
  });

  render(<TimeRangePicker onRefresh={onRefresh} />);
  return SearchBar.mock.calls[SearchBar.mock.calls.length - 1][0];
};

describe('TimeRangePicker', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders only the date picker, with the current time range', () => {
    const props = renderPicker();

    expect(props).toMatchObject({
      showDatePicker: true,
      showQueryInput: false,
      showFilterBar: false,
      isAutoRefreshDisabled: true,
      dateRangeFrom: 'now-15m',
      dateRangeTo: 'now',
    });
  });

  it('sets a new time range when the range changed', () => {
    const { onQuerySubmit } = renderPicker();

    act(() => onQuerySubmit?.({ dateRange: { from: 'now-7d', to: 'now' } }, true));

    expect(setTimeRange).toHaveBeenCalledWith({ rangeFrom: 'now-7d', rangeTo: 'now' });
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it('refreshes when the range did not change', () => {
    const { onQuerySubmit } = renderPicker();

    act(() => onQuerySubmit?.({ dateRange: { from: 'now-15m', to: 'now' } }, false));

    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(setTimeRange).not.toHaveBeenCalled();
  });
});
