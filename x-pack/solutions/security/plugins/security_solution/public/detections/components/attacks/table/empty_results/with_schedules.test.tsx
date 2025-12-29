/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { WithSchedules, WITH_SCHEDULES_DATA_TEST_ID } from './with_schedules';

describe('WithSchedules', () => {
  test('renders correctly and handles click', () => {
    const openSchedulesFlyout = jest.fn();
    const { getByTestId, getByText } = render(
      <WithSchedules openSchedulesFlyout={openSchedulesFlyout} />
    );
    expect(getByTestId(WITH_SCHEDULES_DATA_TEST_ID)).toBeInTheDocument();

    const button = getByText('View schedules'); // WITH_SCHEDULES_ACTION defaultMessage is 'View schedules'
    fireEvent.click(button);
    expect(openSchedulesFlyout).toHaveBeenCalledTimes(1);
  });
});
