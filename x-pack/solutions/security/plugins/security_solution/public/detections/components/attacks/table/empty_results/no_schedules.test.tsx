/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { NoSchedules, NO_SCHEDULES_DATA_TEST_ID } from './no_schedules';

describe('NoSchedules', () => {
  test('renders correctly and handles click', () => {
    const openSchedulesFlyout = jest.fn();
    const { getByTestId, getByText } = render(
      <NoSchedules openSchedulesFlyout={openSchedulesFlyout} />
    );
    expect(getByTestId(NO_SCHEDULES_DATA_TEST_ID)).toBeInTheDocument();

    const button = getByText('Schedule'); // Assuming the button text is 'Schedule' or I should use the translation key if I mocked i18n, but here it seems I can just check for button presence or text.
    // Actually, the text comes from i18n.NO_SCHEDULES_ACTION. Since I am not mocking i18n here (it's imported from translations), it should be the actual text.
    // Let's check translations.ts content again.
    // NO_SCHEDULES_ACTION defaultMessage is 'Schedule'.

    fireEvent.click(button);
    expect(openSchedulesFlyout).toHaveBeenCalledTimes(1);
  });
});
