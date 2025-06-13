/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ThreeWayDiffOutcome,
  UpgradeConflictResolutionEnum,
} from '@kbn/security-solution-plugin/common/api/detection_engine';
import { FtrProviderContext } from '../../../../../../../../ftr_provider_context';
import type { TestFieldRuleUpgradeAssets } from '../test_helpers';
import {
  testFieldUpgradeReview,
  testFieldUpgradesToMergedValue,
  testFieldUpgradesToResolvedValue,
} from '../test_helpers';

export function threatIndexField({ getService }: FtrProviderContext): void {
  describe('"threat_index"', () => {
    describe('non-customized without an upgrade (AAA diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'threat_match',
          threat_index: ['indexA'],
        },
        patch: {},
        upgrade: {
          type: 'threat_match',
          threat_index: ['indexA'],
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'threat_index',
          expectedDiffOutcome: ThreeWayDiffOutcome.StockValueNoUpdate,
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'threat_index',
          resolvedValue: ['resolved'],
          expectedFieldsAfterUpgrade: { threat_index: ['resolved'] },
        },
        getService
      );
    });

    describe('non-customized with an upgrade (AAB diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'threat_match',
          threat_index: ['indexA'],
        },
        patch: {},
        upgrade: {
          type: 'threat_match',
          threat_index: ['indexB'],
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'threat_index',
          expectedDiffOutcome: ThreeWayDiffOutcome.StockValueCanUpdate,
          expectedFieldDiffValues: {
            base: ['indexA'],
            current: ['indexA'],
            target: ['indexB'],
            merged: ['indexB'],
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'threat_index',
          expectedFieldsAfterUpgrade: { threat_index: ['indexB'] },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'threat_index',
          resolvedValue: ['resolved'],
          expectedFieldsAfterUpgrade: { threat_index: ['resolved'] },
        },
        getService
      );
    });

    describe('customized without an upgrade (ABA diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'threat_match',
          threat_index: ['indexA'],
        },
        patch: {
          type: 'threat_match',
          threat_index: ['indexB'],
        },
        upgrade: {
          type: 'threat_match',
          threat_index: ['indexA'],
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'threat_index',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
          expectedFieldDiffValues: {
            base: ['indexA'],
            current: ['indexB'],
            target: ['indexA'],
            merged: ['indexB'],
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'threat_index',
          expectedFieldsAfterUpgrade: { threat_index: ['indexB'] },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'threat_index',
          resolvedValue: ['resolved'],
          expectedFieldsAfterUpgrade: { threat_index: ['resolved'] },
        },
        getService
      );
    });

    describe('customized with the matching upgrade (ABB diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'threat_match',
          threat_index: ['indexA'],
        },
        patch: {
          type: 'threat_match',
          threat_index: ['indexB'],
        },
        upgrade: {
          type: 'threat_match',
          threat_index: ['indexB'],
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'threat_index',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
          expectedFieldDiffValues: {
            base: ['indexA'],
            current: ['indexB'],
            target: ['indexB'],
            merged: ['indexB'],
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'threat_index',
          expectedFieldsAfterUpgrade: { threat_index: ['indexB'] },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'threat_index',
          resolvedValue: ['resolved'],
          expectedFieldsAfterUpgrade: { threat_index: ['resolved'] },
        },
        getService
      );
    });

    describe('customized with an upgrade resulting in a conflict (ABC diff case, solvable conflict)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'threat_match',
          threat_index: ['indexA'],
        },
        patch: {
          type: 'threat_match',
          threat_index: ['indexD'],
        },
        upgrade: {
          type: 'threat_match',
          threat_index: ['indexB', 'indexC'],
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'threat_index',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
          isSolvableConflict: true,
          expectedFieldDiffValues: {
            base: ['indexA'],
            current: ['indexD'],
            target: ['indexB', 'indexC'],
            merged: ['indexD', 'indexB', 'indexC'],
          },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'threat_index',
          resolvedValue: ['resolved'],
          expectedFieldsAfterUpgrade: { threat_index: ['resolved'] },
        },
        getService
      );
    });

    describe('without historical versions', () => {
      describe('customized with the matching upgrade (-AA diff case)', () => {
        const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
          installed: {
            type: 'threat_match',
            threat_index: ['indexA'],
          },
          patch: {
            type: 'threat_match',
            threat_index: ['indexD'],
          },
          upgrade: {
            type: 'threat_match',
            threat_index: ['indexD'],
          },
          removeInstalledAssets: true,
        };

        testFieldUpgradeReview(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'threat_index',
            expectedDiffOutcome: ThreeWayDiffOutcome.MissingBaseNoUpdate,
          },
          getService
        );

        testFieldUpgradesToResolvedValue(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'threat_index',
            resolvedValue: ['resolved'],
            expectedFieldsAfterUpgrade: { threat_index: ['resolved'] },
          },
          getService
        );
      });

      describe('customized with an upgrade (-AB diff case)', () => {
        const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
          installed: {
            type: 'threat_match',
            threat_index: ['indexA'],
          },
          patch: {
            type: 'threat_match',
            threat_index: ['indexD'],
          },
          upgrade: {
            type: 'threat_match',
            threat_index: ['indexB', 'indexC'],
          },
          removeInstalledAssets: true,
        };

        testFieldUpgradeReview(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'threat_index',
            expectedDiffOutcome: ThreeWayDiffOutcome.MissingBaseCanUpdate,
            isMergableField: false,
            expectedFieldDiffValues: {
              current: ['indexD'],
              target: ['indexB', 'indexC'],
              merged: ['indexB', 'indexC'],
            },
          },
          getService
        );

        testFieldUpgradesToMergedValue(
          {
            ruleUpgradeAssets,
            onConflict: UpgradeConflictResolutionEnum.UPGRADE_SOLVABLE,
            diffableRuleFieldName: 'threat_index',
            expectedFieldsAfterUpgrade: { threat_index: ['indexB', 'indexC'] },
          },
          getService
        );

        testFieldUpgradesToResolvedValue(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'threat_index',
            resolvedValue: ['resolved'],
            expectedFieldsAfterUpgrade: { threat_index: ['resolved'] },
          },
          getService
        );
      });
    });
  });
}
