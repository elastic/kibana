/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
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
import { EVENT_ACTION } from '../../../common/constants';

// Mock isFilterActive to control filter state in tests
const mockIsFilterActive = jest.fn();

// Mock emitFilterAction to verify filter emissions
const mockEmitFilterAction = jest.fn();
jest.mock('../../filters/filter_state', () => ({
  isFilterActive: (...args: unknown[]) => mockIsFilterActive(...args),
}));
jest.mock('../../filters/filter_pub_sub', () => ({
  emitFilterAction: (...args: unknown[]) => mockEmitFilterAction(...args),
}));

// Mock emitPreviewAction to verify preview emissions
const mockEmitPreviewAction = jest.fn();
jest.mock('../../preview_pub_sub', () => ({
  emitPreviewAction: (...args: unknown[]) => mockEmitPreviewAction(...args),
}));

// Mock useLabelExpandGraphPopover to capture and expose itemsFn
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

const createMockLabelNode = (): NodeProps =>
  ({
    id: 'label-node-1',
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
      id: 'edge-123',
      label: 'Test Label',
      source: 'source-node',
      target: 'target-node',
      color: 'primary',
      shape: 'label',
    },
  } as unknown as NodeProps);

describe('useLabelNodeExpandPopover', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedItemsFn = null;
    mockIsFilterActive.mockReturnValue(false);
  });

  describe('itemsFn - generates menu items', () => {
    it('should return show events item (event details disabled without proper docMode)', () => {
      const node = createMockLabelNode();
      renderHook(() => useLabelNodeExpandPopover());

      expect(capturedItemsFn).not.toBeNull();
      const items = capturedItemsFn!(node);

      // Based on get_label_expand_items.ts: show-events-with-action + separator + show-event-details
      // But only if docMode is 'single-alert', 'single-event', or 'grouped-events'
      // Our mock doesn't have documentsData, so docMode will be 'na' and event details won't show
      expect(items.length).toBeGreaterThanOrEqual(1);
      expect(items[0]).toMatchObject({
        type: 'item',
        testSubject: GRAPH_LABEL_EXPAND_POPOVER_SHOW_EVENTS_WITH_THIS_ACTION_ITEM_ID,
      });
    });

    it('should not show event details item when doc mode is not appropriate', () => {
      const node = createMockLabelNode();
      renderHook(() => useLabelNodeExpandPopover());

      expect(capturedItemsFn).not.toBeNull();
      const items = capturedItemsFn!(node);

      // With our mock (no documentsData), docMode is 'na', so event details won't show
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
      mockIsFilterActive.mockReturnValue(false);

      const node = createMockLabelNode();
      renderHook(() => useLabelNodeExpandPopover());

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
      mockIsFilterActive.mockReturnValue(true);

      const node = createMockLabelNode();
      renderHook(() => useLabelNodeExpandPopover());

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

  describe('filter action emission via pub-sub', () => {
    it('should emit filter action when events with action item is clicked', () => {
      mockIsFilterActive.mockReturnValue(false);

      const node = createMockLabelNode();
      renderHook(() => useLabelNodeExpandPopover());

      expect(capturedItemsFn).not.toBeNull();
      const items = capturedItemsFn!(node);

      const eventsWithActionItem = items.find(
        (item) =>
          item.type === 'item' &&
          item.testSubject === GRAPH_LABEL_EXPAND_POPOVER_SHOW_EVENTS_WITH_THIS_ACTION_ITEM_ID
      );

      if (eventsWithActionItem?.type === 'item' && eventsWithActionItem.onClick) {
        eventsWithActionItem.onClick();
      }

      expect(mockEmitFilterAction).toHaveBeenCalledWith({
        type: 'TOGGLE_EVENTS_WITH_ACTION',
        field: EVENT_ACTION,
        value: 'Test Label',
        action: 'show',
      });
    });

    it('should emit hide action when filter is already active', () => {
      mockIsFilterActive.mockReturnValue(true);

      const node = createMockLabelNode();
      renderHook(() => useLabelNodeExpandPopover());

      expect(capturedItemsFn).not.toBeNull();
      const items = capturedItemsFn!(node);

      const eventsWithActionItem = items.find(
        (item) =>
          item.type === 'item' &&
          item.testSubject === GRAPH_LABEL_EXPAND_POPOVER_SHOW_EVENTS_WITH_THIS_ACTION_ITEM_ID
      );

      if (eventsWithActionItem?.type === 'item' && eventsWithActionItem.onClick) {
        eventsWithActionItem.onClick();
      }

      expect(mockEmitFilterAction).toHaveBeenCalledWith({
        type: 'TOGGLE_EVENTS_WITH_ACTION',
        field: EVENT_ACTION,
        value: 'Test Label',
        action: 'hide',
      });
    });
  });
});
