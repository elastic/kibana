/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TRIAGE_ALERT_COST, TRIAGE_BATCH_OVERHEAD_COST } from '@kbn/alertzero-common';

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

/**
 * Cost units a batch costs before its first alert (Investigation, analysis hop, review). Defined
 * with the settings, which reject a budget that cannot fund a batch.
 */
export const BATCH_OVERHEAD_COST = TRIAGE_BATCH_OVERHEAD_COST;

/** Cost units each alert in a batch adds. */
export const ALERT_COST = TRIAGE_ALERT_COST;

/** Alerts per tag update, so one bulk call never exceeds the alert index's term limits. */
export const TAG_CHUNK_SIZE = 500;

/** Most claimed alerts one sweep reads. Matches the default `index.max_result_window`. */
export const ALERT_FETCH_LIMIT = 10_000;

/**
 * Most rules one sweep reads unclaimed alerts for. The planner serves at most `IN_FLIGHT_CEILING`
 * rules and skips those with a live batch, so a few times the ceiling is ample.
 */
export const RULE_FETCH_LIMIT = 5 * IN_FLIGHT_CEILING;

export const TRIAGE_PENDING_TAG = 'az:triage_pending';
export const TRIAGE_EXEC_TAG_PREFIX = 'az:triage_exec:';
export const TRIAGE_FAILED_TAG = 'az:triage_failed';

/**
 * Pattern key tags, written on every classified alert that has the key. They are not verdict tags,
 * so the sweep ignores them. Grouping, the proposal summary and Decisions read them.
 */
export const TRIAGE_STRICT_KEY_TAG_PREFIX = 'az:triage_strict_key:';
export const TRIAGE_WIDE_KEY_TAG_PREFIX = 'az:triage_wide_key:';

/** Verdict tags written by the batch's classification. Any of them means the alert is done. */
export const VERDICT_TAGS = ['az:true_positive', 'az:false_positive', 'az:inconclusive'] as const;

export const OPEN_ALERT_STATUSES = ['open', 'acknowledged'] as const;

/** Ascending, so a minimum severity selects its own index and everything after it. */
export const ALERT_SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;

export type AlertSeverity = (typeof ALERT_SEVERITIES)[number];

/** Most alerts one grouped proposal holds. The close action's `maxItems` is the same number. */
export const GROUPED_PROPOSAL_MAX_ALERTS = 1000;

/** Most revisions one grouped proposal reaches. Each revision adds a proposal card to the chat. */
export const GROUPED_PROPOSAL_MAX_REVISIONS = 20;

/** A proposal this close to its deadline takes no joins, so a late alert still gets time to be reviewed. */
export const GROUPED_PROPOSAL_JOIN_MARGIN_MS = 24 * 60 * 60 * 1000;

/** Keys of one batch whose joins run at once. */
export const GROUPED_PROPOSAL_JOIN_CONCURRENCY = 4;

/**
 * Generations of one key the lookup reads. A key gains about one generation every 72 hours, so 200
 * cover about 18 months. Past that, the key gets random ids and no joins.
 */
export const GROUPED_PROPOSAL_MAX_GENERATIONS = 200;

/**
 * Most root ids one head lookup sends as a `terms` clause. Elasticsearch's default
 * `indices.query.bool.max_clause_count` is 65,536; a batch of many keys times
 * `GROUPED_PROPOSAL_MAX_GENERATIONS` can exceed that in one call.
 */
export const GROUPED_PROPOSAL_LIST_HEADS_TERMS = 10_000;

/** Feature flag that turns Alert Triage grouping off: every batch then mints its own proposal. */
export const TRIAGE_GROUPING_FLAG = 'alertzero.triageGrouping';
