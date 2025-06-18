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

export function investigationFieldsField({ getService }: FtrProviderContext): void {
  describe('"investigation_fields"', () => {
    describe('non-customized without an upgrade (AAA diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          investigation_fields: { field_names: ['fieldA'] },
        },
        patch: {},
        upgrade: {
          type: 'query',
          investigation_fields: { field_names: ['fieldA'] },
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'investigation_fields',
          expectedDiffOutcome: ThreeWayDiffOutcome.StockValueNoUpdate,
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'investigation_fields',
          resolvedValue: { field_names: ['resolved'] },
          expectedFieldsAfterUpgrade: { investigation_fields: { field_names: ['resolved'] } },
        },
        getService
      );
    });

    describe('non-customized with an upgrade (AAB diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          investigation_fields: { field_names: ['fieldA'] },
        },
        patch: {},
        upgrade: {
          type: 'query',
          investigation_fields: { field_names: ['fieldB'] },
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'investigation_fields',
          expectedDiffOutcome: ThreeWayDiffOutcome.StockValueCanUpdate,
          expectedFieldDiffValues: {
            base: { field_names: ['fieldA'] },
            current: { field_names: ['fieldA'] },
            target: { field_names: ['fieldB'] },
            merged: { field_names: ['fieldB'] },
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'investigation_fields',
          expectedFieldsAfterUpgrade: { investigation_fields: { field_names: ['fieldB'] } },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'investigation_fields',
          resolvedValue: { field_names: ['resolved'] },
          expectedFieldsAfterUpgrade: { investigation_fields: { field_names: ['resolved'] } },
        },
        getService
      );
    });

    describe('customized without an upgrade (ABA diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          investigation_fields: { field_names: ['fieldA'] },
        },
        patch: {
          investigation_fields: { field_names: ['fieldB'] },
        },
        upgrade: {
          type: 'query',
          investigation_fields: { field_names: ['fieldA'] },
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'investigation_fields',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
          expectedFieldDiffValues: {
            base: { field_names: ['fieldA'] },
            current: { field_names: ['fieldB'] },
            target: { field_names: ['fieldA'] },
            merged: { field_names: ['fieldB'] },
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'investigation_fields',
          expectedFieldsAfterUpgrade: { investigation_fields: { field_names: ['fieldB'] } },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'investigation_fields',
          resolvedValue: { field_names: ['resolved'] },
          expectedFieldsAfterUpgrade: { investigation_fields: { field_names: ['resolved'] } },
        },
        getService
      );
    });

    describe('customized with the matching upgrade (ABB diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          investigation_fields: { field_names: ['fieldA'] },
        },
        patch: {
          investigation_fields: { field_names: ['fieldB'] },
        },
        upgrade: {
          type: 'query',
          investigation_fields: { field_names: ['fieldB'] },
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'investigation_fields',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
          expectedFieldDiffValues: {
            base: { field_names: ['fieldA'] },
            current: { field_names: ['fieldB'] },
            target: { field_names: ['fieldB'] },
            merged: { field_names: ['fieldB'] },
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'investigation_fields',
          expectedFieldsAfterUpgrade: { investigation_fields: { field_names: ['fieldB'] } },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'investigation_fields',
          resolvedValue: { field_names: ['resolved'] },
          expectedFieldsAfterUpgrade: { investigation_fields: { field_names: ['resolved'] } },
        },
        getService
      );
    });

    describe('customized with an upgrade resulting in a conflict (ABC diff case, non-solvable conflict)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          investigation_fields: { field_names: ['fieldA'] },
        },
        patch: {
          investigation_fields: { field_names: ['fieldB'] },
        },
        upgrade: {
          type: 'query',
          investigation_fields: { field_names: ['fieldC'] },
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'investigation_fields',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
          isSolvableConflict: false,
          expectedFieldDiffValues: {
            base: { field_names: ['fieldA'] },
            current: { field_names: ['fieldB'] },
            target: { field_names: ['fieldC'] },
            merged: { field_names: ['fieldB'] },
          },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'investigation_fields',
          resolvedValue: { field_names: ['resolved'] },
          expectedFieldsAfterUpgrade: { investigation_fields: { field_names: ['resolved'] } },
        },
        getService
      );
    });

    describe('without historical versions', () => {
      describe('customized with the matching upgrade (-AA diff case)', () => {
        const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
          installed: {
            type: 'query',
            investigation_fields: { field_names: ['fieldA'] },
          },
          patch: {
            investigation_fields: { field_names: ['fieldB'] },
          },
          upgrade: {
            type: 'query',
            investigation_fields: { field_names: ['fieldB'] },
          },
          removeInstalledAssets: true,
        };

        testFieldUpgradeReview(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'investigation_fields',
            expectedDiffOutcome: ThreeWayDiffOutcome.MissingBaseNoUpdate,
          },
          getService
        );

        testFieldUpgradesToResolvedValue(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'investigation_fields',
            resolvedValue: { field_names: ['resolved'] },
            expectedFieldsAfterUpgrade: { investigation_fields: { field_names: ['resolved'] } },
          },
          getService
        );
      });

      describe('customized with an upgrade (-AB diff case)', () => {
        const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
          installed: {
            type: 'query',
            investigation_fields: { field_names: ['fieldA'] },
          },
          patch: {
            investigation_fields: { field_names: ['fieldB'] },
          },
          upgrade: {
            type: 'query',
            investigation_fields: { field_names: ['fieldC'] },
          },
          removeInstalledAssets: true,
        };

        testFieldUpgradeReview(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'investigation_fields',
            expectedDiffOutcome: ThreeWayDiffOutcome.MissingBaseCanUpdate,
            expectedFieldDiffValues: {
              current: { field_names: ['fieldB'] },
              target: { field_names: ['fieldC'] },
              merged: { field_names: ['fieldC'] },
            },
          },
          getService
        );

        testFieldUpgradesToResolvedValue(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'investigation_fields',
            resolvedValue: { field_names: ['resolved'] },
            expectedFieldsAfterUpgrade: { investigation_fields: { field_names: ['resolved'] } },
          },
          getService
        );
      });
    });
  });
}
