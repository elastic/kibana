/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GraphEntryPoint } from '../../../common/lib/telemetry';
import { ENTITY_ANALYTICS_TABLE_ID } from '../../../entity_analytics/components/home/constants';
import { SCOPE_FLYOUT_TIME_RANGES } from '../../../entity_analytics/common/scope_time_ranges';

export interface GetGraphEntryPointParams {
  mode: 'event' | 'entity';
  isAlert?: boolean;
  /** Scope the enclosing flyout was opened from; only entity mode reads it. */
  scopeId?: string;
}

const ENTITIES_TABLE_SCOPE_IDS: ReadonlySet<string> = new Set([
  ENTITY_ANALYTICS_TABLE_ID,
  ...Object.keys(SCOPE_FLYOUT_TIME_RANGES),
]);

/** Derives where the user opened the graph from: an alert, an event, an entity flyout or the entities table. */
export const getGraphEntryPoint = ({
  mode,
  isAlert,
  scopeId,
}: GetGraphEntryPointParams): GraphEntryPoint => {
  if (mode === 'event') {
    return isAlert ? 'alert_flyout' : 'event_flyout';
  }
  return scopeId !== undefined && ENTITIES_TABLE_SCOPE_IDS.has(scopeId)
    ? 'entity_data_grid'
    : 'entity_flyout';
};
