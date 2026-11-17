/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Key of the Discover profile state that carries a Hunt session. It must match the key of the
 * Discover profile state definition for Hunt sessions.
 */
export const HUNT_PROFILE_STATE_KEY = 'huntSession';

/** How long a Hunt session stays usable after it starts. */
export const HUNT_SESSION_TTL_SECONDS = 12 * 60 * 60;

/** Longest session handle accepted, in characters. It is the session execution id, a UUID. */
export const HUNT_SESSION_HANDLE_MAX_LENGTH = 64;

/** What the server knows about a Hunt session, read from its execution and never from a request. */
export interface HuntSessionClaims {
  spaceId: string;
  definitionId: string;
  definitionVersion: number;
  sessionId: string;
  sessionExecutionId: string;
  /** Set when the session continues an existing Investigation. */
  investigationId?: string;
}

/**
 * The Discover locator `profileState` that opens a Hunt session. `token` is the session's execution
 * id. It identifies the session but proves nothing: the server checks who started it on every use.
 */
export type HuntProfileLocatorState = Record<typeof HUNT_PROFILE_STATE_KEY, { token: string }>;

/** Builds the locator `profileState` that carries the session id into Discover. */
export const buildHuntProfileLocatorState = (token: string): HuntProfileLocatorState => ({
  [HUNT_PROFILE_STATE_KEY]: { token },
});
