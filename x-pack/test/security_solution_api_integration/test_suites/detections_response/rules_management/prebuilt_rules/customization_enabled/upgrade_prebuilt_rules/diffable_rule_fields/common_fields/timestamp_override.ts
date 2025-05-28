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

export function timestampOverrideField({ getService }: FtrProviderContext): void {
  describe('"timestamp_override"', () => {
    describe('non-customized without an upgrade (AAA diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          timestamp_override: 'fieldA',
        },
        patch: {},
        upgrade: {
          type: 'query',
          timestamp_override: 'fieldA',
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'timestamp_override',
          expectedDiffOutcome: ThreeWayDiffOutcome.StockValueNoUpdate,
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'timestamp_override',
          resolvedValue: { field_name: 'resolved', fallback_disabled: false },
          expectedFieldsAfterUpgrade: { timestamp_override: 'resolved' },
        },
        getService
      );
    });

    describe('non-customized with an upgrade (AAB diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          timestamp_override: 'fieldA',
        },
        patch: {},
        upgrade: {
          type: 'query',
          timestamp_override: 'fieldB',
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'timestamp_override',
          expectedDiffOutcome: ThreeWayDiffOutcome.StockValueCanUpdate,
          expectedFieldDiffValues: {
            base: { field_name: 'fieldA', fallback_disabled: false },
            current: { field_name: 'fieldA', fallback_disabled: false },
            target: { field_name: 'fieldB', fallback_disabled: false },
            merged: { field_name: 'fieldB', fallback_disabled: false },
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'timestamp_override',
          expectedFieldsAfterUpgrade: { timestamp_override: 'fieldB' },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'timestamp_override',
          resolvedValue: { field_name: 'resolved', fallback_disabled: false },
          expectedFieldsAfterUpgrade: { timestamp_override: 'resolved' },
        },
        getService
      );
    });

    describe('customized without an upgrade (ABA diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          timestamp_override: 'fieldA',
        },
        patch: {
          timestamp_override: 'fieldB',
        },
        upgrade: {
          type: 'query',
          timestamp_override: 'fieldA',
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'timestamp_override',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
          expectedFieldDiffValues: {
            base: { field_name: 'fieldA', fallback_disabled: false },
            current: { field_name: 'fieldB', fallback_disabled: false },
            target: { field_name: 'fieldA', fallback_disabled: false },
            merged: { field_name: 'fieldB', fallback_disabled: false },
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'timestamp_override',
          expectedFieldsAfterUpgrade: { timestamp_override: 'fieldB' },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'timestamp_override',
          resolvedValue: { field_name: 'resolved', fallback_disabled: false },
          expectedFieldsAfterUpgrade: { timestamp_override: 'resolved' },
        },
        getService
      );
    });

    describe('customized with the matching upgrade (ABB diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          timestamp_override: 'fieldA',
        },
        patch: {
          timestamp_override: 'fieldB',
        },
        upgrade: {
          type: 'query',
          timestamp_override: 'fieldB',
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'timestamp_override',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
          expectedFieldDiffValues: {
            base: { field_name: 'fieldA', fallback_disabled: false },
            current: { field_name: 'fieldB', fallback_disabled: false },
            target: { field_name: 'fieldB', fallback_disabled: false },
            merged: { field_name: 'fieldB', fallback_disabled: false },
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'timestamp_override',
          expectedFieldsAfterUpgrade: { timestamp_override: 'fieldB' },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'timestamp_override',
          resolvedValue: { field_name: 'resolved', fallback_disabled: false },
          expectedFieldsAfterUpgrade: { timestamp_override: 'resolved' },
        },
        getService
      );
    });

    describe('customized with an upgrade resulting in a conflict (ABC diff case, non-solvable conflict)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          timestamp_override: 'fieldA',
        },
        patch: {
          timestamp_override: 'fieldB',
        },
        upgrade: {
          type: 'query',
          timestamp_override: 'fieldC',
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'timestamp_override',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
          isSolvableConflict: false,
          expectedFieldDiffValues: {
            base: { field_name: 'fieldA', fallback_disabled: false },
            current: { field_name: 'fieldB', fallback_disabled: false },
            target: { field_name: 'fieldC', fallback_disabled: false },
            merged: { field_name: 'fieldB', fallback_disabled: false },
          },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'timestamp_override',
          resolvedValue: { field_name: 'resolved', fallback_disabled: false },
          expectedFieldsAfterUpgrade: { timestamp_override: 'resolved' },
        },
        getService
      );
    });

    describe('without historical versions', () => {
      describe('customized with the matching upgrade (-AA diff case)', () => {
        const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
          installed: {
            type: 'query',
            timestamp_override: 'fieldA',
          },
          patch: {
            timestamp_override: 'fieldB',
          },
          upgrade: {
            type: 'query',
            timestamp_override: 'fieldB',
          },
          removeInstalledAssets: true,
        };

        testFieldUpgradeReview(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'timestamp_override',
            expectedDiffOutcome: ThreeWayDiffOutcome.MissingBaseNoUpdate,
          },
          getService
        );

        testFieldUpgradesToResolvedValue(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'timestamp_override',
            resolvedValue: { field_name: 'resolved', fallback_disabled: false },
            expectedFieldsAfterUpgrade: { timestamp_override: 'resolved' },
          },
          getService
        );
      });

      describe('customized with an upgrade (-AB diff case)', () => {
        const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
          installed: {
            type: 'query',
            timestamp_override: 'fieldA',
          },
          patch: {
            timestamp_override: 'fieldB',
          },
          upgrade: {
            type: 'query',
            timestamp_override: 'fieldC',
          },
          removeInstalledAssets: true,
        };

        testFieldUpgradeReview(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'timestamp_override',
            expectedDiffOutcome: ThreeWayDiffOutcome.MissingBaseCanUpdate,
            expectedFieldDiffValues: {
              current: { field_name: 'fieldB', fallback_disabled: false },
              target: { field_name: 'fieldC', fallback_disabled: false },
              merged: { field_name: 'fieldC', fallback_disabled: false },
            },
          },
          getService
        );

        testFieldUpgradesToResolvedValue(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'timestamp_override',
            resolvedValue: { field_name: 'resolved', fallback_disabled: false },
            expectedFieldsAfterUpgrade: { timestamp_override: 'resolved' },
          },
          getService
        );
      });
    });
  });
}
