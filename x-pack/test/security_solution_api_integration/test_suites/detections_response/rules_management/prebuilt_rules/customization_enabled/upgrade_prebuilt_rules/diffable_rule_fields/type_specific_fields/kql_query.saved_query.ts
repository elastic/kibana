/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Temporally comment contents until https://github.com/elastic/kibana/issues/209343 is fixed

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

export function savedQueryKqlQueryField({ getService }: FtrProviderContext): void {
  describe('"kql_query" with saved query', () => {
    describe('non-customized without an upgrade (AAA diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'saved_query',
          saved_id: 'saved_query_id1',
        },
        patch: {},
        upgrade: {
          type: 'saved_query',
          saved_id: 'saved_query_id1',
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'kql_query',
          expectedDiffOutcome: ThreeWayDiffOutcome.StockValueNoUpdate,
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'kql_query',
          resolvedValue: {
            type: KqlQueryType.saved_query,
            saved_query_id: 'resolved',
          },
          expectedFieldsAfterUpgrade: { saved_id: 'resolved' },
        },
        getService
      );
    });

    describe('non-customized with an upgrade (AAB diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'saved_query',
          saved_id: 'saved_query_id1',
        },
        patch: {},
        upgrade: {
          type: 'saved_query',
          saved_id: 'saved_query_id2',
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'kql_query',
          expectedDiffOutcome: ThreeWayDiffOutcome.StockValueCanUpdate,
          expectedFieldDiffValues: {
            base: {
              saved_query_id: 'saved_query_id1',
            },
            current: {
              saved_query_id: 'saved_query_id1',
            },
            target: {
              saved_query_id: 'saved_query_id2',
            },
            merged: {
              saved_query_id: 'saved_query_id2',
            },
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'kql_query',
          expectedFieldsAfterUpgrade: { saved_id: 'saved_query_id2' },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'kql_query',
          resolvedValue: {
            type: KqlQueryType.saved_query,
            saved_query_id: 'resolved',
          },
          expectedFieldsAfterUpgrade: { saved_id: 'resolved' },
        },
        getService
      );
    });

    describe('customized without an upgrade (ABA diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'saved_query',
          saved_id: 'saved_query_id1',
        },
        patch: {
          type: 'saved_query',
          saved_id: 'saved_query_id2',
        },
        upgrade: {
          type: 'saved_query',
          saved_id: 'saved_query_id1',
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'kql_query',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
          expectedFieldDiffValues: {
            base: {
              saved_query_id: 'saved_query_id1',
            },
            current: {
              saved_query_id: 'saved_query_id2',
            },
            target: {
              saved_query_id: 'saved_query_id1',
            },
            merged: {
              saved_query_id: 'saved_query_id2',
            },
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'kql_query',
          expectedFieldsAfterUpgrade: { saved_id: 'saved_query_id2' },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'kql_query',
          resolvedValue: {
            type: KqlQueryType.saved_query,
            saved_query_id: 'resolved',
          },
          expectedFieldsAfterUpgrade: { saved_id: 'resolved' },
        },
        getService
      );
    });

    describe('customized with the matching upgrade (ABB diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'saved_query',
          saved_id: 'saved_query_id1',
        },
        patch: {
          type: 'saved_query',
          saved_id: 'saved_query_id2',
        },
        upgrade: {
          type: 'saved_query',
          saved_id: 'saved_query_id2',
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'kql_query',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
          expectedFieldDiffValues: {
            base: {
              saved_query_id: 'saved_query_id1',
            },
            current: {
              saved_query_id: 'saved_query_id2',
            },
            target: {
              saved_query_id: 'saved_query_id2',
            },
            merged: {
              saved_query_id: 'saved_query_id2',
            },
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'kql_query',
          expectedFieldsAfterUpgrade: { saved_id: 'saved_query_id2' },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'kql_query',
          resolvedValue: {
            type: KqlQueryType.saved_query,
            saved_query_id: 'resolved',
          },
          expectedFieldsAfterUpgrade: { saved_id: 'resolved' },
        },
        getService
      );
    });

    describe('customized with an upgrade resulting in a conflict (ABC diff case, non-solvable conflict)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'saved_query',
          saved_id: 'saved_query_id1',
        },
        patch: {
          type: 'saved_query',
          saved_id: 'saved_query_id2',
        },
        upgrade: {
          type: 'saved_query',
          saved_id: 'saved_query_id3',
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'kql_query',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
          isSolvableConflict: false,
          expectedFieldDiffValues: {
            base: {
              saved_query_id: 'saved_query_id1',
            },
            current: {
              saved_query_id: 'saved_query_id2',
            },
            target: {
              saved_query_id: 'saved_query_id3',
            },
            merged: {
              saved_query_id: 'saved_query_id2',
            },
          },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'kql_query',
          resolvedValue: {
            type: KqlQueryType.saved_query,
            saved_query_id: 'resolved',
          },
          expectedFieldsAfterUpgrade: { saved_id: 'resolved' },
        },
        getService
      );
    });

    describe('without historical versions', () => {
      describe('customized with the matching upgrade (-AA diff case)', () => {
        const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
          installed: {
            type: 'saved_query',
            saved_id: 'saved_query_id1',
          },
          patch: {
            type: 'saved_query',
            saved_id: 'saved_query_id2',
          },
          upgrade: {
            type: 'saved_query',
            saved_id: 'saved_query_id2',
          },
          removeInstalledAssets: true,
        };

        testFieldUpgradeReview(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'kql_query',
            expectedDiffOutcome: ThreeWayDiffOutcome.MissingBaseNoUpdate,
          },
          getService
        );

        testFieldUpgradesToResolvedValue(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'kql_query',
            resolvedValue: {
              type: KqlQueryType.saved_query,
              saved_query_id: 'resolved',
            },
            expectedFieldsAfterUpgrade: { saved_id: 'resolved' },
          },
          getService
        );
      });

      describe('customized with an upgrade (-AB diff case)', () => {
        const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
          installed: {
            type: 'saved_query',
            saved_id: 'saved_query_id1',
          },
          patch: {
            type: 'saved_query',
            saved_id: 'saved_query_id2',
          },
          upgrade: {
            type: 'saved_query',
            saved_id: 'saved_query_id3',
          },
          removeInstalledAssets: true,
        };

        testFieldUpgradeReview(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'kql_query',
            expectedDiffOutcome: ThreeWayDiffOutcome.MissingBaseCanUpdate,
            expectedFieldDiffValues: {
              current: {
                saved_query_id: 'saved_query_id2',
              },
              target: {
                saved_query_id: 'saved_query_id3',
              },
              merged: {
                saved_query_id: 'saved_query_id3',
              },
            },
          },
          getService
        );

        testFieldUpgradesToResolvedValue(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'kql_query',
            resolvedValue: {
              type: KqlQueryType.saved_query,
              saved_query_id: 'resolved',
            },
            expectedFieldsAfterUpgrade: { saved_id: 'resolved' },
          },
          getService
        );
      });
    });
  });
}
