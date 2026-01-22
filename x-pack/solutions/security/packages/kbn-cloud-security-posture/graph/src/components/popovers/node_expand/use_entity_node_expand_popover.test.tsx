/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { Filter } from '@kbn/es-query';
import { useEntityNodeExpandPopover } from './use_entity_node_expand_popover';
import type { NodeProps } from '../../types';
import type {
  ItemExpandPopoverListItemProps,
  SeparatorExpandPopoverListItemProps,
} from '../primitives/list_graph_popover';
import {
  GRAPH_NODE_POPOVER_SHOW_ACTIONS_BY_ITEM_ID,
  GRAPH_NODE_POPOVER_SHOW_ACTIONS_ON_ITEM_ID,
  GRAPH_NODE_POPOVER_SHOW_RELATED_ITEM_ID,
  GRAPH_NODE_POPOVER_SHOW_ENTITY_DETAILS_ITEM_ID,
} from '../../test_ids';
import { addFilter } from '../../graph_investigation/search_filters';
import { RELATED_ENTITY } from '../../../common/constants';

const mockSetSearchFilters = jest.fn();
const mockOnShowEntityDetailsClick = jest.fn();

const dataViewId = 'test-data-view';

// Mock useNodeExpandGraphPopover to capture and expose itemsFn
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

const createMockNode = (
  docMode: 'single-entity' | 'grouped-entities',
  ecsParentField?: string,
  hasEntityEnrichment: boolean = true
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

  if (docMode === 'single-entity') {
    const docData: Record<string, unknown> = {
      id: 'entity-123',
      type: 'entity' as const,
      entity: {
        ecsParentField,
        availableInEntityStore: hasEntityEnrichment,
      },
    };

    // Only add enrichment fields if hasEntityEnrichment is true
    if (hasEntityEnrichment && docData.entity) {
      (docData.entity as Record<string, unknown>).name = 'Test Entity';
      (docData.entity as Record<string, unknown>).type = 'User';
    }

    return {
      ...baseNode,
      data: {
        ...baseNode.data,
        documentsData: [docData],
      },
    } as NodeProps;
  }

  if (docMode === 'grouped-entities') {
    const createDocData = (id: string): Record<string, unknown> => {
      const docData: Record<string, unknown> = {
        id,
        type: 'entity' as const,
        entity: {
          ecsParentField,
          availableInEntityStore: hasEntityEnrichment,
        },
      };

      if (hasEntityEnrichment && docData.entity) {
        (docData.entity as Record<string, unknown>).name = 'Test Entity';
        (docData.entity as Record<string, unknown>).type = 'User';
      }

      return docData;
    };

    return {
      ...baseNode,
      data: {
        ...baseNode.data,
        documentsData: [createDocData('entity-123'), createDocData('entity-456')],
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

  describe('shouldDisableEntityDetailsListItem', () => {
    it('should disable entity details when onShowEntityDetailsClick is not provided in single-entity mode', () => {
      const node = createMockNode('single-entity', 'user');
      renderHook(() => useEntityNodeExpandPopover(mockSetSearchFilters, dataViewId, searchFilters));

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

    it('should disable entity details item when onShowEntityDetailsClick is not provided in grouped-entities mode', () => {
      const node = createMockNode('grouped-entities', 'user');
      renderHook(() => useEntityNodeExpandPopover(mockSetSearchFilters, dataViewId, searchFilters));

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

    it('should disable entity details when documentsData does not contain entity field', () => {
      const node = createMockNode('single-entity', 'user', false);
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
        disabled: true,
        showToolTip: true,
      });
    });

    it('should not disable entity details in grouped-entities mode even when documentsData does not contain entity field', () => {
      const node = createMockNode('grouped-entities', 'user', false);
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
        disabled: false, // Entity field check only applies to single-entity mode
      });
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

    it('should show "Hide" labels when filters are active', () => {
      const node = createMockNode('single-entity', 'user');

      // Create filters that match the node ID for all three filter types
      // This simulates filters being active for this node
      let activeFilters: Filter[] = [];
      activeFilters = addFilter(dataViewId, activeFilters, 'user.entity.id', node.id);
      activeFilters = addFilter(dataViewId, activeFilters, 'user.target.entity.id', node.id);
      activeFilters = addFilter(dataViewId, activeFilters, RELATED_ENTITY, node.id);

      renderHook(() =>
        useEntityNodeExpandPopover(
          mockSetSearchFilters,
          dataViewId,
          activeFilters,
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
        expect(actionsByItem.label).toContain('Hide');
      }
      if (actionsOnItem?.type === 'item') {
        expect(actionsOnItem.label).toContain('Hide');
      }
      if (relatedItem?.type === 'item') {
        expect(relatedItem.label).toContain('Hide');
      }
    });
  });
});
