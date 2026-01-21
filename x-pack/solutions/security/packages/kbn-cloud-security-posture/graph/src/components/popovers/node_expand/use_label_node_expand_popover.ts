/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useNodeExpandPopover } from './use_node_expand_popover';
import type { NodeProps, NodeViewModel } from '../../types';
import { GRAPH_LABEL_EXPAND_POPOVER_TEST_ID } from '../../test_ids';
import { getLabelExpandItems } from './get_label_expand_items';
import { getNodeDocumentMode } from '../../utils';

/**
 * Hook to handle the label node expand popover.
 * This hook is used to show the popover when the user clicks on the expand button of a label node.
 * The popover contains the actions to show/hide the events with this action.
 *
 * Uses pub-sub pattern for filter state management - reads from filterState$ and emits to filterAction$.
 *
 * @param onOpenEventPreview - Optional callback to open event preview with full node data.
 *                             If provided, clicking "Show event details" calls this callback.
 *                             If not provided, it emits via previewAction$ pub-sub.
 * @returns The label node expand popover.
 */
export const useLabelNodeExpandPopover = (onOpenEventPreview?: (node: NodeViewModel) => void) => {
  const itemsFn = useCallback(
    (node: NodeProps) => {
      // Extract the label from node data
      const nodeLabel =
        'label' in node.data && typeof node.data.label === 'string' ? node.data.label : '';

      const docMode = getNodeDocumentMode(node.data);
      const isSingleAlert = docMode === 'single-alert';
      const isSingleEvent = docMode === 'single-event';
      const isGroupedEvents = docMode === 'grouped-events';

      return getLabelExpandItems({
        nodeLabel,
        onShowEventDetails: onOpenEventPreview ? () => onOpenEventPreview(node.data) : undefined,
        shouldRender: {
          // Always show filter action for label nodes
          showEventsWithAction: true,
          // Event details for single events/alerts or grouped events when handler available
          showEventDetails:
            (isSingleAlert || isSingleEvent || isGroupedEvents) && onOpenEventPreview !== undefined,
        },
        isSingleAlert,
      });
    },
    [onOpenEventPreview]
  );

  const labelNodeExpandPopover = useNodeExpandPopover({
    id: 'label-node-expand-popover',
    testSubject: GRAPH_LABEL_EXPAND_POPOVER_TEST_ID,
    itemsFn,
  });

  return labelNodeExpandPopover;
};
