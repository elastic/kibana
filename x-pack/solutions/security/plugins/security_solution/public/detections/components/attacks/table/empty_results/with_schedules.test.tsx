/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import {
  WithSchedules,
  WITH_SCHEDULES_DATA_TEST_ID,
  WITH_SCHEDULES_ACTION_BUTTON_DATA_TEST_ID,
} from './with_schedules';

describe('WithSchedules', () => {
  const openSchedulesFlyout = jest.fn();

  afterEach(() => {
    openSchedulesFlyout.mockClear();
  });

  test('renders correctly', () => {
    const { getByTestId } = render(<WithSchedules openSchedulesFlyout={openSchedulesFlyout} />);
    expect(getByTestId(WITH_SCHEDULES_DATA_TEST_ID)).toBeInTheDocument();
  });

  test('renders the correct title', () => {
    const { getByTestId } = render(<WithSchedules openSchedulesFlyout={openSchedulesFlyout} />);
    expect(getByTestId(WITH_SCHEDULES_DATA_TEST_ID)).toHaveTextContent(
      'No attacks detected for selected time'
    );
  });

  test('renders the correct body', () => {
    const { getByTestId } = render(<WithSchedules openSchedulesFlyout={openSchedulesFlyout} />);
    expect(getByTestId(WITH_SCHEDULES_DATA_TEST_ID)).toHaveTextContent(
      'Scheduled runs happen automatically.'
    );
  });

  test('renders the correct action button text', () => {
    const { getByTestId } = render(<WithSchedules openSchedulesFlyout={openSchedulesFlyout} />);
    expect(getByTestId(WITH_SCHEDULES_ACTION_BUTTON_DATA_TEST_ID)).toHaveTextContent(
      'View schedules'
    );
  });

  test('calls openSchedulesFlyout when action button is clicked', () => {
    const { getByTestId } = render(<WithSchedules openSchedulesFlyout={openSchedulesFlyout} />);
    const button = getByTestId(WITH_SCHEDULES_ACTION_BUTTON_DATA_TEST_ID);

    fireEvent.click(button);

    expect(openSchedulesFlyout).toHaveBeenCalledTimes(1);
  });
});
