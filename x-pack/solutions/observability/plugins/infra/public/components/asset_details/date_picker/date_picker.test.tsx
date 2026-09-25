/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import { DatePicker } from './date_picker';
import { useDatePickerContext } from '../hooks/use_date_picker';

jest.mock('../hooks/use_date_picker');

const useDatePickerContextMock = useDatePickerContext as jest.MockedFunction<
  typeof useDatePickerContext
>;

const mockSetDateRange = jest.fn();
const mockSetAutoRefresh = jest.fn();
const mockOnRefresh = jest.fn();

const AUTO_REFRESH_TROUBLESHOOT_MESSAGE = 'Experiencing continually loading data?';

const mockDatePickerContext = (
  autoRefresh?: { isPaused: boolean; interval: number },
  dateRange = { from: 'now-15m', to: 'now' }
) => {
  useDatePickerContextMock.mockReturnValue({
    dateRange,
    autoRefresh,
    setDateRange: mockSetDateRange,
    setAutoRefresh: mockSetAutoRefresh,
    onRefresh: mockOnRefresh,
  } as unknown as ReturnType<typeof useDatePickerContext>);
};

const renderDatePicker = () =>
  render(
    <I18nProvider>
      <DatePicker />
    </I18nProvider>
  );

// The collapsed picker button repeats the selected range, so quick-menu queries are scoped to
// the popover to keep them unambiguous.
const openQuickMenu = async () => {
  await userEvent.click(screen.getByTestId('superDatePickerToggleQuickMenuButton'));

  return within(screen.getByTestId('superDatePickerQuickMenu'));
};

describe('DatePicker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDatePickerContext();
  });

  it('renders the quick menu toggle', () => {
    renderDatePicker();

    expect(screen.getByTestId('superDatePickerToggleQuickMenuButton')).toBeVisible();
  });

  it('applies a commonly used range picked from the quick menu', async () => {
    renderDatePicker();

    const quickMenu = await openQuickMenu();
    await userEvent.click(quickMenu.getByRole('button', { name: 'Last 1 hour' }));

    expect(mockSetDateRange).toHaveBeenCalledWith({ from: 'now-1h', to: 'now' });
  });

  it('offers the infra-specific commonly used ranges', async () => {
    renderDatePicker();

    const quickMenu = await openQuickMenu();

    for (const label of [
      'Last 15 minutes',
      'Last 1 hour',
      'Last 3 hours',
      'Last 24 hours',
      'Last 7 days',
    ]) {
      expect(quickMenu.getByRole('button', { name: label })).toBeInTheDocument();
    }
  });

  it('pins the end of the range to now when auto-refresh is started', async () => {
    mockDatePickerContext({ isPaused: true, interval: 5000 });
    renderDatePicker();

    const quickMenu = await openQuickMenu();
    await userEvent.click(quickMenu.getByTestId('superDatePickerToggleRefreshButton'));

    expect(mockSetAutoRefresh).toHaveBeenCalledWith({ isPaused: false, interval: 5000 });
    // Auto-refresh only advances when the range ends at `now`.
    expect(mockSetDateRange).toHaveBeenCalledWith({ from: 'now-15m', to: 'now' });
  });

  it('keeps the range untouched when auto-refresh is stopped', async () => {
    mockDatePickerContext({ isPaused: false, interval: 5000 });
    renderDatePicker();

    const quickMenu = await openQuickMenu();
    await userEvent.click(quickMenu.getByTestId('superDatePickerToggleRefreshButton'));

    expect(mockSetAutoRefresh).toHaveBeenCalledWith({ isPaused: true, interval: 5000 });
    expect(mockSetDateRange).not.toHaveBeenCalled();
  });

  it('explains how to troubleshoot while auto-refresh is running', () => {
    mockDatePickerContext({ isPaused: false, interval: 5000 });
    renderDatePicker();

    expect(screen.getByText(AUTO_REFRESH_TROUBLESHOOT_MESSAGE)).toBeInTheDocument();
  });

  it('hides the troubleshooting hint while auto-refresh is paused', () => {
    mockDatePickerContext({ isPaused: true, interval: 5000 });
    renderDatePicker();

    expect(screen.queryByText(AUTO_REFRESH_TROUBLESHOOT_MESSAGE)).not.toBeInTheDocument();
  });

  it('hides the troubleshooting hint when auto-refresh is not configured', () => {
    renderDatePicker();

    expect(screen.queryByText(AUTO_REFRESH_TROUBLESHOOT_MESSAGE)).not.toBeInTheDocument();
  });
});
