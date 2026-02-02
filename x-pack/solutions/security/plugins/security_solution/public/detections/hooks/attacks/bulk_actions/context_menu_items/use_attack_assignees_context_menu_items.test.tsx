/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import React from 'react';

import { useAttackAssigneesContextMenuItems } from './use_attack_assignees_context_menu_items';
import { useBulkAttackAssigneesItems } from '../bulk_action_items/use_bulk_attack_assignees_items';
import { useAttacksPrivileges } from '../use_attacks_privileges';
import { useLicense } from '../../../../../common/hooks/use_license';

jest.mock('../bulk_action_items/use_bulk_attack_assignees_items');
jest.mock('../use_attacks_privileges');
jest.mock('../../../../../common/hooks/use_license');

const mockUseBulkAttackAssigneesItems = useBulkAttackAssigneesItems as jest.MockedFunction<
  typeof useBulkAttackAssigneesItems
>;
const mockUseAttacksPrivileges = useAttacksPrivileges as jest.MockedFunction<
  typeof useAttacksPrivileges
>;
const mockUseLicense = useLicense as jest.MockedFunction<typeof useLicense>;

let queryClient: QueryClient;

function wrapper(props: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: queryClient }, props.children);
}

describe('useAttackAssigneesContextMenuItems', () => {
  const mockClosePopover = jest.fn();
  const mockSetIsLoading = jest.fn();
  const mockOnSuccess = jest.fn();

  const defaultProps = {
    attacksWithAssignees: [
      {
        attackId: 'attack-1',
        relatedAlertIds: ['alert-1', 'alert-2'],
        assignees: ['user1', 'user2'],
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

    mockUseLicense.mockReturnValue({
      isPlatinumPlus: jest.fn().mockReturnValue(true),
    } as unknown as ReturnType<typeof useLicense>);

    mockUseBulkAttackAssigneesItems.mockReturnValue({
      items: [
        {
          key: 'manage-attack-assignees',
          'data-test-subj': 'attack-assignees-context-menu-item',
          label: 'Manage assignees',
          panel: 2,
          disableOnQuery: true,
        },
      ],
      panels: [
        {
          id: 2,
          title: React.createElement('div', null, 'Assignees'),
          'data-test-subj': 'attack-assignees-context-menu-panel',
          renderContent: jest.fn((props) => React.createElement('div', null, 'Assignees Panel')),
          width: 400,
        },
      ],
    });
  });

  it('should return items and panels from bulk hook', () => {
    const { result } = renderHook(() => useAttackAssigneesContextMenuItems(defaultProps), {
      wrapper,
    });

    expect(result.current.items).toBeDefined();
    expect(result.current.panels).toBeDefined();
    expect(result.current.items.length).toBeGreaterThan(0);
    expect(result.current.panels.length).toBeGreaterThan(0);
  });

  it('should call useBulkAttackAssigneesItems with correct props', () => {
    renderHook(() => useAttackAssigneesContextMenuItems(defaultProps), { wrapper });

    expect(mockUseBulkAttackAssigneesItems).toHaveBeenCalledWith({
      onAssigneesUpdate: mockOnSuccess,
      alertAssignments: ['user1', 'user2'],
    });
  });

  it('should aggregate assignees from multiple attacks', () => {
    const props = {
      ...defaultProps,
      attacksWithAssignees: [
        {
          attackId: 'attack-1',
          relatedAlertIds: ['alert-1'],
          assignees: ['user1', 'user2'],
        },
        {
          attackId: 'attack-2',
          relatedAlertIds: ['alert-2'],
          assignees: ['user2', 'user3'],
        },
      ],
    };

    renderHook(() => useAttackAssigneesContextMenuItems(props), { wrapper });

    expect(mockUseBulkAttackAssigneesItems).toHaveBeenCalledWith({
      onAssigneesUpdate: mockOnSuccess,
      alertAssignments: ['user1', 'user2', 'user3'],
    });
  });

  it('should pass correct props to panel renderContent', () => {
    const mockRenderContent = jest.fn((props) =>
      React.createElement('div', null, 'Assignees Panel')
    );
    mockUseBulkAttackAssigneesItems.mockReturnValue({
      items: [],
      panels: [
        {
          id: 2,
          title: React.createElement('div', null, 'Assignees'),
          'data-test-subj': 'attack-assignees-context-menu-panel',
          renderContent: mockRenderContent,
          width: 400,
        },
      ],
    });

    renderHook(() => useAttackAssigneesContextMenuItems(defaultProps), { wrapper });

    expect(mockRenderContent).toHaveBeenCalled();
    const callArgs = mockRenderContent.mock.calls[0][0];
    callArgs.closePopoverMenu();
    expect(mockClosePopover).toHaveBeenCalled();
    expect(callArgs.setIsBulkActionsLoading).toBeDefined();
    expect(callArgs.alertItems).toBeDefined();
    expect(callArgs.alertItems[0]._id).toBe('attack-1');
  });

  it('should preserve panel width', () => {
    const { result } = renderHook(() => useAttackAssigneesContextMenuItems(defaultProps), {
      wrapper,
    });

    expect(result.current.panels[0].width).toBe(400);
  });
});
