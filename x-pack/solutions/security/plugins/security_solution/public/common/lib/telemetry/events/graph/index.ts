/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GraphTelemetryEvent } from './types';
import {
  GraphEventTypes,
  GRAPH_DRILL_TARGET,
  GRAPH_EMPTY_STATE_REASON,
  GRAPH_ENTRY_POINT,
  GRAPH_EVENT_ID,
  GRAPH_EXPANSION_ACTION,
  GRAPH_FETCH_ERROR_CATEGORY,
  GRAPH_GROUPED_ITEM_TYPE,
  GRAPH_NODE_ACTION,
  GRAPH_NODE_TYPE,
  GRAPH_TOGGLE_STATE,
} from './types';

/** Joins all values of a const map into a pipe-separated string for schema descriptions. */
const list = (o: Record<string, string>): string => Object.values(o).join('|');

export const graphEntityGraphEvent: GraphTelemetryEvent = {
  eventType: GraphEventTypes.EntityGraph,
  schema: {
    id: {
      type: 'keyword',
      _meta: {
        description: `Which graph engagement happened (${list(GRAPH_EVENT_ID)})`,
        optional: false,
      },
    },
    entryPoint: {
      type: 'keyword',
      _meta: {
        description: `Where the graph was opened or previewed from (${list(
          GRAPH_ENTRY_POINT
        )}). entity_data_grid is the entities grid row action (actions column); entity_flyout is an entity flyout opened from anywhere, including by clicking the entity name in the grid`,
        optional: false,
      },
    },
    nodeType: {
      type: 'keyword',
      _meta: {
        description: `The kind of graph node the event is about (${list(
          GRAPH_NODE_TYPE
        )}). Set for node_action_clicked, expansion_result and grouped_panel_opened (grouped_entity|grouped_event only)`,
        optional: true,
      },
    },
    action: {
      type: 'keyword',
      _meta: {
        description: `The popover action that was clicked (${list(
          GRAPH_NODE_ACTION
        )}). Set for node_action_clicked; for expansion_result only the expansion actions (${list(
          GRAPH_EXPANSION_ACTION
        )})`,
        optional: true,
      },
    },
    state: {
      type: 'keyword',
      _meta: {
        description: `For toggle actions, whether the click turned the effect on or off (${list(
          GRAPH_TOGGLE_STATE
        )}). Set for node_action_clicked (absent for non-toggle actions) and expansion_result`,
        optional: true,
      },
    },
    change: {
      type: 'keyword',
      _meta: {
        description:
          'Whether a filter was added to or removed from the graph search bar (added|removed). Set for filter_changed',
        optional: true,
      },
    },
    timeRangeChanged: {
      type: 'boolean',
      _meta: {
        description:
          'Whether the submitted graph search changed the time range. Set for search_submitted',
        optional: true,
      },
    },
    queryChanged: {
      type: 'boolean',
      _meta: {
        description:
          'Whether the submitted graph search changed the query. Set for search_submitted',
        optional: true,
      },
    },
    nodesAdded: {
      type: 'boolean',
      _meta: {
        description:
          'Whether the expansion added at least one node to the graph. Set for expansion_result',
        optional: true,
      },
    },
    nodesLimitReached: {
      type: 'boolean',
      _meta: {
        description:
          'Whether the graph hit its node limit after the expansion. Set for expansion_result',
        optional: true,
      },
    },
    itemType: {
      type: 'keyword',
      _meta: {
        description: `The kind of item viewed from the grouped node panel (${list(
          GRAPH_GROUPED_ITEM_TYPE
        )}). Set for grouped_item_viewed`,
        optional: true,
      },
    },
    drillTarget: {
      type: 'keyword',
      _meta: {
        description: `What the user drilled through to from the graph (${list(
          GRAPH_DRILL_TARGET
        )}). Set for drill_through`,
        optional: true,
      },
    },
    emptyReason: {
      type: 'keyword',
      _meta: {
        description: `Why the graph rendered no nodes (${list(
          GRAPH_EMPTY_STATE_REASON
        )}). Set for empty_state_shown`,
        optional: true,
      },
    },
    isEmpty: {
      type: 'boolean',
      _meta: {
        description:
          'Whether the loaded graph preview has no nodes. Set only for graph_preview_shown: true when the preview shows the empty message, false when it shows the graph',
        optional: true,
      },
    },
    errorCategory: {
      type: 'keyword',
      _meta: {
        description: `Coarse category of the failed graph data request (${list(
          GRAPH_FETCH_ERROR_CATEGORY
        )}). Set for fetch_failed`,
        optional: true,
      },
    },
  },
};

export const graphTelemetryEvents: GraphTelemetryEvent[] = [graphEntityGraphEvent];
