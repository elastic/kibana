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

export function newTermsFieldsField({ getService }: FtrProviderContext): void {
  describe('"new_terms_fields"', () => {
    describe('non-customized without an upgrade (AAA diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'new_terms',
          new_terms_fields: ['fieldA'],
        },
        patch: {},
        upgrade: {
          type: 'new_terms',
          new_terms_fields: ['fieldA'],
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'new_terms_fields',
          expectedDiffOutcome: ThreeWayDiffOutcome.StockValueNoUpdate,
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'new_terms_fields',
          resolvedValue: ['resolved'],
          expectedFieldsAfterUpgrade: { new_terms_fields: ['resolved'] },
        },
        getService
      );
    });

    describe('non-customized with an upgrade (AAB diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'new_terms',
          new_terms_fields: ['fieldA'],
        },
        patch: {},
        upgrade: {
          type: 'new_terms',
          new_terms_fields: ['fieldB'],
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'new_terms_fields',
          expectedDiffOutcome: ThreeWayDiffOutcome.StockValueCanUpdate,
          expectedFieldDiffValues: {
            base: ['fieldA'],
            current: ['fieldA'],
            target: ['fieldB'],
            merged: ['fieldB'],
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'new_terms_fields',
          expectedFieldsAfterUpgrade: { new_terms_fields: ['fieldB'] },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'new_terms_fields',
          resolvedValue: ['resolved'],
          expectedFieldsAfterUpgrade: { new_terms_fields: ['resolved'] },
        },
        getService
      );
    });

    describe('customized without an upgrade (ABA diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'new_terms',
          new_terms_fields: ['fieldA'],
        },
        patch: {
          type: 'new_terms',
          new_terms_fields: ['fieldB'],
        },
        upgrade: {
          type: 'new_terms',
          new_terms_fields: ['fieldA'],
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'new_terms_fields',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
          expectedFieldDiffValues: {
            base: ['fieldA'],
            current: ['fieldB'],
            target: ['fieldA'],
            merged: ['fieldB'],
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'new_terms_fields',
          expectedFieldsAfterUpgrade: { new_terms_fields: ['fieldB'] },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'new_terms_fields',
          resolvedValue: ['resolved'],
          expectedFieldsAfterUpgrade: { new_terms_fields: ['resolved'] },
        },
        getService
      );
    });

    describe('customized with the matching upgrade (ABB diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'new_terms',
          new_terms_fields: ['fieldA'],
        },
        patch: {
          type: 'new_terms',
          new_terms_fields: ['fieldB'],
        },
        upgrade: {
          type: 'new_terms',
          new_terms_fields: ['fieldB'],
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'new_terms_fields',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
          expectedFieldDiffValues: {
            base: ['fieldA'],
            current: ['fieldB'],
            target: ['fieldB'],
            merged: ['fieldB'],
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'new_terms_fields',
          expectedFieldsAfterUpgrade: { new_terms_fields: ['fieldB'] },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'new_terms_fields',
          resolvedValue: ['resolved'],
          expectedFieldsAfterUpgrade: { new_terms_fields: ['resolved'] },
        },
        getService
      );
    });

    describe('customized with an upgrade resulting in a conflict (ABC diff case, solvable conflict)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'new_terms',
          new_terms_fields: ['fieldA'],
        },
        patch: {
          type: 'new_terms',
          new_terms_fields: ['fieldB'],
        },
        upgrade: {
          type: 'new_terms',
          new_terms_fields: ['fieldA', 'fieldC'],
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'new_terms_fields',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
          isSolvableConflict: true,
          expectedFieldDiffValues: {
            base: ['fieldA'],
            current: ['fieldB'],
            target: ['fieldA', 'fieldC'],
            merged: ['fieldB', 'fieldC'],
          },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'new_terms_fields',
          resolvedValue: ['resolved'],
          expectedFieldsAfterUpgrade: { new_terms_fields: ['resolved'] },
        },
        getService
      );
    });

    describe('without historical versions', () => {
      describe('customized with the matching upgrade (-AA diff case)', () => {
        const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
          installed: {
            type: 'new_terms',
            new_terms_fields: ['fieldA'],
          },
          patch: {
            type: 'new_terms',
            new_terms_fields: ['fieldB'],
          },
          upgrade: {
            type: 'new_terms',
            new_terms_fields: ['fieldB'],
          },
          removeInstalledAssets: true,
        };

        testFieldUpgradeReview(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'new_terms_fields',
            expectedDiffOutcome: ThreeWayDiffOutcome.MissingBaseNoUpdate,
          },
          getService
        );

        testFieldUpgradesToResolvedValue(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'new_terms_fields',
            resolvedValue: ['resolved'],
            expectedFieldsAfterUpgrade: { new_terms_fields: ['resolved'] },
          },
          getService
        );
      });

      describe('customized with an upgrade (-AB diff case)', () => {
        const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
          installed: {
            type: 'new_terms',
            new_terms_fields: ['fieldA'],
          },
          patch: {
            type: 'new_terms',
            new_terms_fields: ['fieldB'],
          },
          upgrade: {
            type: 'new_terms',
            new_terms_fields: ['fieldA', 'fieldC'],
          },
          removeInstalledAssets: true,
        };

        testFieldUpgradeReview(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'new_terms_fields',
            expectedDiffOutcome: ThreeWayDiffOutcome.MissingBaseCanUpdate,
            isMergableField: false,
            expectedFieldDiffValues: {
              current: ['fieldB'],
              target: ['fieldA', 'fieldC'],
              merged: ['fieldA', 'fieldC'],
            },
          },
          getService
        );

        testFieldUpgradesToMergedValue(
          {
            ruleUpgradeAssets,
            onConflict: UpgradeConflictResolutionEnum.UPGRADE_SOLVABLE,
            diffableRuleFieldName: 'new_terms_fields',
            expectedFieldsAfterUpgrade: { new_terms_fields: ['fieldA', 'fieldC'] },
          },
          getService
        );

        testFieldUpgradesToResolvedValue(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'new_terms_fields',
            resolvedValue: ['resolved'],
            expectedFieldsAfterUpgrade: { new_terms_fields: ['resolved'] },
          },
          getService
        );
      });
    });
  });
}
