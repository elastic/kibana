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
import {
  GRAPH_LABEL_EXPAND_POPOVER_SHOW_EVENTS_WITH_THIS_ACTION_ITEM_ID,
  GRAPH_LABEL_EXPAND_POPOVER_SHOW_EVENT_DETAILS_ITEM_ID,
} from '../../test_ids';
import { EVENT_ACTION } from '../../../common/constants';

/**
 * Opt-in configuration for which items to render in the label expand popover.
 * All items default to false - consumers must explicitly enable the items they want.
 */
export interface LabelExpandShouldRender {
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
  /**
   * Callback to check if a filter is currently active.
   * Returns true if the filter for the given field and value is active.
   * If undefined, filter items will not show active state.
   */
  isFilterActive?: (field: string, value: string) => boolean;
  /**
   * Callback to toggle a filter on/off.
   * If undefined, filter items will not toggle when clicked.
   */
  toggleFilter?: (field: string, value: string, action: 'show' | 'hide') => void;
  /** Opt-in configuration for which items to render. All default to false. */
  shouldRender: LabelExpandShouldRender;
  /** Whether this is a single alert node. Changes label to "Show alert details". Defaults to false. */
  isSingleAlert?: boolean;
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
  const {
    nodeLabel,
    onShowEventDetails,
    onClose,
    isFilterActive,
    toggleFilter,
    shouldRender,
    isSingleAlert = false,
  } = options;

  const items: Array<ItemExpandPopoverListItemProps | SeparatorExpandPopoverListItemProps> = [];

  // Filter action item
  if (shouldRender.showEventsWithAction) {
    const eventsWithActionActive = isFilterActive?.(EVENT_ACTION, nodeLabel) ?? false;
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
        toggleFilter?.(EVENT_ACTION, nodeLabel, eventsWithActionActive ? 'hide' : 'show');
        onClose?.();
      },
    });
  }

  // Event details item (with optional separator if filter items exist)
  if (shouldRender.showEventDetails) {
    // Add separator if there are filter items before the event details
    if (items.length > 0) {
      items.push({ type: 'separator' });
    }

    const eventDetailsLabel = isSingleAlert
      ? i18n.translate(
          'securitySolutionPackages.csp.graph.graphLabelExpandPopover.showAlertDetails',
          { defaultMessage: 'Show alert details' }
        )
      : i18n.translate(
          'securitySolutionPackages.csp.graph.graphLabelExpandPopover.showEventDetails',
          { defaultMessage: 'Show event details' }
        );

    items.push({
      type: 'item',
      iconType: 'expand',
      testSubject: GRAPH_LABEL_EXPAND_POPOVER_SHOW_EVENT_DETAILS_ITEM_ID,
      label: eventDetailsLabel,
      onClick: () => {
        onShowEventDetails?.();
        onClose?.();
      },
    });
  }

  return items;
};
