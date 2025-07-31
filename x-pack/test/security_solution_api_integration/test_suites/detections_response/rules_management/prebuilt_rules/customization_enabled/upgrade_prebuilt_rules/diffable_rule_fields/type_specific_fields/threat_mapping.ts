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

export function threatMappingField({ getService }: FtrProviderContext): void {
  describe('"threat_mapping"', () => {
    describe('non-customized without an upgrade (AAA diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'threat_match',
          threat_mapping: [{ entries: [{ type: 'mapping', field: 'fieldA', value: 'fieldZ' }] }],
        },
        patch: {},
        upgrade: {
          type: 'threat_match',
          threat_mapping: [{ entries: [{ type: 'mapping', field: 'fieldA', value: 'fieldZ' }] }],
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'threat_mapping',
          expectedDiffOutcome: ThreeWayDiffOutcome.StockValueNoUpdate,
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'threat_mapping',
          resolvedValue: [
            { entries: [{ type: 'mapping', field: 'resolvedA', value: 'resolvedB' }] },
          ],
          expectedFieldsAfterUpgrade: {
            threat_mapping: [
              { entries: [{ type: 'mapping', field: 'resolvedA', value: 'resolvedB' }] },
            ],
          },
        },
        getService
      );
    });

    describe('non-customized with an upgrade (AAB diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'threat_match',
          threat_mapping: [{ entries: [{ type: 'mapping', field: 'fieldA', value: 'fieldZ' }] }],
        },
        patch: {},
        upgrade: {
          type: 'threat_match',
          threat_mapping: [{ entries: [{ type: 'mapping', field: 'fieldB', value: 'fieldZ' }] }],
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'threat_mapping',
          expectedDiffOutcome: ThreeWayDiffOutcome.StockValueCanUpdate,
          expectedFieldDiffValues: {
            base: [{ entries: [{ type: 'mapping', field: 'fieldA', value: 'fieldZ' }] }],
            current: [{ entries: [{ type: 'mapping', field: 'fieldA', value: 'fieldZ' }] }],
            target: [{ entries: [{ type: 'mapping', field: 'fieldB', value: 'fieldZ' }] }],
            merged: [{ entries: [{ type: 'mapping', field: 'fieldB', value: 'fieldZ' }] }],
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'threat_mapping',
          expectedFieldsAfterUpgrade: {
            threat_mapping: [{ entries: [{ type: 'mapping', field: 'fieldB', value: 'fieldZ' }] }],
          },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'threat_mapping',
          resolvedValue: [
            { entries: [{ type: 'mapping', field: 'resolvedA', value: 'resolvedB' }] },
          ],
          expectedFieldsAfterUpgrade: {
            threat_mapping: [
              { entries: [{ type: 'mapping', field: 'resolvedA', value: 'resolvedB' }] },
            ],
          },
        },
        getService
      );
    });

    describe('customized without an upgrade (ABA diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'threat_match',
          threat_mapping: [{ entries: [{ type: 'mapping', field: 'fieldA', value: 'fieldZ' }] }],
        },
        patch: {
          type: 'threat_match',
          threat_mapping: [{ entries: [{ type: 'mapping', field: 'fieldB', value: 'fieldZ' }] }],
        },
        upgrade: {
          type: 'threat_match',
          threat_mapping: [{ entries: [{ type: 'mapping', field: 'fieldA', value: 'fieldZ' }] }],
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'threat_mapping',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
          expectedFieldDiffValues: {
            base: [{ entries: [{ type: 'mapping', field: 'fieldA', value: 'fieldZ' }] }],
            current: [{ entries: [{ type: 'mapping', field: 'fieldB', value: 'fieldZ' }] }],
            target: [{ entries: [{ type: 'mapping', field: 'fieldA', value: 'fieldZ' }] }],
            merged: [{ entries: [{ type: 'mapping', field: 'fieldB', value: 'fieldZ' }] }],
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'threat_mapping',
          expectedFieldsAfterUpgrade: {
            threat_mapping: [{ entries: [{ type: 'mapping', field: 'fieldB', value: 'fieldZ' }] }],
          },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'threat_mapping',
          resolvedValue: [
            { entries: [{ type: 'mapping', field: 'resolvedA', value: 'resolvedB' }] },
          ],
          expectedFieldsAfterUpgrade: {
            threat_mapping: [
              { entries: [{ type: 'mapping', field: 'resolvedA', value: 'resolvedB' }] },
            ],
          },
        },
        getService
      );
    });

    describe('customized with the matching upgrade (ABB diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'threat_match',
          threat_mapping: [{ entries: [{ type: 'mapping', field: 'fieldA', value: 'fieldZ' }] }],
        },
        patch: {
          type: 'threat_match',
          threat_mapping: [{ entries: [{ type: 'mapping', field: 'fieldB', value: 'fieldZ' }] }],
        },
        upgrade: {
          type: 'threat_match',
          threat_mapping: [{ entries: [{ type: 'mapping', field: 'fieldB', value: 'fieldZ' }] }],
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'threat_mapping',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
          expectedFieldDiffValues: {
            base: [{ entries: [{ type: 'mapping', field: 'fieldA', value: 'fieldZ' }] }],
            current: [{ entries: [{ type: 'mapping', field: 'fieldB', value: 'fieldZ' }] }],
            target: [{ entries: [{ type: 'mapping', field: 'fieldB', value: 'fieldZ' }] }],
            merged: [{ entries: [{ type: 'mapping', field: 'fieldB', value: 'fieldZ' }] }],
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'threat_mapping',
          expectedFieldsAfterUpgrade: {
            threat_mapping: [{ entries: [{ type: 'mapping', field: 'fieldB', value: 'fieldZ' }] }],
          },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'threat_mapping',
          resolvedValue: [
            { entries: [{ type: 'mapping', field: 'resolvedA', value: 'resolvedB' }] },
          ],
          expectedFieldsAfterUpgrade: {
            threat_mapping: [
              { entries: [{ type: 'mapping', field: 'resolvedA', value: 'resolvedB' }] },
            ],
          },
        },
        getService
      );
    });

    describe('customized with an upgrade resulting in a conflict (ABC diff case, non-solvable conflict)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'threat_match',
          threat_mapping: [{ entries: [{ type: 'mapping', field: 'fieldA', value: 'fieldZ' }] }],
        },
        patch: {
          type: 'threat_match',
          threat_mapping: [{ entries: [{ type: 'mapping', field: 'fieldB', value: 'fieldZ' }] }],
        },
        upgrade: {
          type: 'threat_match',
          threat_mapping: [{ entries: [{ type: 'mapping', field: 'fieldC', value: 'fieldZ' }] }],
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'threat_mapping',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
          isSolvableConflict: false,
          expectedFieldDiffValues: {
            base: [{ entries: [{ type: 'mapping', field: 'fieldA', value: 'fieldZ' }] }],
            current: [{ entries: [{ type: 'mapping', field: 'fieldB', value: 'fieldZ' }] }],
            target: [{ entries: [{ type: 'mapping', field: 'fieldC', value: 'fieldZ' }] }],
            merged: [{ entries: [{ type: 'mapping', field: 'fieldB', value: 'fieldZ' }] }],
          },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'threat_mapping',
          resolvedValue: [
            { entries: [{ type: 'mapping', field: 'resolvedA', value: 'resolvedB' }] },
          ],
          expectedFieldsAfterUpgrade: {
            threat_mapping: [
              { entries: [{ type: 'mapping', field: 'resolvedA', value: 'resolvedB' }] },
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
            type: 'threat_match',
            threat_mapping: [{ entries: [{ type: 'mapping', field: 'fieldA', value: 'fieldZ' }] }],
          },
          patch: {
            type: 'threat_match',
            threat_mapping: [{ entries: [{ type: 'mapping', field: 'fieldB', value: 'fieldZ' }] }],
          },
          upgrade: {
            type: 'threat_match',
            threat_mapping: [{ entries: [{ type: 'mapping', field: 'fieldB', value: 'fieldZ' }] }],
          },
          removeInstalledAssets: true,
        };

        testFieldUpgradeReview(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'threat_mapping',
            expectedDiffOutcome: ThreeWayDiffOutcome.MissingBaseNoUpdate,
          },
          getService
        );

        testFieldUpgradesToResolvedValue(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'threat_mapping',
            resolvedValue: [
              { entries: [{ type: 'mapping', field: 'resolvedA', value: 'resolvedB' }] },
            ],
            expectedFieldsAfterUpgrade: {
              threat_mapping: [
                { entries: [{ type: 'mapping', field: 'resolvedA', value: 'resolvedB' }] },
              ],
            },
          },
          getService
        );
      });

      describe('customized with an upgrade (-AB diff case)', () => {
        const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
          installed: {
            type: 'threat_match',
            threat_mapping: [{ entries: [{ type: 'mapping', field: 'fieldA', value: 'fieldZ' }] }],
          },
          patch: {
            type: 'threat_match',
            threat_mapping: [{ entries: [{ type: 'mapping', field: 'fieldB', value: 'fieldZ' }] }],
          },
          upgrade: {
            type: 'threat_match',
            threat_mapping: [{ entries: [{ type: 'mapping', field: 'fieldC', value: 'fieldZ' }] }],
          },
          removeInstalledAssets: true,
        };

        testFieldUpgradeReview(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'threat_mapping',
            expectedDiffOutcome: ThreeWayDiffOutcome.MissingBaseCanUpdate,
            expectedFieldDiffValues: {
              current: [{ entries: [{ type: 'mapping', field: 'fieldB', value: 'fieldZ' }] }],
              target: [{ entries: [{ type: 'mapping', field: 'fieldC', value: 'fieldZ' }] }],
              merged: [{ entries: [{ type: 'mapping', field: 'fieldC', value: 'fieldZ' }] }],
            },
          },
          getService
        );

        testFieldUpgradesToResolvedValue(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'threat_mapping',
            resolvedValue: [
              { entries: [{ type: 'mapping', field: 'resolvedA', value: 'resolvedB' }] },
            ],
            expectedFieldsAfterUpgrade: {
              threat_mapping: [
                { entries: [{ type: 'mapping', field: 'resolvedA', value: 'resolvedB' }] },
              ],
            },
          },
          getService
        );
      });
    });
  });
}
