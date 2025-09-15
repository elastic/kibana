/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceStart } from '@kbn/core/server';
import {
  ThreeWayDiffConflict,
  ThreeWayDiffOutcome,
} from '../../../../../../common/api/detection_engine/prebuilt_rules';
import { DETECTION_RULE_UPDATE_EVENT } from '../../../../telemetry/event_based/events';
import type { RuleUpdateContext } from './update_rule_telemetry';
import { sendRuleUpdateTelemetryEvents } from './update_rule_telemetry';

const mockAnalytics = (): AnalyticsServiceStart =>
  ({ reportEvent: jest.fn() } as unknown as AnalyticsServiceStart);

const createMockRuleUpdateContext = (
  overrides: Partial<RuleUpdateContext> = {}
): RuleUpdateContext => ({
  ruleId: 'r1',
  ruleName: 'Rule r1',
  hasBaseVersion: true,
  fieldsDiff: {
    name: {
      conflict: ThreeWayDiffConflict.SOLVABLE,
      diff_outcome: ThreeWayDiffOutcome.StockValueCanUpdate,
    },
  },
  ...overrides,
});

describe('sendRuleUpdateTelemetryEvents', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('emits SUCCESS with calculated updated fields for processed rule', () => {
    const analytics = mockAnalytics();

    sendRuleUpdateTelemetryEvents(
      analytics,
      new Map([
        [
          'r1',
          createMockRuleUpdateContext({
            ruleId: 'r1',
            ruleName: 'Rule r1',
          }),
        ],
      ]),
      [{ rule_id: 'r1' }],
      [],
      []
    );

    expect(analytics.reportEvent).toHaveBeenCalledTimes(1);
    const [eventType, payload] = (analytics.reportEvent as jest.Mock).mock.calls[0];

    expect(eventType).toBe(DETECTION_RULE_UPDATE_EVENT.eventType);

    expect(payload.ruleId).toBe('r1');
    expect(payload.ruleName).toBe('Rule r1');
    expect(payload.hasBaseVersion).toBe(true);
    expect(payload.finalResult).toBe('SUCCESS');

    expect(payload.updatedFieldsSummary).toEqual({
      count: 1,
      nonSolvableConflictsCount: 0,
      solvableConflictsCount: 1,
      noConflictsCount: 0,
    });
    expect(payload.updatedFieldsTotal).toEqual(['name']);
    expect(payload.updatedFieldsWithSolvableConflicts).toEqual(['name']);
    expect(payload.updatedFieldsWithNonSolvableConflicts).toEqual([]);
    expect(payload.updatedFieldsWithNoConflicts).toEqual([]);
  });

  test('ignores fields that are not updatable outcomes', () => {
    const analytics = mockAnalytics();

    const notUpdatableCtx = createMockRuleUpdateContext({
      fieldsDiff: {
        description: {
          conflict: ThreeWayDiffConflict.NONE,
          diff_outcome: ThreeWayDiffOutcome.StockValueNoUpdate,
        },
        version: {
          conflict: ThreeWayDiffConflict.NONE,
          diff_outcome: ThreeWayDiffOutcome.StockValueCanUpdate,
        },
      },
    });

    sendRuleUpdateTelemetryEvents(
      analytics,
      new Map([['r1', notUpdatableCtx]]),
      [{ rule_id: 'r1' }],
      [],
      []
    );

    expect(analytics.reportEvent).toHaveBeenCalledTimes(1);
    const [, payload] = (analytics.reportEvent as jest.Mock).mock.calls[0];

    expect(payload.updatedFieldsSummary).toEqual({
      count: 0,
      nonSolvableConflictsCount: 0,
      solvableConflictsCount: 0,
      noConflictsCount: 0,
    });
    expect(payload.updatedFieldsTotal).toEqual([]);
    expect(payload.updatedFieldsWithSolvableConflicts).toEqual([]);
    expect(payload.updatedFieldsWithNonSolvableConflicts).toEqual([]);
    expect(payload.updatedFieldsWithNoConflicts).toEqual([]);
  });

  test('emits ERROR for rules present in errors set', () => {
    const analytics = mockAnalytics();

    sendRuleUpdateTelemetryEvents(
      analytics,
      new Map([
        [
          'r1',
          createMockRuleUpdateContext({
            ruleId: 'r1',
            ruleName: 'Rule r1',
          }),
        ],
      ]),
      [],
      [{ item: { rule_id: 'r1' } }],
      []
    );

    expect(analytics.reportEvent).toHaveBeenCalledTimes(1);
    const [, payload] = (analytics.reportEvent as jest.Mock).mock.calls[0];
    expect(payload.finalResult).toBe('ERROR');
    expect(payload.ruleId).toBe('r1');
    expect(payload.ruleName).toBe('Rule r1');
    expect(payload.hasBaseVersion).toBe(true);
    expect(payload.updatedFieldsSummary).toEqual({
      count: 1,
      nonSolvableConflictsCount: 0,
      solvableConflictsCount: 1,
      noConflictsCount: 0,
    });
    expect(payload.updatedFieldsTotal).toEqual(['name']);
    expect(payload.updatedFieldsWithSolvableConflicts).toEqual(['name']);
    expect(payload.updatedFieldsWithNonSolvableConflicts).toEqual([]);
    expect(payload.updatedFieldsWithNoConflicts).toEqual([]);
  });

  test('emits SKIP for rules present in skipped set', () => {
    const analytics = mockAnalytics();

    sendRuleUpdateTelemetryEvents(
      analytics,
      new Map([
        [
          'r1',
          createMockRuleUpdateContext({
            ruleId: 'r1',
            ruleName: 'Rule r1',
          }),
        ],
      ]),
      [],
      [],
      [{ rule_id: 'r1' }]
    );

    expect(analytics.reportEvent).toHaveBeenCalledTimes(1);
    const [, payload] = (analytics.reportEvent as jest.Mock).mock.calls[0];
    expect(payload.finalResult).toBe('SKIP');
    expect(payload.ruleId).toBe('r1');
    expect(payload.ruleName).toBe('Rule r1');
    expect(payload.hasBaseVersion).toBe(true);
    expect(payload.updatedFieldsSummary).toEqual({
      count: 1,
      nonSolvableConflictsCount: 0,
      solvableConflictsCount: 1,
      noConflictsCount: 0,
    });
    expect(payload.updatedFieldsTotal).toEqual(['name']);
    expect(payload.updatedFieldsWithSolvableConflicts).toEqual(['name']);
    expect(payload.updatedFieldsWithNonSolvableConflicts).toEqual([]);
    expect(payload.updatedFieldsWithNoConflicts).toEqual([]);
  });

  test('does not emit when there is no matching context for outcome lists', () => {
    const analytics = mockAnalytics();

    sendRuleUpdateTelemetryEvents(
      analytics,
      new Map([
        [
          'r1',
          createMockRuleUpdateContext({
            ruleId: 'r1',
            ruleName: 'Rule r1',
          }),
        ],
      ]),
      [{ rule_id: 'x' }],
      [{ item: { rule_id: 'y' } }],
      [{ rule_id: 'z' }]
    );

    expect(analytics.reportEvent).not.toHaveBeenCalled();
  });

  test('emits multiple events when multiple outcomes exist', () => {
    const analytics = mockAnalytics();

    const c1 = createMockRuleUpdateContext({ ruleId: 'r1', ruleName: 'Rule r1' });
    const c2 = createMockRuleUpdateContext({
      ruleId: 'r2',
      ruleName: 'Rule r2',
      fieldsDiff: {
        severity: {
          conflict: ThreeWayDiffConflict.NON_SOLVABLE,
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
        },
      },
      hasBaseVersion: false,
    });
    const c3 = createMockRuleUpdateContext({
      ruleId: 'r3',
      ruleName: 'Rule r3',
      fieldsDiff: {
        note: {
          conflict: ThreeWayDiffConflict.NONE,
          diff_outcome: ThreeWayDiffOutcome.StockValueCanUpdate,
        },
      },
    });

    const c4 = createMockRuleUpdateContext({
      ruleId: 'r4',
      ruleName: 'Rule r4',
      fieldsDiff: {
        description: {
          conflict: ThreeWayDiffConflict.SOLVABLE,
          diff_outcome: ThreeWayDiffOutcome.StockValueCanUpdate,
        },
      },
    });

    sendRuleUpdateTelemetryEvents(
      analytics,
      new Map([
        ['r1', c1],
        ['r2', c2],
        ['r3', c3],
        ['r4', c4],
      ]),
      [{ rule_id: 'r1' }, { rule_id: 'r3' }],
      [{ item: { rule_id: 'r2' } }],
      [{ rule_id: 'r4' }]
    );

    expect(analytics.reportEvent).toHaveBeenCalledTimes(4);

    const payloads = (analytics.reportEvent as jest.Mock).mock.calls.map(([, p]) => p);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payloadsMap = new Map(payloads.map((payload: any) => [payload.ruleId, payload]));

    expect(payloadsMap.get('r1')!.finalResult).toBe('SUCCESS');
    expect(payloadsMap.get('r1')!.updatedFieldsWithSolvableConflicts).toEqual(['name']);
    expect(payloadsMap.get('r1')!.hasBaseVersion).toBe(true);
    expect(payloadsMap.get('r1')!.updatedFieldsSummary).toEqual({
      count: 1,
      nonSolvableConflictsCount: 0,
      solvableConflictsCount: 1,
      noConflictsCount: 0,
    });

    expect(payloadsMap.get('r2')!.finalResult).toBe('ERROR');
    expect(payloadsMap.get('r2')!.hasBaseVersion).toBe(false);
    expect(payloadsMap.get('r2')!.updatedFieldsWithNonSolvableConflicts).toEqual(['severity']);
    expect(payloadsMap.get('r2')!.updatedFieldsSummary).toEqual({
      count: 1,
      nonSolvableConflictsCount: 1,
      solvableConflictsCount: 0,
      noConflictsCount: 0,
    });

    expect(payloadsMap.get('r3')!.finalResult).toBe('SUCCESS');
    expect(payloadsMap.get('r3')!.hasBaseVersion).toBe(true);
    expect(payloadsMap.get('r3')!.updatedFieldsWithNoConflicts).toEqual(['note']);
    expect(payloadsMap.get('r3')!.updatedFieldsSummary).toEqual({
      count: 1,
      nonSolvableConflictsCount: 0,
      solvableConflictsCount: 0,
      noConflictsCount: 1,
    });

    expect(payloadsMap.get('r4')!.finalResult).toBe('SKIP');
    expect(payloadsMap.get('r4')!.hasBaseVersion).toBe(true);
    expect(payloadsMap.get('r4')!.updatedFieldsWithSolvableConflicts).toEqual(['description']);
    expect(payloadsMap.get('r4')!.updatedFieldsSummary).toEqual({
      count: 1,
      nonSolvableConflictsCount: 0,
      solvableConflictsCount: 1,
      noConflictsCount: 0,
    });
  });
});
