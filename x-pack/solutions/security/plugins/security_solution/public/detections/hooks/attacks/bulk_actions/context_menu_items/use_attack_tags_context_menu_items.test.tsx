/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import React from 'react';

import { useAttackTagsContextMenuItems } from './use_attack_tags_context_menu_items';
import { useBulkAttackTagsItems } from '../bulk_action_items/use_bulk_attack_tags_items';
import { useAttacksPrivileges } from '../use_attacks_privileges';

jest.mock('../bulk_action_items/use_bulk_attack_tags_items');
jest.mock('../use_attacks_privileges');

const mockUseBulkAttackTagsItems = useBulkAttackTagsItems as jest.MockedFunction<
  typeof useBulkAttackTagsItems
>;
const mockUseAttacksPrivileges = useAttacksPrivileges as jest.MockedFunction<
  typeof useAttacksPrivileges
>;

let queryClient: QueryClient;

function wrapper(props: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: queryClient }, props.children);
}

describe('useAttackTagsContextMenuItems', () => {
  const mockClosePopover = jest.fn();
  const mockSetIsLoading = jest.fn();
  const mockOnSuccess = jest.fn();

  const defaultProps = {
    attacksWithTags: [
      {
        attackId: 'attack-1',
        relatedAlertIds: ['alert-1', 'alert-2'],
        tags: ['tag1', 'tag2'],
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

    mockUseBulkAttackTagsItems.mockReturnValue({
      items: [
        {
          key: 'manage-attack-tags',
          'data-test-subj': 'attack-tags-context-menu-item',
          label: 'Manage tags',
          panel: 1,
          disableOnQuery: true,
        },
      ],
      panels: [
        {
          id: 1,
          title: React.createElement('div', null, 'Tags'),
          'data-test-subj': 'attack-tags-context-menu-panel',
          renderContent: jest.fn((props) => React.createElement('div', null, 'Tags Panel')),
        },
      ],
    });
  });

  it('should return items and panels from bulk hook', () => {
    const { result } = renderHook(() => useAttackTagsContextMenuItems(defaultProps), { wrapper });

    expect(result.current.items).toBeDefined();
    expect(result.current.panels).toBeDefined();
    expect(result.current.items.length).toBeGreaterThan(0);
    expect(result.current.panels.length).toBeGreaterThan(0);
  });

  it('should call useBulkAttackTagsItems with onTagsUpdate callback', () => {
    renderHook(() => useAttackTagsContextMenuItems(defaultProps), { wrapper });

    expect(mockUseBulkAttackTagsItems).toHaveBeenCalledWith({
      onTagsUpdate: mockOnSuccess,
    });
  });

  it('should pass correct props to panel renderContent', () => {
    const mockRenderContent = jest.fn((props) => React.createElement('div', null, 'Tags Panel'));
    mockUseBulkAttackTagsItems.mockReturnValue({
      items: [],
      panels: [
        {
          id: 1,
          title: React.createElement('div', null, 'Tags'),
          'data-test-subj': 'attack-tags-context-menu-panel',
          renderContent: mockRenderContent,
        },
      ],
    });

    renderHook(() => useAttackTagsContextMenuItems(defaultProps), { wrapper });

    expect(mockRenderContent).toHaveBeenCalled();
    const callArgs = mockRenderContent.mock.calls[0][0];
    callArgs.closePopoverMenu();
    expect(mockClosePopover).toHaveBeenCalled();
    expect(callArgs.setIsBulkActionsLoading).toBeDefined();
    expect(callArgs.alertItems).toBeDefined();
    expect(callArgs.alertItems[0]._id).toBe('attack-1');
  });

  it('should handle multiple attacks', () => {
    const testProps = {
      ...defaultProps,
      attacksWithTags: [
        {
          attackId: 'attack-1',
          relatedAlertIds: ['alert-1'],
          tags: ['tag1'],
        },
        {
          attackId: 'attack-2',
          relatedAlertIds: ['alert-2'],
          tags: ['tag2'],
        },
      ],
    };

    const { result } = renderHook(() => useAttackTagsContextMenuItems(testProps), { wrapper });

    expect(result.current.panels.length).toBeGreaterThan(0);
    // Verify alertItems contains both attacks
    const mockRenderContent = jest.fn((renderProps) =>
      React.createElement('div', null, 'Tags Panel')
    );
    mockUseBulkAttackTagsItems.mockReturnValue({
      items: [],
      panels: [
        {
          id: 1,
          title: React.createElement('div', null, 'Tags'),
          'data-test-subj': 'attack-tags-context-menu-panel',
          renderContent: mockRenderContent,
        },
      ],
    });

    renderHook(() => useAttackTagsContextMenuItems(testProps), { wrapper });

    expect(mockRenderContent).toHaveBeenCalled();
    const callArgs = mockRenderContent.mock.calls[0][0];
    expect(callArgs.alertItems).toHaveLength(2);
    expect(callArgs.alertItems[0]._id).toBe('attack-1');
    expect(callArgs.alertItems[1]._id).toBe('attack-2');
  });
});
