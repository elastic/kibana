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

export function setupField({ getService }: FtrProviderContext): void {
  describe('"setup"', () => {
    describe('non-customized without an upgrade (AAA diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          setup: 'some setup',
        },
        patch: {},
        upgrade: {
          type: 'query',
          setup: 'some setup',
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'setup',
          expectedDiffOutcome: ThreeWayDiffOutcome.StockValueNoUpdate,
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'setup',
          resolvedValue: 'Resolved setup',
          expectedFieldsAfterUpgrade: { setup: 'Resolved setup' },
        },
        getService
      );
    });

    describe('non-customized with an upgrade (AAB diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          setup: 'some setup',
        },
        patch: {},
        upgrade: {
          type: 'query',
          setup: 'updated setup',
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'setup',
          expectedDiffOutcome: ThreeWayDiffOutcome.StockValueCanUpdate,
          expectedFieldDiffValues: {
            base: 'some setup',
            current: 'some setup',
            target: 'updated setup',
            merged: 'updated setup',
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'setup',
          expectedFieldsAfterUpgrade: { setup: 'updated setup' },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'setup',
          resolvedValue: 'Resolved setup',
          expectedFieldsAfterUpgrade: { setup: 'Resolved setup' },
        },
        getService
      );
    });

    describe('customized without an upgrade (ABA diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          setup: 'some setup',
        },
        patch: {
          setup: 'customized setup',
        },
        upgrade: {
          type: 'query',
          setup: 'some setup',
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'setup',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
          expectedFieldDiffValues: {
            base: 'some setup',
            current: 'customized setup',
            target: 'some setup',
            merged: 'customized setup',
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'setup',
          expectedFieldsAfterUpgrade: { setup: 'customized setup' },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'setup',
          resolvedValue: 'Resolved setup',
          expectedFieldsAfterUpgrade: { setup: 'Resolved setup' },
        },
        getService
      );
    });

    describe('customized with the matching upgrade (ABB diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          setup: 'some setup',
        },
        patch: {
          setup: 'updated setup',
        },
        upgrade: {
          type: 'query',
          setup: 'updated setup',
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'setup',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
          expectedFieldDiffValues: {
            base: 'some setup',
            current: 'updated setup',
            target: 'updated setup',
            merged: 'updated setup',
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'setup',
          expectedFieldsAfterUpgrade: { setup: 'updated setup' },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'setup',
          resolvedValue: 'Resolved setup',
          expectedFieldsAfterUpgrade: { setup: 'Resolved setup' },
        },
        getService
      );
    });

    describe('customized with an upgrade resulting in a conflict (ABC diff case, solvable conflict)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          setup: 'line 1\nline 2',
        },
        patch: {
          setup: 'Customized line\nline 1\nline 2',
        },
        upgrade: {
          type: 'query',
          setup: 'line 1\nline 3',
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'setup',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
          isSolvableConflict: true,
          expectedFieldDiffValues: {
            base: 'line 1\nline 2',
            current: 'Customized line\nline 1\nline 2',
            target: 'line 1\nline 3',
            merged: 'Customized line\nline 1\nline 3',
          },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'setup',
          resolvedValue: 'Resolved setup',
          expectedFieldsAfterUpgrade: { setup: 'Resolved setup' },
        },
        getService
      );
    });

    describe('without historical versions', () => {
      describe('customized with the matching upgrade (-AA diff case)', () => {
        const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
          installed: {
            type: 'query',
            setup: 'some setup',
          },
          patch: {
            setup: 'updated setup',
          },
          upgrade: {
            type: 'query',
            setup: 'updated setup',
          },
          removeInstalledAssets: true,
        };

        testFieldUpgradeReview(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'setup',
            expectedDiffOutcome: ThreeWayDiffOutcome.MissingBaseNoUpdate,
          },
          getService
        );

        testFieldUpgradesToResolvedValue(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'setup',
            resolvedValue: 'Resolved setup',
            expectedFieldsAfterUpgrade: { setup: 'Resolved setup' },
          },
          getService
        );
      });

      describe('customized with an upgrade (-AB diff case)', () => {
        const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
          installed: {
            type: 'query',
            setup: 'some setup',
          },
          patch: {
            setup: 'customized setup',
          },
          upgrade: {
            type: 'query',
            setup: 'updated setup',
          },
          removeInstalledAssets: true,
        };

        testFieldUpgradeReview(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'setup',
            expectedDiffOutcome: ThreeWayDiffOutcome.MissingBaseCanUpdate,
            expectedFieldDiffValues: {
              current: 'customized setup',
              target: 'updated setup',
              merged: 'updated setup',
            },
          },
          getService
        );

        testFieldUpgradesToResolvedValue(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'setup',
            resolvedValue: 'Resolved setup',
            expectedFieldsAfterUpgrade: { setup: 'Resolved setup' },
          },
          getService
        );
      });
    });
  });
}
