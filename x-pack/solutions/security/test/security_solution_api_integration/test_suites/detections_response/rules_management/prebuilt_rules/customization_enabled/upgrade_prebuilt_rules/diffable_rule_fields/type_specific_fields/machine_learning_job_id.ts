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

export function machineLearningJobIdField({ getService }: FtrProviderContext): void {
  describe('"machine_learning_job_id"', () => {
    describe('non-customized without an upgrade (AAA diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'machine_learning',
          machine_learning_job_id: 'jobA',
        },
        patch: {},
        upgrade: {
          type: 'machine_learning',
          machine_learning_job_id: 'jobA',
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'machine_learning_job_id',
          expectedDiffOutcome: ThreeWayDiffOutcome.StockValueNoUpdate,
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'machine_learning_job_id',
          resolvedValue: ['resolved'],
          expectedFieldsAfterUpgrade: { machine_learning_job_id: ['resolved'] },
        },
        getService
      );
    });

    describe('non-customized with an upgrade (AAB diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'machine_learning',
          machine_learning_job_id: 'jobA',
        },
        patch: {},
        upgrade: {
          type: 'machine_learning',
          machine_learning_job_id: 'jobB',
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'machine_learning_job_id',
          expectedDiffOutcome: ThreeWayDiffOutcome.StockValueCanUpdate,
          expectedFieldDiffValues: {
            base: ['jobA'],
            current: ['jobA'],
            target: ['jobB'],
            merged: ['jobB'],
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'machine_learning_job_id',
          expectedFieldsAfterUpgrade: { machine_learning_job_id: ['jobB'] },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'machine_learning_job_id',
          resolvedValue: ['resolved'],
          expectedFieldsAfterUpgrade: { machine_learning_job_id: ['resolved'] },
        },
        getService
      );
    });

    describe('customized without an upgrade (ABA diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'machine_learning',
          machine_learning_job_id: 'jobA',
        },
        patch: {
          type: 'machine_learning',
          machine_learning_job_id: 'jobB',
        },
        upgrade: {
          type: 'machine_learning',
          machine_learning_job_id: 'jobA',
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'machine_learning_job_id',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
          expectedFieldDiffValues: {
            base: ['jobA'],
            current: ['jobB'],
            target: ['jobA'],
            merged: ['jobB'],
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'machine_learning_job_id',
          expectedFieldsAfterUpgrade: { machine_learning_job_id: ['jobB'] },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'machine_learning_job_id',
          resolvedValue: ['resolved'],
          expectedFieldsAfterUpgrade: { machine_learning_job_id: ['resolved'] },
        },
        getService
      );
    });

    describe('customized with the matching upgrade (ABB diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'machine_learning',
          machine_learning_job_id: 'jobA',
        },
        patch: {
          type: 'machine_learning',
          machine_learning_job_id: 'jobB',
        },
        upgrade: {
          type: 'machine_learning',
          machine_learning_job_id: 'jobB',
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'machine_learning_job_id',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
          expectedFieldDiffValues: {
            base: ['jobA'],
            current: ['jobB'],
            target: ['jobB'],
            merged: ['jobB'],
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'machine_learning_job_id',
          expectedFieldsAfterUpgrade: { machine_learning_job_id: ['jobB'] },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'machine_learning_job_id',
          resolvedValue: ['resolved'],
          expectedFieldsAfterUpgrade: { machine_learning_job_id: ['resolved'] },
        },
        getService
      );
    });

    describe('customized with an upgrade resulting in a conflict (ABC diff case, non-solvable conflict)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'machine_learning',
          machine_learning_job_id: 'jobA',
        },
        patch: {
          type: 'machine_learning',
          machine_learning_job_id: 'jobB',
        },
        upgrade: {
          type: 'machine_learning',
          machine_learning_job_id: 'jobC',
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'machine_learning_job_id',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
          isSolvableConflict: false,
          expectedFieldDiffValues: {
            base: ['jobA'],
            current: ['jobB'],
            target: ['jobC'],
            merged: ['jobB'],
          },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'machine_learning_job_id',
          resolvedValue: ['resolved'],
          expectedFieldsAfterUpgrade: { machine_learning_job_id: ['resolved'] },
        },
        getService
      );
    });

    describe('without historical versions', () => {
      describe('customized with the matching upgrade (-AA diff case)', () => {
        const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
          installed: {
            type: 'machine_learning',
            machine_learning_job_id: 'jobA',
          },
          patch: {
            type: 'machine_learning',
            machine_learning_job_id: 'jobB',
          },
          upgrade: {
            type: 'machine_learning',
            machine_learning_job_id: 'jobB',
          },
          removeInstalledAssets: true,
        };

        testFieldUpgradeReview(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'machine_learning_job_id',
            expectedDiffOutcome: ThreeWayDiffOutcome.MissingBaseNoUpdate,
          },
          getService
        );

        testFieldUpgradesToResolvedValue(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'machine_learning_job_id',
            resolvedValue: ['resolved'],
            expectedFieldsAfterUpgrade: { machine_learning_job_id: ['resolved'] },
          },
          getService
        );
      });

      describe('customized with an upgrade (-AB diff case)', () => {
        const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
          installed: {
            type: 'machine_learning',
            machine_learning_job_id: 'jobA',
          },
          patch: {
            type: 'machine_learning',
            machine_learning_job_id: 'jobB',
          },
          upgrade: {
            type: 'machine_learning',
            machine_learning_job_id: 'jobC',
          },
          removeInstalledAssets: true,
        };

        testFieldUpgradeReview(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'machine_learning_job_id',
            expectedDiffOutcome: ThreeWayDiffOutcome.MissingBaseCanUpdate,
            expectedFieldDiffValues: {
              current: ['jobB'],
              target: ['jobC'],
              merged: ['jobC'],
            },
          },
          getService
        );

        testFieldUpgradesToResolvedValue(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'machine_learning_job_id',
            resolvedValue: ['resolved'],
            expectedFieldsAfterUpgrade: { machine_learning_job_id: ['resolved'] },
          },
          getService
        );
      });
    });
  });
}
