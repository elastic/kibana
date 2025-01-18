/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PanelViewAndParameters, NodeEventsInCategoryState } from '../../types';

/**
 * `NodeEventsInCategoryState` is used to model an ordered collection of events that are all related to the same node and which all belong to a given category.
 * The app requests these via the data access layer and aggregates the responses from multiple requests. When a different node or category is selected, or when a different panel entirely is selected, the state is cleared out.
 */

/**
 * True if `nodeEventsInCategory` contains data that is relevant to `panelViewAndParameters`.
 * This is used by the reducer to enforce that the nodeEventsInCategory state is always valid.
 */
export function isRelevantToPanelViewAndParameters(
  nodeEventsInCategory: NodeEventsInCategoryState,
  panelViewAndParameters: PanelViewAndParameters
): boolean {
  return (
    panelViewAndParameters.panelView === 'nodeEventsInCategory' &&
    panelViewAndParameters.panelParameters.nodeID === nodeEventsInCategory.nodeID &&
    panelViewAndParameters.panelParameters.eventCategory === nodeEventsInCategory.eventCategory
  );
}

/**
 * Return an updated `NodeEventsInCategoryState` that has data from `first` and `second`. The `cursor` from `second` is used.
 * Returns undefined if `first` and `second` don't contain data form the same set.
 */
export function updatedWith(
  first: NodeEventsInCategoryState,
  second: NodeEventsInCategoryState
): NodeEventsInCategoryState | undefined {
  if (first.nodeID === second.nodeID && first.eventCategory === second.eventCategory) {
    return {
      nodeID: first.nodeID,
      eventCategory: first.eventCategory,
      events: [...first.events, ...second.events],
      cursor: second.cursor,
      lastCursorRequested: null,
      agentId: first.agentId,
    };
  } else {
    return undefined;
  }
}
