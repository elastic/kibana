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

export function ruleScheduleField({ getService }: FtrProviderContext): void {
  describe('"rule_schedule"', () => {
    describe('non-customized without an upgrade (AAA diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          interval: '5m',
          from: 'now-10m',
          to: 'now',
        },
        patch: {},
        upgrade: {
          type: 'query',
          interval: '5m',
          from: 'now-10m',
          to: 'now',
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'rule_schedule',
          expectedDiffOutcome: ThreeWayDiffOutcome.StockValueNoUpdate,
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'rule_schedule',
          resolvedValue: { interval: '1h', from: 'now-2h', to: 'now' },
          expectedFieldsAfterUpgrade: {
            interval: '1h',
            from: 'now-2h',
            to: 'now',
          },
        },
        getService
      );
    });

    describe('non-customized with an upgrade (AAB diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          interval: '5m',
          from: 'now-10m',
          to: 'now',
        },
        patch: {},
        upgrade: {
          type: 'query',
          interval: '5m',
          from: 'now-15m',
          to: 'now',
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'rule_schedule',
          expectedDiffOutcome: ThreeWayDiffOutcome.StockValueCanUpdate,
          expectedFieldDiffValues: {
            base: {
              interval: '5m',
              from: 'now-10m',
              to: 'now',
            },
            current: {
              interval: '5m',
              from: 'now-10m',
              to: 'now',
            },
            target: {
              interval: '5m',
              from: 'now-15m',
              to: 'now',
            },
            merged: {
              interval: '5m',
              from: 'now-15m',
              to: 'now',
            },
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'rule_schedule',
          expectedFieldsAfterUpgrade: { interval: '5m', from: 'now-15m', to: 'now' },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'rule_schedule',
          resolvedValue: {
            interval: '1h',
            from: 'now-2h',
            to: 'now',
          },
          expectedFieldsAfterUpgrade: { interval: '1h', from: 'now-2h', to: 'now' },
        },
        getService
      );
    });

    describe('customized without an upgrade (ABA diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          interval: '5m',
          from: 'now-10m',
          to: 'now',
        },
        patch: {
          from: 'now-20m',
        },
        upgrade: {
          type: 'query',
          interval: '5m',
          from: 'now-10m',
          to: 'now',
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'rule_schedule',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
          expectedFieldDiffValues: {
            base: {
              interval: '5m',
              from: 'now-10m',
              to: 'now',
            },
            current: {
              interval: '5m',
              from: 'now-20m',
              to: 'now',
            },
            target: {
              interval: '5m',
              from: 'now-10m',
              to: 'now',
            },
            merged: {
              interval: '5m',
              from: 'now-20m',
              to: 'now',
            },
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,

          diffableRuleFieldName: 'rule_schedule',
          expectedFieldsAfterUpgrade: { interval: '5m', from: 'now-20m', to: 'now' },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'rule_schedule',
          resolvedValue: {
            interval: '1h',
            from: 'now-2h',
            to: 'now',
          },
          expectedFieldsAfterUpgrade: { interval: '1h', from: 'now-2h', to: 'now' },
        },
        getService
      );
    });

    describe('customized with the matching upgrade (ABB diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          interval: '5m',
          from: 'now-10m',
          to: 'now',
        },
        patch: {
          from: 'now-20m',
        },
        upgrade: {
          type: 'query',
          interval: '5m',
          from: 'now-20m',
          to: 'now',
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'rule_schedule',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
          expectedFieldDiffValues: {
            base: {
              interval: '5m',
              from: 'now-10m',
              to: 'now',
            },
            current: {
              interval: '5m',
              from: 'now-20m',
              to: 'now',
            },
            target: {
              interval: '5m',
              from: 'now-20m',
              to: 'now',
            },
            merged: {
              interval: '5m',
              from: 'now-20m',
              to: 'now',
            },
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'rule_schedule',
          expectedFieldsAfterUpgrade: { interval: '5m', from: 'now-20m', to: 'now' },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'rule_schedule',
          resolvedValue: {
            interval: '1h',
            from: 'now-2h',
            to: 'now',
          },
          expectedFieldsAfterUpgrade: { interval: '1h', from: 'now-2h', to: 'now' },
        },
        getService
      );
    });

    describe('customized with an upgrade resulting in a conflict (ABC diff case, non-solvable conflict)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          interval: '5m',
          from: 'now-10m',
          to: 'now',
        },
        patch: {
          from: 'now-20m',
        },
        upgrade: {
          type: 'query',
          interval: '5m',
          from: 'now-15m',
          to: 'now',
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'rule_schedule',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
          isSolvableConflict: false,
          expectedFieldDiffValues: {
            base: {
              interval: '5m',
              from: 'now-10m',
              to: 'now',
            },
            current: {
              interval: '5m',
              from: 'now-20m',
              to: 'now',
            },
            target: {
              interval: '5m',
              from: 'now-15m',
              to: 'now',
            },
            merged: {
              interval: '5m',
              from: 'now-20m',
              to: 'now',
            },
          },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'rule_schedule',
          resolvedValue: {
            interval: '1h',
            from: 'now-2h',
            to: 'now',
          },
          expectedFieldsAfterUpgrade: { interval: '1h', from: 'now-2h', to: 'now' },
        },
        getService
      );
    });

    describe('without historical versions', () => {
      describe('customized with the matching upgrade (-AA diff case)', () => {
        const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
          installed: {
            type: 'query',
            interval: '5m',
            from: 'now-10m',
            to: 'now',
          },
          patch: {
            from: 'now-20m',
          },
          upgrade: {
            type: 'query',
            interval: '5m',
            from: 'now-20m',
            to: 'now',
          },
          removeInstalledAssets: true,
        };

        testFieldUpgradeReview(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'rule_schedule',
            expectedDiffOutcome: ThreeWayDiffOutcome.MissingBaseNoUpdate,
          },
          getService
        );

        testFieldUpgradesToResolvedValue(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'rule_schedule',
            resolvedValue: {
              interval: '1h',
              from: 'now-2h',
              to: 'now',
            },
            expectedFieldsAfterUpgrade: { interval: '1h', from: 'now-2h', to: 'now' },
          },
          getService
        );
      });

      describe('customized with an upgrade (-AB diff case)', () => {
        const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
          installed: {
            type: 'query',
            interval: '5m',
            from: 'now-10m',
            to: 'now',
          },
          patch: {
            from: 'now-20m',
          },
          upgrade: {
            type: 'query',
            interval: '5m',
            from: 'now-15m',
            to: 'now',
          },
          removeInstalledAssets: true,
        };

        testFieldUpgradeReview(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'rule_schedule',
            expectedDiffOutcome: ThreeWayDiffOutcome.MissingBaseCanUpdate,
            expectedFieldDiffValues: {
              current: {
                interval: '5m',
                from: 'now-20m',
                to: 'now',
              },
              target: {
                interval: '5m',
                from: 'now-15m',
                to: 'now',
              },
              merged: {
                interval: '5m',
                from: 'now-15m',
                to: 'now',
              },
            },
          },
          getService
        );

        testFieldUpgradesToResolvedValue(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'rule_schedule',
            resolvedValue: {
              interval: '1h',
              from: 'now-2h',
              to: 'now',
            },
            expectedFieldsAfterUpgrade: { interval: '1h', from: 'now-2h', to: 'now' },
          },
          getService
        );
      });
    });
  });
}
