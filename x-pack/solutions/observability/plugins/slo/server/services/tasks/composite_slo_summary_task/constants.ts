/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const COMPOSITE_SLO_SUMMARY_TASK_SPAN_NAMES = {
  DECODE_AND_GROUP_COMPOSITES: 'composite_slo_summary_task:decode_and_group_composites',
  FETCH_MEMBER_DEFINITIONS: 'composite_slo_summary_task:fetch_member_definitions',
  COMPUTE_MEMBER_SUMMARIES: 'composite_slo_summary_task:compute_member_summaries',
  BULK_WRITE: 'composite_slo_summary_task:bulk_write',
} as const;

export const COMPOSITE_SLO_SUMMARY_TASK_SKIP_REASON = {
  TASK_NOT_STARTED: 'task_not_started',
  OUTDATED_TASK_VERSION: 'outdated_task_version',
} as const;
