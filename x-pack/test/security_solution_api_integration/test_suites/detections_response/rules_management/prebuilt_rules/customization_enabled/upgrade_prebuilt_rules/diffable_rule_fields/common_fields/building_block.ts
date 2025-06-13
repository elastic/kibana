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

export function buildingBlockField({ getService }: FtrProviderContext): void {
  describe('"building_block"', () => {
    describe('non-customized without an upgrade (AAA diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          building_block_type: 'default',
        },
        patch: {},
        upgrade: {
          type: 'query',
          building_block_type: 'default',
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'building_block',
          expectedDiffOutcome: ThreeWayDiffOutcome.StockValueNoUpdate,
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'building_block',
          resolvedValue: undefined,
          expectedFieldsAfterUpgrade: { building_block_type: undefined },
        },
        getService
      );
    });

    describe('non-customized with an upgrade (AAB diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          building_block_type: 'default',
        },
        patch: {},
        upgrade: {
          type: 'query',
          building_block_type: undefined,
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'building_block',
          expectedDiffOutcome: ThreeWayDiffOutcome.StockValueCanUpdate,
          expectedFieldDiffValues: {
            base: { type: 'default' },
            current: { type: 'default' },
            target: undefined,
            merged: undefined,
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'building_block',
          expectedFieldsAfterUpgrade: { building_block_type: undefined },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'building_block',
          resolvedValue: { type: 'resolved' },
          expectedFieldsAfterUpgrade: { building_block_type: 'resolved' },
        },
        getService
      );
    });

    describe('customized without an upgrade (ABA diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          building_block_type: 'default',
        },
        patch: {
          building_block_type: '',
        },
        upgrade: {
          type: 'query',
          building_block_type: 'default',
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'building_block',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
          expectedFieldDiffValues: {
            base: { type: 'default' },
            current: undefined,
            target: { type: 'default' },
            merged: undefined,
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'building_block',
          expectedFieldsAfterUpgrade: { building_block_type: '' },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'building_block',
          resolvedValue: { type: 'resolved' },
          expectedFieldsAfterUpgrade: { building_block_type: 'resolved' },
        },
        getService
      );
    });

    describe('customized with the matching upgrade (ABB diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          building_block_type: 'default',
        },
        patch: {
          building_block_type: 'custom',
        },
        upgrade: {
          type: 'query',
          building_block_type: 'custom',
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'building_block',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
          expectedFieldDiffValues: {
            base: { type: 'default' },
            current: { type: 'custom' },
            target: { type: 'custom' },
            merged: { type: 'custom' },
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'building_block',
          expectedFieldsAfterUpgrade: { building_block_type: 'custom' },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'building_block',
          resolvedValue: { type: 'resolved' },
          expectedFieldsAfterUpgrade: { building_block_type: 'resolved' },
        },
        getService
      );
    });

    describe('customized with an upgrade resulting in a conflict (ABC diff case, non-solvable conflict)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          building_block_type: 'default',
        },
        patch: {
          building_block_type: 'custom',
        },
        upgrade: {
          type: 'query',
          building_block_type: undefined,
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'building_block',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
          isSolvableConflict: false,
          expectedFieldDiffValues: {
            base: { type: 'default' },
            current: { type: 'custom' },
            target: undefined,
            merged: { type: 'custom' },
          },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'building_block',
          resolvedValue: { type: 'resolved' },
          expectedFieldsAfterUpgrade: { building_block_type: 'resolved' },
        },
        getService
      );
    });

    describe('without historical versions', () => {
      describe('customized with the matching upgrade (-AA diff case)', () => {
        const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
          installed: {
            type: 'query',
            building_block_type: 'default',
          },
          patch: {
            building_block_type: 'custom',
          },
          upgrade: {
            type: 'query',
            building_block_type: 'custom',
          },
          removeInstalledAssets: true,
        };

        testFieldUpgradeReview(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'building_block',
            expectedDiffOutcome: ThreeWayDiffOutcome.MissingBaseNoUpdate,
          },
          getService
        );

        testFieldUpgradesToResolvedValue(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'building_block',
            resolvedValue: { type: 'resolved' },
            expectedFieldsAfterUpgrade: { building_block_type: 'resolved' },
          },
          getService
        );
      });

      describe('customized with an upgrade (-AB diff case)', () => {
        const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
          installed: {
            type: 'query',
            building_block_type: 'default',
          },
          patch: {
            building_block_type: 'custom',
          },
          upgrade: {
            type: 'query',
            building_block_type: undefined,
          },
          removeInstalledAssets: true,
        };

        testFieldUpgradeReview(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'building_block',
            expectedDiffOutcome: ThreeWayDiffOutcome.MissingBaseCanUpdate,
            expectedFieldDiffValues: {
              current: { type: 'custom' },
              target: undefined,
              merged: undefined,
            },
          },
          getService
        );

        testFieldUpgradesToResolvedValue(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'building_block',
            resolvedValue: { type: 'resolved' },
            expectedFieldsAfterUpgrade: { building_block_type: 'resolved' },
          },
          getService
        );
      });
    });
  });
}
