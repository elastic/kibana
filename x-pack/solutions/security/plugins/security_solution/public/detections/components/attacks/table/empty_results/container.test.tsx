/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import {
  EmptyResultsContainer,
  EMPTY_RESULTS_CONTAINER_DATA_TEST_ID,
  EMPTY_RESULTS_MESSAGE_DATA_TEST_ID,
  EMPTY_RESULTS_FOOTER_DATA_TEST_ID,
  LEARN_MORE_LINK_DATA_TEST_ID,
  EMPTY_RESULTS_LOADING_SPINNER_TEST_ID,
} from './container';
import { useFindAttackDiscoverySchedules } from '../../../../../attack_discovery/pages/settings_flyout/schedule/logic/use_find_schedules';
import { NO_SCHEDULES_DATA_TEST_ID } from './no_schedules';
import { WITH_SCHEDULES_DATA_TEST_ID } from './with_schedules';
import { RESET_FILTERS_DATA_TEST_ID } from './reset_filters';

jest.mock(
  '../../../../../attack_discovery/pages/settings_flyout/schedule/logic/use_find_schedules'
);

const mockUseFindAttackDiscoverySchedules = useFindAttackDiscoverySchedules as jest.Mock;

const renderWithIntl = (component: React.ReactElement) => {
  return render(<I18nProvider>{component}</I18nProvider>);
};

describe('EmptyResultsContainer', () => {
  const openSchedulesFlyout = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders loading spinner when loading', () => {
    mockUseFindAttackDiscoverySchedules.mockReturnValue({
      isLoading: true,
      data: { total: 0, schedules: [] },
    });

    const { getByTestId } = renderWithIntl(
      <EmptyResultsContainer hasFilters={false} openSchedulesFlyout={openSchedulesFlyout} />
    );
    expect(getByTestId(EMPTY_RESULTS_LOADING_SPINNER_TEST_ID)).toBeInTheDocument();
  });

  test('renders ResetFilters when hasFilters is true', () => {
    mockUseFindAttackDiscoverySchedules.mockReturnValue({
      isLoading: false,
      data: { total: 0, schedules: [] },
    });

    const { getByTestId } = renderWithIntl(
      <EmptyResultsContainer hasFilters={true} openSchedulesFlyout={openSchedulesFlyout} />
    );
    expect(getByTestId(EMPTY_RESULTS_CONTAINER_DATA_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(EMPTY_RESULTS_MESSAGE_DATA_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(EMPTY_RESULTS_FOOTER_DATA_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(LEARN_MORE_LINK_DATA_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(RESET_FILTERS_DATA_TEST_ID)).toBeInTheDocument();
  });

  test('renders NoSchedules when hasFilters is false and total schedules is 0', () => {
    mockUseFindAttackDiscoverySchedules.mockReturnValue({
      isLoading: false,
      data: { total: 0, schedules: [] },
    });

    const { getByTestId } = renderWithIntl(
      <EmptyResultsContainer hasFilters={false} openSchedulesFlyout={openSchedulesFlyout} />
    );
    expect(getByTestId(NO_SCHEDULES_DATA_TEST_ID)).toBeInTheDocument();
  });

  test('renders WithSchedules when hasFilters is false and total schedules > 0', () => {
    mockUseFindAttackDiscoverySchedules.mockReturnValue({
      isLoading: false,
      data: { total: 1, schedules: [{}] },
    });

    const { getByTestId } = renderWithIntl(
      <EmptyResultsContainer hasFilters={false} openSchedulesFlyout={openSchedulesFlyout} />
    );
    expect(getByTestId(WITH_SCHEDULES_DATA_TEST_ID)).toBeInTheDocument();
  });
});
