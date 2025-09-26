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

export function historyWindowStartField({ getService }: FtrProviderContext): void {
  describe('"history_window_start"', () => {
    describe('non-customized without an upgrade (AAA diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'new_terms',
          history_window_start: 'now-1h',
        },
        patch: {},
        upgrade: {
          type: 'new_terms',
          history_window_start: 'now-1h',
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'history_window_start',
          expectedDiffOutcome: ThreeWayDiffOutcome.StockValueNoUpdate,
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'history_window_start',
          resolvedValue: 'now-30m',
          expectedFieldsAfterUpgrade: { history_window_start: 'now-30m' },
        },
        getService
      );
    });

    describe('non-customized with an upgrade (AAB diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'new_terms',
          history_window_start: 'now-1h',
        },
        patch: {},
        upgrade: {
          type: 'new_terms',
          history_window_start: 'now-30m',
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'history_window_start',
          expectedDiffOutcome: ThreeWayDiffOutcome.StockValueCanUpdate,
          expectedFieldDiffValues: {
            base: 'now-1h',
            current: 'now-1h',
            target: 'now-30m',
            merged: 'now-30m',
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'history_window_start',
          expectedFieldsAfterUpgrade: { history_window_start: 'now-30m' },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'history_window_start',
          resolvedValue: 'now-2h',
          expectedFieldsAfterUpgrade: { history_window_start: 'now-2h' },
        },
        getService
      );
    });

    describe('customized without an upgrade (ABA diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'new_terms',
          history_window_start: 'now-1h',
        },
        patch: {
          type: 'new_terms',
          history_window_start: 'now-2h',
        },
        upgrade: {
          type: 'new_terms',
          history_window_start: 'now-1h',
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'history_window_start',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
          expectedFieldDiffValues: {
            base: 'now-1h',
            current: 'now-2h',
            target: 'now-1h',
            merged: 'now-2h',
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'history_window_start',
          expectedFieldsAfterUpgrade: { history_window_start: 'now-2h' },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'history_window_start',
          resolvedValue: 'now-5h',
          expectedFieldsAfterUpgrade: { history_window_start: 'now-5h' },
        },
        getService
      );
    });

    describe('customized with the matching upgrade (ABB diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'new_terms',
          history_window_start: 'now-1h',
        },
        patch: {
          type: 'new_terms',
          history_window_start: 'now-2h',
        },
        upgrade: {
          type: 'new_terms',
          history_window_start: 'now-2h',
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'history_window_start',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
          expectedFieldDiffValues: {
            base: 'now-1h',
            current: 'now-2h',
            target: 'now-2h',
            merged: 'now-2h',
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'history_window_start',
          expectedFieldsAfterUpgrade: { history_window_start: 'now-2h' },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'history_window_start',
          resolvedValue: 'now-5h',
          expectedFieldsAfterUpgrade: { history_window_start: 'now-5h' },
        },
        getService
      );
    });

    describe('customized with an upgrade resulting in a conflict (ABC diff case, non-solvable conflict)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'new_terms',
          history_window_start: 'now-1h',
        },
        patch: {
          type: 'new_terms',
          history_window_start: 'now-2h',
        },
        upgrade: {
          type: 'new_terms',
          history_window_start: 'now-30m',
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'history_window_start',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
          isSolvableConflict: false,
          expectedFieldDiffValues: {
            base: 'now-1h',
            current: 'now-2h',
            target: 'now-30m',
            merged: 'now-2h',
          },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'history_window_start',
          resolvedValue: 'now-5h',
          expectedFieldsAfterUpgrade: { history_window_start: 'now-5h' },
        },
        getService
      );
    });

    describe('without historical versions', () => {
      describe('customized with the matching upgrade (-AA diff case)', () => {
        const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
          installed: {
            type: 'new_terms',
            history_window_start: 'now-1h',
          },
          patch: {
            type: 'new_terms',
            history_window_start: 'now-2h',
          },
          upgrade: {
            type: 'new_terms',
            history_window_start: 'now-2h',
          },
          removeInstalledAssets: true,
        };

        testFieldUpgradeReview(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'history_window_start',
            expectedDiffOutcome: ThreeWayDiffOutcome.MissingBaseNoUpdate,
          },
          getService
        );

        testFieldUpgradesToResolvedValue(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'history_window_start',
            resolvedValue: 'now-5h',
            expectedFieldsAfterUpgrade: { history_window_start: 'now-5h' },
          },
          getService
        );
      });

      describe('customized with an upgrade (-AB diff case)', () => {
        const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
          installed: {
            type: 'new_terms',
            history_window_start: 'now-1h',
          },
          patch: {
            type: 'new_terms',
            history_window_start: 'now-2h',
          },
          upgrade: {
            type: 'new_terms',
            history_window_start: 'now-30m',
          },
          removeInstalledAssets: true,
        };

        testFieldUpgradeReview(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'history_window_start',
            expectedDiffOutcome: ThreeWayDiffOutcome.MissingBaseCanUpdate,
            expectedFieldDiffValues: {
              current: 'now-2h',
              target: 'now-30m',
              merged: 'now-30m',
            },
          },
          getService
        );

        testFieldUpgradesToResolvedValue(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'history_window_start',
            resolvedValue: 'now-5h',
            expectedFieldsAfterUpgrade: { history_window_start: 'now-5h' },
          },
          getService
        );
      });
    });
  });
}
