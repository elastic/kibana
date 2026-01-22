/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { DateTimePickerGroup } from './date_time_picker_group';

describe('DateTimePickerGroup', () => {
  const startTime = new Date('2026-01-15T11:30:00Z');
  const endTime = new Date('2026-01-15T12:30:00Z');
  const mockOnStartChange = jest.fn();
  const mockOnEndChange = jest.fn();

  beforeEach(() => {
    mockOnStartChange.mockClear();
    mockOnEndChange.mockClear();
  });

  it('renders start and end time pickers', () => {
    render(
      <DateTimePickerGroup
        startTime={startTime}
        endTime={endTime}
        onStartChange={mockOnStartChange}
        onEndChange={mockOnEndChange}
      />
    );

    expect(screen.getByText('Start Time')).toBeInTheDocument();
    expect(screen.getByText('End Time')).toBeInTheDocument();
  });

  it('renders with provided times', () => {
    const { container } = render(
      <DateTimePickerGroup
        startTime={startTime}
        endTime={endTime}
        onStartChange={mockOnStartChange}
        onEndChange={mockOnEndChange}
      />
    );

    expect(container).toBeInTheDocument();
  });
});
