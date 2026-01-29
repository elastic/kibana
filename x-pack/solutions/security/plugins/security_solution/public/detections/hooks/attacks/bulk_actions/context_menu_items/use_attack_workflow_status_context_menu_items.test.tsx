/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import React from 'react';

import { useAttackWorkflowStatusContextMenuItems } from './use_attack_workflow_status_context_menu_items';
import { useBulkAttackWorkflowStatusItems } from '../bulk_action_items/use_bulk_attack_workflow_status_items';
import { useAttacksPrivileges } from '../use_attacks_privileges';

jest.mock('../bulk_action_items/use_bulk_attack_workflow_status_items');
jest.mock('../use_attacks_privileges');

const mockUseBulkAttackWorkflowStatusItems =
  useBulkAttackWorkflowStatusItems as jest.MockedFunction<typeof useBulkAttackWorkflowStatusItems>;
const mockUseAttacksPrivileges = useAttacksPrivileges as jest.MockedFunction<
  typeof useAttacksPrivileges
>;

let queryClient: QueryClient;

function wrapper(props: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: queryClient }, props.children);
}

describe('useAttackWorkflowStatusContextMenuItems', () => {
  const mockClosePopover = jest.fn();
  const mockSetIsLoading = jest.fn();
  const mockOnSuccess = jest.fn();

  const defaultProps = {
    attacksWithWorkflowStatus: [
      {
        attackId: 'attack-1',
        relatedAlertIds: ['alert-1', 'alert-2'],
        workflowStatus: 'open' as const,
      },
    ],
    closePopover: mockClosePopover,
    setIsLoading: mockSetIsLoading,
    onSuccess: mockOnSuccess,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient();

    mockUseAttacksPrivileges.mockReturnValue({
      hasIndexWrite: true,
      hasAttackIndexWrite: true,
      loading: false,
    });

    mockUseBulkAttackWorkflowStatusItems.mockReturnValue({
      items: [
        {
          key: 'open-attack-status',
          'data-test-subj': 'open-attack-status',
          label: 'Open',
          onClick: jest.fn(),
          disableOnQuery: true,
        },
      ],
      panels: [
        {
          id: 1,
          title: React.createElement('div', null, 'Status'),
          'data-test-subj': 'attack-status-context-menu-panel',
          renderContent: jest.fn((props) => React.createElement('div', null, 'Status Panel')),
        },
      ],
    });
  });

  it('should return items and panels from bulk hook', () => {
    const { result } = renderHook(() => useAttackWorkflowStatusContextMenuItems(defaultProps), {
      wrapper,
    });

    expect(result.current.items).toBeDefined();
    expect(result.current.panels).toBeDefined();
    expect(result.current.items.length).toBeGreaterThan(0);
    expect(result.current.panels.length).toBeGreaterThan(0);
  });

  it('should call useBulkAttackWorkflowStatusItems with correct props', () => {
    renderHook(() => useAttackWorkflowStatusContextMenuItems(defaultProps), { wrapper });

    expect(mockUseBulkAttackWorkflowStatusItems).toHaveBeenCalledWith({
      onWorkflowStatusUpdate: mockOnSuccess,
      currentStatus: 'open',
    });
  });

  it('should use status of the first attack', () => {
    const testProps = {
      ...defaultProps,
      attacksWithWorkflowStatus: [
        {
          attackId: 'attack-1',
          relatedAlertIds: ['alert-1'],
          workflowStatus: 'open' as const,
        },
        {
          attackId: 'attack-2',
          relatedAlertIds: ['alert-2'],
          workflowStatus: 'closed' as const,
        },
      ],
    };

    renderHook(() => useAttackWorkflowStatusContextMenuItems(testProps), { wrapper });

    expect(mockUseBulkAttackWorkflowStatusItems).toHaveBeenCalledWith({
      onWorkflowStatusUpdate: mockOnSuccess,
      currentStatus: 'open',
    });
  });

  it('should handle multiple attacks', () => {
    const testProps = {
      ...defaultProps,
      attacksWithWorkflowStatus: [
        {
          attackId: 'attack-1',
          relatedAlertIds: ['alert-1'],
          workflowStatus: 'open' as const,
        },
        {
          attackId: 'attack-2',
          relatedAlertIds: ['alert-2'],
          workflowStatus: 'open' as const,
        },
      ],
    };

    const mockRenderContent = jest.fn((renderProps) =>
      React.createElement('div', null, 'Status Panel')
    );
    mockUseBulkAttackWorkflowStatusItems.mockReturnValue({
      items: [],
      panels: [
        {
          id: 1,
          title: React.createElement('div', null, 'Status'),
          'data-test-subj': 'attack-status-context-menu-panel',
          renderContent: mockRenderContent,
        },
      ],
    });

    renderHook(() => useAttackWorkflowStatusContextMenuItems(testProps), { wrapper });

    expect(mockRenderContent).toHaveBeenCalled();
    const callArgs = mockRenderContent.mock.calls[0][0];
    expect(callArgs.alertItems).toHaveLength(2);
    expect(callArgs.alertItems[0]._id).toBe('attack-1');
    expect(callArgs.alertItems[1]._id).toBe('attack-2');
  });

  it('should pass correct props to panel renderContent', () => {
    const mockRenderContent = jest.fn((props) => React.createElement('div', null, 'Status Panel'));
    mockUseBulkAttackWorkflowStatusItems.mockReturnValue({
      items: [],
      panels: [
        {
          id: 1,
          title: React.createElement('div', null, 'Status'),
          'data-test-subj': 'attack-status-context-menu-panel',
          renderContent: mockRenderContent,
        },
      ],
    });

    renderHook(() => useAttackWorkflowStatusContextMenuItems(defaultProps), { wrapper });

    expect(mockRenderContent).toHaveBeenCalled();
    const callArgs = mockRenderContent.mock.calls[0][0];
    callArgs.closePopoverMenu();
    expect(mockClosePopover).toHaveBeenCalled();
    expect(callArgs.setIsBulkActionsLoading).toBeDefined();
    expect(callArgs.alertItems).toBeDefined();
    expect(callArgs.alertItems[0]._id).toBe('attack-1');
  });
});
