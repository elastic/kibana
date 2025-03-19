/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useRef, useState } from 'react';
import { useGraphPopover } from '../../..';
import type { ExpandButtonClickCallback, NodeProps } from '../types';
import {
  ListGroupGraphPopover,
  type ItemExpandPopoverListItemProps,
  type SeparatorExpandPopoverListItemProps,
} from './list_group_graph_popover';
import type { PopoverActions, PopoverState } from '../graph/use_graph_popover';

interface UseNodeExpandGraphPopoverArgs {
  /**
   * The ID of the popover.
   */
  id: string;

  /**
   * The data-test-subj value for the popover.
   */
  testSubject: string;

  /**
   * Function to get the list of items to display in the popover.
   * This function is called each time the popover is opened.
   */
  itemsFn?: (
    node: NodeProps
  ) => Array<ItemExpandPopoverListItemProps | SeparatorExpandPopoverListItemProps>;
}

export interface UseNodeExpandGraphPopoverReturn {
  /**
   * The ID of the popover.
   */
  id: string;

  /**
   * Handler to open the popover when the node expand button is clicked.
   */
  onNodeExpandButtonClick: ExpandButtonClickCallback;

  /**
   * The component that renders the popover.
   */
  PopoverComponent: React.FC;

  /**
   * The popover actions and state.
   */
  actions: PopoverActions;

  /**
   * The popover state.
   */
  state: PopoverState;
}

export const useNodeExpandGraphPopover = ({
  id,
  testSubject,
  itemsFn,
}: UseNodeExpandGraphPopoverArgs): UseNodeExpandGraphPopoverReturn => {
  const { state, actions } = useGraphPopover(id);
  const { openPopover, closePopover } = actions;

  const selectedNode = useRef<NodeProps | null>(null);
  const unToggleCallbackRef = useRef<(() => void) | null>(null);
  const [pendingOpen, setPendingOpen] = useState<{
    node: NodeProps;
    el: HTMLElement;
    unToggleCallback: () => void;
  } | null>(null);

  // Handler to close the popover, reset selected node and unToggle callback
  const closePopoverHandler = useCallback(() => {
    selectedNode.current = null;
    unToggleCallbackRef.current?.();
    unToggleCallbackRef.current = null;
    closePopover();
  }, [closePopover]);

  /**
   * Handles the click event on the node expand button.
   * Closes the current popover if open and sets the pending open state
   * if the clicked node is different from the currently selected node.
   */
  const onNodeExpandButtonClick: ExpandButtonClickCallback = useCallback(
    (e, node, unToggleCallback) => {
      const lastExpandedNode = selectedNode.current?.id;

      // Close the current popover if open
      closePopoverHandler();

      if (lastExpandedNode !== node.id) {
        // Set the pending open state
        setPendingOpen({ node, el: e.currentTarget, unToggleCallback });
      }
    },
    [closePopoverHandler]
  );

  // Wrap the items function to add the onClick handler to the items and close the popover
  const itemsFnWrapper = useCallback(() => {
    const node = selectedNode.current;

    if (!node) {
      return [];
    }

    const items = itemsFn?.(node) || [];
    return items.map((item) => {
      if (item.type === 'item') {
        return {
          ...item,
          onClick: () => {
            item.onClick();
            closePopoverHandler();
          },
        };
      }

      return item;
    });
  }, [closePopoverHandler, itemsFn]);

  // PopoverComponent is a memoized component that renders the GraphNodeExpandPopover
  // It handles the display of the popover and the actions that can be performed on the node
  // eslint-disable-next-line react/display-name
  const PopoverComponent = memo(() => (
    <ListGroupGraphPopover
      isOpen={state.isOpen}
      anchorElement={state.anchorElement}
      closePopover={closePopoverHandler}
      itemsFn={itemsFnWrapper}
      testSubject={testSubject}
    />
  ));

  // Open pending popover if the popover is not open
  // This block checks if there is a pending popover to be opened.
  // If the popover is not currently open and there is a pending popover,
  // it sets the selected node, stores the unToggle callback, and opens the popover.
  if (!state.isOpen && pendingOpen) {
    const { node, el, unToggleCallback } = pendingOpen;

    selectedNode.current = node;
    unToggleCallbackRef.current = unToggleCallback;
    openPopover(el);

    setPendingOpen(null);
  }

  return {
    id,
    onNodeExpandButtonClick,
    PopoverComponent,
    actions: {
      ...actions,
      closePopover: closePopoverHandler,
    },
    state,
  };
};
