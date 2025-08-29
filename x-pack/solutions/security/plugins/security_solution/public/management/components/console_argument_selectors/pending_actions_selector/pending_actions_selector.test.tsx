/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import type { KibanaReactContextValue } from '@kbn/kibana-react-plugin/public';

import type { PendingActionsSelectorState } from './pending_actions_selector';
import { PendingActionsSelector } from './pending_actions_selector';
import { useGetPendingActions } from '../../../hooks/response_actions/use_get_pending_actions';
import { useGenericErrorToast, useBaseSelectorHandlers, useFocusManagement } from '../shared/hooks';
import { useKibana } from '../../../../common/lib/kibana';
import type { ActionDetails, ActionListApiResponse } from '../../../../../common/endpoint/types';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import type {
  CommandArgumentValueSelectorProps,
  Command,
  CommandArgDefinition,
} from '../../console/types';
import type { ParsedCommandInterface } from '../../console/service/types';
import type { EndpointCommandDefinitionMeta } from '../../endpoint_responder/types';

jest.mock('../../../hooks/response_actions/use_get_pending_actions');
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
jest.mock('../../../../common/components/user_privileges');

jest.useFakeTimers();

describe('PendingActionsSelector', () => {
  const mockUseGetPendingActions = useGetPendingActions as jest.MockedFunction<
    typeof useGetPendingActions
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
  const mockUseUserPrivileges = useUserPrivileges as jest.MockedFunction<typeof useUserPrivileges>;
  const mockOnChange = jest.fn();
  const mockRequestFocus = jest.fn();

  const mockActionDetails: ActionDetails = {
    id: 'action-123-abc',
    command: 'isolate',
    agents: ['agent-1'],
    hosts: {
      'agent-1': { name: 'test-host' },
    },
    agentState: {
      'agent-1': {
        isCompleted: false,
        wasSuccessful: false,
        errors: undefined,
        completedAt: undefined,
      },
    },
    isExpired: false,
    isCompleted: false,
    wasSuccessful: false,
    startedAt: '2023-11-01T10:00:00.000Z',
    completedAt: undefined,
    status: 'pending',
    createdBy: 'test-user',
    agentType: 'endpoint',
    errors: undefined,
  };

  const mockApiResponse: ActionListApiResponse = {
    page: 1,
    pageSize: 10,
    total: 1,
    data: [mockActionDetails],
    agentTypes: [],
    elasticAgentIds: undefined,
    endDate: undefined,
    startDate: undefined,
    userIds: undefined,
    commands: undefined,
    statuses: undefined,
  };

  const mockCommand: Command = {
    input: 'cancel-action --actionId',
    inputDisplay: 'cancel-action --actionId',
    args: {} as ParsedCommandInterface<Record<string, CommandArgDefinition>>,
    commandDefinition: {
      name: 'cancel-action',
      about: 'Cancel a pending action',
      RenderComponent: () => <div>{'Mock render'}</div>,
      meta: {
        agentType: 'endpoint',
        endpointId: '',
        capabilities: [],
        privileges: {},
        platform: 'linux',
      } as EndpointCommandDefinitionMeta,
    },
  };

  const defaultProps: CommandArgumentValueSelectorProps<string, PendingActionsSelectorState> = {
    value: undefined,
    valueText: '',
    argName: 'actionId',
    argIndex: 0,
    store: { isPopoverOpen: false },
    onChange: mockOnChange,
    command: mockCommand,
    requestFocus: mockRequestFocus,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseGetPendingActions.mockReturnValue({
      data: mockApiResponse,
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useGetPendingActions>);

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

    // Mock user privileges - default to having all permissions
    mockUseUserPrivileges.mockReturnValue({
      endpointPrivileges: {
        canIsolateHost: true,
        canUnIsolateHost: true,
        canKillProcess: true,
        canSuspendProcess: true,
        canGetRunningProcesses: true,
        canWriteExecuteOperations: true,
        canWriteFileOperations: true,
        canWriteScanOperations: true,
        canReadActionsLogManagement: true,
        loading: false,
      },
    } as ReturnType<typeof useUserPrivileges>);
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
    mockUseGetPendingActions.mockReturnValueOnce({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useGetPendingActions>);

    render(<PendingActionsSelector {...defaultProps} />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  test('renders initial display label when no action is selected', async () => {
    await renderAndWaitForComponent(<PendingActionsSelector {...defaultProps} />);

    expect(screen.getByText('Click to select action')).toBeInTheDocument();
  });

  test('renders selected action with command-actionId format when action is selected', async () => {
    await renderAndWaitForComponent(
      <PendingActionsSelector
        {...defaultProps}
        value="action-123-abc"
        valueText="isolate - action-123-abc"
      />
    );

    expect(screen.getByText('isolate - action-123-abc')).toBeInTheDocument();
  });

  test('opens popover when clicked', async () => {
    await renderAndWaitForComponent(<PendingActionsSelector {...defaultProps} />);

    fireEvent.click(screen.getByText('Click to select action'));

    // Check that onChange was called with isPopoverOpen set to true
    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({
        store: { isPopoverOpen: true },
      })
    );
  });

  test('displays action in dropdown with command-actionId format', async () => {
    await renderAndWaitForComponent(
      <PendingActionsSelector {...defaultProps} store={{ isPopoverOpen: true }} />
    );

    // The action should be displayed with the new format
    expect(screen.getByText('isolate - action-123-abc')).toBeInTheDocument();
  });

  test('displays action description as tooltip', async () => {
    await renderAndWaitForComponent(
      <PendingActionsSelector {...defaultProps} store={{ isPopoverOpen: true }} />
    );

    // Check that the description contains expected elements
    const descriptionText = screen.getByText(/isolate on test-host by test-user at/);
    expect(descriptionText).toBeInTheDocument();
  });

  test('handles multiple pending actions with different commands', async () => {
    const multipleActionsData: ActionDetails[] = [
      mockActionDetails,
      {
        ...mockActionDetails,
        id: 'action-456-def',
        command: 'release',
      },
      {
        ...mockActionDetails,
        id: 'action-789-ghi',
        command: 'get-file',
      },
    ];

    const multipleActionsResponse: ActionListApiResponse = {
      ...mockApiResponse,
      data: multipleActionsData,
      total: 3,
    };

    mockUseGetPendingActions.mockReturnValue({
      data: multipleActionsResponse,
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useGetPendingActions>);

    await renderAndWaitForComponent(
      <PendingActionsSelector {...defaultProps} store={{ isPopoverOpen: true }} />
    );

    // Verify all actions are displayed with correct format
    expect(screen.getByText('isolate - action-123-abc')).toBeInTheDocument();
    expect(screen.getByText('release - action-456-def')).toBeInTheDocument();
    expect(screen.getByText('get-file - action-789-ghi')).toBeInTheDocument();
  });

  test('calls useGetPendingActions with correct parameters from command meta', async () => {
    const commandWithEndpointId = {
      ...mockCommand,
      commandDefinition: {
        ...mockCommand.commandDefinition,
        meta: {
          ...mockCommand.commandDefinition.meta,
          agentType: 'microsoft_defender_endpoint',
          endpointId: 'test-endpoint-id',
        } as EndpointCommandDefinitionMeta,
      },
    };

    await renderAndWaitForComponent(
      <PendingActionsSelector {...defaultProps} command={commandWithEndpointId} />
    );

    expect(mockUseGetPendingActions).toHaveBeenCalledWith({
      agentType: 'microsoft_defender_endpoint',
      endpointId: 'test-endpoint-id',
      page: 1,
      pageSize: 200,
    });
  });

  describe('Privilege validation', () => {
    test('disables actions when user lacks permission to cancel specific command', async () => {
      // Mock privileges without isolate permission
      mockUseUserPrivileges.mockReturnValue({
        endpointPrivileges: {
          canIsolateHost: false, // User cannot cancel isolate actions
          canUnIsolateHost: true,
          canKillProcess: true,
          canSuspendProcess: true,
          canGetRunningProcesses: true,
          canWriteExecuteOperations: true,
          canWriteFileOperations: true,
          canWriteScanOperations: true,
          canReadActionsLogManagement: true,
          loading: false,
        },
      } as ReturnType<typeof useUserPrivileges>);

      await renderAndWaitForComponent(
        <PendingActionsSelector {...defaultProps} store={{ isPopoverOpen: true }} />
      );

      // The isolate action should be displayed but with privilege restriction tooltip
      expect(screen.getByText('isolate - action-123-abc')).toBeInTheDocument();
    });

    test('shows tooltip message for disabled actions', async () => {
      // Mock privileges without kill process permission  
      const killProcessAction: ActionDetails = {
        ...mockActionDetails,
        id: 'action-kill-123',
        command: 'kill-process',
      };

      const responseWithKillProcess: ActionListApiResponse = {
        ...mockApiResponse,
        data: [killProcessAction],
      };

      mockUseGetPendingActions.mockReturnValue({
        data: responseWithKillProcess,
        isLoading: false,
        isError: false,
        error: null,
      } as unknown as ReturnType<typeof useGetPendingActions>);

      mockUseUserPrivileges.mockReturnValue({
        endpointPrivileges: {
          canIsolateHost: true,
          canUnIsolateHost: true,
          canKillProcess: false, // User cannot cancel kill-process actions
          canSuspendProcess: true,
          canGetRunningProcesses: true,
          canWriteExecuteOperations: true,
          canWriteFileOperations: true,
          canWriteScanOperations: true,
          canReadActionsLogManagement: true,
          loading: false,
        },
      } as ReturnType<typeof useUserPrivileges>);

      await renderAndWaitForComponent(
        <PendingActionsSelector {...defaultProps} store={{ isPopoverOpen: true }} />
      );

      // The action should be displayed
      expect(screen.getByText('kill-process - action-kill-123')).toBeInTheDocument();
    });

    test('enables actions when user has all required permissions', async () => {
      // All permissions are enabled by default in beforeEach
      await renderAndWaitForComponent(
        <PendingActionsSelector {...defaultProps} store={{ isPopoverOpen: true }} />
      );

      // The action should be displayed and selectable
      expect(screen.getByText('isolate - action-123-abc')).toBeInTheDocument();
    });
  });
});
