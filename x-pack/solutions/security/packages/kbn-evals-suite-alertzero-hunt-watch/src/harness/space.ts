/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The space the suite runs in. The default space ('default') is the current
 * behaviour; a shared golden endpoint can host the suite in its own space by
 * exporting HUNT_WATCH_SPACE_ID (data-stream aliases, the alerts index and the
 * per-space Worker workflow id all derive from it).
 */
export const HUNT_WATCH_SPACE_ENV = 'HUNT_WATCH_SPACE_ID';

export const huntWatchSpaceId = (env: NodeJS.ProcessEnv = process.env): string => {
  const value = env[HUNT_WATCH_SPACE_ENV]?.trim();
  return value && value !== '' ? value : 'default';
};

/** The alerts index for the suite's space (`.alerts-security.alerts-<space>`). */
export const alertsIndexForSpace = (spaceId: string): string =>
  `.alerts-security.alerts-${spaceId}`;
