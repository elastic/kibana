/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WATCH_AUTONOMY_LEVELS } from '@kbn/pnd-common';
import type { WatchAutonomyLevel } from '@kbn/pnd-common';

/** The most conservative level: every consequential action waits for a human. */
export const DEFAULT_AUTONOMY_LEVEL: WatchAutonomyLevel = WATCH_AUTONOMY_LEVELS[0];

/**
 * Narrow a value read out of `pnd:autonomy:<watchId>` to a {@link WatchAutonomyLevel}.
 *
 * Fail-closed rather than clamping, and that distinction is the whole point. The scale used to be
 * the ordinals 1..3, so a space seeded before the conversion can still hold a `3` — and clamping
 * "3" to the highest level would silently hand that space Supervised autonomy, auto-accepting gates
 * on the strength of a stale value. Anything that is not a current member therefore reads as
 * `manual`, which auto-accepts nothing.
 *
 * The uiSettings `schema` bounds every *write*, so this only ever fires on state that predates the
 * schema — but it is the boundary the gates depend on, so it does not assume that.
 */
export const asWatchAutonomyLevel = (value: unknown): WatchAutonomyLevel =>
  WATCH_AUTONOMY_LEVELS.includes(value as WatchAutonomyLevel)
    ? (value as WatchAutonomyLevel)
    : DEFAULT_AUTONOMY_LEVEL;

/** Whether `value` is exactly a member of the shared scale — no coercion, no clamping. */
export const isWatchAutonomyLevel = (value: unknown): value is WatchAutonomyLevel =>
  WATCH_AUTONOMY_LEVELS.includes(value as WatchAutonomyLevel);
