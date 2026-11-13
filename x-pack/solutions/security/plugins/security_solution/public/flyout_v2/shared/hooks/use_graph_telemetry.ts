/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import type { GraphTelemetryEvent, GraphTelemetryHandler } from '@kbn/cloud-security-posture-graph';
import { useKibana } from '../../../common/lib/kibana';
import type {
  GraphDrillTarget,
  GraphEntryPoint,
  GraphEventProperties,
} from '../../../common/lib/telemetry';
import { GraphEventTypes } from '../../../common/lib/telemetry';

export interface UseGraphTelemetryResult {
  /** Pass to `GraphInvestigation`'s `onTelemetryEvent`. */
  onTelemetryEvent: GraphTelemetryHandler;
  /** Reports that the graph preview finished loading, and whether it has no nodes to show. */
  reportGraphPreviewShown: (isEmpty: boolean) => void;
  /** Reports that the graph preview was expanded into the full graph. */
  reportGraphPreviewExpanded: () => void;
  /** Reports that the full graph was opened. */
  reportGraphOpened: () => void;
  /** Reports that a graph node drilled through to something outside the graph. */
  reportDrillThrough: (target: GraphDrillTarget) => void;
}

type GraphNodeActionEvent = Extract<GraphTelemetryEvent, { type: 'node_action' }>;
type NodeActionProperties = Extract<GraphEventProperties, { id: 'node_action_clicked' }>;

/**
 * Picks the node action fields one by one, so a field added to the package event never reaches
 * the EBT payload unreviewed. Each return narrows the event to one member of the package's union
 * first: that is what keeps the compiler checking the valid `nodeType` / `action` / `state`
 * combinations, which picking the fields from the whole union would lose.
 */
const toNodeActionProperties = (
  event: GraphNodeActionEvent,
  entryPoint: GraphEntryPoint
): NodeActionProperties => {
  const base = { id: 'node_action_clicked', entryPoint } as const;

  if (event.state !== undefined) {
    const { state } = event;
    return event.nodeType === 'entity'
      ? { ...base, nodeType: event.nodeType, action: event.action, state }
      : { ...base, nodeType: event.nodeType, action: event.action, state };
  }

  switch (event.nodeType) {
    case 'grouped_entity':
      return { ...base, nodeType: event.nodeType, action: event.action };
    case 'grouped_event':
      return { ...base, nodeType: event.nodeType, action: event.action };
    default:
      return { ...base, nodeType: event.nodeType, action: event.action };
  }
};

/** Translates a graph package event into the properties of the `entity_graph` EBT event. */
const toEventProperties = (
  event: GraphTelemetryEvent,
  entryPoint: GraphEntryPoint
): GraphEventProperties => {
  switch (event.type) {
    case 'node_action':
      return toNodeActionProperties(event, entryPoint);
    case 'filter_changed':
      return { id: 'filter_changed', entryPoint, change: event.change };
    case 'search_submitted':
      return {
        id: 'search_submitted',
        entryPoint,
        timeRangeChanged: event.timeRangeChanged,
        queryChanged: event.queryChanged,
      };
    case 'expansion_result':
      return {
        id: 'expansion_result',
        entryPoint,
        action: event.action,
        nodeType: event.nodeType,
        state: event.state,
        nodesAdded: event.nodesAdded,
        nodesLimitReached: event.nodesLimitReached,
      };
    case 'empty_state_shown':
      return { id: 'empty_state_shown', entryPoint, emptyReason: event.emptyReason };
    case 'fetch_failed':
      return { id: 'fetch_failed', entryPoint, errorCategory: event.errorCategory };
    case 'grouped_panel_opened':
      return { id: 'grouped_panel_opened', entryPoint, nodeType: event.nodeType };
    case 'grouped_item_viewed':
      return { id: 'grouped_item_viewed', entryPoint, itemType: event.itemType };
    default: {
      const unmapped: never = event;
      return unmapped;
    }
  }
};

/**
 * Maps graph package engagement events to the `entity_graph` EBT event. The legacy flyout and
 * flyout_v2 render the same graph components, so this is the only place that knows how each one
 * becomes an EBT event. An `undefined` entry point (a graph the user did not open in this session,
 * e.g. restored from the URL) disables reporting: there is no origin to attribute the events to.
 */
export const useGraphTelemetry = (
  entryPoint: GraphEntryPoint | undefined
): UseGraphTelemetryResult => {
  const { telemetry } = useKibana().services;

  const onTelemetryEvent = useCallback<GraphTelemetryHandler>(
    (event) => {
      if (!entryPoint) return;
      telemetry?.reportEvent(GraphEventTypes.EntityGraph, toEventProperties(event, entryPoint));
    },
    [telemetry, entryPoint]
  );

  const reportGraphPreviewShown = useCallback(
    (isEmpty: boolean) => {
      if (!entryPoint) return;
      telemetry?.reportEvent(GraphEventTypes.EntityGraph, {
        id: 'graph_preview_shown',
        entryPoint,
        isEmpty,
      });
    },
    [telemetry, entryPoint]
  );

  const reportGraphPreviewExpanded = useCallback(() => {
    if (!entryPoint) return;
    telemetry?.reportEvent(GraphEventTypes.EntityGraph, {
      id: 'graph_preview_expanded',
      entryPoint,
    });
  }, [telemetry, entryPoint]);

  const reportGraphOpened = useCallback(() => {
    if (!entryPoint) return;
    telemetry?.reportEvent(GraphEventTypes.EntityGraph, { id: 'graph_opened', entryPoint });
  }, [telemetry, entryPoint]);

  const reportDrillThrough = useCallback(
    (drillTarget: GraphDrillTarget) => {
      if (!entryPoint) return;
      telemetry?.reportEvent(GraphEventTypes.EntityGraph, {
        id: 'drill_through',
        entryPoint,
        drillTarget,
      });
    },
    [telemetry, entryPoint]
  );

  return useMemo(
    () => ({
      onTelemetryEvent,
      reportGraphPreviewShown,
      reportGraphPreviewExpanded,
      reportGraphOpened,
      reportDrillThrough,
    }),
    [
      onTelemetryEvent,
      reportGraphPreviewShown,
      reportGraphPreviewExpanded,
      reportGraphOpened,
      reportDrillThrough,
    ]
  );
};
