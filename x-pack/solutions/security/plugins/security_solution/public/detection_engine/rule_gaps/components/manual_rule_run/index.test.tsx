/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import moment from 'moment';
import { fireEvent, render, screen } from '@testing-library/react';
import { ManualRuleRunModal } from '.';
import { MAX_MANUAL_RULE_RUN_LOOKBACK_WINDOW_DAYS } from '../../../../../common/constants';

const convertToDatePickerFormat = (date: moment.Moment) => {
  return `${date.format('L')} ${date.format('LT')}`;
};

describe('ManualRuleRunModal', () => {
  const onCancelMock = jest.fn();
  const onConfirmMock = jest.fn();

  let startDatePicker: Element;
  let endDatePicker: Element;
  let confirmModalConfirmButton: HTMLElement;
  let cancelModalConfirmButton: HTMLElement;
  let timeRangeForm: HTMLElement;

  afterEach(() => {
    onCancelMock.mockReset();
    onConfirmMock.mockReset();
  });

  beforeEach(() => {
    render(<ManualRuleRunModal onCancel={onCancelMock} onConfirm={onConfirmMock} />);

    timeRangeForm = screen.getByTestId('manual-rule-run-time-range-form');
    startDatePicker = timeRangeForm.getElementsByClassName('start-date-picker')[0];
    endDatePicker = timeRangeForm.getElementsByClassName('end-date-picker')[0];
    confirmModalConfirmButton = screen.getByTestId('confirmModalConfirmButton');
    cancelModalConfirmButton = screen.getByTestId('confirmModalCancelButton');
  });

  it('should render modal', () => {
    expect(timeRangeForm).toBeInTheDocument();
    expect(cancelModalConfirmButton).toBeEnabled();
    expect(confirmModalConfirmButton).toBeEnabled();
  });

  it('should render confirmation button disabled if invalid time range has been selected', () => {
    expect(confirmModalConfirmButton).toBeEnabled();

    const now = moment();
    const startDate = now.clone().subtract(1, 'd');
    const endDate = now.clone().subtract(2, 'd');

    fireEvent.change(startDatePicker, {
      target: { value: convertToDatePickerFormat(startDate) },
    });
    fireEvent.change(endDatePicker, {
      target: { value: convertToDatePickerFormat(endDate) },
    });

    expect(confirmModalConfirmButton).toBeDisabled();
    expect(timeRangeForm).toHaveTextContent('Selected time range is invalid');
  });

  it('should render confirmation button disabled if selected start date is more than 90 days in the past', () => {
    expect(confirmModalConfirmButton).toBeEnabled();

    const now = moment();
    const startDate = now.clone().subtract(MAX_MANUAL_RULE_RUN_LOOKBACK_WINDOW_DAYS, 'd');

    fireEvent.change(startDatePicker, {
      target: {
        value: convertToDatePickerFormat(startDate),
      },
    });

    expect(confirmModalConfirmButton).toBeDisabled();
    expect(timeRangeForm).toHaveTextContent(
      'Manual rule run cannot be scheduled earlier than 90 days ago'
    );
  });

  it('should render confirmation button disabled if selected end date is in future', () => {
    expect(confirmModalConfirmButton).toBeEnabled();

    const now = moment();
    const endDate = now.clone().add(2, 'd');

    fireEvent.change(endDatePicker, {
      target: { value: convertToDatePickerFormat(endDate) },
    });

    expect(confirmModalConfirmButton).toBeDisabled();
    expect(timeRangeForm).toHaveTextContent('Manual rule run cannot be scheduled for the future');
  });
});
