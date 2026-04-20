/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  GetRuleHealthRequestBody,
  GetRuleHealthResponse,
  GetSpaceHealthRequestBody,
  GetSpaceHealthResponse,
  ReadRuleExecutionResultsResponse,
} from '../../../../../common/api/detection_engine/rule_monitoring';
import {
  HealthIntervalGranularity,
  HealthIntervalType,
} from '../../../../../common/api/detection_engine/rule_monitoring';

import type {
  IRuleMonitoringApiClient,
  ReadRuleExecutionResultsArgs,
} from '../api_client_interface';

export const api: jest.Mocked<IRuleMonitoringApiClient> = {
  setupDetectionEngineHealthApi: jest.fn<Promise<void>, []>().mockResolvedValue(),

  readRuleExecutionResults: jest
    .fn<Promise<ReadRuleExecutionResultsResponse>, [ReadRuleExecutionResultsArgs]>()
    .mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      per_page: 20,
    }),

  fetchSpaceRulesHealth: jest
    .fn<Promise<GetSpaceHealthResponse>, [GetSpaceHealthRequestBody, AbortSignal | undefined]>()
    .mockResolvedValue({
      timings: {
        requested_at: new Date().toISOString(),
        processed_at: new Date().toISOString(),
        processing_time_ms: 100,
      },
      parameters: {
        interval: {
          type: HealthIntervalType.last_day,
          granularity: HealthIntervalGranularity.hour,
          from: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          to: new Date().toISOString(),
          duration: 'PT24H',
        },
      },
      health: {
        state_at_the_moment: {
          number_of_rules: {
            all: { total: 10, enabled: 8, disabled: 2 },
            by_origin: {
              prebuilt: { total: 5, enabled: 4, disabled: 1 },
              custom: { total: 5, enabled: 4, disabled: 1 },
            },
            by_type: {
              query: { total: 5, enabled: 4, disabled: 1 },
              threshold: { total: 5, enabled: 4, disabled: 1 },
            },
            by_outcome: {
              succeeded: { total: 8, enabled: 8, disabled: 0 },
              failed: { total: 2, enabled: 0, disabled: 2 },
            },
          },
        },
        stats_over_interval: {
          number_of_executions: {
            total: 100,
            by_outcome: {
              succeeded: 90,
              failed: 10,
              warning: 0,
            },
          },
          number_of_logged_messages: {
            total: 50,
            by_level: {
              error: 3,
              warn: 1,
              info: 15,
              debug: 30,
              trace: 100,
            },
          },
          number_of_detected_gaps: {
            total: 2,
            total_duration_s: 3600,
          },
          schedule_delay_ms: { percentiles: { '50': 100, '95': 200 } },
          execution_duration_ms: { percentiles: { '50': 500, '95': 1000 } },
          search_duration_ms: { percentiles: { '50': 200, '95': 400 } },
          indexing_duration_ms: { percentiles: { '50': 50, '95': 100 } },
          frozen_indices_queried_max_count: 0,
        },
        history_over_interval: {
          buckets: [
            {
              timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
              stats: {
                number_of_executions: {
                  total: 50,
                  by_outcome: {
                    succeeded: 45,
                    failed: 5,
                    warning: 0,
                  },
                },
                number_of_logged_messages: {
                  total: 25,
                  by_level: {
                    error: 3,
                    warn: 1,
                    info: 15,
                    debug: 30,
                    trace: 100,
                  },
                },
                number_of_detected_gaps: {
                  total: 1,
                  total_duration_s: 1800,
                },
                schedule_delay_ms: { percentiles: { '50': 110, '95': 210 } },
                execution_duration_ms: { percentiles: { '50': 510, '95': 1010 } },
                search_duration_ms: { percentiles: { '50': 210, '95': 410 } },
                indexing_duration_ms: { percentiles: { '50': 55, '95': 105 } },
                frozen_indices_queried_max_count: 0,
              },
            },
          ],
        },
      },
    }),

  fetchRuleHealth: jest
    .fn<Promise<GetRuleHealthResponse>, [GetRuleHealthRequestBody, AbortSignal | undefined]>()
    .mockResolvedValue({
      timings: {
        requested_at: new Date().toISOString(),
        processed_at: new Date().toISOString(),
        processing_time_ms: 50,
      },
      parameters: {
        interval: {
          type: HealthIntervalType.last_day,
          granularity: HealthIntervalGranularity.hour,
          from: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          to: new Date().toISOString(),
          duration: 'PT24H',
        },
        rule_id: 'rule-id-1',
      },
      health: {
        state_at_the_moment: {
          rule: {
            id: 'rule-id-1',
            enabled: true,
            name: 'Mock Rule',
            tags: [],
            type: 'query',
            from: 'now-5m',
            to: 'now',
            interval: '5m',
            query: '*:*',
            language: 'kuery',
            rule_id: 'test-rule-1',
            description: 'Test rule',
            risk_score: 50,
            risk_score_mapping: [],
            severity_mapping: [],
            exceptions_list: [],
            severity: 'medium',
            false_positives: [],
            references: [],
            max_signals: 100,
            threat: [],
            setup: '',
            related_integrations: [],
            required_fields: [],
            immutable: false,
            rule_source: { type: 'internal' },
            actions: [],
            author: ['Elastic'],
            created_by: 'elastic',
            updated_by: 'elastic',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            revision: 1,
            version: 1,
          },
        },
        stats_over_interval: {
          number_of_executions: {
            total: 10,
            by_outcome: {
              succeeded: 9,
              failed: 1,
              warning: 0,
            },
          },
          number_of_logged_messages: {
            total: 5,
            by_level: {
              error: 3,
              warn: 1,
              info: 15,
              debug: 30,
              trace: 100,
            },
          },
          number_of_detected_gaps: {
            total: 1,
            total_duration_s: 300,
          },
          schedule_delay_ms: { percentiles: { '50': 10, '95': 20 } },
          execution_duration_ms: { percentiles: { '50': 50, '95': 100 } },
          search_duration_ms: { percentiles: { '50': 20, '95': 40 } },
          indexing_duration_ms: { percentiles: { '50': 5, '95': 10 } },
          gap_summary: {
            total_unfilled_duration_ms: 1000,
            total_in_progress_duration_ms: 500,
            total_filled_duration_ms: 2000,
          },
          frozen_indices_queried_max_count: 0,
        },
        history_over_interval: {
          buckets: [
            {
              timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
              stats: {
                number_of_executions: {
                  total: 5,
                  by_outcome: {
                    succeeded: 4,
                    failed: 1,
                    warning: 0,
                  },
                },
                number_of_logged_messages: {
                  total: 2,
                  by_level: {
                    error: 3,
                    warn: 1,
                    info: 15,
                    debug: 30,
                    trace: 100,
                  },
                },
                number_of_detected_gaps: {
                  total: 0,
                  total_duration_s: 0,
                },
                schedule_delay_ms: { percentiles: { '50': 12, '95': 22 } },
                execution_duration_ms: { percentiles: { '50': 52, '95': 102 } },
                search_duration_ms: { percentiles: { '50': 22, '95': 42 } },
                indexing_duration_ms: { percentiles: { '50': 7, '95': 12 } },
                frozen_indices_queried_max_count: 0,
              },
            },
          ],
        },
      },
    }),
};
