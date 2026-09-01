/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimelineItem } from '@kbn/timelines-plugin/common';
import React from 'react';
import { transformBulkActionsToContextMenuItems } from './transform_bulk_actions_to_context_menu_items';
import type { BulkAttackActionItems } from '../types';

const ALERT_ATTACK_DISCOVERY_ALERT_IDS = 'kibana.alert.attack_discovery.alert_ids';

describe('transformBulkActionsToContextMenuItems', () => {
  const mockClosePopover = jest.fn();
  const mockSetIsLoading = jest.fn();
  const mockOnClick = jest.fn();

  const mockAlertItems: TimelineItem[] = [
    {
      _id: 'attack-1',
      data: [
        {
          field: ALERT_ATTACK_DISCOVERY_ALERT_IDS,
          value: ['alert-1', 'alert-2'],
        },
      ],
      ecs: { _id: 'attack-1' },
    } as TimelineItem,
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should transform bulk action items to context menu items', () => {
    const bulkActionItems: BulkAttackActionItems = {
      items: [
        {
          key: 'test-item',
          label: 'Test Item',
          'data-test-subj': 'test-item',
          onClick: mockOnClick,
          disableOnQuery: true,
        },
      ],
      panels: [],
    };

    const result = transformBulkActionsToContextMenuItems({
      bulkActionItems,
      alertItems: mockAlertItems,
      closePopover: mockClosePopover,
      setIsLoading: mockSetIsLoading,
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toEqual({
      name: 'Test Item',
      panel: undefined,
      'data-test-subj': 'test-item',
      key: 'test-item',
      onClick: expect.any(Function),
    });
  });

  it('should handle items without onClick handler', () => {
    const bulkActionItems: BulkAttackActionItems = {
      items: [
        {
          key: 'test-item',
          label: 'Test Item',
          'data-test-subj': 'test-item',
          panel: 1,
          disableOnQuery: true,
        },
      ],
      panels: [],
    };

    const result = transformBulkActionsToContextMenuItems({
      bulkActionItems,
      alertItems: mockAlertItems,
      closePopover: mockClosePopover,
      setIsLoading: mockSetIsLoading,
    });

    expect(result.items[0].onClick).toBeUndefined();
  });

  it('should close the popover before invoking the item onClick (direct-action item)', () => {
    const callOrder: string[] = [];
    mockClosePopover.mockImplementation(() => callOrder.push('closePopover'));
    const onClick = jest.fn(() => callOrder.push('itemOnClick'));

    const bulkActionItems: BulkAttackActionItems = {
      items: [
        {
          key: 'test-item',
          label: 'Test Item',
          'data-test-subj': 'test-item',
          onClick,
          disableOnQuery: true,
        },
      ],
      panels: [],
    };

    const result = transformBulkActionsToContextMenuItems({
      bulkActionItems,
      alertItems: mockAlertItems,
      closePopover: mockClosePopover,
      setIsLoading: mockSetIsLoading,
    });

    (result.items[0].onClick as () => void)();

    expect(mockClosePopover).toHaveBeenCalledTimes(1);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(callOrder).toEqual(['closePopover', 'itemOnClick']);
  });

  it('does not throw when closePopover is not provided', () => {
    const onClick = jest.fn();
    const bulkActionItems: BulkAttackActionItems = {
      items: [
        {
          key: 'test-item',
          label: 'Test Item',
          'data-test-subj': 'test-item',
          onClick,
          disableOnQuery: true,
        },
      ],
      panels: [],
    };

    const result = transformBulkActionsToContextMenuItems({
      bulkActionItems,
      alertItems: mockAlertItems,
      setIsLoading: mockSetIsLoading,
    });

    expect(() => (result.items[0].onClick as () => void)()).not.toThrow();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not close the popover for sub-panel-navigating items', () => {
    const bulkActionItems: BulkAttackActionItems = {
      items: [
        {
          key: 'test-item',
          label: 'Test Item',
          'data-test-subj': 'test-item',
          panel: 2,
          disableOnQuery: true,
        },
      ],
      panels: [],
    };

    const result = transformBulkActionsToContextMenuItems({
      bulkActionItems,
      alertItems: mockAlertItems,
      closePopover: mockClosePopover,
      setIsLoading: mockSetIsLoading,
    });

    expect(result.items[0].onClick).toBeUndefined();
    expect(mockClosePopover).not.toHaveBeenCalled();
  });

  it('should transform bulk action panels to context menu panels', () => {
    const mockRenderContent = jest.fn(() => React.createElement('div', null, 'Panel Content'));

    const bulkActionItems: BulkAttackActionItems = {
      items: [],
      panels: [
        {
          id: 1,
          title: React.createElement('div', null, 'Test Panel'),
          'data-test-subj': 'test-panel',
          renderContent: mockRenderContent,
        },
      ],
    };

    const result = transformBulkActionsToContextMenuItems({
      bulkActionItems,
      alertItems: mockAlertItems,
      closePopover: mockClosePopover,
      setIsLoading: mockSetIsLoading,
    });

    expect(result.panels).toHaveLength(1);
    expect(result.panels[0]).toEqual({
      title: React.createElement('div', null, 'Test Panel'),
      content: expect.any(Object),
      id: 1,
    });
  });

  it('should call renderContent with correct props', () => {
    const mockRenderContent = jest.fn(() => React.createElement('div', null, 'Panel Content'));

    const bulkActionItems: BulkAttackActionItems = {
      items: [],
      panels: [
        {
          id: 1,
          title: React.createElement('div', null, 'Test Panel'),
          'data-test-subj': 'test-panel',
          renderContent: mockRenderContent,
        },
      ],
    };

    transformBulkActionsToContextMenuItems({
      bulkActionItems,
      alertItems: mockAlertItems,
      closePopover: mockClosePopover,
      setIsLoading: mockSetIsLoading,
    });

    expect(mockRenderContent).toHaveBeenCalledWith({
      closePopoverMenu: expect.any(Function),
      setIsBulkActionsLoading: expect.any(Function),
      alertItems: mockAlertItems,
      clearSelection: undefined,
      refresh: undefined,
    });
  });

  it('should handle panels with width property', () => {
    const mockRenderContent = jest.fn(() => React.createElement('div', null, 'Panel Content'));

    const bulkActionItems: BulkAttackActionItems = {
      items: [],
      panels: [
        {
          id: 1,
          title: React.createElement('div', null, 'Test Panel'),
          'data-test-subj': 'test-panel',
          renderContent: mockRenderContent,
          width: 400,
        },
      ],
    };

    const result = transformBulkActionsToContextMenuItems({
      bulkActionItems,
      alertItems: mockAlertItems,
      closePopover: mockClosePopover,
      setIsLoading: mockSetIsLoading,
    });

    expect(result.panels[0].width).toBe(400);
  });

  it('should handle empty items and panels', () => {
    const bulkActionItems: BulkAttackActionItems = {
      items: [],
      panels: [],
    };

    const result = transformBulkActionsToContextMenuItems({
      bulkActionItems,
      alertItems: mockAlertItems,
      closePopover: mockClosePopover,
      setIsLoading: mockSetIsLoading,
    });

    expect(result.items).toEqual([]);
    expect(result.panels).toEqual([]);
  });
});
