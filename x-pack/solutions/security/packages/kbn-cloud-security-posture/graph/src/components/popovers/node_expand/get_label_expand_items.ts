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
import { isFilterActive } from '../../filters/filter_state';
import {
  GRAPH_LABEL_EXPAND_POPOVER_SHOW_EVENTS_WITH_THIS_ACTION_ITEM_ID,
  GRAPH_LABEL_EXPAND_POPOVER_SHOW_EVENT_DETAILS_ITEM_ID,
} from '../../test_ids';
import { EVENT_ACTION } from '../../../common/constants';

/**
 * Opt-in configuration for which items to render in the label expand popover.
 * All items default to false - consumers must explicitly enable the items they want.
 */
export interface LabelExpandEnabledItems {
  /** Show "Show events with this action" filter toggle */
  showEventsWithAction?: boolean;
  /** Show "Show event details" preview action */
  showEventDetails?: boolean;
}

/**
 * Options for generating label expand popover items.
 */
export interface GetLabelExpandItemsOptions {
  /** The node label (action name) */
  nodeLabel: string;
  /** Callback to show event details. Called when "Show event details" is clicked. */
  onShowEventDetails?: () => void;
  /** Callback to close the popover */
  onClose?: () => void;
  /** Opt-in configuration for which items to render. All default to false. */
  enabledItems: LabelExpandEnabledItems;
  /** Label for event details item. Defaults to 'Show event details'. */
  eventDetailsLabel?: string;
}

/**
 * Generates label expand popover items with onClick handlers.
 * Returns items ready to be rendered directly in ListGraphPopover.
 *
 * Uses opt-in pattern: consumers must explicitly enable each item type they want.
 */
export const getLabelExpandItems = (
  options: GetLabelExpandItemsOptions
): Array<ItemExpandPopoverListItemProps | SeparatorExpandPopoverListItemProps> => {
  const { nodeLabel, onShowEventDetails, onClose, enabledItems, eventDetailsLabel } = options;

  const items: Array<ItemExpandPopoverListItemProps | SeparatorExpandPopoverListItemProps> = [];

  // Filter action item
  if (enabledItems.showEventsWithAction) {
    const eventsWithActionActive = isFilterActive(EVENT_ACTION, nodeLabel);
    items.push({
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
    });
  }

  // Event details item (with optional separator if filter items exist)
  if (enabledItems.showEventDetails) {
    // Add separator if there are filter items before the event details
    if (items.length > 0) {
      items.push({ type: 'separator' });
    }

    const defaultLabel = i18n.translate(
      'securitySolutionPackages.csp.graph.graphLabelExpandPopover.showEventDetails',
      { defaultMessage: 'Show event details' }
    );

    items.push({
      type: 'item',
      iconType: 'expand',
      testSubject: GRAPH_LABEL_EXPAND_POPOVER_SHOW_EVENT_DETAILS_ITEM_ID,
      label: eventDetailsLabel ?? defaultLabel,
      onClick: () => {
        onShowEventDetails?.();
        onClose?.();
      },
    });
  }

  return items;
};
