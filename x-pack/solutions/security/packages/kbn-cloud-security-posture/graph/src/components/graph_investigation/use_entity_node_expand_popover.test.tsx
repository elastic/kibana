/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { Filter } from '@kbn/es-query';
import { useEntityNodeExpandPopover } from './use_entity_node_expand_popover';
import type { NodeProps } from '../types';
import type {
  ItemExpandPopoverListItemProps,
  SeparatorExpandPopoverListItemProps,
} from './list_group_graph_popover';
import {
  GRAPH_NODE_POPOVER_SHOW_ACTIONS_BY_ITEM_ID,
  GRAPH_NODE_POPOVER_SHOW_ACTIONS_ON_ITEM_ID,
  GRAPH_NODE_POPOVER_SHOW_RELATED_ITEM_ID,
  GRAPH_NODE_POPOVER_SHOW_ENTITY_DETAILS_ITEM_ID,
} from '../test_ids';

const mockSetSearchFilters = jest.fn();
const mockOnShowEntityDetailsClick = jest.fn();

const dataViewId = 'test-data-view';

// Mock useNodeExpandGraphPopover to capture and expose itemsFn
let capturedItemsFn:
  | ((
      node: NodeProps
    ) => Array<ItemExpandPopoverListItemProps | SeparatorExpandPopoverListItemProps>)
  | null = null;

jest.mock('./use_node_expand_graph_popover', () => ({
  useNodeExpandGraphPopover: jest.fn(({ itemsFn }) => {
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

const createMockNode = (
  docMode: 'single-entity' | 'grouped-entities' | 'na',
  sourceNamespaceField?: string
): NodeProps => {
  const baseNode = {
    id: 'test-node-id',
    type: 'entity',
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
      id: 'entity-123',
      color: 'primary' as const,
      shape: 'ellipse' as const,
      label: 'Test Entity',
    },
  } as NodeProps;

  if (docMode === 'single-entity' || docMode === 'na') {
    return {
      ...baseNode,
      data: {
        ...baseNode.data,
        documentsData: [
          {
            id: 'entity-123',
            type: 'entity' as const,
            sourceNamespaceField,
          },
        ],
      },
    } as NodeProps;
  }

  if (docMode === 'grouped-entities') {
    return {
      ...baseNode,
      data: {
        ...baseNode.data,
        documentsData: [
          {
            id: 'entity-123',
            type: 'entity' as const,
            sourceNamespaceField,
          },
          {
            id: 'entity-456',
            type: 'entity' as const,
            sourceNamespaceField,
          },
        ],
        count: 2,
      },
    } as NodeProps;
  }

  // na mode - node without documentsData
  return baseNode;
};

describe('useEntityNodeExpandPopover', () => {
  let searchFilters: Filter[];

  beforeEach(() => {
    jest.clearAllMocks();
    searchFilters = [];
    capturedItemsFn = null;
  });

  describe('itemsFn - single-entity mode', () => {
    it('should return all 4 menu items when docMode is single-entity and onShowEntityDetailsClick is provided', () => {
      const node = createMockNode('single-entity', 'user');
      renderHook(() =>
        useEntityNodeExpandPopover(
          mockSetSearchFilters,
          dataViewId,
          searchFilters,
          mockOnShowEntityDetailsClick
        )
      );

      expect(capturedItemsFn).not.toBeNull();
      const items = capturedItemsFn!(node);

      expect(items).toHaveLength(5); // 4 items + 1 separator
      expect(items[0]).toMatchObject({
        type: 'item',
        testSubject: GRAPH_NODE_POPOVER_SHOW_ACTIONS_BY_ITEM_ID,
      });
      expect(items[1]).toMatchObject({
        type: 'item',
        testSubject: GRAPH_NODE_POPOVER_SHOW_ACTIONS_ON_ITEM_ID,
      });
      expect(items[2]).toMatchObject({
        type: 'item',
        testSubject: GRAPH_NODE_POPOVER_SHOW_RELATED_ITEM_ID,
      });
      expect(items[3]).toMatchObject({
        type: 'separator',
      });
      expect(items[4]).toMatchObject({
        type: 'item',
        testSubject: GRAPH_NODE_POPOVER_SHOW_ENTITY_DETAILS_ITEM_ID,
        disabled: false,
      });
    });

    it('should disable entity details item when onShowEntityDetailsClick is not provided', () => {
      const node = createMockNode('single-entity', 'user');
      renderHook(() =>
        useEntityNodeExpandPopover(mockSetSearchFilters, dataViewId, searchFilters, undefined)
      );

      expect(capturedItemsFn).not.toBeNull();
      const items = capturedItemsFn!(node);

      const entityDetailsItem = items.find(
        (item) =>
          item.type === 'item' &&
          item.testSubject === GRAPH_NODE_POPOVER_SHOW_ENTITY_DETAILS_ITEM_ID
      );
      expect(entityDetailsItem).toMatchObject({
        disabled: true,
        showToolTip: true,
      });
    });
  });

  describe('itemsFn - grouped-entities mode', () => {
    it('should return only entity details item when docMode is grouped-entities', () => {
      const node = createMockNode('grouped-entities', 'user');
      renderHook(() =>
        useEntityNodeExpandPopover(
          mockSetSearchFilters,
          dataViewId,
          searchFilters,
          mockOnShowEntityDetailsClick
        )
      );

      expect(capturedItemsFn).not.toBeNull();
      const items = capturedItemsFn!(node);

      expect(items).toHaveLength(1);
      expect(items[0]).toMatchObject({
        type: 'item',
        testSubject: GRAPH_NODE_POPOVER_SHOW_ENTITY_DETAILS_ITEM_ID,
        disabled: false,
      });
    });

    it('should disable entity details item when onShowEntityDetailsClick is not provided in grouped-entities mode', () => {
      const node = createMockNode('grouped-entities', 'user');
      renderHook(() =>
        useEntityNodeExpandPopover(mockSetSearchFilters, dataViewId, searchFilters, undefined)
      );

      expect(capturedItemsFn).not.toBeNull();
      const items = capturedItemsFn!(node);

      expect(items).toHaveLength(1);
      expect(items[0]).toMatchObject({
        type: 'item',
        testSubject: GRAPH_NODE_POPOVER_SHOW_ENTITY_DETAILS_ITEM_ID,
        disabled: true,
        showToolTip: true,
      });
    });

    it('should not show filter actions in grouped-entities mode', () => {
      const node = createMockNode('grouped-entities', 'user');
      renderHook(() =>
        useEntityNodeExpandPopover(
          mockSetSearchFilters,
          dataViewId,
          searchFilters,
          mockOnShowEntityDetailsClick
        )
      );

      expect(capturedItemsFn).not.toBeNull();
      const items = capturedItemsFn!(node);

      const hasActionsBy = items.some(
        (item) =>
          item.type === 'item' && item.testSubject === GRAPH_NODE_POPOVER_SHOW_ACTIONS_BY_ITEM_ID
      );
      const hasActionsOn = items.some(
        (item) =>
          item.type === 'item' && item.testSubject === GRAPH_NODE_POPOVER_SHOW_ACTIONS_ON_ITEM_ID
      );
      const hasRelated = items.some(
        (item) =>
          item.type === 'item' && item.testSubject === GRAPH_NODE_POPOVER_SHOW_RELATED_ITEM_ID
      );

      expect(hasActionsBy).toBe(false);
      expect(hasActionsOn).toBe(false);
      expect(hasRelated).toBe(false);
    });
  });

  describe('itemsFn - na mode', () => {
    it('should treat na mode (which returns na) as single-entity', () => {
      const node = createMockNode('na');
      renderHook(() =>
        useEntityNodeExpandPopover(
          mockSetSearchFilters,
          dataViewId,
          searchFilters,
          mockOnShowEntityDetailsClick
        )
      );

      expect(capturedItemsFn).not.toBeNull();
      const items = capturedItemsFn!(node);

      // no-data mode returns 'na' from getNodeDocumentMode, which is treated as single-entity
      expect(items).toHaveLength(5); // 4 items + 1 separator
    });
  });

  describe('shouldDisableEntityDetailsListItem', () => {
    it('should disable entity details when onShowEntityDetailsClick is undefined', () => {
      const node = createMockNode('single-entity', 'user');
      renderHook(() =>
        useEntityNodeExpandPopover(mockSetSearchFilters, dataViewId, searchFilters, undefined)
      );

      expect(capturedItemsFn).not.toBeNull();
      const items = capturedItemsFn!(node);
      const entityDetailsItem = items.find(
        (item) =>
          item.type === 'item' &&
          item.testSubject === GRAPH_NODE_POPOVER_SHOW_ENTITY_DETAILS_ITEM_ID
      );

      expect(entityDetailsItem).toMatchObject({
        disabled: true,
      });
    });

    it('should enable entity details when onShowEntityDetailsClick is provided and docMode is single-entity', () => {
      const node = createMockNode('single-entity', 'user');
      renderHook(() =>
        useEntityNodeExpandPopover(
          mockSetSearchFilters,
          dataViewId,
          searchFilters,
          mockOnShowEntityDetailsClick
        )
      );

      expect(capturedItemsFn).not.toBeNull();
      const items = capturedItemsFn!(node);
      const entityDetailsItem = items.find(
        (item) =>
          item.type === 'item' &&
          item.testSubject === GRAPH_NODE_POPOVER_SHOW_ENTITY_DETAILS_ITEM_ID
      );

      expect(entityDetailsItem).toMatchObject({
        disabled: false,
      });
    });

    it('should enable entity details when onShowEntityDetailsClick is provided and docMode is grouped-entities', () => {
      const node = createMockNode('grouped-entities', 'user');
      renderHook(() =>
        useEntityNodeExpandPopover(
          mockSetSearchFilters,
          dataViewId,
          searchFilters,
          mockOnShowEntityDetailsClick
        )
      );

      expect(capturedItemsFn).not.toBeNull();
      const items = capturedItemsFn!(node);
      const entityDetailsItem = items.find(
        (item) =>
          item.type === 'item' &&
          item.testSubject === GRAPH_NODE_POPOVER_SHOW_ENTITY_DETAILS_ITEM_ID
      );

      expect(entityDetailsItem).toMatchObject({
        disabled: false,
      });
    });

    it('should treat no-data mode (which returns na) as single-entity even if onShowEntityDetailsClick is provided', () => {
      const node = createMockNode('no-data');
      renderHook(() =>
        useEntityNodeExpandPopover(
          mockSetSearchFilters,
          dataViewId,
          searchFilters,
          mockOnShowEntityDetailsClick
        )
      );

      expect(capturedItemsFn).not.toBeNull();
      const items = capturedItemsFn!(node);

      // no-data mode returns 'na' from getNodeDocumentMode, which is treated as single-entity
      expect(items).toHaveLength(5); // 4 items + 1 separator
    });
  });

  describe('action labels', () => {
    it('should show "Show" labels when filters are not active', () => {
      const node = createMockNode('single-entity', 'user');
      renderHook(() =>
        useEntityNodeExpandPopover(
          mockSetSearchFilters,
          dataViewId,
          [],
          mockOnShowEntityDetailsClick
        )
      );

      expect(capturedItemsFn).not.toBeNull();
      const items = capturedItemsFn!(node);

      const actionsByItem = items.find(
        (item) =>
          item.type === 'item' && item.testSubject === GRAPH_NODE_POPOVER_SHOW_ACTIONS_BY_ITEM_ID
      );
      const actionsOnItem = items.find(
        (item) =>
          item.type === 'item' && item.testSubject === GRAPH_NODE_POPOVER_SHOW_ACTIONS_ON_ITEM_ID
      );
      const relatedItem = items.find(
        (item) =>
          item.type === 'item' && item.testSubject === GRAPH_NODE_POPOVER_SHOW_RELATED_ITEM_ID
      );

      if (actionsByItem?.type === 'item') {
        expect(actionsByItem.label).toContain('Show');
      }
      if (actionsOnItem?.type === 'item') {
        expect(actionsOnItem.label).toContain('Show');
      }
      if (relatedItem?.type === 'item') {
        expect(relatedItem.label).toContain('Show');
      }
    });
  });
});
