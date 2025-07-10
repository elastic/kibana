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

export function esqlQueryField({ getService }: FtrProviderContext): void {
  describe('"esql_query"', () => {
    describe('non-customized without an upgrade (AAA diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'esql',
          query: 'FROM indexA METADATA _id',
          language: 'esql',
        },
        patch: {},
        upgrade: {
          type: 'esql',
          query: 'FROM indexA METADATA _id',
          language: 'esql',
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'esql_query',
          expectedDiffOutcome: ThreeWayDiffOutcome.StockValueNoUpdate,
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'esql_query',
          resolvedValue: { query: 'FROM resolved METADATA _id', language: 'esql' },
          expectedFieldsAfterUpgrade: { query: 'FROM resolved METADATA _id', language: 'esql' },
        },
        getService
      );
    });

    describe('non-customized with an upgrade (AAB diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'esql',
          query: 'FROM indexA METADATA _id',
          language: 'esql',
        },
        patch: {},
        upgrade: {
          type: 'esql',
          query: 'FROM indexB METADATA _id',
          language: 'esql',
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'esql_query',
          expectedDiffOutcome: ThreeWayDiffOutcome.StockValueCanUpdate,
          expectedFieldDiffValues: {
            base: {
              query: 'FROM indexA METADATA _id',
              language: 'esql',
            },
            current: {
              query: 'FROM indexA METADATA _id',
              language: 'esql',
            },
            target: {
              query: 'FROM indexB METADATA _id',
              language: 'esql',
            },
            merged: {
              query: 'FROM indexB METADATA _id',
              language: 'esql',
            },
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'esql_query',
          expectedFieldsAfterUpgrade: { query: 'FROM indexB METADATA _id', language: 'esql' },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'esql_query',
          resolvedValue: { query: 'FROM resolved METADATA _id', language: 'esql' },
          expectedFieldsAfterUpgrade: { query: 'FROM resolved METADATA _id', language: 'esql' },
        },
        getService
      );
    });

    describe('customized without an upgrade (ABA diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'esql',
          query: 'FROM indexA METADATA _id',
          language: 'esql',
        },
        patch: {
          type: 'esql',
          query: 'FROM indexB METADATA _id',
          language: 'esql',
        },
        upgrade: {
          type: 'esql',
          query: 'FROM indexA METADATA _id',
          language: 'esql',
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'esql_query',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
          expectedFieldDiffValues: {
            base: {
              query: 'FROM indexA METADATA _id',
              language: 'esql',
            },
            current: {
              query: 'FROM indexB METADATA _id',
              language: 'esql',
            },
            target: {
              query: 'FROM indexA METADATA _id',
              language: 'esql',
            },
            merged: {
              query: 'FROM indexB METADATA _id',
              language: 'esql',
            },
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'esql_query',
          expectedFieldsAfterUpgrade: { query: 'FROM indexB METADATA _id', language: 'esql' },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'esql_query',
          resolvedValue: { query: 'FROM resolved METADATA _id', language: 'esql' },
          expectedFieldsAfterUpgrade: { query: 'FROM resolved METADATA _id', language: 'esql' },
        },
        getService
      );
    });

    describe('customized with the matching upgrade (ABB diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'esql',
          query: 'FROM indexA METADATA _id',
          language: 'esql',
        },
        patch: {
          type: 'esql',
          query: 'FROM indexB METADATA _id',
          language: 'esql',
        },
        upgrade: {
          type: 'esql',
          query: 'FROM indexB METADATA _id',
          language: 'esql',
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'esql_query',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
          expectedFieldDiffValues: {
            base: {
              query: 'FROM indexA METADATA _id',
              language: 'esql',
            },
            current: {
              query: 'FROM indexB METADATA _id',
              language: 'esql',
            },
            target: {
              query: 'FROM indexB METADATA _id',
              language: 'esql',
            },
            merged: {
              query: 'FROM indexB METADATA _id',
              language: 'esql',
            },
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'esql_query',
          expectedFieldsAfterUpgrade: { query: 'FROM indexB METADATA _id', language: 'esql' },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'esql_query',
          resolvedValue: { query: 'FROM resolved METADATA _id', language: 'esql' },
          expectedFieldsAfterUpgrade: { query: 'FROM resolved METADATA _id', language: 'esql' },
        },
        getService
      );
    });

    describe('customized with an upgrade resulting in a conflict (ABC diff case, non-solvable conflict)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'esql',
          query: 'FROM indexA METADATA _id',
          language: 'esql',
        },
        patch: {
          type: 'esql',
          query: 'FROM indexB METADATA _id',
          language: 'esql',
        },
        upgrade: {
          type: 'esql',
          query: 'FROM indexC METADATA _id',
          language: 'esql',
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'esql_query',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
          isSolvableConflict: false,
          expectedFieldDiffValues: {
            base: {
              query: 'FROM indexA METADATA _id',
              language: 'esql',
            },
            current: {
              query: 'FROM indexB METADATA _id',
              language: 'esql',
            },
            target: {
              query: 'FROM indexC METADATA _id',
              language: 'esql',
            },
            merged: {
              query: 'FROM indexB METADATA _id',
              language: 'esql',
            },
          },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'esql_query',
          resolvedValue: { query: 'FROM resolved METADATA _id', language: 'esql' },
          expectedFieldsAfterUpgrade: { query: 'FROM resolved METADATA _id', language: 'esql' },
        },
        getService
      );
    });

    describe('without historical versions', () => {
      describe('customized with the matching upgrade (-AA diff case)', () => {
        const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
          installed: {
            type: 'esql',
            query: 'FROM indexA METADATA _id',
            language: 'esql',
          },
          patch: {
            type: 'esql',
            query: 'FROM indexB METADATA _id',
            language: 'esql',
          },
          upgrade: {
            type: 'esql',
            query: 'FROM indexB METADATA _id',
            language: 'esql',
          },
          removeInstalledAssets: true,
        };

        testFieldUpgradeReview(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'esql_query',
            expectedDiffOutcome: ThreeWayDiffOutcome.MissingBaseNoUpdate,
          },
          getService
        );

        testFieldUpgradesToResolvedValue(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'esql_query',
            resolvedValue: { query: 'FROM resolved METADATA _id', language: 'esql' },
            expectedFieldsAfterUpgrade: { query: 'FROM resolved METADATA _id', language: 'esql' },
          },
          getService
        );
      });

      describe('customized with an upgrade (-AB diff case)', () => {
        const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
          installed: {
            type: 'esql',
            query: 'FROM indexA METADATA _id',
            language: 'esql',
          },
          patch: {
            type: 'esql',
            query: 'FROM indexB METADATA _id',
            language: 'esql',
          },
          upgrade: {
            type: 'esql',
            query: 'FROM indexC METADATA _id',
            language: 'esql',
          },
          removeInstalledAssets: true,
        };

        testFieldUpgradeReview(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'esql_query',
            expectedDiffOutcome: ThreeWayDiffOutcome.MissingBaseCanUpdate,
            expectedFieldDiffValues: {
              current: {
                query: 'FROM indexB METADATA _id',
                language: 'esql',
              },
              target: {
                query: 'FROM indexC METADATA _id',
                language: 'esql',
              },
              merged: {
                query: 'FROM indexC METADATA _id',
                language: 'esql',
              },
            },
          },
          getService
        );

        testFieldUpgradesToResolvedValue(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'esql_query',
            resolvedValue: { query: 'FROM resolved METADATA _id', language: 'esql' },
            expectedFieldsAfterUpgrade: { query: 'FROM resolved METADATA _id', language: 'esql' },
          },
          getService
        );
      });
    });
  });
}
