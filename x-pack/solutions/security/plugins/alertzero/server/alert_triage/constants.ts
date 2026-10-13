/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Largest number of alerts one batch analyses. */
export const BATCH_ALERT_CAP = 100;

/** Alerts a served rule gets before any rule is topped up toward the cap. */
export const MIN_ALERTS_PER_RULE = 30;

/**
 * Most batches in flight (running or queued) per space. The batch workflow's concurrency is
 * `max` running plus `queue-size` queued, and the two must add up to this ceiling.
 */
export const IN_FLIGHT_CEILING = 40;

/** Cluster-wide `workflow:run` delay above which the sweep starts nothing. */
export const TM_DELAY_LIMIT_MS = 120_000;

/** Cost units a batch costs before its first alert (Investigation, analysis hop, review). */
export const BATCH_OVERHEAD_COST = 5;

/** Cost units each alert in a batch adds. */
export const ALERT_COST = 1;

/** Alerts per tag update, so one bulk call never exceeds the alert index's term limits. */
export const TAG_CHUNK_SIZE = 500;

/** Most alerts one sweep reads. Matches the default `index.max_result_window`. */
export const ALERT_FETCH_LIMIT = 10_000;

export const TRIAGE_PENDING_TAG = 'az:triage_pending';
export const TRIAGE_EXEC_TAG_PREFIX = 'az:triage_exec:';
export const TRIAGE_FAILED_TAG = 'az:triage_failed';

/** Verdict tags written by the batch's classification. Any of them means the alert is done. */
export const VERDICT_TAGS = ['az:true_positive', 'az:false_positive', 'az:inconclusive'] as const;

export const OPEN_ALERT_STATUSES = ['open', 'acknowledged'] as const;
