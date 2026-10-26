/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import type { Filter, Query, TimeRange } from '@kbn/es-query';

export type GraphNodeType = 'entity' | 'grouped_entity' | 'event' | 'grouped_event';

export type GraphNodeAction =
  | 'show_entity_relationships'
  | 'show_actions_by'
  | 'show_actions_on'
  | 'show_related_events'
  | 'show_details'
  | 'show_grouped_entities'
  | 'show_grouped_events';

/** Whether a toggle action turned its effect on or off. */
export type GraphToggleState = 'show' | 'hide';

interface NodeActionEvent<N extends GraphNodeType, A extends GraphNodeAction> {
  type: 'node_action';
  nodeType: N;
  action: A;
  /** Non-toggle actions never carry a state. */
  state?: never;
}

/** A toggle action always reports whether it turned its effect on or off. */
type ToggleNodeActionEvent<N extends GraphNodeType, A extends GraphNodeAction> = Omit<
  NodeActionEvent<N, A>,
  'state'
> & { state: GraphToggleState };

/** The only valid `nodeType` / `action` / `state` combinations a node popover can report. */
export type GraphNodeActionEvent =
  | ToggleNodeActionEvent<
      'entity',
      'show_entity_relationships' | 'show_actions_by' | 'show_actions_on' | 'show_related_events'
    >
  | ToggleNodeActionEvent<'event' | 'grouped_event', 'show_related_events'>
  | NodeActionEvent<'entity' | 'event', 'show_details'>
  | NodeActionEvent<'grouped_entity', 'show_grouped_entities'>
  | NodeActionEvent<'grouped_event', 'show_grouped_events'>;

/**
 * Semantic graph engagement events. They carry enums and booleans only — never node IDs, names,
 * or filter values.
 */
export type GraphTelemetryEvent =
  | GraphNodeActionEvent
  | { type: 'filter_changed'; change: 'added' | 'removed' }
  | { type: 'search_submitted'; timeRangeChanged: boolean; queryChanged: boolean };

export type GraphTelemetryHandler = (event: GraphTelemetryEvent) => void;

/**
 * Compares the filter list before and after a SearchBar update. Only additions and removals are
 * reported; same-length changes (edit, disable, negate, pin) are ignored.
 */
export const getFiltersChangedEvent = (
  previous: Filter[],
  next: Filter[]
): GraphTelemetryEvent | undefined => {
  if (next.length === previous.length) return undefined;
  return { type: 'filter_changed', change: next.length > previous.length ? 'added' : 'removed' };
};

/** Describes what a SearchBar submit changed. Returns undefined when nothing actually changed. */
export const getSearchSubmittedEvent = (
  previous: { timeRange: TimeRange; query: Query },
  next: { dateRange: TimeRange; query?: Query }
): GraphTelemetryEvent | undefined => {
  const timeRangeChanged =
    previous.timeRange.from !== next.dateRange.from || previous.timeRange.to !== next.dateRange.to;
  const queryChanged = !isEqual(previous.query.query, next.query?.query ?? '');

  if (!timeRangeChanged && !queryChanged) return undefined;
  return { type: 'search_submitted', timeRangeChanged, queryChanged };
};
