/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { ScheduleField } from '.';
import { TestProviders } from '../../../../../../common/mock';
import { type FieldHook } from '../../../../../../shared_imports';

const defaultField = {
  errors: [],
  label: 'Test run',
  setValue: jest.fn(),
  value: '5h',
} as unknown as FieldHook<string>;

describe('ScheduleField', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    act(() => {
      render(
        <TestProviders>
          <ScheduleField field={defaultField} />
        </TestProviders>
      );
    });
  });

  it('should render the schedule field component', async () => {
    await waitFor(() => {
      expect(screen.getByTestId('attackDiscoveryScheduleField')).toBeInTheDocument();
    });
  });

  it('should render the time value input component', async () => {
    await waitFor(() => {
      expect(screen.getByTestId('scheduleNumberInput')).toBeInTheDocument();
    });
  });

  it('should render the time unit component', async () => {
    await waitFor(() => {
      expect(screen.getByTestId('scheduleUnitInput')).toBeInTheDocument();
    });
  });

  it('should set a new field value when time value changed', async () => {
    act(() => {
      const timeValueInput = screen.getByTestId('scheduleNumberInput');
      fireEvent.change(timeValueInput, { target: { value: '7' } });
    });
    await waitFor(() => {
      expect(defaultField.setValue).toHaveBeenCalledWith('7h');
    });
  });

  it('should set a new field value when time unit changed', async () => {
    act(() => {
      const unitSelect = screen.getByTestId('scheduleUnitInput');
      fireEvent.change(unitSelect, { target: { value: 'm' } });
    });
    await waitFor(() => {
      expect(defaultField.setValue).toHaveBeenCalledWith('5m');
    });
  });

  it('should ignore negative time values', async () => {
    act(() => {
      const timeValueInput = screen.getByTestId('scheduleNumberInput');
      fireEvent.change(timeValueInput, { target: { value: '-7' } });
    });
    await waitFor(() => {
      expect(defaultField.setValue).not.toBeCalled();
    });
  });

  it('should ignore NaN time values', async () => {
    act(() => {
      const timeValueInput = screen.getByTestId('scheduleNumberInput');
      fireEvent.change(timeValueInput, { target: { value: 'hello there' } });
    });
    await waitFor(() => {
      expect(defaultField.setValue).not.toBeCalled();
    });
  });
});
