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

export function descriptionField({ getService }: FtrProviderContext): void {
  describe('"description"', () => {
    describe('non-customized without an upgrade (AAA diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          description: 'Original description line 1\nOriginal description line 2',
        },
        patch: {},
        upgrade: {
          type: 'query',
          description: 'Original description line 1\nOriginal description line 2',
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'description',
          expectedDiffOutcome: ThreeWayDiffOutcome.StockValueNoUpdate,
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'description',
          resolvedValue: 'Resolved description',
          expectedFieldsAfterUpgrade: { description: 'Resolved description' },
        },
        getService
      );
    });

    describe('non-customized with an upgrade (AAB diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          description: 'Original description line 1\nOriginal description line 2',
        },
        patch: {},
        upgrade: {
          type: 'query',
          description: 'Original description line 1\nOriginal description line 3',
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'description',
          expectedDiffOutcome: ThreeWayDiffOutcome.StockValueCanUpdate,
          expectedFieldDiffValues: {
            base: 'Original description line 1\nOriginal description line 2',
            current: 'Original description line 1\nOriginal description line 2',
            target: 'Original description line 1\nOriginal description line 3',
            merged: 'Original description line 1\nOriginal description line 3',
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'description',
          expectedFieldsAfterUpgrade: {
            description: 'Original description line 1\nOriginal description line 3',
          },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'description',
          resolvedValue: 'Resolved description',
          expectedFieldsAfterUpgrade: { description: 'Resolved description' },
        },
        getService
      );
    });

    describe('customized without an upgrade (ABA diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          description: 'Original description line 1\nOriginal description line 2',
        },
        patch: {
          description:
            'Customized description\nOriginal description line 1\nOriginal description line 2',
        },
        upgrade: {
          type: 'query',
          description: 'Original description line 1\nOriginal description line 2',
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'description',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
          expectedFieldDiffValues: {
            base: 'Original description line 1\nOriginal description line 2',
            current:
              'Customized description\nOriginal description line 1\nOriginal description line 2',
            target: 'Original description line 1\nOriginal description line 2',
            merged:
              'Customized description\nOriginal description line 1\nOriginal description line 2',
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'description',
          expectedFieldsAfterUpgrade: {
            description:
              'Customized description\nOriginal description line 1\nOriginal description line 2',
          },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'description',
          resolvedValue: 'Resolved description',
          expectedFieldsAfterUpgrade: { description: 'Resolved description' },
        },
        getService
      );
    });

    describe('customized with the matching upgrade (ABB diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          description: 'Original description',
        },
        patch: {
          description: 'Updated description',
        },
        upgrade: {
          type: 'query',
          description: 'Updated description',
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'description',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
          expectedFieldDiffValues: {
            base: 'Original description',
            current: 'Updated description',
            target: 'Updated description',
            merged: 'Updated description',
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'description',
          expectedFieldsAfterUpgrade: { description: 'Updated description' },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'description',
          resolvedValue: 'Resolved description',
          expectedFieldsAfterUpgrade: { description: 'Resolved description' },
        },
        getService
      );
    });

    describe('customized with an upgrade resulting in a conflict (ABC diff case, solvable conflict)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          description: 'Original description line 1\nOriginal description line 2',
        },
        patch: {
          description:
            'Customized description\nOriginal description line 1\nOriginal description line 2',
        },
        upgrade: {
          type: 'query',
          description: 'Original description line 1\nOriginal description line 3',
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'description',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
          isSolvableConflict: true,
          expectedFieldDiffValues: {
            base: 'Original description line 1\nOriginal description line 2',
            current:
              'Customized description\nOriginal description line 1\nOriginal description line 2',
            target: 'Original description line 1\nOriginal description line 3',
            merged:
              'Customized description\nOriginal description line 1\nOriginal description line 3',
          },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'description',
          resolvedValue: 'Resolved description',
          expectedFieldsAfterUpgrade: { description: 'Resolved description' },
        },
        getService
      );
    });

    describe('without historical versions', () => {
      describe('customized with the matching upgrade (-AA diff case)', () => {
        const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
          installed: {
            type: 'query',
            description: 'Original description',
          },
          patch: {
            description: 'Updated description',
          },
          upgrade: {
            type: 'query',
            description: 'Updated description',
          },
          removeInstalledAssets: true,
        };

        testFieldUpgradeReview(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'description',
            expectedDiffOutcome: ThreeWayDiffOutcome.MissingBaseNoUpdate,
          },
          getService
        );

        testFieldUpgradesToResolvedValue(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'description',
            resolvedValue: 'Resolved description',
            expectedFieldsAfterUpgrade: { description: 'Resolved description' },
          },
          getService
        );
      });

      describe('customized with an upgrade (-AB diff case)', () => {
        const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
          installed: {
            type: 'query',
            description: 'Original description',
          },
          patch: {
            description: 'Customized description',
          },
          upgrade: {
            type: 'query',
            description: 'Updated description',
          },
          removeInstalledAssets: true,
        };

        testFieldUpgradeReview(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'description',
            expectedDiffOutcome: ThreeWayDiffOutcome.MissingBaseCanUpdate,
            expectedFieldDiffValues: {
              current: 'Customized description',
              target: 'Updated description',
              merged: 'Updated description',
            },
          },
          getService
        );

        testFieldUpgradesToResolvedValue(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'description',
            resolvedValue: 'Resolved description',
            expectedFieldsAfterUpgrade: { description: 'Resolved description' },
          },
          getService
        );
      });
    });
  });
}
