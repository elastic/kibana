/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GraphEntryPoint } from '../../../common/lib/telemetry';

export interface GetGraphEntryPointParams {
  mode: 'event' | 'entity';
  /** Whether the source document is an alert; only event mode reads it. */
  isAlert?: boolean;
}

/**
 * Derives where the user opened the graph from: an alert flyout, an event flyout or, for an entity
 * graph, an entity flyout. The entities grid row action is the one other way into an entity graph;
 * it cannot be told apart from a flyout by scope id, so the code that opens it passes
 * `entity_data_grid` explicitly.
 */
export const getGraphEntryPoint = ({
  mode,
  isAlert,
}: GetGraphEntryPointParams): GraphEntryPoint => {
  if (mode === 'event') {
    return isAlert ? 'alert_flyout' : 'event_flyout';
  }
  return 'entity_flyout';
};
