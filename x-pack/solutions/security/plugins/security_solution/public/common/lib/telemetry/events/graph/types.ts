/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RootSchema } from '@kbn/core/public';
// Type-only: the graph package is lazily loaded, so no runtime import may reach this file.
import type {
  GraphEmptyStateReason,
  GraphExpansionAction,
  GraphFetchErrorCategory,
  GraphGroupedItemType,
  GraphNodeAction,
  GraphNodeType,
  GraphTelemetryEvent as GraphPackageEvent,
  GraphToggleState,
} from '@kbn/cloud-security-posture-graph';

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

export const GRAPH_EXPANSION_ACTION: Record<GraphExpansionAction, GraphExpansionAction> = {
  show_entity_relationships: 'show_entity_relationships',
  show_actions_by: 'show_actions_by',
  show_actions_on: 'show_actions_on',
  show_related_events: 'show_related_events',
};

export const GRAPH_EMPTY_STATE_REASON: Record<GraphEmptyStateReason, GraphEmptyStateReason> = {
  no_data: 'no_data',
  no_results_for_filters: 'no_results_for_filters',
};

export const GRAPH_FETCH_ERROR_CATEGORY: Record<GraphFetchErrorCategory, GraphFetchErrorCategory> =
  {
    network: 'network',
    timeout: 'timeout',
    forbidden: 'forbidden',
    client_error: 'client_error',
    server_error: 'server_error',
    unknown: 'unknown',
  };

export const GRAPH_GROUPED_ITEM_TYPE: Record<GraphGroupedItemType, GraphGroupedItemType> = {
  entity: 'entity',
  event: 'event',
  alert: 'alert',
};

/**
 * Where the user opened the graph from. `entity_data_grid` is the Entity Analytics entities grid
 * row action (the actions column); `entity_flyout` is an entity flyout opened from anywhere,
 * including by clicking the entity name in that grid.
 */
export type GraphEntryPoint =
  | 'alert_flyout'
  | 'event_flyout'
  | 'entity_flyout'
  | 'entity_data_grid';

export const GRAPH_ENTRY_POINT: Record<GraphEntryPoint, GraphEntryPoint> = {
  alert_flyout: 'alert_flyout',
  event_flyout: 'event_flyout',
  entity_flyout: 'entity_flyout',
  entity_data_grid: 'entity_data_grid',
};

/** What a graph node drills through to outside the graph. */
export type GraphDrillTarget = 'event' | 'alert' | 'entity' | 'network' | 'timeline';

export const GRAPH_DRILL_TARGET: Record<GraphDrillTarget, GraphDrillTarget> = {
  event: 'event',
  alert: 'alert',
  entity: 'entity',
  network: 'network',
  timeline: 'timeline',
};

export type GraphEventId =
  | 'node_action_clicked'
  | 'filter_changed'
  | 'search_submitted'
  | 'graph_preview_shown'
  | 'graph_preview_expanded'
  | 'graph_opened'
  | 'expansion_result'
  | 'grouped_panel_opened'
  | 'grouped_item_viewed'
  | 'drill_through'
  | 'empty_state_shown'
  | 'fetch_failed';

export const GRAPH_EVENT_ID: Record<GraphEventId, GraphEventId> = {
  node_action_clicked: 'node_action_clicked',
  filter_changed: 'filter_changed',
  search_submitted: 'search_submitted',
  graph_preview_shown: 'graph_preview_shown',
  graph_preview_expanded: 'graph_preview_expanded',
  graph_opened: 'graph_opened',
  expansion_result: 'expansion_result',
  grouped_panel_opened: 'grouped_panel_opened',
  grouped_item_viewed: 'grouped_item_viewed',
  drill_through: 'drill_through',
  empty_state_shown: 'empty_state_shown',
  fetch_failed: 'fetch_failed',
};

/** All graph engagement events share one EBT event type and are told apart by `id`. */
export enum GraphEventTypes {
  EntityGraph = 'entity_graph',
}

/** The package's node action events, whose `nodeType` / `action` / `state` combinations are the only valid ones. */
type GraphNodeActionEvent = Extract<GraphPackageEvent, { type: 'node_action' }>;

/** Distributes `Omit` over a union so each member keeps its own shape. */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

interface GraphEventCommon {
  entryPoint: GraphEntryPoint;
}

export type GraphEventProperties = GraphEventCommon &
  (
    | ({ id: 'node_action_clicked' } & DistributiveOmit<GraphNodeActionEvent, 'type'>)
    | { id: 'filter_changed'; change: 'added' | 'removed' }
    | { id: 'search_submitted'; timeRangeChanged: boolean; queryChanged: boolean }
    | { id: 'graph_preview_shown'; isEmpty: boolean }
    | { id: 'graph_preview_expanded' }
    | { id: 'graph_opened' }
    | {
        id: 'expansion_result';
        action: GraphExpansionAction;
        nodeType: GraphNodeType;
        state: GraphToggleState;
        nodesAdded: boolean;
        nodesLimitReached: boolean;
      }
    | {
        id: 'grouped_panel_opened';
        nodeType: Extract<GraphNodeType, 'grouped_entity' | 'grouped_event'>;
      }
    | { id: 'grouped_item_viewed'; itemType: GraphGroupedItemType }
    | { id: 'drill_through'; drillTarget: GraphDrillTarget }
    | { id: 'empty_state_shown'; emptyReason: GraphEmptyStateReason }
    | { id: 'fetch_failed'; errorCategory: GraphFetchErrorCategory }
  );

/** Flat shape of every property the `entity_graph` event can carry; only `id` and `entryPoint` are always set. */
export interface GraphEventSchemaProperties {
  id: GraphEventId;
  entryPoint: GraphEntryPoint;
  nodeType?: GraphNodeType;
  action?: GraphNodeAction;
  state?: GraphToggleState;
  change?: 'added' | 'removed';
  timeRangeChanged?: boolean;
  queryChanged?: boolean;
  nodesAdded?: boolean;
  nodesLimitReached?: boolean;
  itemType?: GraphGroupedItemType;
  drillTarget?: GraphDrillTarget;
  emptyReason?: GraphEmptyStateReason;
  isEmpty?: boolean;
  errorCategory?: GraphFetchErrorCategory;
}

type AssertAssignable<T extends U, U> = T;

/** Fails to compile when an event variant does not fit the flat schema shape. */
export type GraphEventPropertiesMatchSchema = AssertAssignable<
  GraphEventProperties,
  GraphEventSchemaProperties
>;

export interface GraphTelemetryEventsMap {
  [GraphEventTypes.EntityGraph]: GraphEventProperties;
}

export interface GraphTelemetryEvent {
  eventType: GraphEventTypes;
  schema: RootSchema<GraphEventSchemaProperties>;
}
