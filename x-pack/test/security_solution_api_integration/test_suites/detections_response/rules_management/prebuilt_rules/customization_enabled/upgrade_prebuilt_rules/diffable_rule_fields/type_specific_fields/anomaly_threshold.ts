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

export function anomalyThresholdField({ getService }: FtrProviderContext): void {
  describe('"anomaly_threshold"', () => {
    describe('non-customized without an upgrade (AAA diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'machine_learning',
          anomaly_threshold: 10,
        },
        patch: {},
        upgrade: {
          type: 'machine_learning',
          anomaly_threshold: 10,
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'anomaly_threshold',
          expectedDiffOutcome: ThreeWayDiffOutcome.StockValueNoUpdate,
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'anomaly_threshold',
          resolvedValue: 30,
          expectedFieldsAfterUpgrade: { anomaly_threshold: 30 },
        },
        getService
      );
    });

    describe('non-customized with an upgrade (AAB diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'machine_learning',
          anomaly_threshold: 10,
        },
        patch: {},
        upgrade: {
          type: 'machine_learning',
          anomaly_threshold: 20,
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'anomaly_threshold',
          expectedDiffOutcome: ThreeWayDiffOutcome.StockValueCanUpdate,
          expectedFieldDiffValues: {
            base: 10,
            current: 10,
            target: 20,
            merged: 20,
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'anomaly_threshold',
          expectedFieldsAfterUpgrade: { anomaly_threshold: 20 },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'anomaly_threshold',
          resolvedValue: 30,
          expectedFieldsAfterUpgrade: { anomaly_threshold: 30 },
        },
        getService
      );
    });

    describe('customized without an upgrade (ABA diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'machine_learning',
          anomaly_threshold: 10,
        },
        patch: {
          type: 'machine_learning',
          anomaly_threshold: 20,
        },
        upgrade: {
          type: 'machine_learning',
          anomaly_threshold: 10,
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'anomaly_threshold',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
          expectedFieldDiffValues: {
            base: 10,
            current: 20,
            target: 10,
            merged: 20,
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'anomaly_threshold',
          expectedFieldsAfterUpgrade: { anomaly_threshold: 20 },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'anomaly_threshold',
          resolvedValue: 30,
          expectedFieldsAfterUpgrade: { anomaly_threshold: 30 },
        },
        getService
      );
    });

    describe('customized with the matching upgrade (ABB diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'machine_learning',
          anomaly_threshold: 10,
        },
        patch: {
          type: 'machine_learning',
          anomaly_threshold: 20,
        },
        upgrade: {
          type: 'machine_learning',
          anomaly_threshold: 20,
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'anomaly_threshold',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
          expectedFieldDiffValues: {
            base: 10,
            current: 20,
            target: 20,
            merged: 20,
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'anomaly_threshold',
          expectedFieldsAfterUpgrade: { anomaly_threshold: 20 },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'anomaly_threshold',
          resolvedValue: 30,
          expectedFieldsAfterUpgrade: { anomaly_threshold: 30 },
        },
        getService
      );
    });

    describe('customized with an upgrade resulting in a conflict (ABC diff case, non-solvable conflict)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'machine_learning',
          anomaly_threshold: 10,
        },
        patch: {
          type: 'machine_learning',
          anomaly_threshold: 20,
        },
        upgrade: {
          type: 'machine_learning',
          anomaly_threshold: 30,
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'anomaly_threshold',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
          isSolvableConflict: false,
          expectedFieldDiffValues: {
            base: 10,
            current: 20,
            target: 30,
            merged: 20,
          },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'anomaly_threshold',
          resolvedValue: 50,
          expectedFieldsAfterUpgrade: { anomaly_threshold: 50 },
        },
        getService
      );
    });

    describe('without historical versions', () => {
      describe('customized with the matching upgrade (-AA diff case)', () => {
        const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
          installed: {
            type: 'machine_learning',
            anomaly_threshold: 10,
          },
          patch: {
            type: 'machine_learning',
            anomaly_threshold: 20,
          },
          upgrade: {
            type: 'machine_learning',
            anomaly_threshold: 20,
          },
          removeInstalledAssets: true,
        };

        testFieldUpgradeReview(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'anomaly_threshold',
            expectedDiffOutcome: ThreeWayDiffOutcome.MissingBaseNoUpdate,
          },
          getService
        );

        testFieldUpgradesToResolvedValue(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'anomaly_threshold',
            resolvedValue: 50,
            expectedFieldsAfterUpgrade: { anomaly_threshold: 50 },
          },
          getService
        );
      });

      describe('customized with an upgrade (-AB diff case)', () => {
        const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
          installed: {
            type: 'machine_learning',
            anomaly_threshold: 10,
          },
          patch: {
            type: 'machine_learning',
            anomaly_threshold: 20,
          },
          upgrade: {
            type: 'machine_learning',
            anomaly_threshold: 30,
          },
          removeInstalledAssets: true,
        };

        testFieldUpgradeReview(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'anomaly_threshold',
            expectedDiffOutcome: ThreeWayDiffOutcome.MissingBaseCanUpdate,
            expectedFieldDiffValues: {
              current: 20,
              target: 30,
              merged: 30,
            },
          },
          getService
        );

        testFieldUpgradesToResolvedValue(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'anomaly_threshold',
            resolvedValue: 50,
            expectedFieldsAfterUpgrade: { anomaly_threshold: 50 },
          },
          getService
        );
      });
    });
  });
}
