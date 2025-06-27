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

export function falsePositivesField({ getService }: FtrProviderContext): void {
  describe('"false_positives"', () => {
    describe('non-customized without an upgrade (AAA diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          false_positives: ['example1'],
        },
        patch: {},
        upgrade: {
          type: 'query',
          false_positives: ['example1'],
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'false_positives',
          expectedDiffOutcome: ThreeWayDiffOutcome.StockValueNoUpdate,
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'false_positives',
          resolvedValue: ['resolved'],
          expectedFieldsAfterUpgrade: { false_positives: ['resolved'] },
        },
        getService
      );
    });

    describe('non-customized with an upgrade (AAB diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          false_positives: ['example1'],
        },
        patch: {},
        upgrade: {
          type: 'query',
          false_positives: ['example2'],
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'false_positives',
          expectedDiffOutcome: ThreeWayDiffOutcome.StockValueCanUpdate,
          expectedFieldDiffValues: {
            base: ['example1'],
            current: ['example1'],
            target: ['example2'],
            merged: ['example2'],
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'false_positives',
          expectedFieldsAfterUpgrade: { false_positives: ['example2'] },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'false_positives',
          resolvedValue: ['resolved'],
          expectedFieldsAfterUpgrade: { false_positives: ['resolved'] },
        },
        getService
      );
    });

    describe('customized without an upgrade (ABA diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          false_positives: ['example1'],
        },
        patch: {
          false_positives: ['example3'],
        },
        upgrade: {
          type: 'query',
          false_positives: ['example1'],
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'false_positives',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
          expectedFieldDiffValues: {
            base: ['example1'],
            current: ['example3'],
            target: ['example1'],
            merged: ['example3'],
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'false_positives',
          expectedFieldsAfterUpgrade: { false_positives: ['example3'] },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'false_positives',
          resolvedValue: ['resolved'],
          expectedFieldsAfterUpgrade: { false_positives: ['resolved'] },
        },
        getService
      );
    });

    describe('customized with the matching upgrade (ABB diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          false_positives: ['example1'],
        },
        patch: {
          false_positives: ['example2'],
        },
        upgrade: {
          type: 'query',
          false_positives: ['example2'],
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'false_positives',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
          expectedFieldDiffValues: {
            base: ['example1'],
            current: ['example2'],
            target: ['example2'],
            merged: ['example2'],
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'false_positives',
          expectedFieldsAfterUpgrade: { false_positives: ['example2'] },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'false_positives',
          resolvedValue: ['resolved'],
          expectedFieldsAfterUpgrade: { false_positives: ['resolved'] },
        },
        getService
      );
    });

    describe('customized with an upgrade resulting in a conflict (ABC diff case, non-solvable conflict)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          false_positives: ['example1'],
        },
        patch: {
          false_positives: ['example2'],
        },
        upgrade: {
          type: 'query',
          false_positives: ['example3'],
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'false_positives',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
          isSolvableConflict: false,
          expectedFieldDiffValues: {
            base: ['example1'],
            current: ['example2'],
            target: ['example3'],
            merged: ['example2'],
          },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'false_positives',
          resolvedValue: ['resolved'],
          expectedFieldsAfterUpgrade: { false_positives: ['resolved'] },
        },
        getService
      );
    });

    describe('without historical versions', () => {
      describe('customized with the matching upgrade (-AA diff case)', () => {
        const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
          installed: {
            type: 'query',
            false_positives: ['example1'],
          },
          patch: {
            false_positives: ['example2'],
          },
          upgrade: {
            type: 'query',
            false_positives: ['example2'],
          },
          removeInstalledAssets: true,
        };

        testFieldUpgradeReview(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'false_positives',
            expectedDiffOutcome: ThreeWayDiffOutcome.MissingBaseNoUpdate,
          },
          getService
        );

        testFieldUpgradesToResolvedValue(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'false_positives',
            resolvedValue: ['resolved'],
            expectedFieldsAfterUpgrade: { false_positives: ['resolved'] },
          },
          getService
        );
      });

      describe('customized with an upgrade (-AB diff case)', () => {
        const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
          installed: {
            type: 'query',
            false_positives: ['example1'],
          },
          patch: {
            false_positives: ['example2'],
          },
          upgrade: {
            type: 'query',
            false_positives: ['example3'],
          },
          removeInstalledAssets: true,
        };

        testFieldUpgradeReview(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'false_positives',
            expectedDiffOutcome: ThreeWayDiffOutcome.MissingBaseCanUpdate,
            expectedFieldDiffValues: {
              current: ['example2'],
              target: ['example3'],
              merged: ['example3'],
            },
          },
          getService
        );

        testFieldUpgradesToResolvedValue(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'false_positives',
            resolvedValue: ['resolved'],
            expectedFieldsAfterUpgrade: { false_positives: ['resolved'] },
          },
          getService
        );
      });
    });
  });
}
