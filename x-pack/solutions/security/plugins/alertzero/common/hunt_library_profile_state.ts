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

/** Version of the token payload. */
export const HUNT_PROFILE_TOKEN_VERSION = 1;

/** How long an issued token stays valid. */
export const HUNT_PROFILE_TOKEN_TTL_SECONDS = 12 * 60 * 60;

/** Largest serialized token accepted, in bytes. */
export const HUNT_PROFILE_TOKEN_MAX_BYTES = 4096;

/** What a signed token asserts about the Hunt session that opened Discover. */
export interface HuntProfileTokenPayload {
  v: typeof HUNT_PROFILE_TOKEN_VERSION;
  spaceId: string;
  definitionId: string;
  definitionVersion: number;
  sessionId: string;
  sessionExecutionId: string;
  /** Set when the session continues an existing Investigation. */
  investigationId?: string;
  /** Issued at, in epoch seconds. */
  iat: number;
  /** Expires at, in epoch seconds. */
  exp: number;
}

/** The Discover locator `profileState` that opens a Hunt session. */
export type HuntProfileLocatorState = Record<typeof HUNT_PROFILE_STATE_KEY, { token: string }>;

/** Builds the locator `profileState` that carries a signed token into Discover. */
export const buildHuntProfileLocatorState = (token: string): HuntProfileLocatorState => ({
  [HUNT_PROFILE_STATE_KEY]: { token },
});
