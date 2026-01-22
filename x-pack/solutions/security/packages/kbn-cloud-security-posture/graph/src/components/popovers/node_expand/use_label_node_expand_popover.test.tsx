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
import { createFilterStore, destroyFilterStore, getFilterStore } from '../../filters/filter_store';

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
  // Use unique scopeId per test run to prevent cross-test pollution
  let scopeId: string;

  beforeEach(() => {
    jest.clearAllMocks();
    capturedItemsFn = null;
    // Generate unique scopeId for each test
    scopeId = `test-scope-${Math.random().toString(36).substring(7)}`;
    // Create a filter store for the test scope
    createFilterStore(scopeId, 'test-data-view-id');
  });

  afterEach(() => {
    // Clean up the filter store
    destroyFilterStore(scopeId);
  });

  describe('itemsFn - generates menu items', () => {
    it('should return show events item (event details disabled without proper docMode)', () => {
      const node = createMockLabelNode();
      renderHook(() => useLabelNodeExpandPopover(scopeId));

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
      renderHook(() => useLabelNodeExpandPopover(scopeId));

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
      const node = createMockLabelNode();
      renderHook(() => useLabelNodeExpandPopover(scopeId));

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
      const node = createMockLabelNode();
      const filterStore = getFilterStore(scopeId);

      // Activate a filter first
      filterStore?.toggleFilter('event.action', 'Test Label', 'show');

      renderHook(() => useLabelNodeExpandPopover(scopeId));

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

  describe('filter action via FilterStore', () => {
    it('should toggle filter when events with action item is clicked', () => {
      const node = createMockLabelNode();
      renderHook(() => useLabelNodeExpandPopover(scopeId));

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

      // After clicking, the filter should be added to the store
      const filterStore = getFilterStore(scopeId);
      expect(filterStore?.getFilters().length).toBeGreaterThan(0);
    });
  });
});
