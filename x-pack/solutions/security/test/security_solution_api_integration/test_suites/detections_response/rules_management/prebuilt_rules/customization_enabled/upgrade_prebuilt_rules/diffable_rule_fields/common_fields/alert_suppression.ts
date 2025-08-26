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

export function alertSuppressionField({ getService }: FtrProviderContext): void {
  describe('"alert_suppression"', () => {
    describe('non-customized without an upgrade (AAA diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          alert_suppression: { group_by: ['fieldA'] },
        },
        patch: {},
        upgrade: {
          type: 'query',
          alert_suppression: { group_by: ['fieldA'] },
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'alert_suppression',
          expectedDiffOutcome: ThreeWayDiffOutcome.StockValueNoUpdate,
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'alert_suppression',
          resolvedValue: { group_by: ['fieldC'] },
          expectedFieldsAfterUpgrade: { alert_suppression: { group_by: ['fieldC'] } },
        },
        getService
      );
    });

    describe('non-customized with an upgrade (AAB diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          alert_suppression: { group_by: ['fieldA'] },
        },
        patch: {},
        upgrade: {
          type: 'query',
          alert_suppression: { group_by: ['fieldB'] },
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'alert_suppression',
          expectedDiffOutcome: ThreeWayDiffOutcome.StockValueCanUpdate,
          expectedFieldDiffValues: {
            base: { group_by: ['fieldA'] },
            current: { group_by: ['fieldA'] },
            target: { group_by: ['fieldB'] },
            merged: { group_by: ['fieldB'] },
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'alert_suppression',
          expectedFieldsAfterUpgrade: { alert_suppression: { group_by: ['fieldB'] } },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'alert_suppression',
          resolvedValue: { group_by: ['fieldD'] },
          expectedFieldsAfterUpgrade: { alert_suppression: { group_by: ['fieldD'] } },
        },
        getService
      );
    });

    describe('customized without an upgrade (ABA diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          alert_suppression: { group_by: ['fieldA'] },
        },
        patch: {
          alert_suppression: { group_by: ['fieldB'] },
        },
        upgrade: {
          type: 'query',
          alert_suppression: { group_by: ['fieldA'] },
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'alert_suppression',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
          expectedFieldDiffValues: {
            base: { group_by: ['fieldA'] },
            current: { group_by: ['fieldB'] },
            target: { group_by: ['fieldA'] },
            merged: { group_by: ['fieldB'] },
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'alert_suppression',
          expectedFieldsAfterUpgrade: { alert_suppression: { group_by: ['fieldB'] } },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'alert_suppression',
          resolvedValue: { group_by: ['fieldD'] },
          expectedFieldsAfterUpgrade: { alert_suppression: { group_by: ['fieldD'] } },
        },
        getService
      );
    });

    describe('customized with the matching upgrade (ABB diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          alert_suppression: { group_by: ['fieldA'] },
        },
        patch: {
          alert_suppression: { group_by: ['fieldB'] },
        },
        upgrade: {
          type: 'query',
          alert_suppression: { group_by: ['fieldB'] },
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'alert_suppression',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
          expectedFieldDiffValues: {
            base: { group_by: ['fieldA'] },
            current: { group_by: ['fieldB'] },
            target: { group_by: ['fieldB'] },
            merged: { group_by: ['fieldB'] },
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'alert_suppression',
          expectedFieldsAfterUpgrade: { alert_suppression: { group_by: ['fieldB'] } },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'alert_suppression',
          resolvedValue: { group_by: ['fieldD'] },
          expectedFieldsAfterUpgrade: { alert_suppression: { group_by: ['fieldD'] } },
        },
        getService
      );
    });

    describe('customized with an upgrade resulting in a conflict (ABC diff case, non-solvable conflict)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          alert_suppression: { group_by: ['fieldA'] },
        },
        patch: {
          alert_suppression: { group_by: ['fieldB'] },
        },
        upgrade: {
          type: 'query',
          alert_suppression: { group_by: ['fieldC'] },
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'alert_suppression',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
          isSolvableConflict: false,
          expectedFieldDiffValues: {
            base: { group_by: ['fieldA'] },
            current: { group_by: ['fieldB'] },
            target: { group_by: ['fieldC'] },
            merged: { group_by: ['fieldB'] },
          },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'alert_suppression',
          resolvedValue: { group_by: ['fieldD'] },
          expectedFieldsAfterUpgrade: { alert_suppression: { group_by: ['fieldD'] } },
        },
        getService
      );
    });

    describe('without historical versions', () => {
      describe('customized with the matching upgrade (-AA diff case)', () => {
        const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
          installed: {
            type: 'query',
            alert_suppression: { group_by: ['fieldA'] },
          },
          patch: {
            alert_suppression: { group_by: ['fieldB'] },
          },
          upgrade: {
            type: 'query',
            alert_suppression: { group_by: ['fieldB'] },
          },
          removeInstalledAssets: true,
        };

        testFieldUpgradeReview(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'alert_suppression',
            expectedDiffOutcome: ThreeWayDiffOutcome.MissingBaseNoUpdate,
          },
          getService
        );

        testFieldUpgradesToResolvedValue(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'alert_suppression',
            resolvedValue: { group_by: ['fieldD'] },
            expectedFieldsAfterUpgrade: { alert_suppression: { group_by: ['fieldD'] } },
          },
          getService
        );
      });

      describe('customized with an upgrade (-AB diff case)', () => {
        const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
          installed: {
            type: 'query',
            alert_suppression: { group_by: ['fieldA'] },
          },
          patch: {
            alert_suppression: { group_by: ['fieldB'] },
          },
          upgrade: {
            type: 'query',
            alert_suppression: { group_by: ['fieldC'] },
          },
          removeInstalledAssets: true,
        };

        testFieldUpgradeReview(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'alert_suppression',
            expectedDiffOutcome: ThreeWayDiffOutcome.MissingBaseCanUpdate,
            expectedFieldDiffValues: {
              current: { group_by: ['fieldB'] },
              target: { group_by: ['fieldC'] },
              merged: { group_by: ['fieldC'] },
            },
          },
          getService
        );

        testFieldUpgradesToResolvedValue(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'alert_suppression',
            resolvedValue: { group_by: ['fieldD'] },
            expectedFieldsAfterUpgrade: { alert_suppression: { group_by: ['fieldD'] } },
          },
          getService
        );
      });
    });
  });
}
