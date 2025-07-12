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
import type {
  CommandArgumentValueSelectorProps,
  Command,
  CommandArgDefinition,
} from '../console/types';
import type { CustomScript } from '../../../../server/endpoint/services';
import type { ParsedCommandInterface } from '../console/service/types';

jest.mock('../../hooks/custom_scripts/use_get_custom_scripts');

// Mock setTimeout to execute immediately in tests
jest.useFakeTimers();

describe('CustomScriptSelector', () => {
  const mockUseGetCustomScripts = useGetCustomScripts as jest.MockedFunction<
    typeof useGetCustomScripts
  >;
  const mockOnChange = jest.fn();
  const mockRequestFocus = jest.fn();
  const mockScripts: CustomScript[] = [
    { id: 'script1', name: 'Script 1', description: 'Test script 1' },
    { id: 'script2', name: 'Script 2', description: 'Test script 2' },
  ];

  const mockCommand: Command = {
    input: 'runscript --ScriptName',
    inputDisplay: 'runscript --ScriptName',
    args: {} as ParsedCommandInterface<Record<string, CommandArgDefinition>>,
    commandDefinition: {
      name: 'runscript',
      about: 'Execute a script',
      RenderComponent: () => <div>{'Mock render'}</div>,
      meta: {
        agentType: 'microsoft_defender_endpoint',
      },
    },
  };

  const defaultProps: CommandArgumentValueSelectorProps<string, { isPopoverOpen: boolean }> = {
    value: undefined,
    valueText: '',
    argName: 'ScriptName',
    argIndex: 0,
    store: { isPopoverOpen: false },
    onChange: mockOnChange,
    command: mockCommand,
    requestFocus: mockRequestFocus,
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

    render(<CustomScriptSelector {...defaultProps} />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  test('renders initial display label when no script is selected', async () => {
    await renderAndWaitForComponent(<CustomScriptSelector {...defaultProps} />);

    expect(screen.getByText('Click to select script')).toBeInTheDocument();
  });

  test('renders selected script name when a script is selected', async () => {
    await renderAndWaitForComponent(
      <CustomScriptSelector {...defaultProps} value="Script 1" valueText="Script 1" />
    );

    expect(screen.getByText('Script 1')).toBeInTheDocument();
  });

  test('opens popover when clicked', async () => {
    await renderAndWaitForComponent(<CustomScriptSelector {...defaultProps} />);

    // Click to open the popover
    fireEvent.click(screen.getByText('Click to select script'));

    // Check that onChange was called with isPopoverOpen set to true
    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({
        store: { isPopoverOpen: true },
      })
    );
  });

  test('renders searchbox and listbox when popover is open', async () => {
    await renderAndWaitForComponent(
      <CustomScriptSelector {...defaultProps} store={{ isPopoverOpen: true }} />
    );

    // Check that the searchbox is rendered
    expect(screen.getByRole('searchbox', { name: 'Filter options' })).toBeInTheDocument();
    expect(screen.getByRole('listbox', { name: 'Filter options' })).toBeInTheDocument();
  });

  test('calls onChange with selected script when user makes selection', async () => {
    await renderAndWaitForComponent(
      <CustomScriptSelector {...defaultProps} store={{ isPopoverOpen: true }} />
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
    await renderAndWaitForComponent(
      <CustomScriptSelector {...defaultProps} store={{ isPopoverOpen: true }} />
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
    const crowdstrikeCommand = {
      ...mockCommand,
      commandDefinition: {
        ...mockCommand.commandDefinition,
        meta: { agentType: 'crowdstrike' },
      },
    };

    await renderAndWaitForComponent(
      <CustomScriptSelector {...defaultProps} command={crowdstrikeCommand} />
    );

    expect(mockUseGetCustomScripts).toHaveBeenCalledWith('crowdstrike');
  });

  test('displays script description in dropdown', async () => {
    await renderAndWaitForComponent(
      <CustomScriptSelector {...defaultProps} store={{ isPopoverOpen: true }} />
    );

    // The descriptions should be contained within the option elements
    expect(screen.getByText('Test script 1')).toBeInTheDocument();
    expect(screen.getByText('Test script 2')).toBeInTheDocument();
  });

  test('shows placeholder text in the search box when no search is performed', async () => {
    await renderAndWaitForComponent(
      <CustomScriptSelector
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
    await renderAndWaitForComponent(
      <CustomScriptSelector
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

  test('calls requestFocus when popover closes', async () => {
    await renderAndWaitForComponent(
      <CustomScriptSelector {...defaultProps} store={{ isPopoverOpen: true }} />
    );

    // Simulate popover closing by changing the store state
    await renderAndWaitForComponent(
      <CustomScriptSelector {...defaultProps} store={{ isPopoverOpen: false }} />
    );

    // Advance timers to trigger the setTimeout in useEffect
    act(() => {
      jest.advanceTimersByTime(10);
    });

    expect(mockRequestFocus).toHaveBeenCalled();
  });
});
