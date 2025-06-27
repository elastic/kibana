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

export function tagsField({ getService }: FtrProviderContext): void {
  describe('"tags"', () => {
    describe('non-customized without an upgrade (AAA diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          tags: ['tagA'],
        },
        patch: {},
        upgrade: {
          type: 'query',
          tags: ['tagA'],
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'tags',
          expectedDiffOutcome: ThreeWayDiffOutcome.StockValueNoUpdate,
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'tags',
          resolvedValue: ['resolved'],
          expectedFieldsAfterUpgrade: { tags: ['resolved'] },
        },
        getService
      );
    });

    describe('non-customized with an upgrade (AAB diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          tags: ['tagA'],
        },
        patch: {},
        upgrade: {
          type: 'query',
          tags: ['tagB'],
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'tags',
          expectedDiffOutcome: ThreeWayDiffOutcome.StockValueCanUpdate,
          expectedFieldDiffValues: {
            base: ['tagA'],
            current: ['tagA'],
            target: ['tagB'],
            merged: ['tagB'],
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'tags',
          expectedFieldsAfterUpgrade: { tags: ['tagB'] },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'tags',
          resolvedValue: ['resolved'],
          expectedFieldsAfterUpgrade: { tags: ['resolved'] },
        },
        getService
      );
    });

    describe('customized without an upgrade (ABA diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          tags: ['tagA'],
        },
        patch: {
          tags: ['tagB'],
        },
        upgrade: {
          type: 'query',
          tags: ['tagA'],
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'tags',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
          expectedFieldDiffValues: {
            base: ['tagA'],
            current: ['tagB'],
            target: ['tagA'],
            merged: ['tagB'],
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'tags',
          expectedFieldsAfterUpgrade: { tags: ['tagB'] },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'tags',
          resolvedValue: ['resolved'],
          expectedFieldsAfterUpgrade: { tags: ['resolved'] },
        },
        getService
      );
    });

    describe('customized with the matching upgrade (ABB diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          tags: ['tagA'],
        },
        patch: {
          tags: ['tagB'],
        },
        upgrade: {
          type: 'query',
          tags: ['tagB'],
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'tags',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
          expectedFieldDiffValues: {
            base: ['tagA'],
            current: ['tagB'],
            target: ['tagB'],
            merged: ['tagB'],
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'tags',
          expectedFieldsAfterUpgrade: { tags: ['tagB'] },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'tags',
          resolvedValue: ['resolved'],
          expectedFieldsAfterUpgrade: { tags: ['resolved'] },
        },
        getService
      );
    });

    describe('customized with an upgrade resulting in a conflict (ABC diff case, solvable conflict)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          tags: ['tagA'],
        },
        patch: {
          tags: ['tagB'],
        },
        upgrade: {
          type: 'query',
          tags: ['tagC'],
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'tags',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
          isSolvableConflict: true,
          expectedFieldDiffValues: {
            base: ['tagA'],
            current: ['tagB'],
            target: ['tagC'],
            merged: ['tagB', 'tagC'],
          },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'tags',
          resolvedValue: ['resolved'],
          expectedFieldsAfterUpgrade: { tags: ['resolved'] },
        },
        getService
      );
    });

    describe('without historical versions', () => {
      describe('customized with the matching upgrade (-AA diff case)', () => {
        const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
          installed: {
            type: 'query',
            tags: ['tagA'],
          },
          patch: {
            tags: ['tagB'],
          },
          upgrade: {
            type: 'query',
            tags: ['tagB'],
          },
          removeInstalledAssets: true,
        };

        testFieldUpgradeReview(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'tags',
            expectedDiffOutcome: ThreeWayDiffOutcome.MissingBaseNoUpdate,
          },
          getService
        );

        testFieldUpgradesToResolvedValue(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'tags',
            resolvedValue: ['resolved'],
            expectedFieldsAfterUpgrade: { tags: ['resolved'] },
          },
          getService
        );
      });

      describe('customized with an upgrade (-AB diff case)', () => {
        const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
          installed: {
            type: 'query',
            tags: ['tagA'],
          },
          patch: {
            tags: ['tagB'],
          },
          upgrade: {
            type: 'query',
            tags: ['tagC'],
          },
          removeInstalledAssets: true,
        };

        testFieldUpgradeReview(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'tags',
            expectedDiffOutcome: ThreeWayDiffOutcome.MissingBaseCanUpdate,
            isMergableField: false,
            expectedFieldDiffValues: {
              current: ['tagB'],
              target: ['tagC'],
              merged: ['tagC'],
            },
          },
          getService
        );

        testFieldUpgradesToResolvedValue(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'tags',
            resolvedValue: ['resolved'],
            expectedFieldsAfterUpgrade: { tags: ['resolved'] },
          },
          getService
        );
      });
    });
  });
}
