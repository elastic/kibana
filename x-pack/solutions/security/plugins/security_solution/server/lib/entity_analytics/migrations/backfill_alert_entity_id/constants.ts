/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const LOGGER_NAME = 'alertEntityIdBackfill';

export const TASK_TYPE = 'security-solution-ea-backfill-alert-entity-id';
export const TASK_ID = `${TASK_TYPE}-task-id`;
export const TASK_TIMEOUT = '10m';
export const TASK_SCOPE = ['securitySolution'];

/**
 * The throttle, handed to `update_by_query` as `requests_per_second`: an upper bound on alerts
 * written per second
 */
export const TARGET_ALERTS_PER_SECOND = 500;

/**
 * How soon the task asks Task Manager to run it again. The update-by-query runs inside
 * Elasticsearch, so a run only starts or polls one — this is polling cadence, not a throttle.
 *
 * Coarse on purpose. A space takes hours, so the only thing a faster poll buys is noticing
 * completion sooner, and the only cost of noticing late is that the next space starts a few
 * minutes later.
 */
export const RUN_INTERVAL_MS = 5 * 60 * 1_000;

/**
 * The soonest the task will ask to run again, used when a request is expected to finish before the
 * next interval would come round.
 *
 * Only ever shortens the wait, never lengthens it: a request that has just finished is otherwise
 * invisible until the full interval elapses, which on a deployment of many small spaces is almost
 * the entire wall clock — eight spaces of a thousand alerts take seconds of work and forty minutes
 * of waiting. Keeping {@link RUN_INTERVAL_MS} as the ceiling means a request that dies early is
 * still noticed no later than it would have been.
 */
export const MIN_RUN_INTERVAL_MS = 30 * 1_000;

/**
 * 30 days, matching the risk engine's default scoring window.
 *
 * Each space's window comes from its own `configuration.range`, which the risk engine API accepts
 * unbounded — a space could ask for `now-1y`. This caps how far back any backfill reaches, so the
 * volume of alerts it touches stays predictable however a space is configured.
 */
export const MAX_LOOKBACK_MS = 30 * 24 * 60 * 60 * 1_000;

/**
 * Alerts a single update-by-query may rewrite before it finishes and is reissued.
 *
 * Elasticsearch segments are immutable, so rewriting an alert writes a new document and tombstones
 * the old one — both occupy disk until merges reclaim the space. Capping each request bounds that
 * transient growth.
 */
export const MAX_DOCS_PER_REQUEST = 500_000;

/**
 * How many times a space's update-by-query may be reissued because it stepped over alerts another
 * writer held. `conflicts: proceed` skips those rather than retrying them, so without a reissue
 * they stay unstamped — and they are concentrated in the newest alerts, which rule execution and
 * workflow status changes are still touching.
 */
export const MAX_CONFLICT_REISSUES = 2;

/** Upper bound on spaces read in one pass; matches the scale other EA migrations assume. */
export const MAX_SPACES = 1000;

/**
 * Consecutive failed attempts before a space is abandoned. Without a limit, a permanently broken
 * space never reaches `done`, so the task keeps requesting another run indefinitely.
 */
export const MAX_CONSECUTIVE_SPACE_FAILURES = 3;

/**
 * Absolute backstop on total runs, in case some combination of failures evades the per-space
 * limit. At the polling interval above this is over a month, far more than a backfill needs.
 */
export const MAX_RUNS = 10_000;

/**
 * Stored as a space's `unstampedAtStart` when counting the alerts there failed.
 */
export const UNKNOWN_ALERT_COUNT = -1;
