/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ThreeWayDiffOutcome } from '@kbn/security-solution-plugin/common/api/detection_engine';
import { FtrProviderContext } from '../../../../../../../../ftr_provider_context';
import type { TestFieldRuleUpgradeAssets } from '../test_helpers';
import {
  testFieldUpgradeReview,
  testFieldUpgradesToMergedValue,
  testFieldUpgradesToResolvedValue,
} from '../test_helpers';

export function ruleNameOverrideField({ getService }: FtrProviderContext): void {
  describe('"rule_name_override"', () => {
    describe('non-customized without an upgrade (AAA diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          rule_name_override: 'fieldA',
        },
        patch: {},
        upgrade: {
          type: 'query',
          rule_name_override: 'fieldA',
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'rule_name_override',
          expectedDiffOutcome: ThreeWayDiffOutcome.StockValueNoUpdate,
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'rule_name_override',
          resolvedValue: { field_name: 'resolved' },
          expectedFieldsAfterUpgrade: { rule_name_override: 'resolved' },
        },
        getService
      );
    });

    describe('non-customized with an upgrade (AAB diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          rule_name_override: 'fieldA',
        },
        patch: {},
        upgrade: {
          type: 'query',
          rule_name_override: 'fieldB',
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'rule_name_override',
          expectedDiffOutcome: ThreeWayDiffOutcome.StockValueCanUpdate,
          expectedFieldDiffValues: {
            base: { field_name: 'fieldA' },
            current: { field_name: 'fieldA' },
            target: { field_name: 'fieldB' },
            merged: { field_name: 'fieldB' },
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'rule_name_override',
          expectedFieldsAfterUpgrade: { rule_name_override: 'fieldB' },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'rule_name_override',
          resolvedValue: { field_name: 'resolved' },
          expectedFieldsAfterUpgrade: { rule_name_override: 'resolved' },
        },
        getService
      );
    });

    describe('customized without an upgrade (ABA diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          rule_name_override: 'fieldA',
        },
        patch: {
          rule_name_override: 'fieldB',
        },
        upgrade: {
          type: 'query',
          rule_name_override: 'fieldA',
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'rule_name_override',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
          expectedFieldDiffValues: {
            base: { field_name: 'fieldA' },
            current: { field_name: 'fieldB' },
            target: { field_name: 'fieldA' },
            merged: { field_name: 'fieldB' },
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'rule_name_override',
          expectedFieldsAfterUpgrade: { rule_name_override: 'fieldB' },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'rule_name_override',
          resolvedValue: { field_name: 'resolved' },
          expectedFieldsAfterUpgrade: { rule_name_override: 'resolved' },
        },
        getService
      );
    });

    describe('customized with the matching upgrade (ABB diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          rule_name_override: 'fieldA',
        },
        patch: {
          rule_name_override: 'fieldB',
        },
        upgrade: {
          type: 'query',
          rule_name_override: 'fieldB',
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'rule_name_override',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
          expectedFieldDiffValues: {
            base: { field_name: 'fieldA' },
            current: { field_name: 'fieldB' },
            target: { field_name: 'fieldB' },
            merged: { field_name: 'fieldB' },
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'rule_name_override',
          expectedFieldsAfterUpgrade: { rule_name_override: 'fieldB' },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'rule_name_override',
          resolvedValue: { field_name: 'resolved' },
          expectedFieldsAfterUpgrade: { rule_name_override: 'resolved' },
        },
        getService
      );
    });

    describe('customized with an upgrade resulting in a conflict (ABC diff case, non-solvable conflict)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          rule_name_override: 'fieldA',
        },
        patch: {
          rule_name_override: 'fieldB',
        },
        upgrade: {
          type: 'query',
          rule_name_override: 'fieldC',
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'rule_name_override',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
          isSolvableConflict: false,
          expectedFieldDiffValues: {
            base: { field_name: 'fieldA' },
            current: { field_name: 'fieldB' },
            target: { field_name: 'fieldC' },
            merged: { field_name: 'fieldB' },
          },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'rule_name_override',
          resolvedValue: { field_name: 'resolved' },
          expectedFieldsAfterUpgrade: { rule_name_override: 'resolved' },
        },
        getService
      );
    });

    describe('without historical versions', () => {
      describe('customized with the matching upgrade (-AA diff case)', () => {
        const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
          installed: {
            type: 'query',
            rule_name_override: 'fieldA',
          },
          patch: {
            rule_name_override: 'fieldB',
          },
          upgrade: {
            type: 'query',
            rule_name_override: 'fieldB',
          },
          removeInstalledAssets: true,
        };

        testFieldUpgradeReview(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'rule_name_override',
            expectedDiffOutcome: ThreeWayDiffOutcome.MissingBaseNoUpdate,
          },
          getService
        );

        testFieldUpgradesToResolvedValue(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'rule_name_override',
            resolvedValue: { field_name: 'resolved' },
            expectedFieldsAfterUpgrade: { rule_name_override: 'resolved' },
          },
          getService
        );
      });

      describe('customized with an upgrade (-AB diff case)', () => {
        const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
          installed: {
            type: 'query',
            rule_name_override: 'fieldA',
          },
          patch: {
            rule_name_override: 'fieldB',
          },
          upgrade: {
            type: 'query',
            rule_name_override: 'fieldC',
          },
          removeInstalledAssets: true,
        };

        testFieldUpgradeReview(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'rule_name_override',
            expectedDiffOutcome: ThreeWayDiffOutcome.MissingBaseCanUpdate,
            expectedFieldDiffValues: {
              current: { field_name: 'fieldB' },
              target: { field_name: 'fieldC' },
              merged: { field_name: 'fieldC' },
            },
          },
          getService
        );

        testFieldUpgradesToResolvedValue(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'rule_name_override',
            resolvedValue: { field_name: 'resolved' },
            expectedFieldsAfterUpgrade: { rule_name_override: 'resolved' },
          },
          getService
        );
      });
    });
  });
}
