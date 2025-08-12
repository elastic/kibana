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

export function thresholdField({ getService }: FtrProviderContext): void {
  describe('"threshold"', () => {
    describe('non-customized without an upgrade (AAA diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'threshold',
          threshold: { value: 10, field: 'fieldA' },
        },
        patch: {},
        upgrade: {
          type: 'threshold',
          threshold: { value: 10, field: 'fieldA' },
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'threshold',
          expectedDiffOutcome: ThreeWayDiffOutcome.StockValueNoUpdate,
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'threshold',
          resolvedValue: { value: 50, field: 'resolved' },
          expectedFieldsAfterUpgrade: { threshold: { value: 50, field: ['resolved'] } },
        },
        getService
      );
    });

    describe('non-customized with an upgrade (AAB diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'threshold',
          threshold: { value: 10, field: 'fieldA' },
        },
        patch: {},
        upgrade: {
          type: 'threshold',
          threshold: { value: 10, field: 'fieldB' },
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'threshold',
          expectedDiffOutcome: ThreeWayDiffOutcome.StockValueCanUpdate,
          expectedFieldDiffValues: {
            base: { value: 10, field: ['fieldA'] },
            current: { value: 10, field: ['fieldA'] },
            target: { value: 10, field: ['fieldB'] },
            merged: { value: 10, field: ['fieldB'] },
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'threshold',
          expectedFieldsAfterUpgrade: { threshold: { value: 10, field: ['fieldB'] } },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'threshold',
          resolvedValue: { value: 50, field: 'resolved' },
          expectedFieldsAfterUpgrade: { threshold: { value: 50, field: ['resolved'] } },
        },
        getService
      );
    });

    describe('customized without an upgrade (ABA diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'threshold',
          threshold: { value: 10, field: 'fieldA' },
        },
        patch: {
          type: 'threshold',
          threshold: { value: 10, field: 'fieldB' },
        },
        upgrade: {
          type: 'threshold',
          threshold: { value: 10, field: 'fieldA' },
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'threshold',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
          expectedFieldDiffValues: {
            base: { value: 10, field: ['fieldA'] },
            current: { value: 10, field: ['fieldB'] },
            target: { value: 10, field: ['fieldA'] },
            merged: { value: 10, field: ['fieldB'] },
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'threshold',
          expectedFieldsAfterUpgrade: { threshold: { value: 10, field: ['fieldB'] } },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'threshold',
          resolvedValue: { value: 50, field: 'resolved' },
          expectedFieldsAfterUpgrade: { threshold: { value: 50, field: ['resolved'] } },
        },
        getService
      );
    });

    describe('customized with the matching upgrade (ABB diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'threshold',
          threshold: { value: 10, field: 'fieldA' },
        },
        patch: {
          type: 'threshold',
          threshold: { value: 10, field: 'fieldB' },
        },
        upgrade: {
          type: 'threshold',
          threshold: { value: 10, field: 'fieldB' },
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'threshold',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
          expectedFieldDiffValues: {
            base: { value: 10, field: ['fieldA'] },
            current: { value: 10, field: ['fieldB'] },
            target: { value: 10, field: ['fieldB'] },
            merged: { value: 10, field: ['fieldB'] },
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'threshold',
          expectedFieldsAfterUpgrade: { threshold: { value: 10, field: ['fieldB'] } },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'threshold',
          resolvedValue: { value: 50, field: 'resolved' },
          expectedFieldsAfterUpgrade: { threshold: { value: 50, field: ['resolved'] } },
        },
        getService
      );
    });

    describe('customized with an upgrade resulting in a conflict (ABC diff case, non-solvable conflict)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'threshold',
          threshold: { value: 10, field: 'fieldA' },
        },
        patch: {
          type: 'threshold',
          threshold: { value: 10, field: 'fieldB' },
        },
        upgrade: {
          type: 'threshold',
          threshold: { value: 10, field: 'fieldC' },
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'threshold',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
          isSolvableConflict: false,
          expectedFieldDiffValues: {
            base: { value: 10, field: ['fieldA'] },
            current: { value: 10, field: ['fieldB'] },
            target: { value: 10, field: ['fieldC'] },
            merged: { value: 10, field: ['fieldB'] },
          },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'threshold',
          resolvedValue: { value: 50, field: 'resolved' },
          expectedFieldsAfterUpgrade: { threshold: { value: 50, field: ['resolved'] } },
        },
        getService
      );
    });

    describe('without historical versions', () => {
      describe('customized with the matching upgrade (-AA diff case)', () => {
        const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
          installed: {
            type: 'threshold',
            threshold: { value: 10, field: 'fieldA' },
          },
          patch: {
            type: 'threshold',
            threshold: { value: 10, field: 'fieldB' },
          },
          upgrade: {
            type: 'threshold',
            threshold: { value: 10, field: 'fieldB' },
          },
          removeInstalledAssets: true,
        };

        testFieldUpgradeReview(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'threshold',
            expectedDiffOutcome: ThreeWayDiffOutcome.MissingBaseNoUpdate,
          },
          getService
        );

        testFieldUpgradesToResolvedValue(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'threshold',
            resolvedValue: { value: 50, field: 'resolved' },
            expectedFieldsAfterUpgrade: { threshold: { value: 50, field: ['resolved'] } },
          },
          getService
        );
      });

      describe('customized with an upgrade (-AB diff case)', () => {
        const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
          installed: {
            type: 'threshold',
            threshold: { value: 10, field: 'fieldA' },
          },
          patch: {
            type: 'threshold',
            threshold: { value: 10, field: 'fieldB' },
          },
          upgrade: {
            type: 'threshold',
            threshold: { value: 10, field: 'fieldC' },
          },
          removeInstalledAssets: true,
        };

        testFieldUpgradeReview(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'threshold',
            expectedDiffOutcome: ThreeWayDiffOutcome.MissingBaseCanUpdate,
            expectedFieldDiffValues: {
              current: { value: 10, field: ['fieldB'] },
              target: { value: 10, field: ['fieldC'] },
              merged: { value: 10, field: ['fieldC'] },
            },
          },
          getService
        );

        testFieldUpgradesToResolvedValue(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'threshold',
            resolvedValue: { value: 50, field: 'resolved' },
            expectedFieldsAfterUpgrade: { threshold: { value: 50, field: ['resolved'] } },
          },
          getService
        );
      });
    });
  });
}
