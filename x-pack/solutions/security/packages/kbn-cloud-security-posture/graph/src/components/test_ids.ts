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

export const GRAPH_NODE_POPOVER_SHOW_ENTITY_DETAILS_TOOLTIP_ID =
  `${GRAPH_INVESTIGATION_TEST_ID}ShowEntityDetailsTooltip` as const;

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

export const GRAPH_ID = `${GRAPH_INVESTIGATION_TEST_ID}Graph` as const;
export const GRAPH_ENTITY_NODE_ID = `${GRAPH_INVESTIGATION_TEST_ID}EntityNode` as const;
export const GRAPH_LABEL_NODE_ID = `${GRAPH_INVESTIGATION_TEST_ID}LabelNode` as const;
export const GRAPH_STACK_NODE_ID = `${GRAPH_INVESTIGATION_TEST_ID}StackNode` as const;
export const GRAPH_EDGE_ID = `${GRAPH_INVESTIGATION_TEST_ID}Edge` as const;

export const GRAPH_STACKED_SHAPE_ID = `${GRAPH_INVESTIGATION_TEST_ID}StackedShape` as const;

export const GRAPH_MINIMAP_ID = `${GRAPH_INVESTIGATION_TEST_ID}Minimap` as const;
export const GRAPH_MINIMAP_ENTITY_NODE_ID =
  `${GRAPH_INVESTIGATION_TEST_ID}MinimapEntityNode` as const;
export const GRAPH_MINIMAP_LABEL_NODE_ID =
  `${GRAPH_INVESTIGATION_TEST_ID}MinimapLabelNode` as const;
export const GRAPH_MINIMAP_UNKNOWN_NODE_ID =
  `${GRAPH_INVESTIGATION_TEST_ID}MinimapUnknownNode` as const;

export const GRAPH_NODE_EXPAND_BUTTON_ID = `${PREFIX}NodeExpandButton` as const;

export const GRAPH_ENTITY_NODE_HOVER_SHAPE_ID =
  `${GRAPH_INVESTIGATION_TEST_ID}EntityNodeHoverShape` as const;
export const GRAPH_ENTITY_NODE_BUTTON_ID =
  `${GRAPH_INVESTIGATION_TEST_ID}EntityNodeButton` as const;
export const GRAPH_ENTITY_NODE_DETAILS_ID =
  `${GRAPH_INVESTIGATION_TEST_ID}EntityNodeDetails` as const;

export const GRAPH_IPS_TEXT_ID = `${GRAPH_INVESTIGATION_TEST_ID}IpsText` as const;
export const GRAPH_IPS_PLUS_COUNT_ID = `${GRAPH_INVESTIGATION_TEST_ID}IpsPlusCount` as const;
export const GRAPH_IPS_TOOLTIP_CONTENT_ID =
  `${GRAPH_INVESTIGATION_TEST_ID}IpsTooltipContent` as const;
export const GRAPH_IPS_TOOLTIP_IP_ID = `${GRAPH_INVESTIGATION_TEST_ID}IpsTooltipIp` as const;

export const GRAPH_FLAGS_BADGE_ID = `${GRAPH_INVESTIGATION_TEST_ID}CountryFlagsBadge` as const;
export const GRAPH_FLAGS_VISIBLE_FLAG_ID =
  `${GRAPH_INVESTIGATION_TEST_ID}CountryFlagsVisibleFlag` as const;
export const GRAPH_FLAGS_PLUS_COUNT_ID =
  `${GRAPH_INVESTIGATION_TEST_ID}CountryFlagsPlusCount` as const;
export const GRAPH_FLAGS_TOOLTIP_CONTENT_ID =
  `${GRAPH_INVESTIGATION_TEST_ID}CountryFlagsTooltipContent` as const;
export const GRAPH_FLAGS_TOOLTIP_COUNTRY_ID =
  `${GRAPH_INVESTIGATION_TEST_ID}CountryFlagsTooltipCountry` as const;

export const GRAPH_TAG_WRAPPER_ID = `${GRAPH_INVESTIGATION_TEST_ID}TagWrapper` as const;
export const GRAPH_TAG_COUNT_ID = `${GRAPH_INVESTIGATION_TEST_ID}TagCount` as const;
export const GRAPH_TAG_TEXT_ID = `${GRAPH_INVESTIGATION_TEST_ID}TagText` as const;
