/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SYSTEM_SECURITY_WATCH_IDS } from '@kbn/pnd-common';

/** One of the managed system security watch workflow ids. */
export type SystemSecurityWatchId = (typeof SYSTEM_SECURITY_WATCH_IDS)[number];

/**
 * Allow-list guard for a managed system security watch id (security finding S4).
 *
 * The autonomy routes write to / read from the internal saved-objects repository,
 * which has no SO-level authz, so this guard is the only control that keeps an
 * arbitrary `watchId` from being turned into a uiSettings key. Callers MUST run
 * it BEFORE constructing the settings key.
 */
export const isSystemSecurityWatchId = (watchId: string): watchId is SystemSecurityWatchId =>
  (SYSTEM_SECURITY_WATCH_IDS as readonly string[]).includes(watchId);
