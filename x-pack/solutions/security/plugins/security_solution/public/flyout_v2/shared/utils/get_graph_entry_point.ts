/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FLYOUT_ORIGIN } from '../../../common/lib/telemetry';
import type { FlyoutOrigin, GraphEntryPoint } from '../../../common/lib/telemetry';

export interface GetGraphEntryPointParams {
  mode: 'event' | 'entity';
  /** Whether the source document is an alert; only event mode reads it. */
  isAlert?: boolean;
}

/**
 * Derives where the user opened the graph from: an alert flyout, an event flyout or, for an entity
 * graph, an entity flyout. The entities grid row action is the one other way into an entity graph;
 * it cannot be told apart from a flyout by scope id, so the code that opens it passes
 * `entity_data_grid` explicitly. A graph restored from the URL takes its entry point from the
 * descriptor's origin instead, see `getGraphEntryPointFromOrigin`.
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

/**
 * A restored graph has an entry point only when its descriptor says it was opened from somewhere in
 * this session; a cold reload or shared link carries no origin and so reports nothing.
 */
export const getGraphEntryPointFromOrigin = (
  origin: FlyoutOrigin | undefined
): GraphEntryPoint | undefined =>
  origin === FLYOUT_ORIGIN.AI_CHAT_ENTITY_ATTACHMENT ? 'ai_chat_attachment' : undefined;
