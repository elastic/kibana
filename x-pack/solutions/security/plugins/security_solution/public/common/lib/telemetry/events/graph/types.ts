/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RootSchema } from '@kbn/core/public';
// Type-only: the graph package is lazily loaded, so no runtime import may reach this file.
import type {
  GraphNodeAction,
  GraphNodeType,
  GraphToggleState,
} from '@kbn/cloud-security-posture-graph';

/** Which flyout system the graph was used in. */
export const GRAPH_FLYOUT_VERSION = {
  LEGACY: 'legacy',
  V2: 'v2',
} as const;
export type GraphFlyoutVersion = (typeof GRAPH_FLYOUT_VERSION)[keyof typeof GRAPH_FLYOUT_VERSION];

/** Exhaustive maps so a new package value fails to compile here until it is described. */
export const GRAPH_NODE_TYPE: Record<GraphNodeType, GraphNodeType> = {
  entity: 'entity',
  grouped_entity: 'grouped_entity',
  event: 'event',
  grouped_event: 'grouped_event',
};

export const GRAPH_NODE_ACTION: Record<GraphNodeAction, GraphNodeAction> = {
  show_entity_relationships: 'show_entity_relationships',
  show_actions_by: 'show_actions_by',
  show_actions_on: 'show_actions_on',
  show_related_events: 'show_related_events',
  show_details: 'show_details',
  show_grouped_entities: 'show_grouped_entities',
  show_grouped_events: 'show_grouped_events',
};

export const GRAPH_TOGGLE_STATE: Record<GraphToggleState, GraphToggleState> = {
  show: 'show',
  hide: 'hide',
};

export enum GraphEventTypes {
  NodeActionClicked = 'Graph Node Action Clicked',
  FilterChanged = 'Graph Filter Changed',
  SearchSubmitted = 'Graph Search Submitted',
  PreviewExpanded = 'Graph Preview Expanded',
}

interface ReportGraphNodeActionClickedParams {
  nodeType: GraphNodeType;
  action: GraphNodeAction;
  state?: GraphToggleState;
  flyoutVersion: GraphFlyoutVersion;
}

interface ReportGraphFilterChangedParams {
  change: 'added' | 'removed';
  flyoutVersion: GraphFlyoutVersion;
}

interface ReportGraphSearchSubmittedParams {
  timeRangeChanged: boolean;
  queryChanged: boolean;
  flyoutVersion: GraphFlyoutVersion;
}

interface ReportGraphPreviewExpandedParams {
  flyoutVersion: GraphFlyoutVersion;
}

export interface GraphTelemetryEventsMap {
  [GraphEventTypes.NodeActionClicked]: ReportGraphNodeActionClickedParams;
  [GraphEventTypes.FilterChanged]: ReportGraphFilterChangedParams;
  [GraphEventTypes.SearchSubmitted]: ReportGraphSearchSubmittedParams;
  [GraphEventTypes.PreviewExpanded]: ReportGraphPreviewExpandedParams;
}

export interface GraphTelemetryEvent {
  eventType: GraphEventTypes;
  schema: RootSchema<GraphTelemetryEventsMap[GraphEventTypes]>;
}
