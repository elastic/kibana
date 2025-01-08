/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useRef, useState } from 'react';
import { useGraphPopover } from '../../..';
import type { ExpandButtonClickCallback, NodeProps } from '../types';
import { GraphNodeExpandPopover } from './graph_node_expand_popover';

interface UseGraphNodeExpandPopoverArgs {
  onExploreRelatedEntitiesClick: (node: NodeProps) => void;
  onShowActionsByEntityClick: (node: NodeProps) => void;
  onShowActionsOnEntityClick: (node: NodeProps) => void;
}

export const useGraphNodeExpandPopover = ({
  onExploreRelatedEntitiesClick,
  onShowActionsByEntityClick,
  onShowActionsOnEntityClick,
}: UseGraphNodeExpandPopoverArgs) => {
  const { id, state, actions } = useGraphPopover('node-expand-popover');
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

  // PopoverComponent is a memoized component that renders the GraphNodeExpandPopover
  // It handles the display of the popover and the actions that can be performed on the node

  // eslint-disable-next-line react/display-name
  const PopoverComponent = memo(() => (
    <GraphNodeExpandPopover
      isOpen={state.isOpen}
      anchorElement={state.anchorElement}
      closePopover={closePopoverHandler}
      onShowRelatedEntitiesClick={() => {
        onExploreRelatedEntitiesClick(selectedNode.current as NodeProps);
        closePopoverHandler();
      }}
      onShowActionsByEntityClick={() => {
        onShowActionsByEntityClick(selectedNode.current as NodeProps);
        closePopoverHandler();
      }}
      onShowActionsOnEntityClick={() => {
        onShowActionsOnEntityClick(selectedNode.current as NodeProps);
        closePopoverHandler();
      }}
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
    onNodeExpandButtonClick,
    PopoverComponent,
    id,
    actions: {
      ...actions,
      closePopover: closePopoverHandler,
    },
    state,
  };
};
