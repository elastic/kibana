/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import moment from 'moment';
import { fireEvent, render, screen } from '@testing-library/react';
import { ScheduleBulkActionModal } from '.';
import { EuiCallOut } from '@elastic/eui';

const convertToDatePickerFormat = (date: moment.Moment) => {
  return `${date.format('L')} ${date.format('LT')}`;
};

const modalCopy = {
  modalTitle: 'MODAL_TITLE',
  timeRangeTitle: 'TIME_RANGE_TITLE',
  confirmButton: 'CONFIRM_BUTTON',
  cancelButton: 'CANCEL_BUTTON',
  errors: {
    startDateOutOfRange: 'START_DATE_OUT_OF_RANGE_ERROR',
    endDateInFuture: 'FUTURE_TIME_RANGE_ERROR',
    invalidTimeRange: 'INVALID_TIME_RANGE_ERROR',
  },
};

describe('ScheduleBulkActionModal', () => {
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
    const callouts = [
      <EuiCallOut size="s" iconType="warning" key={1} title={'NOTIFIACTIONS_LIMITATIONS'} />,
    ];
    render(
      <ScheduleBulkActionModal
        onCancel={onCancelMock}
        onConfirm={onConfirmMock}
        text={modalCopy}
        maxLookbackWindowDays={90}
        callouts={callouts}
      />
    );

    timeRangeForm = screen.getByTestId('schedule-bulk-action-modal-time-range-form');
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
    expect(timeRangeForm).toHaveTextContent('INVALID_TIME_RANGE_ERROR');
  });

  it('should render confirmation button disabled if selected start date is more than lookup window', () => {
    expect(confirmModalConfirmButton).toBeEnabled();

    const now = moment();
    const startDate = now.clone().subtract(90, 'd');

    fireEvent.change(startDatePicker, {
      target: {
        value: convertToDatePickerFormat(startDate),
      },
    });

    expect(confirmModalConfirmButton).toBeDisabled();
    expect(timeRangeForm).toHaveTextContent('START_DATE_OUT_OF_RANGE_ERROR');
  });

  it('should render confirmation button disabled if selected end date is in future', () => {
    expect(confirmModalConfirmButton).toBeEnabled();

    const now = moment();
    const endDate = now.clone().add(2, 'd');

    fireEvent.change(endDatePicker, {
      target: { value: convertToDatePickerFormat(endDate) },
    });

    expect(confirmModalConfirmButton).toBeDisabled();
    expect(timeRangeForm).toHaveTextContent('FUTURE_TIME_RANGE_ERROR');
  });
});
