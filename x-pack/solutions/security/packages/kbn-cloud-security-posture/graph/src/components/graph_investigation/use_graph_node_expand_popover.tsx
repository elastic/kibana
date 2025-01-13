/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useRef, useState } from 'react';
import { useGraphPopover } from '../../..';
import type { ExpandButtonClickCallback, NodeProps } from '../types';
import { GraphNodeExpandPopover, type NodeToggleAction } from './graph_node_expand_popover';

interface UseGraphNodeExpandPopoverArgs {
  getRelatedEntitiesAction: (node: NodeProps) => NodeToggleAction;
  getActionsByEntityAction: (node: NodeProps) => NodeToggleAction;
  getActionsOnEntityAction: (node: NodeProps) => NodeToggleAction;
  onToggleExploreRelatedEntitiesClick: (node: NodeProps, action: NodeToggleAction) => void;
  onToggleActionsByEntityClick: (node: NodeProps, action: NodeToggleAction) => void;
  onToggleActionsOnEntityClick: (node: NodeProps, action: NodeToggleAction) => void;
}

export const useGraphNodeExpandPopover = ({
  getRelatedEntitiesAction,
  getActionsByEntityAction,
  getActionsOnEntityAction,
  onToggleExploreRelatedEntitiesClick,
  onToggleActionsByEntityClick,
  onToggleActionsOnEntityClick,
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
      relatedEntitiesAction={
        selectedNode.current ? getRelatedEntitiesAction(selectedNode.current as NodeProps) : 'show'
      }
      actionsByEntityAction={
        selectedNode.current ? getActionsByEntityAction(selectedNode.current as NodeProps) : 'show'
      }
      actionsOnEntityAction={
        selectedNode.current ? getActionsOnEntityAction(selectedNode.current as NodeProps) : 'show'
      }
      onToggleRelatedEntitiesClick={(action) => {
        onToggleExploreRelatedEntitiesClick(selectedNode.current as NodeProps, action);
        closePopoverHandler();
      }}
      onToggleActionsByEntityClick={(action) => {
        onToggleActionsByEntityClick(selectedNode.current as NodeProps, action);
        closePopoverHandler();
      }}
      onToggleActionsOnEntityClick={(action) => {
        onToggleActionsOnEntityClick(selectedNode.current as NodeProps, action);
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
