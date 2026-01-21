/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
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
import { RELATED_ENTITY } from '../../../common/constants';
import { DOCUMENT_TYPE_ENTITY } from '@kbn/cloud-security-posture-common/schema/graph/v1';

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
  beforeEach(() => {
    jest.clearAllMocks();
    capturedItemsFn = null;
    mockIsFilterActive.mockReturnValue(false);
  });

  describe('itemsFn - single-entity mode', () => {
    it('should return all 4 menu items when docMode is single-entity and entity is enriched', () => {
      const node = createMockNode('single-entity', 'user');
      renderHook(() => useEntityNodeExpandPopover());

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
      renderHook(() => useEntityNodeExpandPopover());

      expect(capturedItemsFn).not.toBeNull();
      const items = capturedItemsFn!(node);

      // grouped-entities mode has "Show entity details" disabled because pub-sub only supports single entities
      expect(items).toHaveLength(1);
      expect(items[0]).toMatchObject({
        type: 'item',
        testSubject: GRAPH_NODE_POPOVER_SHOW_ENTITY_DETAILS_ITEM_ID,
        disabled: true, // Disabled because pub-sub doesn't support grouped previews
      });
    });

    it('should not show filter actions in grouped-entities mode', () => {
      const node = createMockNode('grouped-entities', 'user');
      renderHook(() => useEntityNodeExpandPopover());

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
    it('should disable entity details when entity is not enriched in single-entity mode', () => {
      const node = createMockNode('single-entity', 'user', false);
      renderHook(() => useEntityNodeExpandPopover());

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

    it('should disable entity details in grouped-entities mode (pub-sub only supports single entities)', () => {
      const node = createMockNode('grouped-entities', 'user');
      renderHook(() => useEntityNodeExpandPopover());

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

    it('should enable entity details when entity is enriched in single-entity mode', () => {
      const node = createMockNode('single-entity', 'user', true);
      renderHook(() => useEntityNodeExpandPopover());

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

    it('should disable entity details when documentsData does not contain entity enrichment', () => {
      const node = createMockNode('single-entity', 'user', false);
      renderHook(() => useEntityNodeExpandPopover());

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

    it('should also disable entity details in grouped-entities mode when documentsData does not contain entity enrichment', () => {
      const node = createMockNode('grouped-entities', 'user', false);
      renderHook(() => useEntityNodeExpandPopover());

      expect(capturedItemsFn).not.toBeNull();
      const items = capturedItemsFn!(node);

      expect(items).toHaveLength(1);
      expect(items[0]).toMatchObject({
        type: 'item',
        testSubject: GRAPH_NODE_POPOVER_SHOW_ENTITY_DETAILS_ITEM_ID,
        disabled: true, // Disabled because pub-sub doesn't support grouped previews
      });
    });
  });

  describe('action labels', () => {
    it('should show "Show" labels when filters are not active', () => {
      mockIsFilterActive.mockReturnValue(false);

      const node = createMockNode('single-entity', 'user');
      renderHook(() => useEntityNodeExpandPopover());

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
      mockIsFilterActive.mockReturnValue(true);

      const node = createMockNode('single-entity', 'user');
      renderHook(() => useEntityNodeExpandPopover());

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

  describe('filter action emission via pub-sub', () => {
    it('should emit filter action when filter item is clicked', () => {
      mockIsFilterActive.mockReturnValue(false);

      const node = createMockNode('single-entity', 'user');
      renderHook(() => useEntityNodeExpandPopover());

      expect(capturedItemsFn).not.toBeNull();
      const items = capturedItemsFn!(node);

      const relatedItem = items.find(
        (item) =>
          item.type === 'item' && item.testSubject === GRAPH_NODE_POPOVER_SHOW_RELATED_ITEM_ID
      );

      if (relatedItem?.type === 'item' && relatedItem.onClick) {
        relatedItem.onClick();
      }

      expect(mockEmitFilterAction).toHaveBeenCalledWith({
        type: 'TOGGLE_RELATED_EVENTS',
        field: RELATED_ENTITY,
        value: node.id,
        action: 'show',
      });
    });

    it('should emit preview action when entity details item is clicked', () => {
      const node = createMockNode('single-entity', 'user');
      renderHook(() => useEntityNodeExpandPopover());

      expect(capturedItemsFn).not.toBeNull();
      const items = capturedItemsFn!(node);

      const entityDetailsItem = items.find(
        (item) =>
          item.type === 'item' &&
          item.testSubject === GRAPH_NODE_POPOVER_SHOW_ENTITY_DETAILS_ITEM_ID
      );

      if (entityDetailsItem?.type === 'item' && entityDetailsItem.onClick) {
        entityDetailsItem.onClick();
      }

      expect(mockEmitPreviewAction).toHaveBeenCalledWith({
        itemType: DOCUMENT_TYPE_ENTITY,
        id: 'entity-123',
        index: undefined,
        type: 'User',
        subType: undefined,
        availableInEntityStore: true,
      });
      expect(mockEmitFilterAction).not.toHaveBeenCalled();
    });
  });
});
