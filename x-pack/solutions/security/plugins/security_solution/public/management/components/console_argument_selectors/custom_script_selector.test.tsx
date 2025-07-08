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
import { useConsoleStateDispatch } from '../console/hooks/state_selectors/use_console_state_dispatch';
import type { CommandArgumentValueSelectorProps } from '../console/types';
import type { CustomScript } from '../../../../server/endpoint/services';

jest.mock('../../hooks/custom_scripts/use_get_custom_scripts');
jest.mock('../console/hooks/state_selectors/use_console_state_dispatch');

// Mock setTimeout to execute immediately in tests
jest.useFakeTimers();

describe('CustomScriptSelector', () => {
  const mockUseGetCustomScripts = useGetCustomScripts as jest.MockedFunction<
    typeof useGetCustomScripts
  >;
  const mockUseConsoleStateDispatch = useConsoleStateDispatch as jest.MockedFunction<
    typeof useConsoleStateDispatch
  >;
  const mockOnChange = jest.fn();
  const mockDispatch = jest.fn();
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

    // Mock the dispatch function
    mockUseConsoleStateDispatch.mockReturnValue(mockDispatch);
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  const renderAndWaitForComponent = async (component: React.ReactElement) => {
    const result = render(component);
    // Fast-forward the timers to skip the delay
    act(() => {
      jest.advanceTimersByTime(10);
    });
    // Wait for component to finish rendering
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
    return result;
  };

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

  test('renders initial display label when no script is selected', async () => {
    const SelectorComponent = CustomScriptSelector('endpoint');
    await renderAndWaitForComponent(<SelectorComponent {...defaultProps} />);

    expect(screen.getByText('Click to select script')).toBeInTheDocument();
  });

  test('renders selected script name when a script is selected', async () => {
    const SelectorComponent = CustomScriptSelector('endpoint');
    await renderAndWaitForComponent(
      <SelectorComponent {...defaultProps} value="Script 1" valueText="Script 1" />
    );

    expect(screen.getByText('Script 1')).toBeInTheDocument();
  });

  test('opens popover when clicked', async () => {
    const SelectorComponent = CustomScriptSelector('endpoint');
    await renderAndWaitForComponent(<SelectorComponent {...defaultProps} />);

    // Click to open the popover
    fireEvent.click(screen.getByText('Click to select script'));

    // Check that onChange was called with isPopoverOpen set to true
    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({
        store: { isPopoverOpen: true },
      })
    );
  });

  test('displays script options in the popover when open', async () => {
    const SelectorComponent = CustomScriptSelector('endpoint');
    await renderAndWaitForComponent(
      <SelectorComponent {...defaultProps} store={{ isPopoverOpen: true }} />
    );

    // Check that the searchbox is rendered
    expect(screen.getByRole('searchbox', { name: 'Filter options' })).toBeInTheDocument();
    expect(screen.getByRole('listbox', { name: 'Filter options' })).toBeInTheDocument();
  });

  test('calls onChange with selected script when user makes selection', async () => {
    const SelectorComponent = CustomScriptSelector('endpoint');
    await renderAndWaitForComponent(
      <SelectorComponent {...defaultProps} store={{ isPopoverOpen: true }} />
    );

    const searchbox = screen.getByRole('searchbox', { name: 'Filter options' });

    // Click on the input to show options
    act(() => {
      fireEvent.click(searchbox);
    });

    // Find and click the first option
    const option = screen.getByRole('option', { name: /Script 1/i });
    fireEvent.click(option);

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
    await renderAndWaitForComponent(
      <SelectorComponent {...defaultProps} store={{ isPopoverOpen: true }} />
    );

    const searchbox = screen.getByRole('searchbox', { name: 'Filter options' });

    // Click on the input to show options
    fireEvent.click(searchbox);

    // Find and click the first option
    const option = screen.getByRole('option', { name: /Script 1/i });
    fireEvent.click(option);

    // Check that onChange was called with isPopoverOpen set to false
    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({
        store: { isPopoverOpen: false },
      })
    );
  });

  test('calls useGetCustomScripts with correct agent type', async () => {
    const SelectorComponent = CustomScriptSelector('crowdstrike');
    await renderAndWaitForComponent(<SelectorComponent {...defaultProps} />);

    expect(mockUseGetCustomScripts).toHaveBeenCalledWith('crowdstrike');
  });

  test('displays script description in dropdown', async () => {
    const SelectorComponent = CustomScriptSelector('endpoint');
    await renderAndWaitForComponent(
      <SelectorComponent {...defaultProps} store={{ isPopoverOpen: true }} />
    );

    // The descriptions should be contained within the option elements
    expect(screen.getByText('Test script 1')).toBeInTheDocument();
    expect(screen.getByText('Test script 2')).toBeInTheDocument();
  });

  test('shows placeholder text in the search box when no search is performed', async () => {
    const SelectorComponent = CustomScriptSelector('endpoint');
    await renderAndWaitForComponent(
      <SelectorComponent
        {...defaultProps}
        value="Script 1"
        valueText="Script 1"
        store={{ isPopoverOpen: true }}
      />
    );

    const searchbox = screen.getByRole('searchbox', { name: 'Filter options' });
    expect(searchbox).toHaveAttribute('placeholder', 'Script 1');
  });

  test('filters script options as the user types in the search box', async () => {
    const SelectorComponent = CustomScriptSelector('endpoint');
    await renderAndWaitForComponent(
      <SelectorComponent
        {...defaultProps}
        value="Script 1"
        valueText="Script 1"
        store={{ isPopoverOpen: true }}
      />
    );

    const searchbox = screen.getByRole('searchbox', { name: 'Filter options' });

    // Change the search text to filter for only "Script 2"
    fireEvent.change(searchbox, { target: { value: 'Script 2' } });

    await waitFor(() => {
      expect(screen.queryByText('Test script 1')).not.toBeInTheDocument();
      expect(screen.getByText('Test script 2')).toBeInTheDocument();
    });
  });
});
