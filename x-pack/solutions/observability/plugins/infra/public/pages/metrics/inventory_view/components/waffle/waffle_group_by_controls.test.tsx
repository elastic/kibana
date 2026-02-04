/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { InventoryItemType } from '@kbn/metrics-data-access-plugin/common';
import { WaffleGroupByControls } from './waffle_group_by_controls';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import userEvent from '@testing-library/user-event';

const wrapWithProviders = (children: React.ReactNode) => <IntlProvider>{children}</IntlProvider>;

describe('WaffleGroupByControls', () => {
  const mockOnChange = jest.fn();
  const mockOnChangeCustomOptions = jest.fn();

  const defaultProps = {
    options: [
      {
        text: 'cloud.availability_zone',
        field: 'cloud.availability_zone',
      },
      {
        text: 'cloud.machine.type',
        field: 'cloud.machine.type',
      },
      {
        text: 'cloud.project.id',
        field: 'cloud.project.id',
      },
      {
        text: 'cloud.provider',
        field: 'cloud.provider',
      },
      {
        text: 'service.type',
        field: 'service.type',
      },
    ],
    nodeType: 'host' as InventoryItemType,
    groupBy: [],
    onChange: mockOnChange,
    onChangeCustomOptions: mockOnChangeCustomOptions,
    customOptions: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders "All" label when no groupBy is selected', () => {
    render(wrapWithProviders(<WaffleGroupByControls {...defaultProps} />));

    expect(screen.getByTestId('waffleGroupByDropdown')).toHaveTextContent('All');
  });

  it('renders field labels when groupBy is applied', async () => {
    const singleGroupBy = [{ field: 'cloud.provider' }];
    const { rerender } = render(
      wrapWithProviders(<WaffleGroupByControls {...defaultProps} groupBy={singleGroupBy} />)
    );
    expect(screen.getByTestId('waffleGroupByDropdown')).toHaveTextContent(singleGroupBy[0].field);

    const doubleGroupBy = [{ field: 'cloud.provider' }, { field: 'service.type' }];
    rerender(
      wrapWithProviders(<WaffleGroupByControls {...defaultProps} groupBy={doubleGroupBy} />)
    );

    expect(screen.getByTestId('waffleGroupByDropdown')).toHaveTextContent(
      doubleGroupBy.map((g) => g.field).join('')
    );
  });

  it('renders options, custom options and custom field buttons', async () => {
    const user = userEvent.setup();

    const customOptions = [
      { text: 'custom.field.one', field: 'custom.field.one' },
      { text: 'custom.field.two', field: 'custom.field.two' },
    ];

    render(
      wrapWithProviders(<WaffleGroupByControls {...defaultProps} customOptions={customOptions} />)
    );

    // Open the popover
    const dropdownButton = screen.getByTestId('waffleGroupByDropdown');
    await user.click(dropdownButton);

    // Check for default options
    defaultProps.options.forEach((option) => {
      expect(screen.getByRole('button', { name: option.text })).toBeInTheDocument();
    });

    // Check for custom options
    customOptions.forEach((option) => {
      expect(screen.getByRole('button', { name: option.text })).toBeInTheDocument();
    });

    // Check for custom field button
    expect(screen.getByRole('button', { name: 'Custom field' })).toBeInTheDocument();
  });

  it('calls onChange when an option is selected or unselected', async () => {
    const user = userEvent.setup();

    const { rerender } = render(wrapWithProviders(<WaffleGroupByControls {...defaultProps} />));

    // Open the popover
    const dropdownButton = screen.getByTestId('waffleGroupByDropdown');
    await user.click(dropdownButton);

    // Click on an option
    const optionToSelect = defaultProps.options[0];
    const optionButton = screen.getByRole('button', { name: optionToSelect.text });
    await user.click(optionButton);

    expect(mockOnChange).toHaveBeenCalledWith([{ field: optionToSelect.field }]);

    // Rerender with the selected option
    rerender(
      wrapWithProviders(
        <WaffleGroupByControls {...defaultProps} groupBy={[{ field: optionToSelect.field }]} />
      )
    );

    // Open the popover again
    await user.click(screen.getByTestId('waffleGroupByDropdown'));

    // Click on the selected option to remove it
    const selectedOptionButton = screen.getByRole('button', { name: optionToSelect.text });
    await user.click(selectedOptionButton);

    expect(mockOnChange).toHaveBeenCalledWith([]);
  });

  it('disables options when two groupings are already selected', async () => {
    const user = userEvent.setup();

    const groupBy = [{ field: 'cloud.provider' }, { field: 'service.type' }];

    render(wrapWithProviders(<WaffleGroupByControls {...defaultProps} groupBy={groupBy} />));

    // Open the popover
    const dropdownButton = screen.getByTestId('waffleGroupByDropdown');
    await user.click(dropdownButton);

    // Check that all options not already selected are disabled
    defaultProps.options.forEach((option) => {
      const optionButton = screen.getByRole('button', { name: option.text });
      if (groupBy.find((g) => g.field === option.field)) {
        expect(optionButton).toBeEnabled();
      } else {
        expect(optionButton).toBeDisabled();
      }
    });

    // Check for custom field button
    expect(screen.getByRole('button', { name: 'Custom field' })).toBeDisabled();
  });
});
