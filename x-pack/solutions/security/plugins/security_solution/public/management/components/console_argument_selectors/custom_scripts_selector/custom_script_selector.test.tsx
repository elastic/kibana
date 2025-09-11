/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import type { KibanaReactContextValue } from '@kbn/kibana-react-plugin/public';

import type { CustomScriptSelectorState } from './custom_script_selector';
import { CustomScriptSelector } from './custom_script_selector';
import { useGetCustomScripts } from '../../../hooks/custom_scripts/use_get_custom_scripts';
import {
  useGenericErrorToast,
  useBaseSelectorHandlers,
  useFocusManagement,
  useRenderDelay,
} from '../shared/hooks';
import { useKibana } from '../../../../common/lib/kibana';
import type { ResponseActionScript } from '../../../../../common/endpoint/types';
import type {
  CommandArgumentValueSelectorProps,
  Command,
  CommandArgDefinition,
} from '../../console/types';
import type { ParsedCommandInterface } from '../../console/service/types';
import type { EndpointCommandDefinitionMeta } from '../../endpoint_responder/types';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';

jest.mock('../../../hooks/custom_scripts/use_get_custom_scripts');
jest.mock('../../console/hooks/state_selectors/use_console_state_dispatch');
jest.mock('../shared/hooks', () => ({
  useGenericErrorToast: jest.fn(),
  useBaseSelectorHandlers: jest.fn(() => ({
    handleOpenPopover: jest.fn(),
    handleClosePopover: jest.fn(),
    setIsPopoverOpen: jest.fn(),
  })),
  useBaseSelectorState: jest.fn((store, value) => store ?? { isPopoverOpen: !value }),
  useRenderDelay: jest.fn(() => false),
  useFocusManagement: jest.fn(),
}));
jest.mock('../../../../common/lib/kibana');

jest.useFakeTimers();

describe('CustomScriptSelector', () => {
  const mockUseGetCustomScripts = useGetCustomScripts as jest.MockedFunction<
    typeof useGetCustomScripts
  >;
  const mockUseGenericErrorToast = useGenericErrorToast as jest.MockedFunction<
    typeof useGenericErrorToast
  >;
  const mockUseBaseSelectorHandlers = useBaseSelectorHandlers as jest.MockedFunction<
    typeof useBaseSelectorHandlers
  >;
  const mockUseFocusManagement = useFocusManagement as jest.MockedFunction<
    typeof useFocusManagement
  >;
  const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;
  const mockUseRenderDelay = useRenderDelay as jest.MockedFunction<typeof useRenderDelay>;
  const mockOnChange = jest.fn();
  const mockRequestFocus = jest.fn();
  const mockScripts: ResponseActionScript[] = [
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
        endpointId: '',
        capabilities: [],
        privileges: {},
        platform: 'linux',
      },
      args: {
        ScriptName: {
          required: true,
          allowMultiples: false,
          about: 'an argument',
        },
      },
    },
  };

  const defaultProps: CommandArgumentValueSelectorProps<string, CustomScriptSelectorState> = {
    value: undefined,
    valueText: '',
    argName: 'ScriptName',
    argIndex: 0,
    store: { isPopoverOpen: false, selectedOption: undefined },
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

    // Default behavior: don't show render delay
    mockUseRenderDelay.mockReturnValue(false);

    // Mock the error toast hook
    mockUseGenericErrorToast.mockImplementation(() => {});

    // Mock the base selector handlers hook with working implementations
    const mockHandleOpenPopover = jest.fn(() => {
      mockOnChange({
        value: defaultProps.value,
        valueText: defaultProps.valueText,
        store: { isPopoverOpen: true },
      });
    });

    const mockHandleClosePopover = jest.fn(() => {
      mockOnChange({
        value: defaultProps.value,
        valueText: defaultProps.valueText,
        store: { isPopoverOpen: false },
      });
    });
    mockUseBaseSelectorHandlers.mockReturnValue({
      handleOpenPopover: mockHandleOpenPopover,
      handleClosePopover: mockHandleClosePopover,
      setIsPopoverOpen: jest.fn(),
    });

    mockUseFocusManagement.mockImplementation((isPopoverOpen, requestFocus) => {
      if (!isPopoverOpen && requestFocus) {
        setTimeout(() => {
          requestFocus();
        }, 0);
      }
    });

    mockUseKibana.mockReturnValue({
      services: {
        notifications: {
          toasts: {
            add: jest.fn(),
            addSuccess: jest.fn(),
            addWarning: jest.fn(),
            addDanger: jest.fn(),
          },
        },
      },
    } as unknown as KibanaReactContextValue<never>);
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
    // Ensure render delay doesn't block the spinner
    mockUseRenderDelay.mockReturnValueOnce(true);

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

    fireEvent.click(screen.getByText('Click to select script'));

    // Check that onChange was called with isPopoverOpen set to true
    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({
        store: { isPopoverOpen: true, selectedOption: undefined },
      })
    );
  });

  test('renders searchbox and listbox when popover is open', async () => {
    await renderAndWaitForComponent(
      <CustomScriptSelector
        {...defaultProps}
        store={{ isPopoverOpen: true, selectedOption: undefined }}
      />
    );

    // Check that the searchbox is rendered
    expect(screen.getByRole('searchbox', { name: 'Filter options' })).toBeInTheDocument();
    expect(screen.getByRole('listbox', { name: 'Filter options' })).toBeInTheDocument();
  });

  test('calls onChange with selected script when user makes selection', async () => {
    await renderAndWaitForComponent(
      <CustomScriptSelector
        {...defaultProps}
        store={{ isPopoverOpen: true, selectedOption: undefined }}
      />
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
        store: {
          isPopoverOpen: false,
          selectedOption: { description: 'Test script 1', id: 'script1', name: 'Script 1' },
        },
      })
    );
  });

  test('closes popover after selection', async () => {
    await renderAndWaitForComponent(
      <CustomScriptSelector
        {...defaultProps}
        store={{ isPopoverOpen: true, selectedOption: undefined }}
      />
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
        store: {
          isPopoverOpen: false,
          selectedOption: { description: 'Test script 1', id: 'script1', name: 'Script 1' },
        },
      })
    );
  });

  test('calls useGetCustomScripts with correct agent type', async () => {
    const crowdstrikeCommand = {
      ...mockCommand,
      commandDefinition: {
        ...mockCommand.commandDefinition,
        meta: {
          agentType: 'crowdstrike',
          endpointId: '',
          capabilities: [],
          privileges: {},
          platform: 'linux',
        } as unknown as EndpointCommandDefinitionMeta,
      },
    };

    await renderAndWaitForComponent(
      <CustomScriptSelector {...defaultProps} command={crowdstrikeCommand} />
    );

    expect(mockUseGetCustomScripts).toHaveBeenCalledWith('crowdstrike', {}, { enabled: true });
  });

  test('displays script description in dropdown', async () => {
    await renderAndWaitForComponent(
      <CustomScriptSelector
        {...defaultProps}
        store={{ isPopoverOpen: true, selectedOption: undefined }}
      />
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
        store={{ isPopoverOpen: true, selectedOption: undefined }}
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
        store={{ isPopoverOpen: true, selectedOption: undefined }}
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
      <CustomScriptSelector
        {...defaultProps}
        store={{ isPopoverOpen: true, selectedOption: undefined }}
      />
    );

    // Simulate popover closing by changing the store state
    await renderAndWaitForComponent(
      <CustomScriptSelector
        {...defaultProps}
        store={{ isPopoverOpen: false, selectedOption: undefined }}
      />
    );

    // Advance timers to trigger the setTimeout in useEffect
    act(() => {
      jest.advanceTimersByTime(10);
    });

    expect(mockRequestFocus).toHaveBeenCalled();
  });

  test('does not render full component if command does not allow multiples', async () => {
    const { getByTestId } = await renderAndWaitForComponent(
      <IntlProvider locale="en">
        <CustomScriptSelector {...defaultProps} argIndex={1} />
      </IntlProvider>
    );

    expect(
      getByTestId(`scriptSelector-${defaultProps.command.commandDefinition.name}-1-noMultipleArgs`)
        .textContent
    ).toEqual(' Argument is only supported once per command');
  });
});
