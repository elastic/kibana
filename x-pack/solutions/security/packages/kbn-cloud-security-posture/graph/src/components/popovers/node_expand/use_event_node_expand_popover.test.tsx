/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useEventNodeExpandPopover } from './use_event_node_expand_popover';
import type { NodeProps } from '../../types';
import type {
  ItemExpandPopoverListItemProps,
  SeparatorExpandPopoverListItemProps,
} from '../primitives/list_graph_popover';
import {
  GRAPH_EVENT_EXPAND_POPOVER_SHOW_EVENTS_WITH_THIS_ACTION_ITEM_ID,
  GRAPH_EVENT_EXPAND_POPOVER_SHOW_EVENT_DETAILS_ITEM_ID,
} from '../../test_ids';
import { emitFilterToggle, isFilterActiveForScope } from '../../filters/filter_store';

// Mock filter_store module to control isFilterActiveForScope
jest.mock('../../filters/filter_store', () => {
  const actual = jest.requireActual('../../filters/filter_store');
  return {
    ...actual,
    isFilterActiveForScope: jest.fn(() => false),
    emitFilterToggle: jest.fn(),
  };
});

const mockIsFilterActiveForScope = isFilterActiveForScope as jest.MockedFunction<
  typeof isFilterActiveForScope
>;
const mockEmitFilterToggle = emitFilterToggle as jest.MockedFunction<typeof emitFilterToggle>;

// Mock useEventExpandGraphPopover to capture and expose itemsFn
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

const createMockEventNode = (): NodeProps =>
  ({
    id: 'event-node-1',
    type: 'event',
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
      kind: 'event',
    },
  } as unknown as NodeProps);

const createMockSingleEventNode = (): NodeProps => {
  const base = createMockEventNode();
  return {
    ...base,
    data: {
      ...base.data,
      documentsData: [{ id: 'event-1', type: 'event', event: { id: 'event-1' } }],
    },
  } as unknown as NodeProps;
};

const createMockSingleAlertNode = (): NodeProps => {
  const base = createMockEventNode();
  return {
    ...base,
    data: {
      ...base.data,
      documentsData: [{ id: 'alert-1', type: 'alert', event: { id: 'alert-1' } }],
    },
  } as unknown as NodeProps;
};

const createMockGroupedEventsNode = (): NodeProps => {
  const base = createMockEventNode();
  return {
    ...base,
    data: {
      ...base.data,
      documentsData: [
        { id: 'event-1', type: 'event', event: { id: 'event-1' } },
        { id: 'event-2', type: 'event', event: { id: 'event-2' } },
      ],
    },
  } as unknown as NodeProps;
};

describe('useEventNodeExpandPopover', () => {
  const scopeId = 'test-scope-id';

  beforeEach(() => {
    jest.clearAllMocks();
    capturedItemsFn = null;
    mockEmitFilterToggle.mockClear();
    mockIsFilterActiveForScope.mockReturnValue(false);
  });

  describe('itemsFn - generates menu items', () => {
    it('should return show events item (event details disabled without proper docMode)', () => {
      const node = createMockEventNode();
      renderHook(() => useEventNodeExpandPopover(scopeId));

      expect(capturedItemsFn).not.toBeNull();
      const items = capturedItemsFn!(node);

      // Based on get_event_expand_items.ts: show-events-with-action + separator + show-event-details
      // But only if docMode is 'single-alert', 'single-event', or 'grouped-events'
      // Our mock doesn't have documentsData, so docMode will be 'na' and event details won't show
      expect(items.length).toBeGreaterThanOrEqual(1);
      expect(items[0]).toMatchObject({
        type: 'item',
        testSubject: GRAPH_EVENT_EXPAND_POPOVER_SHOW_EVENTS_WITH_THIS_ACTION_ITEM_ID,
      });
    });

    it('should not show event details item when doc mode is not appropriate', () => {
      const node = createMockEventNode();
      renderHook(() => useEventNodeExpandPopover(scopeId));

      expect(capturedItemsFn).not.toBeNull();
      const items = capturedItemsFn!(node);

      // With our mock (no documentsData), docMode is 'na', so event details won't show
      const eventDetailsItem = items.find(
        (item) =>
          item.type === 'item' &&
          item.testSubject === GRAPH_EVENT_EXPAND_POPOVER_SHOW_EVENT_DETAILS_ITEM_ID
      );

      expect(eventDetailsItem).toBeUndefined();
    });
  });

  describe('action labels', () => {
    it('should show "Show" label when filter is not active', () => {
      const node = createMockEventNode();
      renderHook(() => useEventNodeExpandPopover(scopeId));

      expect(capturedItemsFn).not.toBeNull();
      const items = capturedItemsFn!(node);

      const eventsWithActionItem = items.find(
        (item) =>
          item.type === 'item' &&
          item.testSubject === GRAPH_EVENT_EXPAND_POPOVER_SHOW_EVENTS_WITH_THIS_ACTION_ITEM_ID
      );

      if (eventsWithActionItem?.type === 'item') {
        expect(eventsWithActionItem.label).toContain('Show');
      }
    });

    it('should show "Hide" label when filter is active', () => {
      // Mock isFilterActiveForScope to return true
      mockIsFilterActiveForScope.mockReturnValue(true);

      const node = createMockEventNode();
      renderHook(() => useEventNodeExpandPopover(scopeId));

      expect(capturedItemsFn).not.toBeNull();
      const items = capturedItemsFn!(node);

      const eventsWithActionItem = items.find(
        (item) =>
          item.type === 'item' &&
          item.testSubject === GRAPH_EVENT_EXPAND_POPOVER_SHOW_EVENTS_WITH_THIS_ACTION_ITEM_ID
      );

      if (eventsWithActionItem?.type === 'item') {
        expect(eventsWithActionItem.label).toContain('Hide');
      }
    });
  });

  describe('filter action via event bus', () => {
    it('should emit filter toggle event when events with action item is clicked', () => {
      const node = createMockEventNode();
      renderHook(() => useEventNodeExpandPopover(scopeId));

      expect(capturedItemsFn).not.toBeNull();
      const items = capturedItemsFn!(node);

      const eventsWithActionItem = items.find(
        (item) =>
          item.type === 'item' &&
          item.testSubject === GRAPH_EVENT_EXPAND_POPOVER_SHOW_EVENTS_WITH_THIS_ACTION_ITEM_ID
      );

      if (eventsWithActionItem?.type === 'item' && eventsWithActionItem.onClick) {
        eventsWithActionItem.onClick();
      }

      // Verify event was emitted
      expect(mockEmitFilterToggle).toHaveBeenCalledWith(
        scopeId,
        'event.action',
        'Test Label',
        'show'
      );
    });
  });

  describe('event details item label', () => {
    const findItem = (
      items: Array<ItemExpandPopoverListItemProps | SeparatorExpandPopoverListItemProps>,
      testSubject: string
    ) =>
      items.find((item) => item.type === 'item' && item.testSubject === testSubject) as
        | ItemExpandPopoverListItemProps
        | undefined;

    it('labels the details item "Show grouped events" for a grouped-events node', () => {
      renderHook(() => useEventNodeExpandPopover(scopeId, jest.fn()));

      const items = capturedItemsFn!(createMockGroupedEventsNode());

      expect(findItem(items, GRAPH_EVENT_EXPAND_POPOVER_SHOW_EVENT_DETAILS_ITEM_ID)?.label).toBe(
        'Show grouped events'
      );
    });

    it('omits the grouped events item when no preview handler is provided', () => {
      renderHook(() => useEventNodeExpandPopover(scopeId));

      const items = capturedItemsFn!(createMockGroupedEventsNode());

      expect(
        findItem(items, GRAPH_EVENT_EXPAND_POPOVER_SHOW_EVENT_DETAILS_ITEM_ID)
      ).toBeUndefined();
    });

    it('keeps "Show event details" for a single event and "Show alert details" for a single alert', () => {
      renderHook(() => useEventNodeExpandPopover(scopeId, jest.fn()));

      const eventItems = capturedItemsFn!(createMockSingleEventNode());
      const alertItems = capturedItemsFn!(createMockSingleAlertNode());

      expect(
        findItem(eventItems, GRAPH_EVENT_EXPAND_POPOVER_SHOW_EVENT_DETAILS_ITEM_ID)?.label
      ).toBe('Show event details');
      expect(
        findItem(alertItems, GRAPH_EVENT_EXPAND_POPOVER_SHOW_EVENT_DETAILS_ITEM_ID)?.label
      ).toBe('Show alert details');
    });

    it('keeps the filter item label independent of grouped mode', () => {
      renderHook(() => useEventNodeExpandPopover(scopeId, jest.fn()));

      const showItems = capturedItemsFn!(createMockGroupedEventsNode());
      expect(
        findItem(showItems, GRAPH_EVENT_EXPAND_POPOVER_SHOW_EVENTS_WITH_THIS_ACTION_ITEM_ID)?.label
      ).toBe('Show related events');

      mockIsFilterActiveForScope.mockReturnValue(true);
      const hideItems = capturedItemsFn!(createMockGroupedEventsNode());
      expect(
        findItem(hideItems, GRAPH_EVENT_EXPAND_POPOVER_SHOW_EVENTS_WITH_THIS_ACTION_ITEM_ID)?.label
      ).toBe('Hide related events');
    });
  });

  describe('telemetry', () => {
    const onTelemetryEvent = jest.fn();
    const mockOnOpenEventPreview = jest.fn();

    const clickItem = (testSubject: string, node: NodeProps) => {
      const items = capturedItemsFn!(node);
      const item = items.find(
        (candidate) => candidate.type === 'item' && candidate.testSubject === testSubject
      );
      expect(item).toBeDefined();
      if (item?.type === 'item') {
        item.onClick?.();
      }
    };

    beforeEach(() => {
      onTelemetryEvent.mockClear();
      mockOnOpenEventPreview.mockClear();
    });

    it('reports show_related_events with the show state', () => {
      renderHook(() => useEventNodeExpandPopover(scopeId, undefined, onTelemetryEvent));
      clickItem(
        GRAPH_EVENT_EXPAND_POPOVER_SHOW_EVENTS_WITH_THIS_ACTION_ITEM_ID,
        createMockEventNode()
      );

      expect(onTelemetryEvent).toHaveBeenCalledTimes(1);
      expect(onTelemetryEvent).toHaveBeenCalledWith({
        type: 'node_action',
        nodeType: 'event',
        action: 'show_related_events',
        state: 'show',
      });
    });

    it('reports show_related_events with the hide state when the filter is already active', () => {
      mockIsFilterActiveForScope.mockReturnValue(true);
      renderHook(() => useEventNodeExpandPopover(scopeId, undefined, onTelemetryEvent));
      clickItem(
        GRAPH_EVENT_EXPAND_POPOVER_SHOW_EVENTS_WITH_THIS_ACTION_ITEM_ID,
        createMockEventNode()
      );

      expect(onTelemetryEvent).toHaveBeenCalledWith({
        type: 'node_action',
        nodeType: 'event',
        action: 'show_related_events',
        state: 'hide',
      });
    });

    it('reports show_details and still opens the preview', () => {
      const node = createMockSingleEventNode();
      renderHook(() =>
        useEventNodeExpandPopover(scopeId, mockOnOpenEventPreview, onTelemetryEvent)
      );
      clickItem(GRAPH_EVENT_EXPAND_POPOVER_SHOW_EVENT_DETAILS_ITEM_ID, node);

      expect(onTelemetryEvent).toHaveBeenCalledWith({
        type: 'node_action',
        nodeType: 'event',
        action: 'show_details',
      });
      expect(mockOnOpenEventPreview).toHaveBeenCalledWith(node.data);
    });

    it('reports show_related_events as grouped_event for a grouped event node', () => {
      renderHook(() => useEventNodeExpandPopover(scopeId, undefined, onTelemetryEvent));
      clickItem(
        GRAPH_EVENT_EXPAND_POPOVER_SHOW_EVENTS_WITH_THIS_ACTION_ITEM_ID,
        createMockGroupedEventsNode()
      );

      expect(onTelemetryEvent).toHaveBeenCalledTimes(1);
      expect(onTelemetryEvent).toHaveBeenCalledWith({
        type: 'node_action',
        nodeType: 'grouped_event',
        action: 'show_related_events',
        state: 'show',
      });
    });

    it('reports the hide state of show_related_events on a grouped event node', () => {
      mockIsFilterActiveForScope.mockReturnValue(true);
      renderHook(() => useEventNodeExpandPopover(scopeId, undefined, onTelemetryEvent));
      clickItem(
        GRAPH_EVENT_EXPAND_POPOVER_SHOW_EVENTS_WITH_THIS_ACTION_ITEM_ID,
        createMockGroupedEventsNode()
      );

      expect(onTelemetryEvent).toHaveBeenCalledWith({
        type: 'node_action',
        nodeType: 'grouped_event',
        action: 'show_related_events',
        state: 'hide',
      });
    });

    it('keeps reporting show_related_events as event for a single event node', () => {
      renderHook(() => useEventNodeExpandPopover(scopeId, undefined, onTelemetryEvent));
      clickItem(
        GRAPH_EVENT_EXPAND_POPOVER_SHOW_EVENTS_WITH_THIS_ACTION_ITEM_ID,
        createMockSingleEventNode()
      );

      expect(onTelemetryEvent).toHaveBeenCalledWith({
        type: 'node_action',
        nodeType: 'event',
        action: 'show_related_events',
        state: 'show',
      });
    });

    it('reports show_grouped_events for a grouped event node and still opens the preview', () => {
      const node = createMockGroupedEventsNode();
      renderHook(() =>
        useEventNodeExpandPopover(scopeId, mockOnOpenEventPreview, onTelemetryEvent)
      );
      clickItem(GRAPH_EVENT_EXPAND_POPOVER_SHOW_EVENT_DETAILS_ITEM_ID, node);

      expect(onTelemetryEvent).toHaveBeenCalledTimes(1);
      expect(onTelemetryEvent).toHaveBeenCalledWith({
        type: 'node_action',
        nodeType: 'grouped_event',
        action: 'show_grouped_events',
      });
      expect(mockOnOpenEventPreview).toHaveBeenCalledWith(node.data);
    });

    it('does not throw on any click path when onTelemetryEvent is omitted', () => {
      const node = createMockSingleEventNode();
      renderHook(() => useEventNodeExpandPopover(scopeId, mockOnOpenEventPreview));

      expect(() => {
        clickItem(GRAPH_EVENT_EXPAND_POPOVER_SHOW_EVENTS_WITH_THIS_ACTION_ITEM_ID, node);
        clickItem(GRAPH_EVENT_EXPAND_POPOVER_SHOW_EVENT_DETAILS_ITEM_ID, node);
      }).not.toThrow();
    });
  });
});
