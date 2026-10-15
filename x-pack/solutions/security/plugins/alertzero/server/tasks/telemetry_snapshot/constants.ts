/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const TELEMETRY_SNAPSHOT_TASK_TYPE = 'alertzero:telemetry_snapshot';

/** Stable, so `ensureScheduled` keeps one task instance across restarts and Kibana nodes. */
export const TELEMETRY_SNAPSHOT_TASK_ID = `${TELEMETRY_SNAPSHOT_TASK_TYPE}:1.0.0`;

/**
 * Every 3 hours, while `lastSnapshotDay` keeps the reports to one per UTC day. A 24h interval would
 * lose a whole day to one failed or aborted run, or to a run that lands just before midnight
 * after a restart. Eight runs a day still cost little: a run that already reported today stops
 * at the opt-in and day checks, before any Elasticsearch read.
 */
export const TELEMETRY_SNAPSHOT_INTERVAL = '3h';

export const TELEMETRY_SNAPSHOT_TIMEOUT = '5m';

/** At most this many spaces are read at once. */
export const SNAPSHOT_SPACE_CONCURRENCY = 5;

/** Page size of the space enumeration; the spaces plugin caps a deployment at 1000 by default. */
export const SPACES_PAGE_SIZE = 1000;

/** How long a run waits for the telemetry plugin's opt-in decision before treating it as out. */
export const TELEMETRY_OPT_IN_TIMEOUT_MS = 5_000;
