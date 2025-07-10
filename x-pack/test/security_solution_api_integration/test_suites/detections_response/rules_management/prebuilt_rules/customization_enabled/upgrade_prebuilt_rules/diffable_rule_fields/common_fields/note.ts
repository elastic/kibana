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

export function noteField({ getService }: FtrProviderContext): void {
  describe('"note"', () => {
    describe('non-customized without an upgrade (AAA diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          note: 'some note',
        },
        patch: {},
        upgrade: {
          type: 'query',
          note: 'some note',
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'note',
          expectedDiffOutcome: ThreeWayDiffOutcome.StockValueNoUpdate,
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'note',
          resolvedValue: 'Resolved note',
          expectedFieldsAfterUpgrade: { note: 'Resolved note' },
        },
        getService
      );
    });

    describe('non-customized with an upgrade (AAB diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          note: 'some note',
        },
        patch: {},
        upgrade: {
          type: 'query',
          note: 'updated note',
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'note',
          expectedDiffOutcome: ThreeWayDiffOutcome.StockValueCanUpdate,
          expectedFieldDiffValues: {
            base: 'some note',
            current: 'some note',
            target: 'updated note',
            merged: 'updated note',
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'note',
          expectedFieldsAfterUpgrade: { note: 'updated note' },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'note',
          resolvedValue: 'Resolved note',
          expectedFieldsAfterUpgrade: { note: 'Resolved note' },
        },
        getService
      );
    });

    describe('customized without an upgrade (ABA diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          note: 'some note',
        },
        patch: {
          note: 'customized note',
        },
        upgrade: {
          type: 'query',
          note: 'some note',
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'note',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
          expectedFieldDiffValues: {
            base: 'some note',
            current: 'customized note',
            target: 'some note',
            merged: 'customized note',
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'note',
          expectedFieldsAfterUpgrade: { note: 'customized note' },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'note',
          resolvedValue: 'Resolved note',
          expectedFieldsAfterUpgrade: { note: 'Resolved note' },
        },
        getService
      );
    });

    describe('customized with the matching upgrade (ABB diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          note: 'some note',
        },
        patch: {
          note: 'updated note',
        },
        upgrade: {
          type: 'query',
          note: 'updated note',
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'note',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
          expectedFieldDiffValues: {
            base: 'some note',
            current: 'updated note',
            target: 'updated note',
            merged: 'updated note',
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'note',
          expectedFieldsAfterUpgrade: { note: 'updated note' },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'note',
          resolvedValue: 'Resolved note',
          expectedFieldsAfterUpgrade: { note: 'Resolved note' },
        },
        getService
      );
    });

    describe('customized with an upgrade resulting in a conflict (ABC diff case, solvable conflict)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          note: 'line 1\nline 2',
        },
        patch: {
          note: 'Customized line\nline 1\nline 2',
        },
        upgrade: {
          type: 'query',
          note: 'line 1\nline 3',
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'note',
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
          diffableRuleFieldName: 'note',
          resolvedValue: 'Resolved note',
          expectedFieldsAfterUpgrade: { note: 'Resolved note' },
        },
        getService
      );
    });

    describe('without historical versions', () => {
      describe('customized with the matching upgrade (-AA diff case)', () => {
        const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
          installed: {
            type: 'query',
            note: 'some note',
          },
          patch: {
            note: 'updated note',
          },
          upgrade: {
            type: 'query',
            note: 'updated note',
          },
          removeInstalledAssets: true,
        };

        testFieldUpgradeReview(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'note',
            expectedDiffOutcome: ThreeWayDiffOutcome.MissingBaseNoUpdate,
          },
          getService
        );

        testFieldUpgradesToResolvedValue(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'note',
            resolvedValue: 'Resolved note',
            expectedFieldsAfterUpgrade: { note: 'Resolved note' },
          },
          getService
        );
      });

      describe('customized with an upgrade (-AB diff case)', () => {
        const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
          installed: {
            type: 'query',
            note: 'some note',
          },
          patch: {
            note: 'customized note',
          },
          upgrade: {
            type: 'query',
            note: 'updated note',
          },
          removeInstalledAssets: true,
        };

        testFieldUpgradeReview(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'note',
            expectedDiffOutcome: ThreeWayDiffOutcome.MissingBaseCanUpdate,
            expectedFieldDiffValues: {
              current: 'customized note',
              target: 'updated note',
              merged: 'updated note',
            },
          },
          getService
        );

        testFieldUpgradesToResolvedValue(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'note',
            resolvedValue: 'Resolved note',
            expectedFieldsAfterUpgrade: { note: 'Resolved note' },
          },
          getService
        );
      });
    });
  });
}
