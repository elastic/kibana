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

export function referencesField({ getService }: FtrProviderContext): void {
  describe('"references"', () => {
    describe('non-customized without an upgrade (AAA diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          references: ['http://url-1'],
        },
        patch: {},
        upgrade: {
          type: 'query',
          references: ['http://url-1'],
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'references',
          expectedDiffOutcome: ThreeWayDiffOutcome.StockValueNoUpdate,
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'references',
          resolvedValue: ['https://resolved'],
          expectedFieldsAfterUpgrade: { references: ['https://resolved'] },
        },
        getService
      );
    });

    describe('non-customized with an upgrade (AAB diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          references: ['http://url-1'],
        },
        patch: {},
        upgrade: {
          type: 'query',
          references: ['http://url-1', 'http://url-2'],
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'references',
          expectedDiffOutcome: ThreeWayDiffOutcome.StockValueCanUpdate,
          expectedFieldDiffValues: {
            base: ['http://url-1'],
            current: ['http://url-1'],
            target: ['http://url-1', 'http://url-2'],
            merged: ['http://url-1', 'http://url-2'],
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'references',
          expectedFieldsAfterUpgrade: { references: ['http://url-1', 'http://url-2'] },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'references',
          resolvedValue: ['https://resolved'],
          expectedFieldsAfterUpgrade: { references: ['https://resolved'] },
        },
        getService
      );
    });

    describe('customized without an upgrade (ABA diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          references: ['http://url-1'],
        },
        patch: {
          references: ['http://url-2'],
        },
        upgrade: {
          type: 'query',
          references: ['http://url-1'],
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'references',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
          expectedFieldDiffValues: {
            base: ['http://url-1'],
            current: ['http://url-2'],
            target: ['http://url-1'],
            merged: ['http://url-2'],
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'references',
          expectedFieldsAfterUpgrade: { references: ['http://url-2'] },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'references',
          resolvedValue: ['https://resolved'],
          expectedFieldsAfterUpgrade: { references: ['https://resolved'] },
        },
        getService
      );
    });

    describe('customized with the matching upgrade (ABB diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          references: ['http://url-1'],
        },
        patch: {
          references: ['http://url-1', 'http://url-2'],
        },
        upgrade: {
          type: 'query',
          references: ['http://url-1', 'http://url-2'],
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'references',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
          expectedFieldDiffValues: {
            base: ['http://url-1'],
            current: ['http://url-1', 'http://url-2'],
            target: ['http://url-1', 'http://url-2'],
            merged: ['http://url-1', 'http://url-2'],
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'references',
          expectedFieldsAfterUpgrade: { references: ['http://url-1', 'http://url-2'] },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'references',
          resolvedValue: ['https://resolved'],
          expectedFieldsAfterUpgrade: { references: ['https://resolved'] },
        },
        getService
      );
    });

    describe('customized with an upgrade resulting in a conflict (ABC diff case, solvable conflict)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          references: ['http://url-1'],
        },
        patch: {
          references: ['http://url-2'],
        },
        upgrade: {
          type: 'query',
          references: ['http://url-1', 'http://url-3'],
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'references',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
          isSolvableConflict: true,
          expectedFieldDiffValues: {
            base: ['http://url-1'],
            current: ['http://url-2'],
            target: ['http://url-1', 'http://url-3'],
            merged: ['http://url-2', 'http://url-3'],
          },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'references',
          resolvedValue: ['https://resolved'],
          expectedFieldsAfterUpgrade: { references: ['https://resolved'] },
        },
        getService
      );
    });

    describe('without historical versions', () => {
      describe('customized with the matching upgrade (-AA diff case)', () => {
        const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
          installed: {
            type: 'query',
            references: ['http://url-1'],
          },
          patch: {
            references: ['http://url-2'],
          },
          upgrade: {
            type: 'query',
            references: ['http://url-2'],
          },
          removeInstalledAssets: true,
        };

        testFieldUpgradeReview(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'references',
            expectedDiffOutcome: ThreeWayDiffOutcome.MissingBaseNoUpdate,
          },
          getService
        );

        testFieldUpgradesToResolvedValue(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'references',
            resolvedValue: ['https://resolved'],
            expectedFieldsAfterUpgrade: { references: ['https://resolved'] },
          },
          getService
        );
      });

      describe('customized with an upgrade (-AB diff case)', () => {
        const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
          installed: {
            type: 'query',
            references: ['http://url-1'],
          },
          patch: {
            references: ['http://url-3'],
          },
          upgrade: {
            type: 'query',
            references: ['http://url-1', 'http://url-2'],
          },
          removeInstalledAssets: true,
        };

        testFieldUpgradeReview(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'references',
            expectedDiffOutcome: ThreeWayDiffOutcome.MissingBaseCanUpdate,
            isMergableField: false,
            expectedFieldDiffValues: {
              current: ['http://url-3'],
              target: ['http://url-1', 'http://url-2'],
              merged: ['http://url-1', 'http://url-2'],
            },
          },
          getService
        );

        testFieldUpgradesToResolvedValue(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'references',
            resolvedValue: ['https://resolved'],
            expectedFieldsAfterUpgrade: { references: ['https://resolved'] },
          },
          getService
        );
      });
    });
  });
}
