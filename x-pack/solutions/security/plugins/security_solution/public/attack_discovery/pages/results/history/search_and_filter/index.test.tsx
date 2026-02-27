/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSelectableOption } from '@elastic/eui';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { SearchAndFilter } from '.';
import { TestProviders } from '../../../../../common/mock';

jest.mock('../../../use_get_attack_discovery_generations', () => ({
  useInvalidateGetAttackDiscoveryGenerations: jest.fn().mockReturnValue(jest.fn()),
}));
jest.mock('../../../use_find_attack_discoveries', () => ({
  useInvalidateFindAttackDiscoveries: jest.fn().mockReturnValue(jest.fn()),
}));

const mockSetQuery = jest.fn();
const mockSetStart = jest.fn();
const mockSetEnd = jest.fn();
const mockSetFilterByAlertIds = jest.fn();
const mockSetSelectedAttackDiscoveries = jest.fn();
const mockOnRefresh = jest.fn();
const mockSetSelectedConnectorNames = jest.fn();
const mockSetShared = jest.fn();
const mockSetStatusItems = jest.fn();

const defaultProps = {
  aiConnectors: [],
  connectorNames: [],
  end: undefined,
  filterByAlertIds: [],
  isLoading: false,
  onRefresh: mockOnRefresh,
  query: '',
  selectedConnectorNames: [],
  setEnd: mockSetEnd,
  setFilterByAlertIds: mockSetFilterByAlertIds,
  setQuery: mockSetQuery,
  setSelectedAttackDiscoveries: mockSetSelectedAttackDiscoveries,
  setSelectedConnectorNames: mockSetSelectedConnectorNames,
  setShared: mockSetShared,
  setStart: mockSetStart,
  setStatusItems: mockSetStatusItems,
  shared: undefined,
  start: undefined,
  statusItems: [],
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
      .getByTestId('searchAndFilterQueryQuery')
      .querySelector('input[type="search"]');

    expect(input).toBeInTheDocument();
  });

  it('renders the Visibility filter', () => {
    render(
      <TestProviders>
        <SearchAndFilter {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByText('Visibility')).toBeInTheDocument();
  });

  it('renders the Status filter', () => {
    render(
      <TestProviders>
        <SearchAndFilter {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('renders the Connector filter', () => {
    render(
      <TestProviders>
        <SearchAndFilter {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByText('Connector')).toBeInTheDocument();
  });

  it('renders the date picker', () => {
    render(
      <TestProviders>
        <SearchAndFilter {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByTestId('alertSelectionDatePicker')).toBeInTheDocument();
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

    it('calls setStart when the date picker changes', () => {
      expect(mockSetStart).toHaveBeenCalledWith('now-7d');
    });

    it('calls setEnd when the date picker changes', () => {
      expect(mockSetEnd).toHaveBeenCalledWith('now');
    });
  });

  it('calls onRefresh when the refresh button is clicked', () => {
    render(
      <TestProviders>
        <SearchAndFilter {...defaultProps} />
      </TestProviders>
    );

    fireEvent.click(screen.getByTestId('superDatePickerApplyTimeButton'));

    expect(mockOnRefresh).toHaveBeenCalled();
  });

  it('updates the query when the search input changes and the Enter key is pressed', () => {
    render(
      <TestProviders>
        <SearchAndFilter {...defaultProps} />
      </TestProviders>
    );

    const input = screen
      .getByTestId('searchAndFilterQueryQuery')
      .querySelector('input[type="search"]');
    if (input) {
      fireEvent.change(input, { target: { value: 'test query' } });
      fireEvent.keyDown(screen.getByTestId('searchAndFilterQueryQuery'), { key: 'Enter' });
    }

    expect(mockSetQuery).toHaveBeenCalledWith('test query');
  });

  it('onKeyDown does not refresh for a non-Enter key press', () => {
    render(
      <TestProviders>
        <SearchAndFilter {...defaultProps} />
      </TestProviders>
    );

    fireEvent.keyDown(screen.getByTestId('searchAndFilterQueryQuery'), { key: 'a' });

    expect(mockOnRefresh).not.toHaveBeenCalled();
  });

  it('renders alert ID badges when filterByAlertIds is provided', () => {
    const alertIds = ['alert-id-1'];
    render(
      <TestProviders>
        <SearchAndFilter {...defaultProps} filterByAlertIds={alertIds} />
      </TestProviders>
    );

    expect(screen.getByText('_id: alert-id-1')).toBeInTheDocument();
  });

  it('calls mockSetFilterByAlertIds when the badge cross icon is clicked', () => {
    const alertIds = ['alert-id-1'];

    render(
      <TestProviders>
        <SearchAndFilter {...defaultProps} filterByAlertIds={alertIds} />
      </TestProviders>
    );

    const clearButton = screen.getByRole('button', { name: 'Clear filter _id:alert-id-1' });
    fireEvent.click(clearButton);

    expect(mockSetFilterByAlertIds).toHaveBeenCalledWith([]);
  });

  it('disables the date picker when isLoading is true', () => {
    render(
      <TestProviders>
        <SearchAndFilter {...defaultProps} isLoading={true} />
      </TestProviders>
    );

    const datePicker = screen.getByTestId('alertSelectionDatePicker');
    const button = datePicker.querySelector('button');

    expect(button).toBeDisabled();
  });

  it('returns statusItems updated when Status filter changes', () => {
    const statusOptions: EuiSelectableOption[] = [
      { label: 'Open', checked: undefined },
      { label: 'Closed', checked: undefined },
    ];

    render(
      <TestProviders>
        <SearchAndFilter {...defaultProps} statusItems={statusOptions} />
      </TestProviders>
    );

    // Simulate clicking the Status filter and selecting 'Open'
    fireEvent.click(screen.getByText('Status'));
    fireEvent.click(screen.getByText('Open'));

    expect(mockSetStatusItems).toHaveBeenCalledWith([
      { label: 'Open', checked: 'on' },
      { label: 'Closed', checked: undefined },
    ]);
  });

  it('returns selectedConnectorNames updated when Connector filter changes', () => {
    const connectorNames = ['GPT-4', 'Claude', 'Gemini'];
    render(
      <TestProviders>
        <SearchAndFilter {...defaultProps} connectorNames={connectorNames} />
      </TestProviders>
    );

    defaultProps.setSelectedConnectorNames(['GPT-4']);

    expect(mockSetSelectedConnectorNames).toHaveBeenCalledWith(['GPT-4']);
  });
});
