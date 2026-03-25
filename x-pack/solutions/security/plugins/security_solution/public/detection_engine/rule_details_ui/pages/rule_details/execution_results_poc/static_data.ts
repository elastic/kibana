/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  UnifiedExecutionResult,
  ReadRuleExecutionResultsResponse,
} from '../../../../../../common/api/detection_engine/rule_monitoring';

const executions: UnifiedExecutionResult[] = [
  {
    execution_uuid: 'a3f7c1e2-8b4d-4f6a-9e2c-1d5b3a8f7c4e',
    execution_start: '2023-10-25T10:00:12.487Z',
    execution_duration_ms: 1487,
    schedule_delay_ms: 213,
    backfill: null,
    outcome: {
      status: 'success',
      message: 'Rule executed successfully',
    },
    metrics: {
      total_search_duration_ms: 823,
      total_indexing_duration_ms: 487,
      execution_gap_duration_s: 0,
      alerts_candidate_count: 5,
      alert_counts: { new: 5 },
      matched_indices_count: 2,
      frozen_indices_queried_count: 0,
      index_duration_ms: 117,
    },
  },
  {
    execution_uuid: 'b8e4d2f1-6c3a-4b7e-8d1f-9a2e5c7b3d6f',
    execution_start: '2023-10-25T09:00:08.234Z',
    execution_duration_ms: 2941,
    schedule_delay_ms: 47,
    backfill: {
      from: '2023-10-24T09:00:00.000Z',
      to: '2023-10-25T09:00:00.000Z',
    },
    outcome: {
      status: 'failure',
      message:
        '10 minutes (589664ms) were not queried between this rule execution and the last execution, so signals may have been missed. Consider increasing your look behind time or adding more Kibana instances',
    },
    metrics: {
      total_search_duration_ms: 2763,
      total_indexing_duration_ms: null,
      execution_gap_duration_s: null,
      alerts_candidate_count: 0,
      alert_counts: { new: 0 },
      matched_indices_count: 0,
      frozen_indices_queried_count: 0,
      index_duration_ms: null,
    },
  },
  {
    execution_uuid: 'c5d9a3b7-2e8f-4c1d-b6a4-3f7e9d1c5b8a',
    execution_start: '2023-10-25T08:00:05.891Z',
    execution_duration_ms: 5183,
    schedule_delay_ms: 112,
    backfill: {
      from: '2023-10-24T08:00:00.000Z',
      to: '2023-10-25T08:00:00.000Z',
    },
    outcome: {
      status: 'success',
      message: 'Rule executed successfully',
    },
    metrics: {
      total_search_duration_ms: 3217,
      total_indexing_duration_ms: 1489,
      execution_gap_duration_s: null,
      alerts_candidate_count: 25,
      alert_counts: { new: 20 },
      matched_indices_count: 1,
      frozen_indices_queried_count: 3,
      index_duration_ms: 443,
    },
  },
  {
    execution_uuid: 'd1b6e8f4-9a3c-4d7b-a5e2-8c1f6b4d9a3e',
    execution_start: '2023-10-25T07:00:03.127Z',
    execution_duration_ms: 2034,
    schedule_delay_ms: 287,
    backfill: null,
    outcome: {
      status: 'warning',
      message: 'Some indices were missing',
    },
    metrics: {
      total_search_duration_ms: 1523,
      total_indexing_duration_ms: 194,
      execution_gap_duration_s: 5,
      alerts_candidate_count: 3,
      alert_counts: { new: 2 },
      matched_indices_count: 1,
      frozen_indices_queried_count: 0,
      index_duration_ms: 57,
    },
  },
  {
    execution_uuid: 'e7c2f5a9-4b1d-4e8c-9d3a-6f2b7e1c4a5d',
    execution_start: '2023-10-25T06:00:17.643Z',
    execution_duration_ms: 812,
    schedule_delay_ms: 93,
    backfill: null,
    outcome: {
      status: 'success',
      message: 'Rule executed successfully',
    },
    metrics: {
      total_search_duration_ms: 614,
      total_indexing_duration_ms: null,
      execution_gap_duration_s: 0,
      alerts_candidate_count: 0,
      alert_counts: { new: 0 },
      matched_indices_count: 1,
      frozen_indices_queried_count: 0,
      index_duration_ms: null,
    },
  },
  {
    execution_uuid: 'f4a8d6b3-1e7c-4f2a-b9d5-3c8e1a6f4b7d',
    execution_start: '2023-10-25T05:00:22.916Z',
    execution_duration_ms: 6287,
    schedule_delay_ms: 513,
    backfill: {
      from: '2023-10-20T05:00:00.000Z',
      to: '2023-10-25T05:00:00.000Z',
    },
    outcome: {
      status: 'success',
      message: 'Rule executed successfully',
    },
    metrics: {
      total_search_duration_ms: 3814,
      total_indexing_duration_ms: 1978,
      execution_gap_duration_s: null,
      alerts_candidate_count: 120,
      alert_counts: { new: 100 },
      matched_indices_count: 2,
      frozen_indices_queried_count: 5,
      index_duration_ms: 791,
    },
  },
  {
    execution_uuid: '1b3e5d7a-9c2f-4a8b-d6e4-7f1c3b5a9d2e',
    execution_start: '2023-10-25T11:00:06.351Z',
    execution_duration_ms: 487,
    schedule_delay_ms: 104,
    backfill: null,
    outcome: {
      status: 'success',
      message: 'Rule executed successfully',
    },
    metrics: {
      total_search_duration_ms: 391,
      total_indexing_duration_ms: null,
      execution_gap_duration_s: null,
      alerts_candidate_count: 0,
      alert_counts: { new: 0 },
      matched_indices_count: 0,
      frozen_indices_queried_count: 0,
      index_duration_ms: null,
    },
  },
  {
    execution_uuid: '2d6f8a4c-3b1e-4d9a-c7f5-1a8e4b6d3c9f',
    execution_start: '2023-10-25T04:00:09.774Z',
    execution_duration_ms: 1213,
    schedule_delay_ms: 143,
    backfill: null,
    outcome: {
      status: 'success',
      message: 'Rule executed successfully',
    },
    metrics: {
      total_search_duration_ms: 887,
      total_indexing_duration_ms: 97,
      execution_gap_duration_s: 2,
      alerts_candidate_count: 1,
      alert_counts: { new: 1 },
      matched_indices_count: 1,
      frozen_indices_queried_count: 0,
      index_duration_ms: 28,
    },
  },
  {
    execution_uuid: '9e1c4b7f-5a3d-4c8e-b2d6-8f3a1e7c5b4d',
    execution_start: '2023-10-25T03:00:01.582Z',
    execution_duration_ms: 103,
    schedule_delay_ms: 47,
    backfill: null,
    outcome: {
      status: 'failure',
      message: 'Timeout exceeded',
    },
    metrics: {
      total_search_duration_ms: 52,
      total_indexing_duration_ms: null,
      execution_gap_duration_s: null,
      alerts_candidate_count: 0,
      alert_counts: { new: 0 },
      matched_indices_count: 0,
      frozen_indices_queried_count: 0,
      index_duration_ms: null,
    },
  },
  {
    execution_uuid: '6a4d2e8b-7c1f-4b3a-d9e5-2f8c6a1b4d7e',
    execution_start: '2023-10-25T02:00:14.239Z',
    execution_duration_ms: 891,
    schedule_delay_ms: 107,
    backfill: null,
    outcome: {
      status: 'success',
      message: 'Rule executed successfully',
    },
    metrics: {
      total_search_duration_ms: 713,
      total_indexing_duration_ms: null,
      execution_gap_duration_s: 0,
      alerts_candidate_count: 0,
      alert_counts: { new: 0 },
      matched_indices_count: 1,
      frozen_indices_queried_count: 0,
      index_duration_ms: null,
    },
  },
];

export const mockResponse: ReadRuleExecutionResultsResponse = {
  data: executions,
  total: executions.length,
  page: 1,
  per_page: 20,
};
