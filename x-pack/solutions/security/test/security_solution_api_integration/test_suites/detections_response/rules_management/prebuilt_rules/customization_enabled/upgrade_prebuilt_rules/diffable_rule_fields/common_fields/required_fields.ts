/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ThreeWayDiffOutcome } from '@kbn/security-solution-plugin/common/api/detection_engine';
import type { FtrProviderContext } from '../../../../../../../../ftr_provider_context';
import type { TestFieldRuleUpgradeAssets } from '../test_helpers';
import {
  testFieldUpgradeReview,
  testFieldUpgradesToMergedValue,
  testFieldUpgradesToResolvedValue,
} from '../test_helpers';

export function requiredFieldsField({ getService }: FtrProviderContext): void {
  describe('"required_fields"', () => {
    describe('non-customized without an upgrade (AAA diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          required_fields: [
            {
              name: 'fieldA',
              type: 'string',
            },
          ],
        },
        patch: {},
        upgrade: {
          type: 'query',
          required_fields: [
            {
              name: 'fieldA',
              type: 'string',
            },
          ],
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'required_fields',
          expectedDiffOutcome: ThreeWayDiffOutcome.StockValueNoUpdate,
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'required_fields',
          resolvedValue: [
            {
              name: 'resolved',
              type: 'string',
              ecs: false,
            },
          ],
          expectedFieldsAfterUpgrade: {
            required_fields: [
              {
                name: 'resolved',
                type: 'string',
                ecs: false,
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
          required_fields: [
            {
              name: 'fieldA',
              type: 'string',
            },
          ],
        },
        patch: {},
        upgrade: {
          type: 'query',
          required_fields: [
            {
              name: 'fieldB',
              type: 'string',
            },
          ],
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'required_fields',
          expectedDiffOutcome: ThreeWayDiffOutcome.StockValueCanUpdate,
          expectedFieldDiffValues: {
            base: [
              {
                name: 'fieldA',
                type: 'string',
                ecs: false,
              },
            ],
            current: [
              {
                name: 'fieldA',
                type: 'string',
                ecs: false,
              },
            ],
            target: [
              {
                name: 'fieldB',
                type: 'string',
                ecs: false,
              },
            ],
            merged: [
              {
                name: 'fieldB',
                type: 'string',
                ecs: false,
              },
            ],
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'required_fields',
          expectedFieldsAfterUpgrade: {
            required_fields: [
              {
                name: 'fieldB',
                type: 'string',
                ecs: false,
              },
            ],
          },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'required_fields',
          resolvedValue: [
            {
              name: 'resolved',
              type: 'string',
              ecs: false,
            },
          ],
          expectedFieldsAfterUpgrade: {
            required_fields: [
              {
                name: 'resolved',
                type: 'string',
                ecs: false,
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
          required_fields: [
            {
              name: 'fieldA',
              type: 'string',
            },
          ],
        },
        patch: {
          required_fields: [
            {
              name: 'fieldB',
              type: 'string',
              ecs: false,
            },
          ],
        },
        upgrade: {
          type: 'query',
          required_fields: [
            {
              name: 'fieldA',
              type: 'string',
            },
          ],
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'required_fields',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
          expectedFieldDiffValues: {
            base: [
              {
                name: 'fieldA',
                type: 'string',
                ecs: false,
              },
            ],
            current: [
              {
                name: 'fieldB',
                type: 'string',
                ecs: false,
              },
            ],
            target: [
              {
                name: 'fieldA',
                type: 'string',
                ecs: false,
              },
            ],
            merged: [
              {
                name: 'fieldB',
                type: 'string',
                ecs: false,
              },
            ],
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'required_fields',
          expectedFieldsAfterUpgrade: {
            required_fields: [
              {
                name: 'fieldB',
                type: 'string',
                ecs: false,
              },
            ],
          },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'required_fields',
          resolvedValue: [
            {
              name: 'resolved',
              type: 'string',
              ecs: false,
            },
          ],
          expectedFieldsAfterUpgrade: {
            required_fields: [
              {
                name: 'resolved',
                type: 'string',
                ecs: false,
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
          required_fields: [
            {
              name: 'fieldA',
              type: 'string',
            },
          ],
        },
        patch: {
          required_fields: [
            {
              name: 'fieldB',
              type: 'string',
              ecs: false,
            },
          ],
        },
        upgrade: {
          type: 'query',
          required_fields: [
            {
              name: 'fieldB',
              type: 'string',
            },
          ],
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'required_fields',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
          expectedFieldDiffValues: {
            base: [
              {
                name: 'fieldA',
                type: 'string',
                ecs: false,
              },
            ],
            current: [
              {
                name: 'fieldB',
                type: 'string',
                ecs: false,
              },
            ],
            target: [
              {
                name: 'fieldB',
                type: 'string',
                ecs: false,
              },
            ],
            merged: [
              {
                name: 'fieldB',
                type: 'string',
                ecs: false,
              },
            ],
          },
        },
        getService
      );

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'required_fields',
          expectedFieldsAfterUpgrade: {
            required_fields: [
              {
                name: 'fieldB',
                type: 'string',
                ecs: false,
              },
            ],
          },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'required_fields',
          resolvedValue: [
            {
              name: 'resolved',
              type: 'string',
              ecs: false,
            },
          ],
          expectedFieldsAfterUpgrade: {
            required_fields: [
              {
                name: 'resolved',
                type: 'string',
                ecs: false,
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
          required_fields: [
            {
              name: 'fieldA',
              type: 'string',
            },
          ],
        },
        patch: {
          required_fields: [
            {
              name: 'fieldB',
              type: 'string',
              ecs: false,
            },
          ],
        },
        upgrade: {
          type: 'query',
          required_fields: [
            {
              name: 'fieldC',
              type: 'string',
            },
          ],
        },
      };

      testFieldUpgradeReview(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'required_fields',
          expectedDiffOutcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
          isSolvableConflict: false,
          expectedFieldDiffValues: {
            base: [
              {
                name: 'fieldA',
                type: 'string',
                ecs: false,
              },
            ],
            current: [
              {
                name: 'fieldB',
                type: 'string',
                ecs: false,
              },
            ],
            target: [
              {
                name: 'fieldC',
                type: 'string',
                ecs: false,
              },
            ],
            merged: [
              {
                name: 'fieldB',
                type: 'string',
                ecs: false,
              },
            ],
          },
        },
        getService
      );

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'required_fields',
          resolvedValue: [
            {
              name: 'resolved',
              type: 'string',
              ecs: false,
            },
          ],
          expectedFieldsAfterUpgrade: {
            required_fields: [
              {
                name: 'resolved',
                type: 'string',
                ecs: false,
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
            required_fields: [
              {
                name: 'fieldA',
                type: 'string',
              },
            ],
          },
          patch: {
            required_fields: [
              {
                name: 'fieldB',
                type: 'string',
                ecs: false,
              },
            ],
          },
          upgrade: {
            type: 'query',
            required_fields: [
              {
                name: 'fieldB',
                type: 'string',
              },
            ],
          },
          removeInstalledAssets: true,
        };

        testFieldUpgradeReview(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'required_fields',
            expectedDiffOutcome: ThreeWayDiffOutcome.MissingBaseNoUpdate,
          },
          getService
        );

        testFieldUpgradesToResolvedValue(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'required_fields',
            resolvedValue: [
              {
                name: 'resolved',
                type: 'string',
                ecs: false,
              },
            ],
            expectedFieldsAfterUpgrade: {
              required_fields: [
                {
                  name: 'resolved',
                  type: 'string',
                  ecs: false,
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
            required_fields: [
              {
                name: 'fieldA',
                type: 'string',
              },
            ],
          },
          patch: {
            required_fields: [
              {
                name: 'fieldB',
                type: 'string',
                ecs: false,
              },
            ],
          },
          upgrade: {
            type: 'query',
            required_fields: [
              {
                name: 'fieldC',
                type: 'string',
              },
            ],
          },
          removeInstalledAssets: true,
        };

        testFieldUpgradeReview(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'required_fields',
            expectedDiffOutcome: ThreeWayDiffOutcome.MissingBaseCanUpdate,
            expectedFieldDiffValues: {
              current: [
                {
                  name: 'fieldB',
                  type: 'string',
                  ecs: false,
                },
              ],
              target: [
                {
                  name: 'fieldC',
                  type: 'string',
                  ecs: false,
                },
              ],
              merged: [
                {
                  name: 'fieldC',
                  type: 'string',
                  ecs: false,
                },
              ],
            },
          },
          getService
        );

        testFieldUpgradesToResolvedValue(
          {
            ruleUpgradeAssets,
            diffableRuleFieldName: 'required_fields',
            resolvedValue: [
              {
                name: 'resolved',
                type: 'string',
                ecs: false,
              },
            ],
            expectedFieldsAfterUpgrade: {
              required_fields: [
                {
                  name: 'resolved',
                  type: 'string',
                  ecs: false,
                },
              ],
            },
          },
          getService
        );
      });
    });

    describe('resolving a "required_fields" conflict with a value that omits "ecs"', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          required_fields: [
            {
              name: 'fieldA',
              type: 'string',
            },
          ],
        },
        patch: {
          required_fields: [
            {
              name: 'fieldB',
              type: 'string',
              ecs: false,
            },
          ],
        },
        upgrade: {
          type: 'query',
          required_fields: [
            {
              name: 'fieldC',
              type: 'string',
            },
          ],
        },
      };

      testFieldUpgradesToResolvedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'required_fields',
          // No `ecs` on the resolved value, exactly like the UI sends it.
          resolvedValue: [
            {
              name: '@timestamp',
              type: 'date',
            },
            {
              name: 'winlog.event_data.CustomField',
              type: 'keyword',
            },
          ],
          // The server recomputes `ecs`: `true` for the ECS field, `false` for
          // the non-ECS one.
          expectedFieldsAfterUpgrade: {
            required_fields: [
              {
                name: '@timestamp',
                type: 'date',
                ecs: true,
              },
              {
                name: 'winlog.event_data.CustomField',
                type: 'keyword',
                ecs: false,
              },
            ],
          },
        },
        getService
      );
    });
  });
}
