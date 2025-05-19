/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { CustomScriptSelector } from './custom_script_selector';
import { useGetCustomScripts } from '../../hooks/custom_scripts/use_get_custom_scripts';
import type { CustomScript } from '../../../../common/endpoint/types/custom_scripts';
import type { CommandArgumentValueSelectorProps } from '../console/types';

jest.mock('../../hooks/custom_scripts/use_get_custom_scripts');

describe('CustomScriptSelector', () => {
  const mockUseGetCustomScripts = useGetCustomScripts as jest.MockedFunction<
    typeof useGetCustomScripts
  >;
  const mockOnChange = jest.fn();
  const mockScripts: CustomScript[] = [
    { id: 'script1', name: 'Script 1', description: 'Test script 1' },
    { id: 'script2', name: 'Script 2', description: 'Test script 2' },
  ];

  const defaultProps: CommandArgumentValueSelectorProps<string, { isPopoverOpen: boolean }> = {
    value: undefined,
    valueText: '',
    argName: 'script',
    argIndex: 0,
    store: { isPopoverOpen: false },
    onChange: mockOnChange,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseGetCustomScripts.mockReturnValue({
      data: mockScripts,
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useGetCustomScripts>);
  });

  test('renders loading spinner when fetching data', () => {
    mockUseGetCustomScripts.mockReturnValueOnce({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useGetCustomScripts>);

    const SelectorComponent = CustomScriptSelector('endpoint');
    render(<SelectorComponent {...defaultProps} />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  test('renders initial display label when no script is selected', () => {
    const SelectorComponent = CustomScriptSelector('endpoint');
    render(<SelectorComponent {...defaultProps} />);

    expect(screen.getByText('Click to select script')).toBeInTheDocument();
  });

  test('renders selected script name when a script is selected', () => {
    const SelectorComponent = CustomScriptSelector('endpoint');
    render(<SelectorComponent {...defaultProps} value="Script 1" valueText="Script 1" />);

    expect(screen.getByText('Script 1')).toBeInTheDocument();
  });

  test('opens popover when clicked', async () => {
    const SelectorComponent = CustomScriptSelector('endpoint');
    render(<SelectorComponent {...defaultProps} />);

    // Click to open the popover
    fireEvent.click(screen.getByText('Click to select script'));

    // Check that onChange was called with isPopoverOpen set to true
    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({
        store: { isPopoverOpen: true },
      })
    );
  });

  test('displays script options in the popover when open', () => {
    const SelectorComponent = CustomScriptSelector('endpoint');
    render(<SelectorComponent {...defaultProps} store={{ isPopoverOpen: true }} />);

    // Check that the combobox is rendered
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  test('calls onChange with selected script when user makes selection', async () => {
    const SelectorComponent = CustomScriptSelector('endpoint');
    render(<SelectorComponent {...defaultProps} store={{ isPopoverOpen: true }} />);

    // Find the combobox input
    const combobox = screen.getByRole('combobox');

    // Click on the input to show options
    act(() => {
      fireEvent.click(combobox);
    });

    // Wait for options to appear and click the first one
    await waitFor(() => {
      // Try to find the option by test ID
      const option = screen.getByTestId('script1-label');
      fireEvent.click(option);
    });

    // Check that onChange was called with the selected script
    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({
        value: 'Script 1',
        valueText: 'Script 1',
        store: { isPopoverOpen: false },
      })
    );
  });

  test('closes popover after selection', async () => {
    const SelectorComponent = CustomScriptSelector('endpoint');
    render(<SelectorComponent {...defaultProps} store={{ isPopoverOpen: true }} />);

    // Find the combobox input
    const combobox = screen.getByRole('combobox');

    // Click on the input to show options
    fireEvent.click(combobox);

    // Wait for options to appear and click the first one
    await waitFor(() => {
      // Try to find the option by test ID
      const option = screen.getByTestId('script1-label');
      fireEvent.click(option);
    });

    // Check that onChange was called with isPopoverOpen set to false
    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({
        store: { isPopoverOpen: false },
      })
    );
  });

  test('calls useGetCustomScripts with correct agent type', () => {
    const SelectorComponent = CustomScriptSelector('crowdstrike');
    render(<SelectorComponent {...defaultProps} />);

    expect(mockUseGetCustomScripts).toHaveBeenCalledWith('crowdstrike');
  });

  test('displays script description in dropdown', async () => {
    const SelectorComponent = CustomScriptSelector('endpoint');
    render(<SelectorComponent {...defaultProps} store={{ isPopoverOpen: true }} />);

    // Find the combobox input
    const combobox = screen.getByRole('combobox');

    // Click on the input to show options using act
    act(() => {
      fireEvent.click(combobox);
    });

    // Wait for the popover content to be rendered
    await waitFor(() => {
      const optionOneDescription = screen.getByTestId('script1-description');
      const optionTwoDescription = screen.getByTestId('script2-description');
      expect(optionOneDescription.textContent).toContain('Test script 1');
      expect(optionTwoDescription.textContent).toContain('Test script 2');
    });
  });
});
