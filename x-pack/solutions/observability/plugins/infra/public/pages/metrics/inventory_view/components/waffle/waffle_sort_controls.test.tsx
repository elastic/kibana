/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WaffleSortControls } from './waffle_sort_controls';
import type { WaffleSortOption } from '../../hooks/use_waffle_options';

describe('WaffleSortControls', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the sort dropdown', () => {
    render(<WaffleSortControls sort={{ by: 'name', direction: 'asc' }} onChange={mockOnChange} />);

    const waffleSortByDropdown = screen.getByTestId('waffleSortByDropdown');
    expect(waffleSortByDropdown).toBeInTheDocument();
  });

  it('displays correct label when sorted by name', () => {
    render(<WaffleSortControls sort={{ by: 'name', direction: 'asc' }} onChange={mockOnChange} />);

    const waffleSortByDropdown = screen.getByTestId('waffleSortByDropdown');
    expect(waffleSortByDropdown).toHaveTextContent('Name');
  });

  it('displays correct label when sorted by value', () => {
    render(<WaffleSortControls sort={{ by: 'value', direction: 'asc' }} onChange={mockOnChange} />);

    const waffleSortByDropdown = screen.getByTestId('waffleSortByDropdown');
    expect(waffleSortByDropdown).toHaveTextContent('Metric value');
  });

  it('opens popover when dropdown is clicked', async () => {
    const user = userEvent.setup();

    render(<WaffleSortControls sort={{ by: 'name', direction: 'asc' }} onChange={mockOnChange} />);

    const waffleSortByDropdown = screen.getByTestId('waffleSortByDropdown');
    await user.click(waffleSortByDropdown);

    expect(screen.getByTestId('waffleSortByName')).toBeInTheDocument();
    expect(screen.getByTestId('waffleSortByValue')).toBeInTheDocument();
    expect(screen.getByTestId('waffleSortByDirection')).toBeInTheDocument();
  });

  it('calls onChange with name sort when "Sort by name" is clicked', async () => {
    const user = userEvent.setup();

    render(<WaffleSortControls sort={{ by: 'value', direction: 'asc' }} onChange={mockOnChange} />);

    const waffleSortByDropdown = screen.getByTestId('waffleSortByDropdown');
    await user.click(waffleSortByDropdown);

    const waffleSortByName = await screen.findByTestId('waffleSortByName');
    fireEvent.click(waffleSortByName);

    expect(mockOnChange).toHaveBeenCalledWith({ by: 'name', direction: 'asc' });
  });

  it('calls onChange with value sort when "Sort by value" is clicked', async () => {
    const user = userEvent.setup();

    render(<WaffleSortControls sort={{ by: 'name', direction: 'asc' }} onChange={mockOnChange} />);

    const waffleSortByDropdown = screen.getByTestId('waffleSortByDropdown');
    await user.click(waffleSortByDropdown);

    const waffleSortByValue = await screen.findByTestId('waffleSortByValue');
    fireEvent.click(waffleSortByValue);

    expect(mockOnChange).toHaveBeenCalledWith({ by: 'value', direction: 'asc' });
  });

  it('toggles sort direction from asc to desc when direction switch is clicked', async () => {
    const user = userEvent.setup();

    const valueSortAsc: WaffleSortOption = { by: 'value', direction: 'asc' };
    render(<WaffleSortControls sort={valueSortAsc} onChange={mockOnChange} />);

    const waffleSortByDropdown = screen.getByTestId('waffleSortByDropdown');
    await user.click(waffleSortByDropdown);

    const waffleSortByDirection = await screen.findByTestId('waffleSortByDirection');
    fireEvent.click(waffleSortByDirection);

    expect(mockOnChange).toHaveBeenCalledWith({ by: 'value', direction: 'desc' });
  });

  it('toggles sort direction from desc to asc when direction switch is clicked', async () => {
    const user = userEvent.setup();

    const valueSortDesc: WaffleSortOption = { by: 'value', direction: 'desc' };
    render(<WaffleSortControls sort={valueSortDesc} onChange={mockOnChange} />);

    const waffleSortByDropdown = screen.getByTestId('waffleSortByDropdown');
    await user.click(waffleSortByDropdown);

    const waffleSortByDirection = await screen.findByTestId('waffleSortByDirection');
    fireEvent.click(waffleSortByDirection);

    expect(mockOnChange).toHaveBeenCalledWith({ by: 'value', direction: 'asc' });
  });

  describe('complete sort flow', () => {
    it('should sort by value then toggle sort direction', async () => {
      const user = userEvent.setup();

      const { rerender } = render(
        <WaffleSortControls sort={{ by: 'name', direction: 'asc' }} onChange={mockOnChange} />
      );

      const waffleSortByDropdown = screen.getByTestId('waffleSortByDropdown');
      expect(waffleSortByDropdown).toHaveTextContent('Name');

      await user.click(waffleSortByDropdown);

      const waffleSortByValue = await screen.findByTestId('waffleSortByValue');
      expect(waffleSortByValue).toHaveTextContent('Metric value');

      fireEvent.click(waffleSortByValue);

      const valueSortAsc: WaffleSortOption = { by: 'value', direction: 'asc' };
      expect(mockOnChange).toHaveBeenCalledWith(valueSortAsc);

      rerender(<WaffleSortControls sort={valueSortAsc} onChange={mockOnChange} />);

      expect(waffleSortByDropdown).toHaveTextContent('Metric value');

      await user.click(waffleSortByDropdown);

      const waffleSortByDirection = await screen.findByTestId('waffleSortByDirection');
      fireEvent.click(waffleSortByDirection);

      expect(mockOnChange).toHaveBeenLastCalledWith({ by: 'value', direction: 'desc' });
    });
  });
});
