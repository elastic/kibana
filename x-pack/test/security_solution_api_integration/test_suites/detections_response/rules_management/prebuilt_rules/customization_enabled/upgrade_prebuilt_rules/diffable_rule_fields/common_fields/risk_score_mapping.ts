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

export function riskScoreMappingField({ getService }: FtrProviderContext): void {
  describe('"risk_score_mapping"', () => {
    describe('non-customized without an upgrade (AAA diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          risk_score_mapping: [
            {
              field: 'fieldA',
              operator: 'equals',
              value: '10',
              risk_score: 10,
            },
          ],
        },
        patch: {},
        upgrade: {
          type: 'query',
          risk_score_mapping: [
            {
              field: 'fieldA',
              operator: 'equals',
              value: '10',
              risk_score: 10,
            },
          ],
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'risk_score_mapping',
          expectedDiffOutcome: ThreeWayDiffOutcome.StockValueNoUpdate,
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'risk_score_mapping',
          resolvedValue: [
            {
              field: 'resolved',
              operator: 'equals',
              value: '50',
              risk_score: 50,
            },
          ],
          expectedFieldsAfterUpgrade: {
            risk_score_mapping: [
              {
                field: 'resolved',
                operator: 'equals',
                value: '50',
                risk_score: 50,
              },
            ],
          },
        },
        getService
      );
    });

    describe('non-customized with an upgrade (AAB diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          risk_score_mapping: [
            {
              field: 'fieldA',
              operator: 'equals',
              value: '10',
              risk_score: 10,
            },
          ],
        },
        patch: {},
        upgrade: {
          type: 'query',
          risk_score_mapping: [
            {
              field: 'fieldB',
              operator: 'equals',
              value: '30',
              risk_score: 30,
            },
          ],
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'risk_score_mapping',
          expectedDiffOutcome: ThreeWayDiffOutcome.StockValueCanUpdate,
          expectedFieldDiffValues: {
            base: [
              {
                field: 'fieldA',
                operator: 'equals',
                value: '10',
                risk_score: 10,
              },
            ],
            current: [
              {
                field: 'fieldA',
                operator: 'equals',
                value: '10',
                risk_score: 10,
              },
            ],
            target: [
              {
                field: 'fieldB',
                operator: 'equals',
                value: '30',
                risk_score: 30,
              },
            ],
            merged: [
              {
                field: 'fieldB',
                operator: 'equals',
                value: '30',
                risk_score: 30,
              },
            ],
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'risk_score_mapping',
          expectedFieldsAfterUpgrade: {
            risk_score_mapping: [
              {
                field: 'fieldB',
                operator: 'equals',
                value: '30',
                risk_score: 30,
              },
            ],
          },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'risk_score_mapping',
          resolvedValue: [
            {
              field: 'resolved',
              operator: 'equals',
              value: '50',
              risk_score: 50,
            },
          ],
          expectedFieldsAfterUpgrade: {
            risk_score_mapping: [
              {
                field: 'resolved',
                operator: 'equals',
                value: '50',
                risk_score: 50,
              },
            ],
          },
        },
        getService
      );
    });

    describe('customized without an upgrade (ABA diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          risk_score_mapping: [
            {
              field: 'fieldA',
              operator: 'equals',
              value: '10',
              risk_score: 10,
            },
          ],
        },
        patch: {
          risk_score_mapping: [
            {
              field: 'fieldB',
              operator: 'equals',
              value: '30',
              risk_score: 30,
            },
          ],
        },
        upgrade: {
          type: 'query',
          risk_score_mapping: [
            {
              field: 'fieldA',
              operator: 'equals',
              value: '10',
              risk_score: 10,
            },
          ],
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'risk_score_mapping',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
          expectedFieldDiffValues: {
            base: [
              {
                field: 'fieldA',
                operator: 'equals',
                value: '10',
                risk_score: 10,
              },
            ],
            current: [
              {
                field: 'fieldB',
                operator: 'equals',
                value: '30',
                risk_score: 30,
              },
            ],
            target: [
              {
                field: 'fieldA',
                operator: 'equals',
                value: '10',
                risk_score: 10,
              },
            ],
            merged: [
              {
                field: 'fieldB',
                operator: 'equals',
                value: '30',
                risk_score: 30,
              },
            ],
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'risk_score_mapping',
          expectedFieldsAfterUpgrade: {
            risk_score_mapping: [
              {
                field: 'fieldB',
                operator: 'equals',
                value: '30',
                risk_score: 30,
              },
            ],
          },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'risk_score_mapping',
          resolvedValue: [
            {
              field: 'resolved',
              operator: 'equals',
              value: '50',
              risk_score: 50,
            },
          ],
          expectedFieldsAfterUpgrade: {
            risk_score_mapping: [
              {
                field: 'resolved',
                operator: 'equals',
                value: '50',
                risk_score: 50,
              },
            ],
          },
        },
        getService
      );
    });

    describe('customized with the matching upgrade (ABB diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          risk_score_mapping: [
            {
              field: 'fieldA',
              operator: 'equals',
              value: '10',
              risk_score: 10,
            },
          ],
        },
        patch: {
          risk_score_mapping: [
            {
              field: 'fieldB',
              operator: 'equals',
              value: '30',
              risk_score: 30,
            },
          ],
        },
        upgrade: {
          type: 'query',
          risk_score_mapping: [
            {
              field: 'fieldB',
              operator: 'equals',
              value: '30',
              risk_score: 30,
            },
          ],
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'risk_score_mapping',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
          expectedFieldDiffValues: {
            base: [
              {
                field: 'fieldA',
                operator: 'equals',
                value: '10',
                risk_score: 10,
              },
            ],
            current: [
              {
                field: 'fieldB',
                operator: 'equals',
                value: '30',
                risk_score: 30,
              },
            ],
            target: [
              {
                field: 'fieldB',
                operator: 'equals',
                value: '30',
                risk_score: 30,
              },
            ],
            merged: [
              {
                field: 'fieldB',
                operator: 'equals',
                value: '30',
                risk_score: 30,
              },
            ],
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'risk_score_mapping',
          expectedFieldsAfterUpgrade: {
            risk_score_mapping: [
              {
                field: 'fieldB',
                operator: 'equals',
                value: '30',
                risk_score: 30,
              },
            ],
          },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'risk_score_mapping',
          resolvedValue: [
            {
              field: 'resolved',
              operator: 'equals',
              value: '50',
              risk_score: 50,
            },
          ],
          expectedFieldsAfterUpgrade: {
            risk_score_mapping: [
              {
                field: 'resolved',
                operator: 'equals',
                value: '50',
                risk_score: 50,
              },
            ],
          },
        },
        getService
      );
    });

    describe('customized with an upgrade resulting in a conflict (ABC diff case, non-solvable conflict)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          risk_score_mapping: [
            {
              field: 'fieldA',
              operator: 'equals',
              value: '10',
              risk_score: 10,
            },
          ],
        },
        patch: {
          risk_score_mapping: [
            {
              field: 'fieldB',
              operator: 'equals',
              value: '30',
              risk_score: 30,
            },
          ],
        },
        upgrade: {
          type: 'query',
          risk_score_mapping: [
            {
              field: 'fieldC',
              operator: 'equals',
              value: '50',
              risk_score: 50,
            },
          ],
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'risk_score_mapping',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
          isSolvableConflict: false,
          expectedFieldDiffValues: {
            base: [
              {
                field: 'fieldA',
                operator: 'equals',
                value: '10',
                risk_score: 10,
              },
            ],
            current: [
              {
                field: 'fieldB',
                operator: 'equals',
                value: '30',
                risk_score: 30,
              },
            ],
            target: [
              {
                field: 'fieldC',
                operator: 'equals',
                value: '50',
                risk_score: 50,
              },
            ],
            merged: [
              {
                field: 'fieldB',
                operator: 'equals',
                value: '30',
                risk_score: 30,
              },
            ],
          },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'risk_score_mapping',
          resolvedValue: [
            {
              field: 'resolved',
              operator: 'equals',
              value: '50',
              risk_score: 50,
            },
          ],
          expectedFieldsAfterUpgrade: {
            risk_score_mapping: [
              {
                field: 'resolved',
                operator: 'equals',
                value: '50',
                risk_score: 50,
              },
            ],
          },
        },
        getService
      );
    });

    describe('without historical versions', () => {
      describe('customized with the matching upgrade (-AA diff case)', () => {
        const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
          installed: {
            type: 'query',
            risk_score_mapping: [
              {
                field: 'fieldA',
                operator: 'equals',
                value: '10',
                risk_score: 10,
              },
            ],
          },
          patch: {
            risk_score_mapping: [
              {
                field: 'fieldB',
                operator: 'equals',
                value: '30',
                risk_score: 30,
              },
            ],
          },
          upgrade: {
            type: 'query',
            risk_score_mapping: [
              {
                field: 'fieldB',
                operator: 'equals',
                value: '30',
                risk_score: 30,
              },
            ],
          },
          removeInstalledAssets: true,
        };

        testFieldUpgradeReview(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'risk_score_mapping',
            expectedDiffOutcome: ThreeWayDiffOutcome.MissingBaseNoUpdate,
          },
          getService
        );

        testFieldUpgradesToResolvedValue(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'risk_score_mapping',
            resolvedValue: [
              {
                field: 'resolved',
                operator: 'equals',
                value: '50',
                risk_score: 50,
              },
            ],
            expectedFieldsAfterUpgrade: {
              risk_score_mapping: [
                {
                  field: 'resolved',
                  operator: 'equals',
                  value: '50',
                  risk_score: 50,
                },
              ],
            },
          },
          getService
        );
      });

      describe('customized with an upgrade (-AB diff case)', () => {
        const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
          installed: {
            type: 'query',
            risk_score_mapping: [
              {
                field: 'fieldA',
                operator: 'equals',
                value: '10',
                risk_score: 10,
              },
            ],
          },
          patch: {
            risk_score_mapping: [
              {
                field: 'fieldB',
                operator: 'equals',
                value: '30',
                risk_score: 30,
              },
            ],
          },
          upgrade: {
            type: 'query',
            risk_score_mapping: [
              {
                field: 'fieldC',
                operator: 'equals',
                value: '50',
                risk_score: 50,
              },
            ],
          },
          removeInstalledAssets: true,
        };

        testFieldUpgradeReview(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'risk_score_mapping',
            expectedDiffOutcome: ThreeWayDiffOutcome.MissingBaseCanUpdate,
            expectedFieldDiffValues: {
              current: [
                {
                  field: 'fieldB',
                  operator: 'equals',
                  value: '30',
                  risk_score: 30,
                },
              ],
              target: [
                {
                  field: 'fieldC',
                  operator: 'equals',
                  value: '50',
                  risk_score: 50,
                },
              ],
              merged: [
                {
                  field: 'fieldC',
                  operator: 'equals',
                  value: '50',
                  risk_score: 50,
                },
              ],
            },
          },
          getService
        );

        testFieldUpgradesToResolvedValue(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'risk_score_mapping',
            resolvedValue: [
              {
                field: 'resolved',
                operator: 'equals',
                value: '50',
                risk_score: 50,
              },
            ],
            expectedFieldsAfterUpgrade: {
              risk_score_mapping: [
                {
                  field: 'resolved',
                  operator: 'equals',
                  value: '50',
                  risk_score: 50,
                },
              ],
            },
          },
          getService
        );
      });
    });
  });
}
