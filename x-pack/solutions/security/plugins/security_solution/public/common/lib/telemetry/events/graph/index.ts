/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GraphTelemetryEvent } from './types';
import { GraphEventTypes, GRAPH_NODE_ACTION, GRAPH_NODE_TYPE, GRAPH_TOGGLE_STATE } from './types';

/** Joins all values of a const map into a pipe-separated string for schema descriptions. */
const list = (o: Record<string, string>): string => Object.values(o).join('|');

export const graphNodeActionClickedEvent: GraphTelemetryEvent = {
  eventType: GraphEventTypes.NodeActionClicked,
  schema: {
    nodeType: {
      type: 'keyword',
      _meta: {
        description: `The kind of graph node whose popover action was clicked (${list(
          GRAPH_NODE_TYPE
        )})`,
        optional: false,
      },
    },
    action: {
      type: 'keyword',
      _meta: {
        description: `The popover action that was clicked (${list(GRAPH_NODE_ACTION)})`,
        optional: false,
      },
    },
    state: {
      type: 'keyword',
      _meta: {
        description: `For toggle actions, whether the click turned the effect on or off (${list(
          GRAPH_TOGGLE_STATE
        )}). Absent for non-toggle actions`,
        optional: true,
      },
    },
  },
};

export const graphFilterChangedEvent: GraphTelemetryEvent = {
  eventType: GraphEventTypes.FilterChanged,
  schema: {
    change: {
      type: 'keyword',
      _meta: {
        description:
          'Whether a filter was added to or removed from the graph search bar (added|removed)',
        optional: false,
      },
    },
  },
};

export const graphSearchSubmittedEvent: GraphTelemetryEvent = {
  eventType: GraphEventTypes.SearchSubmitted,
  schema: {
    timeRangeChanged: {
      type: 'boolean',
      _meta: {
        description: 'Whether the submitted graph search changed the time range',
        optional: false,
      },
    },
    queryChanged: {
      type: 'boolean',
      _meta: {
        description: 'Whether the submitted graph search changed the query',
        optional: false,
      },
    },
  },
};

export const graphPreviewExpandedEvent: GraphTelemetryEvent = {
  eventType: GraphEventTypes.PreviewExpanded,
  schema: {},
};

export const graphTelemetryEvents = [
  graphNodeActionClickedEvent,
  graphFilterChangedEvent,
  graphSearchSubmittedEvent,
  graphPreviewExpandedEvent,
];
