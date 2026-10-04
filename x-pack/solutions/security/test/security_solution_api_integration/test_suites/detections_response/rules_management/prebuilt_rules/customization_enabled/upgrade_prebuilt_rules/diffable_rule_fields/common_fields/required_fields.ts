/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import {
  ModeEnum,
  ThreeWayDiffConflict,
  ThreeWayDiffOutcome,
  ThreeWayMergeOutcome,
  UpgradeConflictResolutionEnum,
} from '@kbn/security-solution-plugin/common/api/detection_engine';
import type { FtrProviderContext } from '../../../../../../../../ftr_provider_context';
import {
  DEFAULT_RULE_UPDATE_VERSION,
  DEFAULT_TEST_RULE_ID,
  setUpRuleUpgrade,
} from '../../../../../../utils/rules/prebuilt_rules/set_up_rule_upgrade';
import {
  fetchFirstPrebuiltRuleUpgradeReviewDiff,
  performUpgradePrebuiltRules,
} from '../../../../../../utils';
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

    describe('customized with an upgrade resulting in a conflict (ABC diff case, solvable conflict)', () => {
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
          isSolvableConflict: true,
          expectedMergeOutcome: ThreeWayMergeOutcome.Target,
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
                name: 'fieldC',
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
          onConflict: UpgradeConflictResolutionEnum.UPGRADE_SOLVABLE,
          diffableRuleFieldName: 'required_fields',
          expectedFieldsAfterUpgrade: {
            required_fields: [
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

    describe('reordered without an upgrade (AAA diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          required_fields: [
            {
              name: 'fieldA',
              type: 'string',
            },
            {
              name: 'fieldB',
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
            {
              name: 'fieldA',
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
          expectedDiffOutcome: ThreeWayDiffOutcome.StockValueNoUpdate,
        },
        getService
      );
    });

    describe('reordered with an upgrade (AAB diff case)', () => {
      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          required_fields: [
            {
              name: 'fieldA',
              type: 'string',
            },
            {
              name: 'fieldB',
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
            {
              name: 'fieldA',
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
          expectedDiffOutcome: ThreeWayDiffOutcome.StockValueCanUpdate,
          expectedFieldDiffValues: {
            base: [
              {
                name: 'fieldA',
                type: 'string',
                ecs: false,
              },
              {
                name: 'fieldB',
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
              {
                name: 'fieldA',
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
              {
                name: 'fieldC',
                type: 'string',
                ecs: false,
              },
            ],
            merged: [
              {
                name: 'fieldA',
                type: 'string',
                ecs: false,
              },
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

      testFieldUpgradesToMergedValue(
        {
          ruleUpgradeAssets,
          diffableRuleFieldName: 'required_fields',
          expectedFieldsAfterUpgrade: {
            required_fields: [
              {
                name: 'fieldA',
                type: 'string',
                ecs: false,
              },
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
    });

    describe('shipped required fields list shrinks while the installed rule has a stale bloated list', () => {
      const es = getService('es');
      const supertest = getService('supertest');
      const log = getService('log');
      const detectionsApi = getService('detectionsApi');
      const deps = { es, supertest, log, detectionsApi };

      const bloatedRequiredFields = Array.from({ length: 50 }, (_, i) => ({
        name: `field${i}`,
        type: 'keyword',
        ecs: false,
      }));
      const targetRequiredFields = bloatedRequiredFields.slice(0, 5);

      const ruleUpgradeAssets: TestFieldRuleUpgradeAssets = {
        installed: {
          type: 'query',
          required_fields: bloatedRequiredFields.slice(0, 3),
        },
        // Emulates a stale stored list flagged as customized after the package rewrote the base version
        patch: {
          required_fields: bloatedRequiredFields,
        },
        upgrade: {
          type: 'query',
          required_fields: targetRequiredFields,
        },
      };

      it('upgrades to the target list and does not flag "required_fields" as customized afterwards', async () => {
        await setUpRuleUpgrade({
          assets: ruleUpgradeAssets,
          removeInstalledAssets: false,
          deps,
        });

        const diff = await fetchFirstPrebuiltRuleUpgradeReviewDiff(supertest);

        expect(diff.fields.required_fields).toMatchObject({
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
          conflict: ThreeWayDiffConflict.SOLVABLE,
          merge_outcome: ThreeWayMergeOutcome.Target,
        });

        await performUpgradePrebuiltRules(es, supertest, {
          mode: ModeEnum.SPECIFIC_RULES,
          on_conflict: UpgradeConflictResolutionEnum.UPGRADE_SOLVABLE,
          rules: [
            {
              rule_id: DEFAULT_TEST_RULE_ID,
              revision: 1,
              version: DEFAULT_RULE_UPDATE_VERSION,
              fields: {
                required_fields: { pick_version: 'MERGED' },
              },
            },
          ],
        });

        const { body: upgradedRule } = await detectionsApi
          .readRule({ query: { rule_id: DEFAULT_TEST_RULE_ID } })
          .expect(200);

        expect(upgradedRule.required_fields).toEqual(
          targetRequiredFields.map((field) => ({ ...field, ecs: false }))
        );
        expect(upgradedRule.rule_source).toMatchObject({
          is_customized: false,
          customized_fields: [],
        });

        // Saving the rule unchanged, with reordered required fields, must keep it non-customized
        const { body: savedRule } = await detectionsApi
          .updateRule({
            body: {
              ...upgradedRule,
              id: undefined,
              required_fields: [...upgradedRule.required_fields].reverse(),
            },
          })
          .expect(200);

        expect(savedRule.rule_source).toMatchObject({
          is_customized: false,
          customized_fields: [],
        });
      });
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
