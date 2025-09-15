/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ThreeWayDiffConflict } from '../../../../../../common/api/detection_engine/prebuilt_rules/model/diff/three_way_diff/three_way_diff_conflict';
import { ThreeWayDiffOutcome } from '../../../../../../common/api/detection_engine/prebuilt_rules/model/diff/three_way_diff/three_way_diff_outcome';
import type { BasicRuleFieldsDiff, RuleUpdateTelemetryDraft } from './update_rule_telemetry';
import {
  createRuleUpdateTelemetryDraft,
  sendRuleUpdateTelemetryEvents,
} from './update_rule_telemetry';
import type { AnalyticsServiceStart } from '@kbn/core/server';
import { DETECTION_RULE_UPDATE_EVENT } from '../../../../telemetry/event_based/events';

describe('telemetry for rule update', () => {
  describe('buildRuleUpgradeTelemetryDraft', () => {
    test('classifies updated fields by conflict', () => {
      const diff: BasicRuleFieldsDiff = {
        version: {
          conflict: ThreeWayDiffConflict.NONE,
          diff_outcome: ThreeWayDiffOutcome.StockValueCanUpdate,
        },

        fieldA: {
          conflict: ThreeWayDiffConflict.NONE,
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
        },

        fieldB: {
          conflict: ThreeWayDiffConflict.SOLVABLE,
          diff_outcome: ThreeWayDiffOutcome.StockValueCanUpdate,
        },

        fieldC: {
          conflict: ThreeWayDiffConflict.NON_SOLVABLE,
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
        },

        fieldD: {
          conflict: ThreeWayDiffConflict.NONE,
          diff_outcome: ThreeWayDiffOutcome.MissingBaseCanUpdate,
        },

        fieldE: {
          conflict: ThreeWayDiffConflict.NONE,
          diff_outcome: undefined,
        },
      };

      const draft = createRuleUpdateTelemetryDraft({
        calculatedRuleDiff: diff,
        ruleId: 'r-1',
        ruleName: 'Rule 1',
        hasBaseVersion: false,
      });

      expect(draft.ruleId).toBe('r-1');
      expect(draft.ruleName).toBe('Rule 1');
      expect(draft.hasBaseVersion).toBe(false);

      expect(draft.updatedFieldsTotal.sort()).toEqual(
        ['fieldA', 'fieldB', 'fieldC', 'fieldD'].sort()
      );
      expect(draft.updatedFieldsWithNoConflicts).toEqual(
        expect.arrayContaining(['fieldA', 'fieldD'])
      );
      expect(draft.updatedFieldsWithSolvableConflicts).toEqual(expect.arrayContaining(['fieldB']));
      expect(draft.updatedFieldsWithNonSolvableConflicts).toEqual(
        expect.arrayContaining(['fieldC'])
      );

      expect(draft.updatedFieldsSummary.count).toBe(draft.updatedFieldsTotal.length);
      expect(draft.updatedFieldsSummary.nonSolvableConflictsCount).toBe(
        draft.updatedFieldsWithNonSolvableConflicts.length
      );
      expect(draft.updatedFieldsSummary.solvableConflictsCount).toBe(
        draft.updatedFieldsWithSolvableConflicts.length
      );
      expect(draft.updatedFieldsSummary.noConflictsCount).toBe(
        draft.updatedFieldsWithNoConflicts.length
      );
    });

    test('sets hasMissingBaseVersion=true when base version is undefined', () => {
      const diff: BasicRuleFieldsDiff = {
        name: {
          conflict: ThreeWayDiffConflict.NONE,
          diff_outcome: ThreeWayDiffOutcome.StockValueCanUpdate,
        },
      };

      const draft = createRuleUpdateTelemetryDraft({
        calculatedRuleDiff: diff,
        ruleId: 'abc-123',
        ruleName: 'Test rule',
        hasBaseVersion: true,
      });

      expect(draft.ruleId).toBe('abc-123');
      expect(draft.ruleName).toBe('Test rule');
      expect(draft.hasBaseVersion).toBe(true);
      expect(draft.updatedFieldsTotal).toEqual(['name']);
    });

    test('ignores non-updated outcomes"', () => {
      const diff: BasicRuleFieldsDiff = {
        description: {
          conflict: ThreeWayDiffConflict.NONE,
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
        },
        name: {
          conflict: ThreeWayDiffConflict.NONE,
          diff_outcome: ThreeWayDiffOutcome.StockValueNoUpdate,
        },
        severity: {
          conflict: ThreeWayDiffConflict.NONE,
          diff_outcome: ThreeWayDiffOutcome.MissingBaseNoUpdate,
        },
      };

      const draft = createRuleUpdateTelemetryDraft({
        calculatedRuleDiff: diff,
        ruleId: 'r-1',
        ruleName: 'Rule 1',
        hasBaseVersion: false,
      });

      expect(draft.updatedFieldsTotal).toEqual([]);
      expect(draft.updatedFieldsSummary.count).toBe(0);
      expect(draft.updatedFieldsWithNoConflicts).toEqual([]);
      expect(draft.updatedFieldsWithSolvableConflicts).toEqual([]);
      expect(draft.updatedFieldsWithNonSolvableConflicts).toEqual([]);
    });
  });

  describe('sendTelemetryEvents', () => {
    const mockDraft = (ruleId: string) => ({
      ruleId,
      ruleName: `Rule ${ruleId}`,
      hasMissingBaseVersion: false,
      updatedFieldsSummary: {
        count: 1,
        nonSolvableConflictsCount: 0,
        solvableConflictsCount: 1,
        noConflictsCount: 0,
      },
      updatedFieldsTotal: ['name'],
      updatedFieldsWithNonSolvableConflicts: [],
      updatedFieldsWithSolvableConflicts: ['name'],
      updatedFieldsWithNoConflicts: [],
    });

    test('emits SUCCESS / ERROR / SKIP events only for rules with drafts', () => {
      const mockAnalytics = { reportEvent: jest.fn() } as unknown as AnalyticsServiceStart;

      const drafts = new Map<string, RuleUpdateTelemetryDraft>([
        ['r1', mockDraft('r1')],
        ['r2', mockDraft('r2')],
        ['r3', mockDraft('r3')],
      ]);

      const updatedRules = [{ rule_id: 'r1' }];
      const installationErrors = [{ item: { rule_id: 'r2' } }];
      const skippedRules = [{ rule_id: 'r3' }];

      sendRuleUpdateTelemetryEvents(
        mockAnalytics,
        drafts,
        updatedRules,
        installationErrors,
        skippedRules
      );

      const reportMock = mockAnalytics.reportEvent as jest.Mock;
      expect(reportMock).toHaveBeenCalledTimes(3);

      expect(reportMock.mock.calls[0][0]).toBe(DETECTION_RULE_UPDATE_EVENT.eventType);
      expect(reportMock.mock.calls[0][1]).toEqual({
        ruleId: 'r1',
        ruleName: 'Rule r1',
        hasMissingBaseVersion: false,
        finalResult: 'SUCCESS',
        updatedFieldsSummary: {
          count: 1,
          nonSolvableConflictsCount: 0,
          solvableConflictsCount: 1,
          noConflictsCount: 0,
        },
        updatedFieldsTotal: ['name'],
        updatedFieldsWithNonSolvableConflicts: [],
        updatedFieldsWithSolvableConflicts: ['name'],
        updatedFieldsWithNoConflicts: [],
      });
      expect(reportMock.mock.calls[1][0]).toBe(DETECTION_RULE_UPDATE_EVENT.eventType);
      expect(reportMock.mock.calls[1][1]).toEqual({
        ruleId: 'r2',
        ruleName: 'Rule r2',
        hasMissingBaseVersion: false,
        finalResult: 'ERROR',
        updatedFieldsSummary: {
          count: 1,
          nonSolvableConflictsCount: 0,
          solvableConflictsCount: 1,
          noConflictsCount: 0,
        },
        updatedFieldsTotal: ['name'],
        updatedFieldsWithNonSolvableConflicts: [],
        updatedFieldsWithSolvableConflicts: ['name'],
        updatedFieldsWithNoConflicts: [],
      });
      expect(reportMock.mock.calls[2][0]).toBe(DETECTION_RULE_UPDATE_EVENT.eventType);
      expect(reportMock.mock.calls[2][1]).toEqual({
        ruleId: 'r3',
        ruleName: 'Rule r3',
        hasMissingBaseVersion: false,
        finalResult: 'SKIP',
        updatedFieldsSummary: {
          count: 1,
          nonSolvableConflictsCount: 0,
          solvableConflictsCount: 1,
          noConflictsCount: 0,
        },
        updatedFieldsTotal: ['name'],
        updatedFieldsWithNonSolvableConflicts: [],
        updatedFieldsWithSolvableConflicts: ['name'],
        updatedFieldsWithNoConflicts: [],
      });
    });

    test('does not throw if analytics.reportEvent throws', () => {
      const erroringAnalytics = {
        reportEvent: jest.fn(() => {
          throw new Error('erroringAnalytics');
        }),
      } as unknown as AnalyticsServiceStart;

      const drafts = new Map<string, RuleUpdateTelemetryDraft>([['r1', mockDraft('r1')]]);
      const updatedRules = [{ rule_id: 'r1' }];

      expect(() =>
        sendRuleUpdateTelemetryEvents(erroringAnalytics, drafts, updatedRules, [], [])
      ).not.toThrow();
    });

    test('emits nothing when there are no matching drafts', () => {
      const mockAnalytics = { reportEvent: jest.fn() } as unknown as AnalyticsServiceStart;
      const drafts = new Map<string, RuleUpdateTelemetryDraft>(); // empty -> no matches

      sendRuleUpdateTelemetryEvents(
        mockAnalytics,
        drafts,
        [{ rule_id: 'x' }],
        [{ item: { rule_id: 'y' } }],
        [{ rule_id: 'z' }]
      );

      expect(mockAnalytics.reportEvent).not.toHaveBeenCalled();
    });
  });
});
