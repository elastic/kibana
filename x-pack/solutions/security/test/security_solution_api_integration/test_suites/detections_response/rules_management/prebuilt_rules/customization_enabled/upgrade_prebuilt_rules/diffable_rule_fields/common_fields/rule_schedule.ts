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
import type { FtrProviderContext } from '../../../../../../../../ftr_provider_context';
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

    describe('with equivalent duration (e.g. 1h == 60m and now-1d == now-24h)', () => {
      describe('non-customized without an upgrade, current uses a different format (AAA diff case)', () => {
        const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
          installed: {
            type: 'query',
            interval: '60m',
            from: 'now-24h',
            to: 'now',
          },
          patch: {
            interval: '1h',
            from: 'now-1d',
          },
          upgrade: {
            type: 'query',
            interval: '60m',
            from: 'now-24h',
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

        testFieldUpgradesToMergedValue(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'rule_schedule',
            expectedFieldsAfterUpgrade: { interval: '60m', from: 'now-24h', to: 'now' },
          },
          getService
        );
      });

      describe('non-customized with an upgrade, current uses a different format (AAB diff case)', () => {
        const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
          installed: {
            type: 'query',
            interval: '60m',
            from: 'now-24h',
            to: 'now',
          },
          patch: {
            interval: '1h',
            from: 'now-1d',
          },
          upgrade: {
            type: 'query',
            interval: '30m',
            from: 'now-24h',
            to: 'now',
          },
        };

        testFieldUpgradeReview(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'rule_schedule',
            expectedDiffOutcome: ThreeWayDiffOutcome.StockValueCanUpdate,
            expectedFieldDiffValues: {
              base: { interval: '60m', from: 'now-24h', to: 'now' },
              current: { interval: '1h', from: 'now-1d', to: 'now' },
              target: { interval: '30m', from: 'now-24h', to: 'now' },
              merged: { interval: '30m', from: 'now-24h', to: 'now' },
            },
          },
          getService
        );

        testFieldUpgradesToMergedValue(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'rule_schedule',
            expectedFieldsAfterUpgrade: { interval: '30m', from: 'now-24h', to: 'now' },
          },
          getService
        );
      });

      describe('customized, target equals base in a different format (ABA diff case)', () => {
        const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
          installed: {
            type: 'query',
            interval: '60m',
            from: 'now-24h',
            to: 'now',
          },
          patch: {
            interval: '2h',
          },
          upgrade: {
            type: 'query',
            interval: '1h',
            from: 'now-1d',
            to: 'now',
          },
        };

        testFieldUpgradeReview(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'rule_schedule',
            expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
            expectedFieldDiffValues: {
              base: { interval: '60m', from: 'now-24h', to: 'now' },
              current: { interval: '2h', from: 'now-24h', to: 'now' },
              target: { interval: '1h', from: 'now-1d', to: 'now' },
              merged: { interval: '2h', from: 'now-1d', to: 'now' },
            },
          },
          getService
        );

        testFieldUpgradesToMergedValue(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'rule_schedule',
            expectedFieldsAfterUpgrade: { interval: '2h', from: 'now-1d', to: 'now' },
          },
          getService
        );
      });

      describe('customized, target equals current in a different format (ABB diff case)', () => {
        const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
          installed: {
            type: 'query',
            interval: '60m',
            from: 'now-24h',
            to: 'now',
          },
          patch: {
            interval: '2h',
          },
          upgrade: {
            type: 'query',
            interval: '120m',
            from: 'now-24h',
            to: 'now',
          },
        };

        testFieldUpgradeReview(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'rule_schedule',
            expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
            expectedFieldDiffValues: {
              base: { interval: '60m', from: 'now-24h', to: 'now' },
              current: { interval: '2h', from: 'now-24h', to: 'now' },
              target: { interval: '120m', from: 'now-24h', to: 'now' },
              merged: { interval: '2h', from: 'now-24h', to: 'now' },
            },
          },
          getService
        );

        testFieldUpgradesToMergedValue(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'rule_schedule',
            expectedFieldsAfterUpgrade: { interval: '2h', from: 'now-24h', to: 'now' },
          },
          getService
        );
      });

      describe('without historical versions', () => {
        describe('current equals target in a different format (-AA diff case)', () => {
          const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
            installed: {
              type: 'query',
              interval: '60m',
              from: 'now-24h',
              to: 'now',
            },
            patch: {
              interval: '1h',
              from: 'now-1d',
            },
            upgrade: {
              type: 'query',
              interval: '60m',
              from: 'now-24h',
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

          // Target version is used when the base version is missing
          testFieldUpgradesToMergedValue(
            {
              ruleUpgradeAssets,
              diffableRuleFieldName: 'rule_schedule',
              expectedFieldsAfterUpgrade: { interval: '60m', from: 'now-24h', to: 'now' },
            },
            getService
          );
        });

        describe('customized, current uses a different format than target (-AB diff case)', () => {
          const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
            installed: {
              type: 'query',
              interval: '60m',
              from: 'now-24h',
              to: 'now',
            },
            patch: {
              interval: '1h',
              from: 'now-2d',
            },
            upgrade: {
              type: 'query',
              interval: '60m',
              from: 'now-24h',
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
                current: { interval: '1h', from: 'now-2d', to: 'now' },
                target: { interval: '60m', from: 'now-24h', to: 'now' },
                merged: { interval: '60m', from: 'now-24h', to: 'now' },
              },
            },
            getService
          );

          // Target version is used when the base version is missing
          testFieldUpgradesToMergedValue(
            {
              ruleUpgradeAssets,
              diffableRuleFieldName: 'rule_schedule',
              onConflict: UpgradeConflictResolutionEnum.UPGRADE_SOLVABLE,
              expectedFieldsAfterUpgrade: { interval: '60m', from: 'now-24h', to: 'now' },
            },
            getService
          );
        });
      });
    });
  });
}
