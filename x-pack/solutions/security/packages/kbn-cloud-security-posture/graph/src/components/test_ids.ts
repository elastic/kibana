/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const PREFIX = 'cloudSecurityGraph' as const;

export const GRAPH_INVESTIGATION_TEST_ID = `${PREFIX}GraphInvestigation` as const;
export const GRAPH_NODE_EXPAND_POPOVER_TEST_ID =
  `${GRAPH_INVESTIGATION_TEST_ID}GraphNodeExpandPopover` as const;
export const GRAPH_NODE_POPOVER_SHOW_RELATED_ITEM_ID =
  `${GRAPH_INVESTIGATION_TEST_ID}ExploreRelatedEntities` as const;
export const GRAPH_NODE_POPOVER_SHOW_ACTIONS_BY_ITEM_ID =
  `${GRAPH_INVESTIGATION_TEST_ID}ShowActionsByEntity` as const;
export const GRAPH_NODE_POPOVER_SHOW_ACTIONS_ON_ITEM_ID =
  `${GRAPH_INVESTIGATION_TEST_ID}ShowActionsOnEntity` as const;
export const GRAPH_NODE_POPOVER_SHOW_ENTITY_DETAILS_ITEM_ID =
  `${GRAPH_INVESTIGATION_TEST_ID}ShowEntityDetails` as const;

export const GRAPH_LABEL_EXPAND_POPOVER_TEST_ID =
  `${GRAPH_INVESTIGATION_TEST_ID}GraphLabelExpandPopover` as const;
export const GRAPH_LABEL_EXPAND_POPOVER_SHOW_EVENTS_WITH_THIS_ACTION_ITEM_ID =
  `${GRAPH_INVESTIGATION_TEST_ID}ShowEventsWithThisAction` as const;
export const GRAPH_LABEL_EXPAND_POPOVER_SHOW_EVENT_DETAILS_ITEM_ID =
  `${GRAPH_INVESTIGATION_TEST_ID}ShowEventDetails` as const;

export const GRAPH_ACTIONS_TOGGLE_SEARCH_ID = `${GRAPH_INVESTIGATION_TEST_ID}ToggleSearch` as const;
export const GRAPH_ACTIONS_INVESTIGATE_IN_TIMELINE_ID =
  `${GRAPH_INVESTIGATION_TEST_ID}InvestigateInTimeline` as const;

export const GRAPH_CONTROLS_ZOOM_IN_ID = `${GRAPH_INVESTIGATION_TEST_ID}ZoomIn` as const;
export const GRAPH_CONTROLS_ZOOM_OUT_ID = `${GRAPH_INVESTIGATION_TEST_ID}ZoomOut` as const;
export const GRAPH_CONTROLS_CENTER_ID = `${GRAPH_INVESTIGATION_TEST_ID}Center` as const;
export const GRAPH_CONTROLS_FIT_VIEW_ID = `${GRAPH_INVESTIGATION_TEST_ID}FitView` as const;

export const NODE_EXPAND_BUTTON_TEST_ID = `${PREFIX}NodeExpandButton` as const;
