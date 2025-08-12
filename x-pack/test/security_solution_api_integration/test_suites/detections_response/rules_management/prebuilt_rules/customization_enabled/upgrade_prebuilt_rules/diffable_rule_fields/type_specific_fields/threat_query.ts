/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  KqlQueryType,
  ThreeWayDiffOutcome,
} from '@kbn/security-solution-plugin/common/api/detection_engine';
import { FtrProviderContext } from '../../../../../../../../ftr_provider_context';
import type { TestFieldRuleUpgradeAssets } from '../test_helpers';
import {
  testFieldUpgradeReview,
  testFieldUpgradesToMergedValue,
  testFieldUpgradesToResolvedValue,
} from '../test_helpers';

export function threatQueryField({ getService }: FtrProviderContext): void {
  describe('"threat_query"', () => {
    describe('non-customized without an upgrade (AAA diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'threat_match',
          threat_query: 'process.name:*.exe',
        },
        patch: {},
        upgrade: {
          type: 'threat_match',
          threat_query: 'process.name:*.exe',
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'threat_query',
          expectedDiffOutcome: ThreeWayDiffOutcome.StockValueNoUpdate,
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'threat_query',
          resolvedValue: {
            type: KqlQueryType.inline_query,
            query: 'resolved:*',
            language: 'kuery',
            filters: [],
          },
          expectedFieldsAfterUpgrade: { threat_query: 'resolved:*', threat_language: 'kuery' },
        },
        getService
      );
    });

    describe('non-customized with an upgrade (AAB diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'threat_match',
          threat_query: 'process.name:*.exe',
        },
        patch: {},
        upgrade: {
          type: 'threat_match',
          threat_query: 'process.name:*.sys',
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'threat_query',
          expectedDiffOutcome: ThreeWayDiffOutcome.StockValueCanUpdate,
          expectedFieldDiffValues: {
            base: {
              type: KqlQueryType.inline_query,
              query: 'process.name:*.exe',
              language: 'kuery',
              filters: [],
            },
            current: {
              type: KqlQueryType.inline_query,
              query: 'process.name:*.exe',
              language: 'kuery',
              filters: [],
            },
            target: {
              type: KqlQueryType.inline_query,
              query: 'process.name:*.sys',
              language: 'kuery',
              filters: [],
            },
            merged: {
              type: KqlQueryType.inline_query,
              query: 'process.name:*.sys',
              language: 'kuery',
              filters: [],
            },
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'threat_query',
          expectedFieldsAfterUpgrade: {
            threat_query: 'process.name:*.sys',
            threat_language: 'kuery',
          },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'threat_query',
          resolvedValue: {
            type: KqlQueryType.inline_query,
            query: 'resolved:*',
            language: 'kuery',
            filters: [],
          },
          expectedFieldsAfterUpgrade: { threat_query: 'resolved:*', threat_language: 'kuery' },
        },
        getService
      );
    });

    describe('customized without an upgrade (ABA diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'threat_match',
          threat_query: 'process.name:*.exe',
        },
        patch: {
          type: 'threat_match',
          threat_query: 'process.name:*.sys',
        },
        upgrade: {
          type: 'threat_match',
          threat_query: 'process.name:*.exe',
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'threat_query',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
          expectedFieldDiffValues: {
            base: {
              type: KqlQueryType.inline_query,
              query: 'process.name:*.exe',
              language: 'kuery',
              filters: [],
            },
            current: {
              type: KqlQueryType.inline_query,
              query: 'process.name:*.sys',
              language: 'kuery',
              filters: [],
            },
            target: {
              type: KqlQueryType.inline_query,
              query: 'process.name:*.exe',
              language: 'kuery',
              filters: [],
            },
            merged: {
              type: KqlQueryType.inline_query,
              query: 'process.name:*.sys',
              language: 'kuery',
              filters: [],
            },
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'threat_query',
          expectedFieldsAfterUpgrade: {
            threat_query: 'process.name:*.sys',
            threat_language: 'kuery',
          },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'threat_query',
          resolvedValue: {
            type: KqlQueryType.inline_query,
            query: 'resolved:*',
            language: 'kuery',
            filters: [],
          },
          expectedFieldsAfterUpgrade: { threat_query: 'resolved:*', threat_language: 'kuery' },
        },
        getService
      );
    });

    describe('customized with the matching upgrade (ABB diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'threat_match',
          threat_query: 'process.name:*.exe',
        },
        patch: {
          type: 'threat_match',
          threat_query: 'process.name:*.sys',
        },
        upgrade: {
          type: 'threat_match',
          threat_query: 'process.name:*.sys',
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'threat_query',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
          expectedFieldDiffValues: {
            base: {
              type: KqlQueryType.inline_query,
              query: 'process.name:*.exe',
              language: 'kuery',
              filters: [],
            },
            current: {
              type: KqlQueryType.inline_query,
              query: 'process.name:*.sys',
              language: 'kuery',
              filters: [],
            },
            target: {
              type: KqlQueryType.inline_query,
              query: 'process.name:*.sys',
              language: 'kuery',
              filters: [],
            },
            merged: {
              type: KqlQueryType.inline_query,
              query: 'process.name:*.sys',
              language: 'kuery',
              filters: [],
            },
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'threat_query',
          expectedFieldsAfterUpgrade: {
            threat_query: 'process.name:*.sys',
            threat_language: 'kuery',
          },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'threat_query',
          resolvedValue: {
            type: KqlQueryType.inline_query,
            query: 'resolved:*',
            language: 'kuery',
            filters: [],
          },
          expectedFieldsAfterUpgrade: { threat_query: 'resolved:*', threat_language: 'kuery' },
        },
        getService
      );
    });

    describe('customized with an upgrade resulting in a conflict (ABC diff case, non-solvable conflict)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'threat_match',
          threat_query: 'process.name:*.exe',
        },
        patch: {
          type: 'threat_match',
          threat_query: 'process.name:*.sys',
        },
        upgrade: {
          type: 'threat_match',
          threat_query: 'process.name:*.com',
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'threat_query',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
          isSolvableConflict: false,
          expectedFieldDiffValues: {
            base: {
              type: KqlQueryType.inline_query,
              query: 'process.name:*.exe',
              language: 'kuery',
              filters: [],
            },
            current: {
              type: KqlQueryType.inline_query,
              query: 'process.name:*.sys',
              language: 'kuery',
              filters: [],
            },
            target: {
              type: KqlQueryType.inline_query,
              query: 'process.name:*.com',
              language: 'kuery',
              filters: [],
            },
            merged: {
              type: KqlQueryType.inline_query,
              query: 'process.name:*.sys',
              language: 'kuery',
              filters: [],
            },
          },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'threat_query',
          resolvedValue: {
            type: KqlQueryType.inline_query,
            query: 'resolved:*',
            language: 'kuery',
            filters: [],
          },
          expectedFieldsAfterUpgrade: { threat_query: 'resolved:*', threat_language: 'kuery' },
        },
        getService
      );
    });

    describe('without historical versions', () => {
      describe('customized with the matching upgrade (-AA diff case)', () => {
        const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
          installed: {
            type: 'threat_match',
            threat_query: 'process.name:*.exe',
          },
          patch: {
            type: 'threat_match',
            threat_query: 'process.name:*.sys',
          },
          upgrade: {
            type: 'threat_match',
            threat_query: 'process.name:*.sys',
          },
          removeInstalledAssets: true,
        };

        testFieldUpgradeReview(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'threat_query',
            expectedDiffOutcome: ThreeWayDiffOutcome.MissingBaseNoUpdate,
          },
          getService
        );

        testFieldUpgradesToResolvedValue(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'threat_query',
            resolvedValue: {
              type: KqlQueryType.inline_query,
              query: 'resolved:*',
              language: 'kuery',
              filters: [],
            },
            expectedFieldsAfterUpgrade: { threat_query: 'resolved:*', threat_language: 'kuery' },
          },
          getService
        );
      });

      describe('customized with an upgrade (-AB diff case)', () => {
        const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
          installed: {
            type: 'threat_match',
            threat_query: 'process.name:*.exe',
          },
          patch: {
            type: 'threat_match',
            threat_query: 'process.name:*.sys',
          },
          upgrade: {
            type: 'threat_match',
            threat_query: 'process.name:*.com',
          },
          removeInstalledAssets: true,
        };

        testFieldUpgradeReview(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'threat_query',
            expectedDiffOutcome: ThreeWayDiffOutcome.MissingBaseCanUpdate,
            expectedFieldDiffValues: {
              current: {
                type: KqlQueryType.inline_query,
                query: 'process.name:*.sys',
                language: 'kuery',
                filters: [],
              },
              target: {
                type: KqlQueryType.inline_query,
                query: 'process.name:*.com',
                language: 'kuery',
                filters: [],
              },
              merged: {
                type: KqlQueryType.inline_query,
                query: 'process.name:*.com',
                language: 'kuery',
                filters: [],
              },
            },
          },
          getService
        );

        testFieldUpgradesToResolvedValue(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'threat_query',
            resolvedValue: {
              type: KqlQueryType.inline_query,
              query: 'resolved:*',
              language: 'kuery',
              filters: [],
            },
            expectedFieldsAfterUpgrade: { threat_query: 'resolved:*', threat_language: 'kuery' },
          },
          getService
        );
      });
    });
  });
}
