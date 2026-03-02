/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Saved object type for alert grouping workflows */
export const ALERT_GROUPING_WORKFLOW_SO_TYPE = 'alert-grouping-workflow';

/** Saved object type for workflow executions */
export const ALERT_GROUPING_EXECUTION_SO_TYPE = 'alert-grouping-execution';

/** Saved object type for case triggers */
export const CASE_TRIGGER_SO_TYPE = 'case-trigger';

/** Saved object type for batch size cache */
export const BATCH_SIZE_CACHE_SO_TYPE = 'attack-discovery-batch-cache';

/** Default tag applied to processed alerts */
export const LLM_TRIAGED_TAG = 'llm-triaged';

/** Maximum workflows per space */
export const MAX_WORKFLOWS_PER_SPACE = 10;

/** Maximum triggers per space */
export const MAX_TRIGGERS_PER_SPACE = 50;

/** Default workflow schedule interval */
export const DEFAULT_SCHEDULE_INTERVAL = 'PT15M';

/** Default debounce period for triggers (in seconds) */
export const DEFAULT_DEBOUNCE_SECONDS = 300;

/** Default batch size for Attack Discovery */
export const DEFAULT_BATCH_SIZE = 100;

/** Default alerts index pattern */
export const DEFAULT_ALERTS_INDEX_PATTERN = '.alerts-security.alerts-*';

/** Default time range for alert processing */
export const DEFAULT_TIME_RANGE = {
  start: 'now-24h',
  end: 'now',
};

/** Default exclude tags for alert filtering */
export const DEFAULT_EXCLUDE_TAGS = [LLM_TRIAGED_TAG];

/** Default alert statuses to include */
export const DEFAULT_INCLUDE_STATUSES = ['open', 'acknowledged'] as const;

/** Maximum alerts to process per workflow run */
export const MAX_ALERTS_PER_RUN = 10000;

/** Maximum observables per case (from Cases plugin) */
export const MAX_OBSERVABLES_PER_CASE = 50;

/** Task type for alert grouping workflow */
export const ALERT_GROUPING_TASK_TYPE = 'alertGrouping:workflow';
