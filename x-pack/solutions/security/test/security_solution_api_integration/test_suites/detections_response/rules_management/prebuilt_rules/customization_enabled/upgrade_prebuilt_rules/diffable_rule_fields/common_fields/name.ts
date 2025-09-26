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

export function nameField({ getService }: FtrProviderContext): void {
  describe('"name"', () => {
    describe('non-customized without an upgrade (AAA diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          name: 'Original name',
        },
        patch: {},
        upgrade: {
          type: 'query',
          name: 'Original name',
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'name',
          expectedDiffOutcome: ThreeWayDiffOutcome.StockValueNoUpdate,
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'name',
          resolvedValue: 'Resolved name',
          expectedFieldsAfterUpgrade: { name: 'Resolved name' },
        },
        getService
      );
    });

    describe('non-customized with an upgrade (AAB diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          name: 'Original name',
        },
        patch: {},
        upgrade: {
          type: 'query',
          name: 'Updated name',
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'name',
          expectedDiffOutcome: ThreeWayDiffOutcome.StockValueCanUpdate,
          expectedFieldDiffValues: {
            base: 'Original name',
            current: 'Original name',
            target: 'Updated name',
            merged: 'Updated name',
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'name',
          expectedFieldsAfterUpgrade: { name: 'Updated name' },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'name',
          resolvedValue: 'Resolved name',
          expectedFieldsAfterUpgrade: { name: 'Resolved name' },
        },
        getService
      );
    });

    describe('customized without an upgrade (ABA diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          name: 'Original name',
        },
        patch: {
          name: 'Customized name',
        },
        upgrade: {
          type: 'query',
          name: 'Original name',
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'name',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
          expectedFieldDiffValues: {
            base: 'Original name',
            current: 'Customized name',
            target: 'Original name',
            merged: 'Customized name',
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'name',
          expectedFieldsAfterUpgrade: { name: 'Customized name' },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'name',
          resolvedValue: 'Resolved name',
          expectedFieldsAfterUpgrade: { name: 'Resolved name' },
        },
        getService
      );
    });

    describe('customized with the matching upgrade (ABB diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          name: 'Original name',
        },
        patch: {
          name: 'Updated name',
        },
        upgrade: {
          type: 'query',
          name: 'Updated name',
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'name',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
          expectedFieldDiffValues: {
            base: 'Original name',
            current: 'Updated name',
            target: 'Updated name',
            merged: 'Updated name',
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'name',
          expectedFieldsAfterUpgrade: { name: 'Updated name' },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'name',
          resolvedValue: 'Resolved name',
          expectedFieldsAfterUpgrade: { name: 'Resolved name' },
        },
        getService
      );
    });

    describe('customized with an upgrade resulting in a conflict (ABC diff case, non-solvable conflict)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          name: 'Original name',
        },
        patch: {
          name: 'Customized name',
        },
        upgrade: {
          type: 'query',
          name: 'Updated name',
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'name',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
          isSolvableConflict: false,
          expectedFieldDiffValues: {
            base: 'Original name',
            current: 'Customized name',
            target: 'Updated name',
            merged: 'Customized name',
          },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'name',
          resolvedValue: 'Resolved name',
          expectedFieldsAfterUpgrade: { name: 'Resolved name' },
        },
        getService
      );
    });

    describe('without historical versions', () => {
      describe('customized with the matching upgrade (-AA diff case)', () => {
        const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
          installed: {
            type: 'query',
            name: 'Original name',
          },
          patch: {
            name: 'Updated name',
          },
          upgrade: {
            type: 'query',
            name: 'Updated name',
          },
          removeInstalledAssets: true,
        };

        testFieldUpgradeReview(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'name',
            expectedDiffOutcome: ThreeWayDiffOutcome.MissingBaseNoUpdate,
          },
          getService
        );

        testFieldUpgradesToResolvedValue(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'name',
            resolvedValue: 'Resolved name',
            expectedFieldsAfterUpgrade: { name: 'Resolved name' },
          },
          getService
        );
      });

      describe('customized with an upgrade (-AB diff case)', () => {
        const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
          installed: {
            type: 'query',
            name: 'Original name',
          },
          patch: {
            name: 'Customized name',
          },
          upgrade: {
            type: 'query',
            name: 'Updated name',
          },
          removeInstalledAssets: true,
        };

        testFieldUpgradeReview(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'name',
            expectedDiffOutcome: ThreeWayDiffOutcome.MissingBaseCanUpdate,
            expectedFieldDiffValues: {
              current: 'Customized name',
              target: 'Updated name',
              merged: 'Updated name',
            },
          },
          getService
        );

        testFieldUpgradesToResolvedValue(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'name',
            resolvedValue: 'Resolved name',
            expectedFieldsAfterUpgrade: { name: 'Resolved name' },
          },
          getService
        );
      });
    });
  });
}
