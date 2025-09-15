/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { render, screen, waitFor } from '@testing-library/react';
import { createMemoryHistory, MemoryHistory } from 'history';
import React from 'react';
import { Router } from '@kbn/shared-ux-router';
import { useLocation } from 'react-router-dom';
import qs from 'query-string';
import { DatePicker } from './date_picker';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { of } from 'rxjs';
import { DatePickerContextProvider } from '../../../../context/date_picker_context/date_picker_context';
import userEvent from '@testing-library/user-event';

let history: MemoryHistory;

const mockRefreshTimeRange = jest.fn();
let mockHistoryPush: jest.SpyInstance;
let mockHistoryReplace: jest.SpyInstance;

function DatePickerWrapper() {
  const location = useLocation();

  const { rangeFrom, rangeTo, refreshInterval, refreshPaused } = qs.parse(location.search, {
    parseNumbers: true,
    parseBooleans: true,
  }) as {
    rangeFrom?: string;
    rangeTo?: string;
    refreshInterval?: number;
    refreshPaused?: boolean;
  };

  return (
    <DatePicker
      rangeFrom={rangeFrom}
      rangeTo={rangeTo}
      refreshInterval={refreshInterval}
      refreshPaused={refreshPaused}
      onTimeRangeRefresh={mockRefreshTimeRange}
    />
  );
}

function renderDatePicker(initialParams: {
  rangeFrom?: string;
  rangeTo?: string;
  refreshInterval?: number;
  refreshPaused?: boolean;
}) {
  const setTimeSpy = jest.fn();
  const getTimeSpy = jest.fn().mockReturnValue({});

  history = createMemoryHistory({
    initialEntries: [`/?${qs.stringify(initialParams)}`],
  });

  mockHistoryPush = jest.spyOn(history, 'push');
  mockHistoryReplace = jest.spyOn(history, 'replace');

  return {
    ...render(
      <Router history={history}>
        <KibanaContextProvider
          services={{
            data: {
              query: {
                timefilter: {
                  timefilter: {
                    setTime: setTimeSpy,
                    getTime: getTimeSpy,
                    getTimeDefaults: jest.fn().mockReturnValue({}),
                    getRefreshIntervalDefaults: jest.fn().mockReturnValue({}),
                    getRefreshInterval: jest.fn().mockReturnValue({}),
                  },
                },
              },
            },
            uiSettings: {
              get: (key: string) => [],
              get$: (key: string) => of(true),
            },
          }}
        >
          <DatePickerContextProvider>
            <DatePickerWrapper />
          </DatePickerContextProvider>
        </KibanaContextProvider>
      </Router>
    ),
    setTimeSpy,
    getTimeSpy,
  };
}

describe('DatePicker', () => {
  beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation(() => null);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('updates the URL when the date range changes', async () => {
    const user = userEvent.setup();
    renderDatePicker({
      rangeFrom: 'now-15m',
      rangeTo: 'now',
    });

    // It updates the URL when it doesn't contain the range.
    expect(mockHistoryReplace).toHaveBeenCalledTimes(1);
    expect(mockHistoryPush).toHaveBeenCalledTimes(0);

    const datePicker = screen.getByTestId('superDatePickerShowDatesButton');
    await user.click(datePicker);

    const lastDayButton = await screen.findByTestId('superDatePickerRelativeDateInputNumber');
    // weird fix since the input may not be cleared properly
    await user.clear(lastDayButton);
    await user.clear(lastDayButton);
    await user.type(lastDayButton, '30');

    const updateButton = screen.getByTestId('superDatePickerApplyTimeButton');
    await user.click(updateButton);

    // Wait for URL update
    await waitFor(() => {
      expect(mockHistoryPush).toHaveBeenCalledWith(
        expect.objectContaining({
          search: expect.stringContaining('rangeFrom=now-30m&rangeTo=now'),
        })
      );
    });
  });

  it('enables auto-refresh when refreshPaused is false', async () => {
    jest.useFakeTimers({ legacyFakeTimers: true });

    renderDatePicker({
      rangeFrom: 'now-15m',
      rangeTo: 'now',
      refreshPaused: false,
      refreshInterval: 1000,
    });
    expect(mockRefreshTimeRange).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1000);
    await waitFor(() => {
      expect(mockRefreshTimeRange).toHaveBeenCalled();
    });
  });

  it('disables auto-refresh when refreshPaused is true', async () => {
    jest.useFakeTimers({ legacyFakeTimers: true });
    renderDatePicker({
      rangeFrom: 'now-15m',
      rangeTo: 'now',
      refreshPaused: true,
      refreshInterval: 1000,
    });
    expect(mockRefreshTimeRange).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1000);
    await waitFor(() => {
      expect(mockRefreshTimeRange).not.toHaveBeenCalled();
    });
  });
});
