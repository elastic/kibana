/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getUpgradeableRules } from './get_upgradeable_rules';
import { ModeEnum, SkipRuleUpgradeReasonEnum } from '../../../../../../common/api/detection_engine';
import type {
  RuleResponse,
  RuleUpgradeSpecifier,
} from '../../../../../../common/api/detection_engine';
import { getPrebuiltRuleMockOfType } from '../../model/rule_assets/prebuilt_rule_asset.mock';
import { convertPrebuiltRuleAssetToRuleResponse } from '../../../rule_management/logic/detection_rules_client/converters/convert_prebuilt_rule_asset_to_rule_response';
import type { RuleTriad } from '../../model/rule_groups/get_rule_groups';

describe('getUpgradeableRules', () => {
  const baseRule = getPrebuiltRuleMockOfType('query');
  const createUpgradeableRule = (
    ruleId: string,
    currentVersion: number,
    targetVersion: number
  ): RuleTriad => {
    return {
      current: {
        ...baseRule,
        rule_id: ruleId,
        version: currentVersion,
        revision: 0,
      },
      target: { ...baseRule, rule_id: ruleId, version: targetVersion },
    } as RuleTriad;
  };

  const mockUpgradeableRule = createUpgradeableRule('rule-1', 1, 2);

  const mockCurrentRule: RuleResponse = {
    ...convertPrebuiltRuleAssetToRuleResponse(baseRule),
    rule_id: 'rule-1',
    revision: 0,
    version: 1,
  };

  describe('ALL_RULES mode', () => {
    it('should return all upgradeable rules when in ALL_RULES mode', () => {
      const result = getUpgradeableRules({
        rawUpgradeableRules: [mockUpgradeableRule],
        currentRules: [mockCurrentRule],
        mode: ModeEnum.ALL_RULES,
      });

      expect(result.upgradeableRules).toEqual([mockUpgradeableRule]);
      expect(result.fetchErrors).toEqual([]);
      expect(result.skippedRules).toEqual([]);
    });

    it('should handle empty upgradeable rules list', () => {
      const result = getUpgradeableRules({
        rawUpgradeableRules: [],
        currentRules: [],
        mode: ModeEnum.ALL_RULES,
      });

      expect(result.upgradeableRules).toEqual([]);
      expect(result.fetchErrors).toEqual([]);
      expect(result.skippedRules).toEqual([]);
    });
  });

  describe('SPECIFIC_RULES mode', () => {
    const mockVersionSpecifier: RuleUpgradeSpecifier = {
      rule_id: 'rule-1',
      revision: 0,
      version: 1,
    };

    it('should return specified upgradeable rules when in SPECIFIC_RULES mode', () => {
      const result = getUpgradeableRules({
        rawUpgradeableRules: [mockUpgradeableRule],
        currentRules: [mockCurrentRule],
        versionSpecifiers: [mockVersionSpecifier],
        mode: ModeEnum.SPECIFIC_RULES,
      });

      expect(result.upgradeableRules).toEqual([mockUpgradeableRule]);
      expect(result.fetchErrors).toEqual([]);
      expect(result.skippedRules).toEqual([]);
    });

    it('should handle rule not found', () => {
      const result = getUpgradeableRules({
        rawUpgradeableRules: [mockUpgradeableRule],
        currentRules: [mockCurrentRule],
        versionSpecifiers: [{ ...mockVersionSpecifier, rule_id: 'nonexistent' }],
        mode: ModeEnum.SPECIFIC_RULES,
      });

      expect(result.upgradeableRules).toEqual([mockUpgradeableRule]);
      expect(result.fetchErrors).toHaveLength(1);
      expect(result.fetchErrors[0].error.message).toContain(
        'Rule with rule_id "nonexistent" and version "1" not found'
      );
      expect(result.skippedRules).toEqual([]);
    });

    it('should handle non-upgradeable rule', () => {
      const nonUpgradeableRule: RuleResponse = {
        ...convertPrebuiltRuleAssetToRuleResponse(baseRule),
        rule_id: 'rule-2',
        revision: 0,
        version: 1,
      };

      const result = getUpgradeableRules({
        rawUpgradeableRules: [mockUpgradeableRule],
        currentRules: [mockCurrentRule, nonUpgradeableRule],
        versionSpecifiers: [mockVersionSpecifier, { ...mockVersionSpecifier, rule_id: 'rule-2' }],
        mode: ModeEnum.SPECIFIC_RULES,
      });

      expect(result.upgradeableRules).toEqual([mockUpgradeableRule]);
      expect(result.fetchErrors).toEqual([]);
      expect(result.skippedRules).toEqual([
        { rule_id: 'rule-2', reason: SkipRuleUpgradeReasonEnum.RULE_UP_TO_DATE },
      ]);
    });

    it('should handle revision mismatch', () => {
      const result = getUpgradeableRules({
        rawUpgradeableRules: [mockUpgradeableRule],
        currentRules: [mockCurrentRule],
        versionSpecifiers: [{ ...mockVersionSpecifier, revision: 1 }],
        mode: ModeEnum.SPECIFIC_RULES,
      });

      expect(result.upgradeableRules).toEqual([]);
      expect(result.fetchErrors).toHaveLength(1);
      expect(result.fetchErrors[0].error.message).toContain(
        'Revision mismatch for rule_id rule-1: expected 0, got 1'
      );
      expect(result.skippedRules).toEqual([]);
    });

    it('should handle multiple rules with mixed scenarios', () => {
      const mockUpgradeableRule2 = createUpgradeableRule('rule-2', 1, 2);
      const mockCurrentRule2: RuleResponse = {
        ...convertPrebuiltRuleAssetToRuleResponse(baseRule),
        rule_id: 'rule-2',
        revision: 0,
        version: 1,
      };
      const mockCurrentRule3: RuleResponse = {
        ...convertPrebuiltRuleAssetToRuleResponse(baseRule),
        rule_id: 'rule-3',
        revision: 1,
        version: 1,
      };

      const result = getUpgradeableRules({
        rawUpgradeableRules: [
          mockUpgradeableRule,
          mockUpgradeableRule2,
          createUpgradeableRule('rule-3', 1, 2),
        ],
        currentRules: [mockCurrentRule, mockCurrentRule2, mockCurrentRule3],
        versionSpecifiers: [
          mockVersionSpecifier,
          { ...mockVersionSpecifier, rule_id: 'rule-2' },
          { ...mockVersionSpecifier, rule_id: 'rule-3', revision: 0 },
          { ...mockVersionSpecifier, rule_id: 'rule-4' },
          { ...mockVersionSpecifier, rule_id: 'rule-5', revision: 1 },
        ],
        mode: ModeEnum.SPECIFIC_RULES,
      });

      expect(result.upgradeableRules).toEqual([mockUpgradeableRule, mockUpgradeableRule2]);
      expect(result.fetchErrors).toHaveLength(3);
      expect(result.fetchErrors[0].error.message).toContain(
        'Revision mismatch for rule_id rule-3: expected 1, got 0'
      );
      expect(result.fetchErrors[1].error.message).toContain(
        'Rule with rule_id "rule-4" and version "1" not found'
      );
      expect(result.fetchErrors[2].error.message).toContain(
        'Rule with rule_id "rule-5" and version "1" not found'
      );
      expect(result.skippedRules).toEqual([]);
    });
  });
});
