/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { of } from 'rxjs';
import type { PrebuiltRuleAsset } from '../../model/rule_assets/prebuilt_rule_asset';
import type { RuleResponse } from '../../../../../../common/api/detection_engine';
import { ThreeWayDiffConflict } from '../../../../../../common/api/detection_engine/prebuilt_rules/model/diff/three_way_diff/three_way_diff_conflict';
import { ThreeWayMergeOutcome } from '../../../../../../common/api/detection_engine/prebuilt_rules/model/diff/three_way_diff/three_way_merge_outcome';
import { reportRuleUpgradeTelemetry } from './create_upgradeable_rules_payload';
import type { BasicRuleFieldsDiff } from './create_upgradeable_rules_payload';
import type { AnalyticsServiceStart } from '@kbn/core/server';
import type { RuleTriad } from '../../model/rule_groups/get_rule_groups';

describe('reportRuleUpgradeTelemetry', () => {
  const mockPrebuiltRuleAsset: PrebuiltRuleAsset = {
    rule_id: 'id',
    version: 1,
    name: '',
    description: '',
    risk_score: 1,
    severity: 'low',
    type: 'query',
    from: '',
    to: '',
    interval: '',
    query: '',
    language: 'kuery',
    enabled: true,
    tags: [],
  };
  const mockRuleResponse: RuleResponse = {
    id: 'id',
    rule_id: 'id',
    version: 1,
    name: '',
    description: '',
    risk_score: 1,
    severity: 'low',
    type: 'query',
    from: '',
    to: '',
    interval: '',
    query: '',
    language: 'kuery',
    enabled: true,
    tags: [],
    risk_score_mapping: [],
    severity_mapping: [],
    references: [],
    false_positives: [],
    max_signals: 100,
    threat: [],
    actions: [],
    throttle: undefined,
    exceptions_list: [],
    created_by: '',
    updated_by: '',
    created_at: '',
    updated_at: '',
    outcome: undefined,
    alias_target_id: undefined,
    alias_purpose: undefined,
    building_block_type: undefined,
    note: undefined,
    timeline_id: undefined,
    timeline_title: undefined,
    meta: undefined,
    filters: [],
    index: [],
    output_index: '',
    namespace: undefined,
    author: [],
    license: undefined,
    setup: '',
    related_integrations: [],
    required_fields: [],
    immutable: true,
    // minimalny zestaw wymaganych pól
    rule_source: { type: 'external', is_customized: false }, // or another valid value for your use case
    revision: 1,
  };
  let analytics: AnalyticsServiceStart;

  beforeEach(() => {
    analytics = {
      reportEvent: jest.fn(),
      optIn: jest.fn(),
      telemetryCounter$: of(),
    };
  });

  it('should not report event if there are no conflicts', () => {
    const mockRuleTriad: RuleTriad = {
      base: mockPrebuiltRuleAsset,
      current: mockRuleResponse,
      target: { ...mockPrebuiltRuleAsset, version: 2 },
    };
    const diff: BasicRuleFieldsDiff = {
      description: {
        conflict: ThreeWayDiffConflict.NONE,
        merge_outcome: ThreeWayMergeOutcome.Current,
      },
      name: {
        conflict: ThreeWayDiffConflict.NONE,
      },
    };
    reportRuleUpgradeTelemetry({
      analytics,
      calculatedRuleDiff: diff,
      ruleId: 'rule-1',
      upgradeableRule: mockRuleTriad,
    });
    expect(analytics.reportEvent).not.toHaveBeenCalled();
  });

  it('should report event with correct structure for conflicts', () => {
    const mockRuleTriad: RuleTriad = {
      base: undefined,
      current: mockRuleResponse,
      target: { ...mockPrebuiltRuleAsset, version: 2 },
    };
    const diff: BasicRuleFieldsDiff = {
      fieldA: {
        conflict: ThreeWayDiffConflict.SOLVABLE,
        merge_outcome: ThreeWayMergeOutcome.Merged,
      },
      fieldB: {
        conflict: ThreeWayDiffConflict.NON_SOLVABLE,
        merge_outcome: ThreeWayMergeOutcome.Current,
      },
    };
    reportRuleUpgradeTelemetry({
      analytics,
      calculatedRuleDiff: diff,
      ruleId: 'rule-2',
      upgradeableRule: mockRuleTriad,
    });
    expect(analytics.reportEvent).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        ruleId: 'rule-2',
        hasMissingBaseVersion: true,
        totalFieldsWithConflict: {
          count: 2,
          prepopulated: 1,
          notPrepopulated: 1,
        },
        customizedFields: [
          expect.objectContaining({
            fieldName: 'fieldA',
            conflict: ThreeWayDiffConflict.SOLVABLE,
            selectedVersion: ThreeWayMergeOutcome.Merged,
            prepopulatedFinalVersion: true,
          }),
          expect.objectContaining({
            fieldName: 'fieldB',
            conflict: ThreeWayDiffConflict.NON_SOLVABLE,
            selectedVersion: ThreeWayMergeOutcome.Current,
            prepopulatedFinalVersion: false,
          }),
        ],
      })
    );
  });
});
