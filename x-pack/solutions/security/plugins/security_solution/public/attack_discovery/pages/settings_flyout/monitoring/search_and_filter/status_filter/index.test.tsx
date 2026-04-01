/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { StatusFilter } from '.';

const defaultProps = {
  onStatusChange: jest.fn(),
  selectedStatuses: [] as string[],
};

describe('StatusFilter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the status filter button', () => {
    render(<StatusFilter {...defaultProps} />);

    expect(screen.getByTestId('monitoringStatusFilterButton')).toBeInTheDocument();
  });

  it('renders three status options when the popover is open', () => {
    render(<StatusFilter {...defaultProps} />);

    fireEvent.click(screen.getByTestId('monitoringStatusFilterButton'));

    expect(screen.getAllByRole('option').length).toBe(3);
  });

  it('renders Running option', () => {
    render(<StatusFilter {...defaultProps} />);

    fireEvent.click(screen.getByTestId('monitoringStatusFilterButton'));

    expect(screen.getByText('Running')).toBeInTheDocument();
  });

  it('renders Succeeded option', () => {
    render(<StatusFilter {...defaultProps} />);

    fireEvent.click(screen.getByTestId('monitoringStatusFilterButton'));

    expect(screen.getByText('Succeeded')).toBeInTheDocument();
  });

  it('renders Failed option', () => {
    render(<StatusFilter {...defaultProps} />);

    fireEvent.click(screen.getByTestId('monitoringStatusFilterButton'));

    expect(screen.getByText('Failed')).toBeInTheDocument();
  });

  it('shows selected statuses as checked', () => {
    render(<StatusFilter {...defaultProps} selectedStatuses={['running', 'failed']} />);

    fireEvent.click(screen.getByTestId('monitoringStatusFilterButton'));
    const checkedOptions = screen
      .getAllByRole('option')
      .filter((el) => el.getAttribute('aria-checked') === 'true');

    expect(checkedOptions.length).toBe(2);
  });

  it('calls onStatusChange with the newly selected status', () => {
    const onStatusChange = jest.fn();

    render(<StatusFilter {...defaultProps} onStatusChange={onStatusChange} />);

    fireEvent.click(screen.getByTestId('monitoringStatusFilterButton'));
    fireEvent.click(screen.getByText('Running'));

    expect(onStatusChange).toHaveBeenCalledWith(['running']);
  });

  it('disables the filter button when loading', () => {
    render(<StatusFilter {...defaultProps} isLoading={true} />);

    expect(screen.getByTestId('monitoringStatusFilterButton')).toBeDisabled();
  });
});
