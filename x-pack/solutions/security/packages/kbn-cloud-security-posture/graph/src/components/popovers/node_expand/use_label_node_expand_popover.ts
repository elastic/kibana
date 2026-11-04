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
import type { GraphTelemetryHandler } from '../../graph_telemetry';
import { emitFilterToggle, isFilterActiveForScope } from '../../filters/filter_store';

/**
 * Hook to handle the label node expand popover.
 * This hook is used to show the popover when the user clicks on the expand button of a label node.
 * The popover contains the actions to show/hide the events with this action.
 *
 * Uses filter event bus for filter state management - emits events via emitFilterToggle().
 *
 * @param scopeId - The unique identifier for the graph instance (used to scope filter state)
 * @param onOpenEventPreview - Optional callback to open event preview with full node data.
 *                             If provided, clicking "Show event details" calls this callback.
 * @param onTelemetryEvent - Optional callback invoked when the user triggers a popover action.
 * @returns The label node expand popover.
 */
export const useLabelNodeExpandPopover = (
  scopeId: string,
  onOpenEventPreview?: (node: NodeViewModel) => void,
  onTelemetryEvent?: GraphTelemetryHandler
) => {
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
        onShowEventDetails: onOpenEventPreview
          ? () => {
              onTelemetryEvent?.(
                isGroupedEvents
                  ? {
                      type: 'node_action',
                      nodeType: 'grouped_event',
                      action: 'show_grouped_events',
                    }
                  : { type: 'node_action', nodeType: 'event', action: 'show_details' }
              );
              onOpenEventPreview(node.data);
            }
          : undefined,
        isFilterActive: (field, value) => isFilterActiveForScope(scopeId, field, value),
        toggleFilter: (field, value, action) => {
          onTelemetryEvent?.({
            type: 'node_action',
            nodeType: isGroupedEvents ? 'grouped_event' : 'event',
            action: 'show_related_events',
            state: action,
          });
          emitFilterToggle(scopeId, field, value, action);
        },
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
    [scopeId, onOpenEventPreview, onTelemetryEvent]
  );

  const labelNodeExpandPopover = useNodeExpandPopover({
    id: 'label-node-expand-popover',
    testSubject: GRAPH_LABEL_EXPAND_POPOVER_TEST_ID,
    itemsFn,
  });

  return labelNodeExpandPopover;
};
