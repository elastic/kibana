/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';

import { ScheduleDetailsButton } from './schedule_details_button';

describe('ScheduleDetailsButton', () => {
  it('renders the button and tooltip', () => {
    const onClickMock = jest.fn();
    const { getByTestId, getByLabelText } = render(<ScheduleDetailsButton onClick={onClickMock} />);

    const button = getByTestId('scheduleButton');
    expect(button).toBeInTheDocument();
    expect(getByLabelText('Open schedule details')).toBeInTheDocument();
  });

  it('calls onClick when the button is clicked', () => {
    const onClickMock = jest.fn();
    const { getByTestId } = render(<ScheduleDetailsButton onClick={onClickMock} />);

    const button = getByTestId('scheduleButton');
    fireEvent.click(button);

    expect(onClickMock).toHaveBeenCalledTimes(1);
  });
});
