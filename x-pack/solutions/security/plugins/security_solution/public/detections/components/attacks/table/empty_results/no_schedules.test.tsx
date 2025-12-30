/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import {
  NoSchedules,
  NO_SCHEDULES_DATA_TEST_ID,
  NO_SCHEDULES_ACTION_BUTTON_DATA_TEST_ID,
} from './no_schedules';

describe('NoSchedules', () => {
  const openSchedulesFlyout = jest.fn();

  afterEach(() => {
    openSchedulesFlyout.mockClear();
  });

  test('renders correctly', () => {
    const { getByTestId } = render(<NoSchedules openSchedulesFlyout={openSchedulesFlyout} />);
    expect(getByTestId(NO_SCHEDULES_DATA_TEST_ID)).toBeInTheDocument();
  });

  test('renders the correct title', () => {
    const { getByTestId } = render(<NoSchedules openSchedulesFlyout={openSchedulesFlyout} />);
    expect(getByTestId(NO_SCHEDULES_DATA_TEST_ID)).toHaveTextContent(
      'Automate attack discoveries for your alerts'
    );
  });

  test('renders the correct body', () => {
    const { getByTestId } = render(<NoSchedules openSchedulesFlyout={openSchedulesFlyout} />);
    expect(getByTestId(NO_SCHEDULES_DATA_TEST_ID)).toHaveTextContent(
      'Schedule recurring scans to find attacks without manual effort.'
    );
  });

  test('renders the correct action button text', () => {
    const { getByTestId } = render(<NoSchedules openSchedulesFlyout={openSchedulesFlyout} />);
    expect(getByTestId(NO_SCHEDULES_ACTION_BUTTON_DATA_TEST_ID)).toHaveTextContent('Schedule');
  });

  test('calls openSchedulesFlyout when action button is clicked', () => {
    const { getByTestId } = render(<NoSchedules openSchedulesFlyout={openSchedulesFlyout} />);
    const button = getByTestId(NO_SCHEDULES_ACTION_BUTTON_DATA_TEST_ID);

    fireEvent.click(button);

    expect(openSchedulesFlyout).toHaveBeenCalledTimes(1);
  });
});
