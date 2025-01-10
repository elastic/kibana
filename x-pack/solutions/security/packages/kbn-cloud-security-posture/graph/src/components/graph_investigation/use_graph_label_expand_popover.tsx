/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGraphPopover } from '../../..';
import type { ExpandButtonClickCallback, NodeProps } from '../types';
import type { PopoverActions } from '../graph/use_graph_popover';
import { GraphLabelExpandPopover } from './graph_label_expand_popover';

interface UseGraphLabelExpandPopoverArgs {
  onShowEventsWithThisActionClick: (node: NodeProps) => void;
}

export const useGraphLabelExpandPopover = ({
  onShowEventsWithThisActionClick,
}: UseGraphLabelExpandPopoverArgs) => {
  const { id, state, actions } = useGraphPopover('label-expand-popover');
  const { openPopover, closePopover } = actions;

  const selectedNode = useRef<NodeProps | null>(null);
  const unToggleCallbackRef = useRef<(() => void) | null>(null);
  const [pendingOpen, setPendingOpen] = useState<{
    node: NodeProps;
    el: HTMLElement;
    unToggleCallback: () => void;
  } | null>(null);

  const closePopoverHandler = useCallback(() => {
    selectedNode.current = null;
    unToggleCallbackRef.current?.();
    unToggleCallbackRef.current = null;
    closePopover();
  }, [closePopover]);

  const onLabelExpandButtonClick: ExpandButtonClickCallback = useCallback(
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

  useEffect(() => {
    // Open pending popover if the popover is not open
    if (!state.isOpen && pendingOpen) {
      const { node, el, unToggleCallback } = pendingOpen;

      selectedNode.current = node;
      unToggleCallbackRef.current = unToggleCallback;
      openPopover(el);

      setPendingOpen(null);
    }
  }, [state.isOpen, pendingOpen, openPopover]);

  const PopoverComponent = memo(() => (
    <GraphLabelExpandPopover
      isOpen={state.isOpen}
      anchorElement={state.anchorElement}
      closePopover={closePopoverHandler}
      onShowEventsWithThisActionClick={() => {
        onShowEventsWithThisActionClick(selectedNode.current as NodeProps);
        closePopoverHandler();
      }}
    />
  ));

  PopoverComponent.displayName = GraphLabelExpandPopover.displayName;

  const actionsWithClose: PopoverActions = useMemo(
    () => ({
      ...actions,
      closePopover: closePopoverHandler,
    }),
    [actions, closePopoverHandler]
  );

  return useMemo(
    () => ({
      onLabelExpandButtonClick,
      PopoverComponent,
      id,
      actions: actionsWithClose,
      state,
    }),
    [PopoverComponent, actionsWithClose, id, onLabelExpandButtonClick, state]
  );
};
