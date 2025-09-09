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

export function threatIndicatorPathField({ getService }: FtrProviderContext): void {
  describe('"threat_indicator_path"', () => {
    describe('non-customized without an upgrade (AAA diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'threat_match',
          threat_indicator_path: 'fieldA',
        },
        patch: {},
        upgrade: {
          type: 'threat_match',
          threat_indicator_path: 'fieldA',
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'threat_indicator_path',
          expectedDiffOutcome: ThreeWayDiffOutcome.StockValueNoUpdate,
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'threat_indicator_path',
          resolvedValue: 'resolved',
          expectedFieldsAfterUpgrade: { threat_indicator_path: 'resolved' },
        },
        getService
      );
    });

    describe('non-customized with an upgrade (AAB diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'threat_match',
          threat_indicator_path: 'fieldA',
        },
        patch: {},
        upgrade: {
          type: 'threat_match',
          threat_indicator_path: 'fieldB',
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'threat_indicator_path',
          expectedDiffOutcome: ThreeWayDiffOutcome.StockValueCanUpdate,
          expectedFieldDiffValues: {
            base: 'fieldA',
            current: 'fieldA',
            target: 'fieldB',
            merged: 'fieldB',
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'threat_indicator_path',
          expectedFieldsAfterUpgrade: { threat_indicator_path: 'fieldB' },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'threat_indicator_path',
          resolvedValue: 'resolved',
          expectedFieldsAfterUpgrade: { threat_indicator_path: 'resolved' },
        },
        getService
      );
    });

    describe('customized without an upgrade (ABA diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'threat_match',
          threat_indicator_path: 'fieldA',
        },
        patch: {
          type: 'threat_match',
          threat_indicator_path: 'fieldB',
        },
        upgrade: {
          type: 'threat_match',
          threat_indicator_path: 'fieldA',
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'threat_indicator_path',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
          expectedFieldDiffValues: {
            base: 'fieldA',
            current: 'fieldB',
            target: 'fieldA',
            merged: 'fieldB',
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'threat_indicator_path',
          expectedFieldsAfterUpgrade: { threat_indicator_path: 'fieldB' },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'threat_indicator_path',
          resolvedValue: 'resolved',
          expectedFieldsAfterUpgrade: { threat_indicator_path: 'resolved' },
        },
        getService
      );
    });

    describe('customized with the matching upgrade (ABB diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'threat_match',
          threat_indicator_path: 'fieldA',
        },
        patch: {
          type: 'threat_match',
          threat_indicator_path: 'fieldB',
        },
        upgrade: {
          type: 'threat_match',
          threat_indicator_path: 'fieldB',
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'threat_indicator_path',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
          expectedFieldDiffValues: {
            base: 'fieldA',
            current: 'fieldB',
            target: 'fieldB',
            merged: 'fieldB',
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'threat_indicator_path',
          expectedFieldsAfterUpgrade: { threat_indicator_path: 'fieldB' },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'threat_indicator_path',
          resolvedValue: 'resolved',
          expectedFieldsAfterUpgrade: { threat_indicator_path: 'resolved' },
        },
        getService
      );
    });

    describe('customized with an upgrade resulting in a conflict (ABC diff case, non-solvable conflict)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'threat_match',
          threat_indicator_path: 'fieldA',
        },
        patch: {
          type: 'threat_match',
          threat_indicator_path: 'fieldB',
        },
        upgrade: {
          type: 'threat_match',
          threat_indicator_path: 'fieldC',
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'threat_indicator_path',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
          isSolvableConflict: false,
          expectedFieldDiffValues: {
            base: 'fieldA',
            current: 'fieldB',
            target: 'fieldC',
            merged: 'fieldB',
          },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'threat_indicator_path',
          resolvedValue: 'resolved',
          expectedFieldsAfterUpgrade: { threat_indicator_path: 'resolved' },
        },
        getService
      );
    });

    describe('without historical versions', () => {
      describe('customized with the matching upgrade (-AA diff case)', () => {
        const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
          installed: {
            type: 'threat_match',
            threat_indicator_path: 'fieldA',
          },
          patch: {
            type: 'threat_match',
            threat_indicator_path: 'fieldB',
          },
          upgrade: {
            type: 'threat_match',
            threat_indicator_path: 'fieldB',
          },
          removeInstalledAssets: true,
        };

        testFieldUpgradeReview(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'threat_indicator_path',
            expectedDiffOutcome: ThreeWayDiffOutcome.MissingBaseNoUpdate,
          },
          getService
        );

        testFieldUpgradesToResolvedValue(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'threat_indicator_path',
            resolvedValue: 'resolved',
            expectedFieldsAfterUpgrade: { threat_indicator_path: 'resolved' },
          },
          getService
        );
      });

      describe('customized with an upgrade (-AB diff case)', () => {
        const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
          installed: {
            type: 'threat_match',
            threat_indicator_path: 'fieldA',
          },
          patch: {
            type: 'threat_match',
            threat_indicator_path: 'fieldB',
          },
          upgrade: {
            type: 'threat_match',
            threat_indicator_path: 'fieldC',
          },
          removeInstalledAssets: true,
        };

        testFieldUpgradeReview(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'threat_indicator_path',
            expectedDiffOutcome: ThreeWayDiffOutcome.MissingBaseCanUpdate,
            expectedFieldDiffValues: {
              current: 'fieldB',
              target: 'fieldC',
              merged: 'fieldC',
            },
          },
          getService
        );

        testFieldUpgradesToResolvedValue(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'threat_indicator_path',
            resolvedValue: 'resolved',
            expectedFieldsAfterUpgrade: { threat_indicator_path: 'resolved' },
          },
          getService
        );
      });
    });
  });
}
