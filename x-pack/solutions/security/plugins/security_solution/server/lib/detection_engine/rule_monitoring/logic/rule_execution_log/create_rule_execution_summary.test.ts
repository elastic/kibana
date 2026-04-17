/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRuleMock } from '../../../routes/__mocks__/request_responses';
import { getQueryRuleParams } from '../../../rule_schema/mocks';
import { RuleExecutionStatusEnum } from '../../../../../../common/api/detection_engine/rule_monitoring';
import { createRuleExecutionSummary } from './create_rule_execution_summary';

const mockMonitoring = {
  run: {
    history: [],
    calculated_metrics: { success_ratio: 1 },
    last_run: {
      timestamp: '2024-01-01T00:00:00.000Z',
      metrics: {
        duration: 100,
        total_search_duration_ms: 50,
        total_indexing_duration_ms: null,
        total_alerts_detected: null,
        total_alerts_created: null,
        gap_duration_s: null,
        gap_range: null,
      },
    },
  },
};

const mockLastRun = {
  outcome: 'succeeded' as const,
  outcomeOrder: 0,
  outcomeMsg: ['Rule execution completed successfully'],
  warning: null,
  alertsCount: { new: 0, ignored: 0, recovered: 0, active: 0 },
};

describe('createRuleExecutionSummary', () => {
  it('returns null when rule has no monitoring data', () => {
    const rule = getRuleMock(getQueryRuleParams(), { monitoring: undefined });
    expect(createRuleExecutionSummary(rule)).toBeNull();
  });

  it('returns running status when rule is running and enabled', () => {
    const rule = getRuleMock(getQueryRuleParams(), {
      running: true,
      enabled: true,
      monitoring: mockMonitoring,
      lastRun: mockLastRun,
    });

    const summary = createRuleExecutionSummary(rule);
    expect(summary?.last_execution.status).toBe(RuleExecutionStatusEnum.running);
  });

  it('does not return running status when rule is running but disabled', () => {
    const rule = getRuleMock(getQueryRuleParams(), {
      running: true,
      enabled: false,
      monitoring: mockMonitoring,
      lastRun: mockLastRun,
    });

    const summary = createRuleExecutionSummary(rule);
    expect(summary?.last_execution.status).not.toBe(RuleExecutionStatusEnum.running);
    expect(summary?.last_execution.status).toBe(RuleExecutionStatusEnum.succeeded);
  });

  it('returns the last known status for a disabled rule with a stale running flag', () => {
    const rule = getRuleMock(getQueryRuleParams(), {
      running: true,
      enabled: false,
      monitoring: mockMonitoring,
      lastRun: { ...mockLastRun, outcome: 'failed' as const },
    });

    const summary = createRuleExecutionSummary(rule);
    expect(summary?.last_execution.status).toBe(RuleExecutionStatusEnum.failed);
  });

  it('returns null when rule is not running and has no lastRun', () => {
    const rule = getRuleMock(getQueryRuleParams(), {
      running: false,
      monitoring: mockMonitoring,
      lastRun: undefined,
    });

    expect(createRuleExecutionSummary(rule)).toBeNull();
  });
});
