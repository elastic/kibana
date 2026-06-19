/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assertPickVersionIsTarget } from './assert_pick_version_is_target';
import type {
  PickVersionValues,
  RuleUpgradeSpecifier,
} from '../../../../../../common/api/detection_engine';

describe('assertPickVersionIsTarget', () => {
  const ruleId = 'test-rule-id';
  const createExpectedError = (id: string) =>
    `Rule update for rule ${id} has a rule type change. All 'pick_version' values for rule must match 'TARGET'`;

  describe('valid cases - ', () => {
    it('should not throw when pick_version is TARGET for ALL_RULES mode (no specifier)', () => {
      expect(() =>
        assertPickVersionIsTarget({ ruleId, globalPickVersion: 'TARGET' })
      ).not.toThrow();
    });

    it('should not throw when pick_version is TARGET for SPECIFIC_RULES mode', () => {
      const ruleUpgradeSpecifier: RuleUpgradeSpecifier = {
        rule_id: ruleId,
        revision: 1,
        version: 1,
        pick_version: 'TARGET',
      };

      expect(() => assertPickVersionIsTarget({ ruleId, ruleUpgradeSpecifier })).not.toThrow();
    });

    it('should not throw when all pick_version values are TARGET', () => {
      const ruleUpgradeSpecifier: RuleUpgradeSpecifier = {
        rule_id: ruleId,
        revision: 1,
        version: 1,
        pick_version: 'TARGET',
        fields: {
          name: { pick_version: 'TARGET' },
          description: { pick_version: 'TARGET' },
        },
      };

      expect(() =>
        assertPickVersionIsTarget({ ruleId, globalPickVersion: 'TARGET', ruleUpgradeSpecifier })
      ).not.toThrow();
    });
  });

  describe('invalid cases - ', () => {
    it('should throw when pick_version is not TARGET for ALL_RULES mode', () => {
      const pickVersions: PickVersionValues[] = ['BASE', 'CURRENT', 'MERGED'];

      pickVersions.forEach((globalPickVersion) => {
        expect(() => assertPickVersionIsTarget({ ruleId, globalPickVersion })).toThrowError(
          createExpectedError(ruleId)
        );
      });
    });

    it('should throw when pick_version is not TARGET for SPECIFIC_RULES mode', () => {
      const ruleUpgradeSpecifier: RuleUpgradeSpecifier = {
        rule_id: ruleId,
        revision: 1,
        version: 1,
        pick_version: 'BASE',
      };

      expect(() => assertPickVersionIsTarget({ ruleId, ruleUpgradeSpecifier })).toThrowError(
        createExpectedError(ruleId)
      );
    });

    it('should throw when any field-specific pick_version is not TARGET', () => {
      const ruleUpgradeSpecifier: RuleUpgradeSpecifier = {
        rule_id: ruleId,
        revision: 1,
        version: 1,
        pick_version: 'TARGET',
        fields: {
          name: { pick_version: 'BASE' },
        },
      };

      expect(() => assertPickVersionIsTarget({ ruleId, ruleUpgradeSpecifier })).toThrowError(
        createExpectedError(ruleId)
      );
    });

    it('should throw when pick_version is missing (defaults to MERGED)', () => {
      const ruleUpgradeSpecifier: RuleUpgradeSpecifier = {
        rule_id: ruleId,
        revision: 1,
        version: 1,
      };

      expect(() => assertPickVersionIsTarget({ ruleId, ruleUpgradeSpecifier })).toThrow();
    });
  });
});
