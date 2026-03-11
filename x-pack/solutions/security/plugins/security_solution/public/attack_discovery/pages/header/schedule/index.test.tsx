/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

import { Schedule } from '.';
import { TestProviders } from '../../../../common/mock';
import { SCHEDULE, SCHEDULE_TOOLTIP } from './translations';

const defaultProps = {
  isLoading: false,
  openFlyout: jest.fn(),
};

describe('Schedule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the button with the expected text', () => {
    render(
      <TestProviders>
        <Schedule {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByTestId('schedule')).toHaveTextContent(SCHEDULE);
  });

  it('renders the tooltip on hover with the expected text', async () => {
    render(
      <TestProviders>
        <Schedule {...defaultProps} />
      </TestProviders>
    );

    fireEvent.mouseOver(screen.getByTestId('schedule'));

    await waitFor(() => {
      expect(screen.getByTestId('scheduleTooltip')).toHaveTextContent(SCHEDULE_TOOLTIP);
    });
  });

  it('disables the button when isLoading is true', () => {
    render(
      <TestProviders>
        <Schedule {...defaultProps} isLoading={true} />
      </TestProviders>
    );

    expect(screen.getByTestId('schedule')).toBeDisabled();
  });

  it('calls openFlyout with schedule when clicked', () => {
    render(
      <TestProviders>
        <Schedule {...defaultProps} />
      </TestProviders>
    );

    fireEvent.click(screen.getByTestId('schedule'));

    expect(defaultProps.openFlyout).toHaveBeenCalledWith('schedule');
  });
});
