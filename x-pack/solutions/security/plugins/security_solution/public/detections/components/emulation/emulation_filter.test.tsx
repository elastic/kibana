/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Subject } from 'rxjs';
import { EmulationFilter, EMULATION_FILTER_BUTTON_TEST_ID } from './emulation_filter';
import { useKibana } from '../../../common/lib/kibana';
import type { FilterManager } from '@kbn/data-plugin/public';

jest.mock('../../../common/lib/kibana');

// I9: the component subscribes to `filterManager.getUpdates$()` so it can
// re-derive its toggle state when filters are mutated by other callers.
// The mock has to expose a real observable; an unobservable jest.fn would
// blow up at `.subscribe(…)`.
const filterUpdates$ = new Subject<void>();
const mockFilterManager = {
  getFilters: jest.fn(() => []),
  setFilters: jest.fn(),
  getUpdates$: jest.fn(() => filterUpdates$.asObservable()),
} as unknown as FilterManager;

const mockUseKibana = useKibana as jest.Mock;

describe('EmulationFilter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseKibana.mockReturnValue({
      services: {
        data: {
          query: {
            filterManager: mockFilterManager,
          },
        },
      },
    });
  });

  it('renders the filter button', () => {
    render(<EmulationFilter />);
    expect(screen.getByTestId(EMULATION_FILTER_BUTTON_TEST_ID)).toBeInTheDocument();
    expect(screen.getByText('Emulation')).toBeInTheDocument();
  });

  it('opens popover when button is clicked', async () => {
    render(<EmulationFilter />);
    const button = screen.getByTestId(EMULATION_FILTER_BUTTON_TEST_ID);

    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Show emulation alerts')).toBeInTheDocument();
      expect(screen.getByText('Hide emulation alerts')).toBeInTheDocument();
    });
  });

  it('applies filter when "Hide emulation alerts" is selected', async () => {
    render(<EmulationFilter />);
    const button = screen.getByTestId(EMULATION_FILTER_BUTTON_TEST_ID);

    fireEvent.click(button);

    await waitFor(() => {
      const hideOption = screen.getByText('Hide emulation alerts');
      fireEvent.click(hideOption);
    });

    expect(mockFilterManager.setFilters).toHaveBeenCalled();
  });

  it('shows active filter indicator when hiding emulation alerts', async () => {
    render(<EmulationFilter />);
    const button = screen.getByTestId(EMULATION_FILTER_BUTTON_TEST_ID);

    fireEvent.click(button);

    await waitFor(() => {
      const hideOption = screen.getByText('Hide emulation alerts');
      fireEvent.click(hideOption);
    });

    // The button should show it has an active filter
    expect(button).toHaveAttribute('aria-pressed', 'true');
  });

  it('removes filter when "Show emulation alerts" is selected after hiding', async () => {
    render(<EmulationFilter />);
    const button = screen.getByTestId(EMULATION_FILTER_BUTTON_TEST_ID);

    // First, hide emulation alerts
    fireEvent.click(button);
    await waitFor(() => {
      const hideOption = screen.getByText('Hide emulation alerts');
      fireEvent.click(hideOption);
    });

    // Then, show emulation alerts again
    fireEvent.click(button);
    await waitFor(() => {
      const showOption = screen.getByText('Show emulation alerts');
      fireEvent.click(showOption);
    });

    // setFilters should have been called twice
    expect(mockFilterManager.setFilters).toHaveBeenCalledTimes(2);
  });
});
