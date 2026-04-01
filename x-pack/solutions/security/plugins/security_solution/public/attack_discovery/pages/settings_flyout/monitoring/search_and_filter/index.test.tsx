/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { SearchAndFilter } from '.';
import { TestProviders } from '../../../../../common/mock';

const defaultProps = {
  end: 'now',
  isLoading: false,
  onRefresh: jest.fn(),
  onSearchChange: jest.fn(),
  onStatusChange: jest.fn(),
  onTimeChange: jest.fn(),
  search: '',
  selectedStatuses: [] as string[],
  start: 'now-24h',
};

describe('SearchAndFilter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the search bar', () => {
    render(
      <TestProviders>
        <SearchAndFilter {...defaultProps} />
      </TestProviders>
    );

    const input = screen
      .getByTestId('monitoringSearchAndFilterQuery')
      .querySelector('input[type="search"]');

    expect(input).toBeInTheDocument();
  });

  it('renders the Status filter', () => {
    render(
      <TestProviders>
        <SearchAndFilter {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('renders the date picker', () => {
    render(
      <TestProviders>
        <SearchAndFilter {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByTestId('monitoringDatePicker')).toBeInTheDocument();
  });

  describe('when the date picker changes', () => {
    beforeEach(() => {
      render(
        <TestProviders>
          <SearchAndFilter {...defaultProps} />
        </TestProviders>
      );

      fireEvent.click(screen.getByTestId('superDatePickerToggleQuickMenuButton'));
      fireEvent.click(screen.getByTestId('superDatePickerCommonlyUsed_Last_7 days'));
    });

    it('calls onTimeChange when the date picker changes', () => {
      expect(defaultProps.onTimeChange).toHaveBeenCalledWith('now-7d', 'now');
    });

    it('calls onSearchChange to submit the current query', () => {
      expect(defaultProps.onSearchChange).toHaveBeenCalledWith('');
    });
  });

  it('calls onRefresh when the apply button is clicked', () => {
    render(
      <TestProviders>
        <SearchAndFilter {...defaultProps} />
      </TestProviders>
    );

    fireEvent.click(screen.getByTestId('superDatePickerApplyTimeButton'));

    expect(defaultProps.onRefresh).toHaveBeenCalled();
  });

  it('submits the search query when Enter is pressed', () => {
    render(
      <TestProviders>
        <SearchAndFilter {...defaultProps} />
      </TestProviders>
    );

    const input = screen
      .getByTestId('monitoringSearchAndFilterQuery')
      .querySelector('input[type="search"]');

    if (input) {
      fireEvent.change(input, { target: { value: 'test query' } });
      fireEvent.keyDown(screen.getByTestId('monitoringSearchAndFilterQuery'), { key: 'Enter' });
    }

    expect(defaultProps.onSearchChange).toHaveBeenCalledWith('test query');
  });

  it('does not call onRefresh for a non-Enter key press', () => {
    render(
      <TestProviders>
        <SearchAndFilter {...defaultProps} />
      </TestProviders>
    );

    fireEvent.keyDown(screen.getByTestId('monitoringSearchAndFilterQuery'), { key: 'a' });

    expect(defaultProps.onRefresh).not.toHaveBeenCalled();
  });

  it('disables the date picker when isLoading is true', () => {
    render(
      <TestProviders>
        <SearchAndFilter {...defaultProps} isLoading={true} />
      </TestProviders>
    );

    const datePicker = screen.getByTestId('monitoringDatePicker');
    const button = datePicker.querySelector('button');

    expect(button).toBeDisabled();
  });
});
