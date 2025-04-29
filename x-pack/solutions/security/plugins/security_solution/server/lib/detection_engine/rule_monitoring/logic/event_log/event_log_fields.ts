/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// -------------------------------------------------------------------------------------------------
// ECS fields

export const TIMESTAMP = `@timestamp` as const;

export const MESSAGE = 'message' as const;
export const EVENT_PROVIDER = 'event.provider' as const;
export const EVENT_ACTION = 'event.action' as const;
export const EVENT_CATEGORY = 'event.category' as const;
export const EVENT_SEQUENCE = 'event.sequence' as const;

export const LOG_LEVEL = 'log.level' as const;

// -------------------------------------------------------------------------------------------------
// Custom fields of Alerting Framework and Security Solution

const RULE_EXECUTION = 'kibana.alert.rule.execution' as const;
const RULE_EXECUTION_METRICS = `${RULE_EXECUTION}.metrics` as const;

export const RULE_EXECUTION_UUID = `${RULE_EXECUTION}.uuid` as const;

export const RULE_EXECUTION_OUTCOME = 'kibana.alerting.outcome' as const;

export const RULE_EXECUTION_STATUS = `${RULE_EXECUTION}.status` as const;

export const RULE_EXECUTION_TOTAL_DURATION_MS =
  `${RULE_EXECUTION_METRICS}.total_run_duration_ms` as const;

export const RULE_EXECUTION_SEARCH_DURATION_MS =
  `${RULE_EXECUTION_METRICS}.total_search_duration_ms` as const;

export const RULE_EXECUTION_INDEXING_DURATION_MS =
  `${RULE_EXECUTION_METRICS}.total_indexing_duration_ms` as const;

export const RULE_EXECUTION_GAP_DURATION_S =
  `${RULE_EXECUTION_METRICS}.execution_gap_duration_s` as const;

export const RULE_EXECUTION_SCHEDULE_DELAY_NS = 'kibana.task.schedule_delay' as const;

export const NUMBER_OF_ALERTS_GENERATED = `${RULE_EXECUTION_METRICS}.alert_counts.new` as const;
