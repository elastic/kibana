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
    execution_uuid: 'uuid-1',
    execution_start: '2023-10-25T10:00:00.000Z',
    execution_duration_ms: 1500,
    schedule_delay_ms: 200,
    backfill: null,
    outcome: {
      status: 'success',
      message: 'Rule executed successfully',
    },
    metrics: {
      total_search_duration_ms: 800,
      total_indexing_duration_ms: 500,
      execution_gap_duration_s: 0,
      alerts_candidate_count: 5,
      alert_counts: { new: 5 },
      matched_indices_count: 2,
      frozen_indices_queried_count: null,
      index_duration_ms: 120,
    },
  },
  {
    execution_uuid: 'uuid-2',
    execution_start: '2023-10-25T09:00:00.000Z',
    execution_duration_ms: 3000,
    schedule_delay_ms: 50,
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
      total_search_duration_ms: 2800,
      total_indexing_duration_ms: null,
      execution_gap_duration_s: null,
      alerts_candidate_count: 0,
      alert_counts: { new: 0 },
      matched_indices_count: 0,
      frozen_indices_queried_count: null,
      index_duration_ms: null,
    },
  },
  {
    execution_uuid: 'uuid-3',
    execution_start: '2023-10-25T08:00:00.000Z',
    execution_duration_ms: 5200,
    schedule_delay_ms: 100,
    backfill: {
      from: '2023-10-24T08:00:00.000Z',
      to: '2023-10-25T08:00:00.000Z',
    },
    outcome: {
      status: 'success',
      message: 'Rule executed successfully',
    },
    metrics: {
      total_search_duration_ms: 3200,
      total_indexing_duration_ms: 1500,
      execution_gap_duration_s: null,
      alerts_candidate_count: 25,
      alert_counts: { new: 20 },
      matched_indices_count: 1,
      frozen_indices_queried_count: 3,
      index_duration_ms: 450,
    },
  },
  {
    execution_uuid: 'uuid-4',
    execution_start: '2023-10-25T07:00:00.000Z',
    execution_duration_ms: 2000,
    schedule_delay_ms: 300,
    backfill: null,
    outcome: {
      status: 'warning',
      message: 'Some indices were missing',
    },
    metrics: {
      total_search_duration_ms: 1500,
      total_indexing_duration_ms: 200,
      execution_gap_duration_s: 5,
      alerts_candidate_count: 3,
      alert_counts: { new: 2 },
      matched_indices_count: 1,
      frozen_indices_queried_count: null,
      index_duration_ms: 60,
    },
  },
  {
    execution_uuid: 'uuid-5',
    execution_start: '2023-10-25T06:00:00.000Z',
    execution_duration_ms: 800,
    schedule_delay_ms: 100,
    backfill: null,
    outcome: {
      status: 'success',
      message: 'Rule executed successfully',
    },
    metrics: {
      total_search_duration_ms: 600,
      total_indexing_duration_ms: null,
      execution_gap_duration_s: 0,
      alerts_candidate_count: 0,
      alert_counts: { new: 0 },
      matched_indices_count: 1,
      frozen_indices_queried_count: null,
      index_duration_ms: null,
    },
  },
  {
    execution_uuid: 'uuid-6',
    execution_start: '2023-10-25T05:00:00.000Z',
    execution_duration_ms: 6300,
    schedule_delay_ms: 500,
    backfill: {
      from: '2023-10-20T05:00:00.000Z',
      to: '2023-10-25T05:00:00.000Z',
    },
    outcome: {
      status: 'success',
      message: 'Rule executed successfully',
    },
    metrics: {
      total_search_duration_ms: 3800,
      total_indexing_duration_ms: 2000,
      execution_gap_duration_s: null,
      alerts_candidate_count: 120,
      alert_counts: { new: 100 },
      matched_indices_count: 2,
      frozen_indices_queried_count: 5,
      index_duration_ms: 800,
    },
  },
  {
    execution_uuid: 'uuid-7',
    execution_start: '2023-10-25T11:00:00.000Z',
    execution_duration_ms: 500,
    schedule_delay_ms: 100,
    backfill: null,
    outcome: {
      status: 'success',
      message: 'Rule executed successfully',
    },
    metrics: {
      total_search_duration_ms: 400,
      total_indexing_duration_ms: null,
      execution_gap_duration_s: null,
      alerts_candidate_count: 0,
      alert_counts: { new: 0 },
      matched_indices_count: 0,
      frozen_indices_queried_count: null,
      index_duration_ms: null,
    },
  },
  {
    execution_uuid: 'uuid-8',
    execution_start: '2023-10-25T04:00:00.000Z',
    execution_duration_ms: 1200,
    schedule_delay_ms: 150,
    backfill: null,
    outcome: {
      status: 'success',
      message: 'Rule executed successfully',
    },
    metrics: {
      total_search_duration_ms: 900,
      total_indexing_duration_ms: 100,
      execution_gap_duration_s: 2,
      alerts_candidate_count: 1,
      alert_counts: { new: 1 },
      matched_indices_count: 1,
      frozen_indices_queried_count: null,
      index_duration_ms: 30,
    },
  },
  {
    execution_uuid: 'uuid-9',
    execution_start: '2023-10-25T03:00:00.000Z',
    execution_duration_ms: 100,
    schedule_delay_ms: 50,
    backfill: null,
    outcome: {
      status: 'failure',
      message: 'Timeout exceeded',
    },
    metrics: {
      total_search_duration_ms: 50,
      total_indexing_duration_ms: null,
      execution_gap_duration_s: null,
      alerts_candidate_count: 0,
      alert_counts: { new: 0 },
      matched_indices_count: 0,
      frozen_indices_queried_count: null,
      index_duration_ms: null,
    },
  },
  {
    execution_uuid: 'uuid-10',
    execution_start: '2023-10-25T02:00:00.000Z',
    execution_duration_ms: 900,
    schedule_delay_ms: 100,
    backfill: null,
    outcome: {
      status: 'success',
      message: 'Rule executed successfully',
    },
    metrics: {
      total_search_duration_ms: 700,
      total_indexing_duration_ms: null,
      execution_gap_duration_s: 0,
      alerts_candidate_count: 0,
      alert_counts: { new: 0 },
      matched_indices_count: 1,
      frozen_indices_queried_count: null,
      index_duration_ms: null,
    },
  },
];

export const mockResponse: ReadRuleExecutionResultsResponse = {
  executions,
  total: executions.length,
  page: 1,
  per_page: 20,
};
