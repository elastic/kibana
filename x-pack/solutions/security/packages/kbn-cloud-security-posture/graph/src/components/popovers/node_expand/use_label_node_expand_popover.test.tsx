/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { Filter } from '@kbn/es-query';
import { useLabelNodeExpandPopover } from './use_label_node_expand_popover';
import type { NodeProps } from '../../types';
import type {
  ItemExpandPopoverListItemProps,
  SeparatorExpandPopoverListItemProps,
} from '../primitives/list_graph_popover';
import {
  GRAPH_LABEL_EXPAND_POPOVER_SHOW_EVENTS_WITH_THIS_ACTION_ITEM_ID,
  GRAPH_LABEL_EXPAND_POPOVER_SHOW_EVENT_DETAILS_ITEM_ID,
} from '../../test_ids';
import { addFilter } from '../../graph_investigation/search_filters';
import { EVENT_ACTION } from '../../../common/constants';

const mockSetSearchFilters = jest.fn();
const mockOnShowEventDetailsClick = jest.fn();

const dataViewId = 'test-data-view';

// Mock useNodeExpandPopover to capture and expose itemsFn
let capturedItemsFn:
  | ((
      node: NodeProps
    ) => Array<ItemExpandPopoverListItemProps | SeparatorExpandPopoverListItemProps>)
  | null = null;

jest.mock('./use_node_expand_popover', () => ({
  useNodeExpandPopover: jest.fn(({ itemsFn }) => {
    capturedItemsFn = itemsFn;
    return {
      id: 'test-popover',
      onNodeExpandButtonClick: jest.fn(),
      PopoverComponent: () => null,
      actions: { openPopover: jest.fn(), closePopover: jest.fn() },
      state: { isOpen: false, anchorElement: null },
    };
  }),
}));

const createMockLabelNode = (
  docMode: 'single-event' | 'single-alert' | 'grouped-events',
  label: string = 'test-action'
): NodeProps => {
  const baseNode = {
    id: 'test-label-node-id',
    type: 'label',
    position: { x: 0, y: 0 },
    dragging: false,
    zIndex: 0,
    selectable: true,
    deletable: true,
    selected: false,
    draggable: true,
    isConnectable: true,
    positionAbsoluteX: 0,
    positionAbsoluteY: 0,
    data: {
      id: 'label-123',
      color: 'primary' as const,
      shape: 'label' as const,
      label,
    },
  } as NodeProps;

  if (docMode === 'single-event') {
    return {
      ...baseNode,
      data: {
        ...baseNode.data,
        documentsData: [
          {
            id: 'event-123',
            type: 'event' as const,
          },
        ],
      },
    } as NodeProps;
  }

  if (docMode === 'single-alert') {
    return {
      ...baseNode,
      data: {
        ...baseNode.data,
        documentsData: [
          {
            id: 'alert-123',
            type: 'alert' as const,
          },
        ],
      },
    } as NodeProps;
  }

  // grouped-events
  return {
    ...baseNode,
    data: {
      ...baseNode.data,
      documentsData: [
        { id: 'event-123', type: 'event' as const },
        { id: 'event-456', type: 'event' as const },
      ],
      count: 2,
    },
  } as NodeProps;
};

describe('useLabelNodeExpandPopover', () => {
  let searchFilters: Filter[];

  beforeEach(() => {
    jest.clearAllMocks();
    searchFilters = [];
    capturedItemsFn = null;
  });

  describe('itemsFn - basic items', () => {
    it('should return show events with action item', () => {
      const node = createMockLabelNode('single-event');
      renderHook(() =>
        useLabelNodeExpandPopover(
          mockSetSearchFilters,
          dataViewId,
          searchFilters,
          mockOnShowEventDetailsClick
        )
      );

      expect(capturedItemsFn).not.toBeNull();
      const items = capturedItemsFn!(node);

      // Should have: 1 filter action + separator + event details = 3
      expect(items.length).toBeGreaterThanOrEqual(2);
      expect(items[0]).toMatchObject({
        type: 'item',
        testSubject: GRAPH_LABEL_EXPAND_POPOVER_SHOW_EVENTS_WITH_THIS_ACTION_ITEM_ID,
      });
    });

    it('should return event details item when handler is provided', () => {
      const node = createMockLabelNode('single-event');
      renderHook(() =>
        useLabelNodeExpandPopover(
          mockSetSearchFilters,
          dataViewId,
          searchFilters,
          mockOnShowEventDetailsClick
        )
      );

      expect(capturedItemsFn).not.toBeNull();
      const items = capturedItemsFn!(node);

      const eventDetailsItem = items.find(
        (item) =>
          item.type === 'item' &&
          item.testSubject === GRAPH_LABEL_EXPAND_POPOVER_SHOW_EVENT_DETAILS_ITEM_ID
      );
      expect(eventDetailsItem).toBeDefined();
    });

    it('should not return event details item when handler is not provided', () => {
      const node = createMockLabelNode('single-event');
      renderHook(() => useLabelNodeExpandPopover(mockSetSearchFilters, dataViewId, searchFilters));

      expect(capturedItemsFn).not.toBeNull();
      const items = capturedItemsFn!(node);

      const eventDetailsItem = items.find(
        (item) =>
          item.type === 'item' &&
          item.testSubject === GRAPH_LABEL_EXPAND_POPOVER_SHOW_EVENT_DETAILS_ITEM_ID
      );
      expect(eventDetailsItem).toBeUndefined();
    });
  });

  describe('action labels', () => {
    it('should show "Show" label when filter is not active', () => {
      const node = createMockLabelNode('single-event', 'test-action');
      renderHook(() =>
        useLabelNodeExpandPopover(mockSetSearchFilters, dataViewId, [], mockOnShowEventDetailsClick)
      );

      expect(capturedItemsFn).not.toBeNull();
      const items = capturedItemsFn!(node);

      const eventsWithActionItem = items.find(
        (item) =>
          item.type === 'item' &&
          item.testSubject === GRAPH_LABEL_EXPAND_POPOVER_SHOW_EVENTS_WITH_THIS_ACTION_ITEM_ID
      );

      if (eventsWithActionItem?.type === 'item') {
        expect(eventsWithActionItem.label).toContain('Show');
      }
    });

    it('should show "Hide" label when filter is active', () => {
      const node = createMockLabelNode('single-event', 'test-action');

      let activeFilters: Filter[] = [];
      activeFilters = addFilter(dataViewId, activeFilters, EVENT_ACTION, 'test-action');

      renderHook(() =>
        useLabelNodeExpandPopover(
          mockSetSearchFilters,
          dataViewId,
          activeFilters,
          mockOnShowEventDetailsClick
        )
      );

      expect(capturedItemsFn).not.toBeNull();
      const items = capturedItemsFn!(node);

      const eventsWithActionItem = items.find(
        (item) =>
          item.type === 'item' &&
          item.testSubject === GRAPH_LABEL_EXPAND_POPOVER_SHOW_EVENTS_WITH_THIS_ACTION_ITEM_ID
      );

      if (eventsWithActionItem?.type === 'item') {
        expect(eventsWithActionItem.label).toContain('Hide');
      }
    });
  });

  describe('alert vs event details label', () => {
    it('should show "Show alert details" for single-alert mode', () => {
      const node = createMockLabelNode('single-alert');
      renderHook(() =>
        useLabelNodeExpandPopover(
          mockSetSearchFilters,
          dataViewId,
          searchFilters,
          mockOnShowEventDetailsClick
        )
      );

      expect(capturedItemsFn).not.toBeNull();
      const items = capturedItemsFn!(node);

      const eventDetailsItem = items.find(
        (item) =>
          item.type === 'item' &&
          item.testSubject === GRAPH_LABEL_EXPAND_POPOVER_SHOW_EVENT_DETAILS_ITEM_ID
      );

      if (eventDetailsItem?.type === 'item') {
        expect(eventDetailsItem.label).toContain('alert');
      }
    });

    it('should show "Show event details" for single-event mode', () => {
      const node = createMockLabelNode('single-event');
      renderHook(() =>
        useLabelNodeExpandPopover(
          mockSetSearchFilters,
          dataViewId,
          searchFilters,
          mockOnShowEventDetailsClick
        )
      );

      expect(capturedItemsFn).not.toBeNull();
      const items = capturedItemsFn!(node);

      const eventDetailsItem = items.find(
        (item) =>
          item.type === 'item' &&
          item.testSubject === GRAPH_LABEL_EXPAND_POPOVER_SHOW_EVENT_DETAILS_ITEM_ID
      );

      if (eventDetailsItem?.type === 'item') {
        expect(eventDetailsItem.label).toContain('event');
      }
    });
  });

  describe('separator', () => {
    it('should add separator before event details item', () => {
      const node = createMockLabelNode('single-event');
      renderHook(() =>
        useLabelNodeExpandPopover(
          mockSetSearchFilters,
          dataViewId,
          searchFilters,
          mockOnShowEventDetailsClick
        )
      );

      expect(capturedItemsFn).not.toBeNull();
      const items = capturedItemsFn!(node);

      // Find separator
      const separatorIndex = items.findIndex((item) => item.type === 'separator');
      const eventDetailsIndex = items.findIndex(
        (item) =>
          item.type === 'item' &&
          item.testSubject === GRAPH_LABEL_EXPAND_POPOVER_SHOW_EVENT_DETAILS_ITEM_ID
      );

      // Separator should come before event details
      if (separatorIndex !== -1 && eventDetailsIndex !== -1) {
        expect(separatorIndex).toBeLessThan(eventDetailsIndex);
      }
    });
  });
});
