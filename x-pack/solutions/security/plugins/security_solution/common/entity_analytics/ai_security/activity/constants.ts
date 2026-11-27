/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Sessions are counted over this many days, ending now, in the flyout and on the agent row. */
export const SESSIONS_WINDOW_DAYS = 30;

/** Newest own-process events read per agent. A busy install loses its oldest sessions first. */
export const ACTIVITY_MAX_PROCESS_EVENTS = 5000;

/**
 * Defend process events for one namespace. The PoC treats the space ID as the namespace, so a
 * space reads only its own events.
 */
export const getEndpointProcessIndex = (namespace: string): string =>
  `logs-endpoint.events.process-${namespace}`;
