/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NodeViewModel } from '../../types';
import { getNodeDocumentMode } from '../../utils';
import {
  GRAPH_LABEL_EXPAND_POPOVER_SHOW_EVENTS_WITH_THIS_ACTION_ITEM_ID,
  GRAPH_LABEL_EXPAND_POPOVER_SHOW_EVENT_DETAILS_ITEM_ID,
} from '../../test_ids';
import { EVENT_ACTION } from '../../../common/constants';
import type { FilterActionType } from '../../graph_investigation/filter_actions';

/**
 * Action descriptor for label expand popover items.
 * Contains all the data needed to render a menu item and emit filter actions.
 * Does NOT contain labels or onClick handlers - those are bound by the caller.
 */
export interface LabelExpandItemDescriptor {
  /** Unique item type identifier */
  type: 'show-events-with-action' | 'show-event-details';
  /** Icon to display */
  iconType: string;
  /** Test subject for automation */
  testSubject: string;
  /** The field to filter on (for filter actions) */
  field?: string;
  /** The value to filter for */
  value?: string;
  /** Current toggle state - 'show' means filter is not active, 'hide' means it is */
  currentAction?: 'show' | 'hide';
  /** Filter action type to emit when clicked */
  filterActionType?: FilterActionType;
  /** Document mode for determining label text */
  docMode?: ReturnType<typeof getNodeDocumentMode>;
}

/**
 * Input for label expand item generation.
 * Contains the minimal data needed to generate item descriptors.
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
  const label = 'label' in node && typeof node.label === 'string' ? node.label : '';

  return {
    label,
    docMode,
  };
};

/**
 * Pure function to generate label expand item descriptors.
 * Returns an array of item descriptors based on the node state.
 * The caller is responsible for:
 * - Resolving labels (i18n)
 * - Binding onClick handlers
 * - Determining current filter state (isFilterActive)
 *
 * @param input - Label expand input containing node data
 * @param isFilterActive - Function to check if a filter is currently active
 * @param hasEventDetailsHandler - Whether event details handler is available
 * @returns Array of item descriptors
 */
export const getLabelExpandItems = (
  input: LabelExpandInput,
  isFilterActive: (field: string, value: string) => boolean,
  hasEventDetailsHandler: boolean
): LabelExpandItemDescriptor[] => {
  const { label, docMode } = input;

  const eventsWithActionActive = isFilterActive(EVENT_ACTION, label);

  const items: LabelExpandItemDescriptor[] = [
    {
      type: 'show-events-with-action',
      iconType: 'analyzeEvent',
      testSubject: GRAPH_LABEL_EXPAND_POPOVER_SHOW_EVENTS_WITH_THIS_ACTION_ITEM_ID,
      field: EVENT_ACTION,
      value: label,
      currentAction: eventsWithActionActive ? 'hide' : 'show',
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
      docMode, // Pass doc mode for label resolution (alert vs event)
    });
  }

  return items;
};
