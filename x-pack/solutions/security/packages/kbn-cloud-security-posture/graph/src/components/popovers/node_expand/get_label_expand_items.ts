/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { NodeViewModel } from '../../types';
import { getNodeDocumentMode } from '../../utils';
import {
  GRAPH_LABEL_EXPAND_POPOVER_SHOW_EVENTS_WITH_THIS_ACTION_ITEM_ID,
  GRAPH_LABEL_EXPAND_POPOVER_SHOW_EVENT_DETAILS_ITEM_ID,
} from '../../test_ids';
import { EVENT_ACTION } from '../../../common/constants';
import type { FilterActionType } from '../../graph_investigation/filter_actions';

/**
 * Label expand popover item with label included.
 * Contains all the data needed to render a menu item.
 * onClick handler is NOT included - the caller must bind it.
 */
export interface LabelExpandPopoverItem {
  /** Unique item type identifier */
  type: 'show-events-with-action' | 'show-event-details';
  /** Icon to display */
  iconType: string;
  /** Test subject for automation */
  testSubject: string;
  /** Resolved i18n label */
  label: string;
  /** The field to filter on (for filter actions) */
  field?: string;
  /** The value to filter for */
  value?: string;
  /** Current toggle state - 'show' means filter is not active, 'hide' means it is */
  currentAction?: 'show' | 'hide';
  /** Filter action type to emit when clicked */
  filterActionType?: FilterActionType;
}

/**
 * Input for label expand item generation.
 * Contains the minimal data needed to generate items.
 */
export interface LabelExpandInput {
  /** Label text (node.label) */
  label: string;
  /** Node document mode */
  docMode: ReturnType<typeof getNodeDocumentMode>;
}

/**
 * Create LabelExpandInput from a NodeViewModel.
 * Helper to extract the necessary data for item generation.
 */
export const createLabelExpandInput = (node: NodeViewModel): LabelExpandInput => {
  const docMode = getNodeDocumentMode(node);
  const nodeLabel = 'label' in node && typeof node.label === 'string' ? node.label : '';

  return {
    label: nodeLabel,
    docMode,
  };
};

/**
 * Resolves the i18n label for a label expand item.
 */
const resolveLabel = (
  type: LabelExpandPopoverItem['type'],
  currentAction?: 'show' | 'hide',
  docMode?: ReturnType<typeof getNodeDocumentMode>
): string => {
  switch (type) {
    case 'show-events-with-action':
      return currentAction === 'show'
        ? i18n.translate(
            'securitySolutionPackages.csp.graph.graphLabelExpandPopover.showRelatedEvents',
            { defaultMessage: 'Show related events' }
          )
        : i18n.translate(
            'securitySolutionPackages.csp.graph.graphLabelExpandPopover.hideRelatedEvents',
            { defaultMessage: 'Hide related events' }
          );
    case 'show-event-details':
      return docMode === 'single-alert'
        ? i18n.translate(
            'securitySolutionPackages.csp.graph.graphLabelExpandPopover.showAlertDetails',
            { defaultMessage: 'Show alert details' }
          )
        : i18n.translate(
            'securitySolutionPackages.csp.graph.graphLabelExpandPopover.showEventDetails',
            { defaultMessage: 'Show event details' }
          );
    default:
      return '';
  }
};

/**
 * Generates label expand popover items with labels included.
 * Returns complete items ready for rendering - caller only needs to bind onClick handlers.
 *
 * @param input - Label expand input containing node data
 * @param isFilterActive - Function to check if a filter is currently active
 * @param hasEventDetailsHandler - Whether event details handler is available
 * @returns Array of items with labels
 */
export const getLabelExpandItems = (
  input: LabelExpandInput,
  isFilterActive: (field: string, value: string) => boolean,
  hasEventDetailsHandler: boolean
): LabelExpandPopoverItem[] => {
  const { label, docMode } = input;

  const eventsWithActionActive = isFilterActive(EVENT_ACTION, label);
  const eventsAction: 'show' | 'hide' = eventsWithActionActive ? 'hide' : 'show';

  const items: LabelExpandPopoverItem[] = [
    {
      type: 'show-events-with-action',
      iconType: 'analyzeEvent',
      testSubject: GRAPH_LABEL_EXPAND_POPOVER_SHOW_EVENTS_WITH_THIS_ACTION_ITEM_ID,
      label: resolveLabel('show-events-with-action', eventsAction),
      field: EVENT_ACTION,
      value: label,
      currentAction: eventsAction,
      filterActionType: 'TOGGLE_EVENTS_WITH_ACTION',
    },
  ];

  // Add event details item if handler is available and doc mode is appropriate
  const shouldShowEventDetails =
    hasEventDetailsHandler && ['single-alert', 'single-event', 'grouped-events'].includes(docMode);

  if (shouldShowEventDetails) {
    items.push({
      type: 'show-event-details',
      iconType: 'expand',
      testSubject: GRAPH_LABEL_EXPAND_POPOVER_SHOW_EVENT_DETAILS_ITEM_ID,
      label: resolveLabel('show-event-details', undefined, docMode),
    });
  }

  return items;
};
