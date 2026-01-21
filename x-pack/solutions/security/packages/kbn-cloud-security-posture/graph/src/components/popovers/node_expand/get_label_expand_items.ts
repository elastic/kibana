/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type {
  ItemExpandPopoverListItemProps,
  SeparatorExpandPopoverListItemProps,
} from '../primitives/list_graph_popover';
import { emitFilterAction } from '../../filters/filter_pub_sub';
import { emitPreviewAction } from '../../preview_pub_sub';
import type { NodeViewModel } from '../../types';
import { getNodeDocumentMode } from '../../utils';
import {
  GRAPH_LABEL_EXPAND_POPOVER_SHOW_EVENTS_WITH_THIS_ACTION_ITEM_ID,
  GRAPH_LABEL_EXPAND_POPOVER_SHOW_EVENT_DETAILS_ITEM_ID,
} from '../../test_ids';
import { EVENT_ACTION } from '../../../common/constants';
import type { EntityOrEventItem } from '../../graph_grouped_node_preview_panel/components/grouped_item/types';

/**
 * Options for generating label expand popover items.
 */
export interface GetLabelExpandItemsOptions {
  /** The node label (action name) */
  nodeLabel: string;
  /** The node data */
  nodeData?: NodeViewModel;
  /** Function to check if a filter is currently active */
  isFilterActive: (field: string, value: string) => boolean;
  /** Callback to open event preview with full node data (for graph node popovers) */
  onOpenEventPreview?: (node: NodeViewModel) => void;
  /** Item to use for preview action via pub-sub (for flyout action buttons) */
  previewItem?: EntityOrEventItem;
  /** Callback to close the popover */
  onClose?: () => void;
}

/**
 * Generates label expand popover items with onClick handlers.
 * Returns items ready to be rendered directly in ListGraphPopover.
 */
export const getLabelExpandItems = (
  options: GetLabelExpandItemsOptions
): Array<ItemExpandPopoverListItemProps | SeparatorExpandPopoverListItemProps> => {
  const { nodeLabel, nodeData, isFilterActive, onOpenEventPreview, previewItem, onClose } = options;

  // Determine document mode
  const docMode = nodeData ? getNodeDocumentMode(nodeData) : 'single-event';

  // Check if filter is active
  const eventsWithActionActive = isFilterActive(EVENT_ACTION, nodeLabel);

  // Determine if event details should be shown
  const hasPreviewAction = onOpenEventPreview !== undefined || previewItem !== undefined;
  const shouldShowEventDetails =
    hasPreviewAction && ['single-alert', 'single-event', 'grouped-events'].includes(docMode);

  const items: Array<ItemExpandPopoverListItemProps | SeparatorExpandPopoverListItemProps> = [
    {
      type: 'item',
      iconType: 'analyzeEvent',
      testSubject: GRAPH_LABEL_EXPAND_POPOVER_SHOW_EVENTS_WITH_THIS_ACTION_ITEM_ID,
      label: eventsWithActionActive
        ? i18n.translate(
            'securitySolutionPackages.csp.graph.graphLabelExpandPopover.hideRelatedEvents',
            { defaultMessage: 'Hide related events' }
          )
        : i18n.translate(
            'securitySolutionPackages.csp.graph.graphLabelExpandPopover.showRelatedEvents',
            { defaultMessage: 'Show related events' }
          ),
      onClick: () => {
        emitFilterAction({
          type: 'TOGGLE_EVENTS_WITH_ACTION',
          field: EVENT_ACTION,
          value: nodeLabel,
          action: eventsWithActionActive ? 'hide' : 'show',
        });
        onClose?.();
      },
    },
  ];

  if (shouldShowEventDetails) {
    items.push({ type: 'separator' });
    items.push({
      type: 'item',
      iconType: 'expand',
      testSubject: GRAPH_LABEL_EXPAND_POPOVER_SHOW_EVENT_DETAILS_ITEM_ID,
      label:
        docMode === 'single-alert'
          ? i18n.translate(
              'securitySolutionPackages.csp.graph.graphLabelExpandPopover.showAlertDetails',
              { defaultMessage: 'Show alert details' }
            )
          : i18n.translate(
              'securitySolutionPackages.csp.graph.graphLabelExpandPopover.showEventDetails',
              { defaultMessage: 'Show event details' }
            ),
      onClick: () => {
        if (onOpenEventPreview && nodeData) {
          onOpenEventPreview(nodeData);
        } else if (previewItem) {
          emitPreviewAction(previewItem);
        }
        onClose?.();
      },
    });
  }

  return items;
};
