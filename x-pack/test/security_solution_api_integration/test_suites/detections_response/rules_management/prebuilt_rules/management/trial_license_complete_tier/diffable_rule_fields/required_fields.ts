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
} from '@kbn/security-solution-plugin/common/api/detection_engine';
import { FtrProviderContext } from '../../../../../../../ftr_provider_context';
import { performUpgradePrebuiltRules, reviewPrebuiltRulesToUpgrade } from '../../../../../utils';
import {
  DEFAULT_TEST_RULE_ID,
  setUpRuleUpgrade,
} from '../../../../../utils/rules/prebuilt_rules/set_up_rule_upgrade';

export function requiredFieldsField({ getService }: FtrProviderContext): void {
  const es = getService('es');
  const supertest = getService('supertest');
  const log = getService('log');
  const securitySolutionApi = getService('securitySolutionApi');

  const deps = {
    es,
    supertest,
    log,
  };

  describe('"required_fields"', () => {
    describe('non-customized w/o an upgrade (AAA diff case)', () => {
      beforeEach(async () => {
        await setUpRuleUpgrade({
          assets: {
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
          },
          deps,
        });
      });

      it('does NOT return upgrade review', async () => {
        const response = await reviewPrebuiltRulesToUpgrade(supertest);

        expect(response.stats).toMatchObject({
          num_rules_to_upgrade_total: 1,
          num_rules_with_conflicts: 0,
          num_rules_with_non_solvable_conflicts: 0,
        });
        expect(response.rules[0].diff).toMatchObject({
          num_fields_with_updates: 1,
          num_fields_with_conflicts: 0,
          num_fields_with_non_solvable_conflicts: 0,
        });
        expect(response.rules[0].diff.fields).not.toMatchObject({
          required_fields: expect.anything(),
        });
      });

      it('upgrades to RESOLVED value', async () => {
        const response = await performUpgradePrebuiltRules(es, supertest, {
          mode: ModeEnum.SPECIFIC_RULES,
          rules: [
            {
              rule_id: DEFAULT_TEST_RULE_ID,
              revision: 0,
              version: 2,
              fields: {
                required_fields: {
                  pick_version: 'RESOLVED',
                  resolved_value: [
                    {
                      name: 'resolved',
                      type: 'string',
                      ecs: false,
                    },
                  ],
                },
              },
            },
          ],
        });

        const upgradedRule = await securitySolutionApi.readRule({
          query: { rule_id: DEFAULT_TEST_RULE_ID },
        });

        expect(response.results.updated[0]).toMatchObject({
          required_fields: [
            {
              name: 'resolved',
              type: 'string',
              ecs: false,
            },
          ],
        });
        expect(upgradedRule.body).toMatchObject({
          required_fields: [
            {
              name: 'resolved',
              type: 'string',
              ecs: false,
            },
          ],
        });
      });
    });

    describe('non-customized w/ an upgrade (AAB diff case)', () => {
      beforeEach(async () => {
        await setUpRuleUpgrade({
          assets: {
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
          },
          deps,
        });
      });

      it('returns upgrade review', async () => {
        const response = await reviewPrebuiltRulesToUpgrade(supertest);

        expect(response.stats).toMatchObject({
          num_rules_to_upgrade_total: 1,
          num_rules_with_conflicts: 0,
          num_rules_with_non_solvable_conflicts: 0,
        });
        expect(response.rules[0].diff).toMatchObject({
          num_fields_with_updates: 2,
          num_fields_with_conflicts: 0,
          num_fields_with_non_solvable_conflicts: 0,
        });
        expect(response.rules[0].diff.fields).toMatchObject({
          required_fields: {
            base_version: [
              {
                name: 'fieldA',
                type: 'string',
                ecs: false,
              },
            ],
            current_version: [
              {
                name: 'fieldA',
                type: 'string',
                ecs: false,
              },
            ],
            target_version: [
              {
                name: 'fieldB',
                type: 'string',
                ecs: false,
              },
            ],
            merged_version: [
              {
                name: 'fieldB',
                type: 'string',
                ecs: false,
              },
            ],
            diff_outcome: ThreeWayDiffOutcome.StockValueCanUpdate,
            merge_outcome: ThreeWayMergeOutcome.Target,
            conflict: ThreeWayDiffConflict.NONE,
            has_update: true,
            has_base_version: true,
          },
        });
      });

      it('upgrades to MERGED version', async () => {
        const response = await performUpgradePrebuiltRules(es, supertest, {
          mode: ModeEnum.SPECIFIC_RULES,
          rules: [
            {
              rule_id: DEFAULT_TEST_RULE_ID,
              revision: 0,
              version: 2,
              fields: {
                required_fields: {
                  pick_version: 'MERGED',
                },
              },
            },
          ],
        });

        const upgradedRule = await securitySolutionApi.readRule({
          query: { rule_id: DEFAULT_TEST_RULE_ID },
        });

        expect(response.results.updated[0]).toMatchObject({
          required_fields: [
            {
              name: 'fieldB',
              type: 'string',
              ecs: false,
            },
          ],
        });
        expect(upgradedRule.body).toMatchObject({
          required_fields: [
            {
              name: 'fieldB',
              type: 'string',
              ecs: false,
            },
          ],
        });
      });

      it('upgrades to RESOLVED value', async () => {
        const response = await performUpgradePrebuiltRules(es, supertest, {
          mode: ModeEnum.SPECIFIC_RULES,
          rules: [
            {
              rule_id: DEFAULT_TEST_RULE_ID,
              revision: 0,
              version: 2,
              fields: {
                required_fields: {
                  pick_version: 'RESOLVED',
                  resolved_value: [
                    {
                      name: 'resolved',
                      type: 'string',
                      ecs: false,
                    },
                  ],
                },
              },
            },
          ],
        });

        const upgradedRule = await securitySolutionApi.readRule({
          query: { rule_id: DEFAULT_TEST_RULE_ID },
        });

        expect(response.results.updated[0]).toMatchObject({
          required_fields: [
            {
              name: 'resolved',
              type: 'string',
              ecs: false,
            },
          ],
        });
        expect(upgradedRule.body).toMatchObject({
          required_fields: [
            {
              name: 'resolved',
              type: 'string',
              ecs: false,
            },
          ],
        });
      });
    });

    describe('customized w/o an upgrade (ABA diff case)', () => {
      beforeEach(async () => {
        await setUpRuleUpgrade({
          assets: {
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
          },
          deps,
        });
      });

      it('returns upgrade preview', async () => {
        const response = await reviewPrebuiltRulesToUpgrade(supertest);

        expect(response.stats).toMatchObject({
          num_rules_to_upgrade_total: 1,
          num_rules_with_conflicts: 0,
          num_rules_with_non_solvable_conflicts: 0,
        });
        expect(response.rules[0].diff).toMatchObject({
          num_fields_with_updates: 1,
          num_fields_with_conflicts: 0,
          num_fields_with_non_solvable_conflicts: 0,
        });
        expect(response.rules[0].diff.fields).toMatchObject({
          required_fields: {
            base_version: [
              {
                name: 'fieldA',
                type: 'string',
                ecs: false,
              },
            ],
            current_version: [
              {
                name: 'fieldB',
                type: 'string',
                ecs: false,
              },
            ],
            target_version: [
              {
                name: 'fieldA',
                type: 'string',
                ecs: false,
              },
            ],
            merged_version: [
              {
                name: 'fieldB',
                type: 'string',
                ecs: false,
              },
            ],
            diff_outcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
            merge_outcome: ThreeWayMergeOutcome.Current,
            conflict: ThreeWayDiffConflict.NONE,
            has_update: false,
            has_base_version: true,
          },
        });
      });

      it('upgrades to MERGED version', async () => {
        const response = await performUpgradePrebuiltRules(es, supertest, {
          mode: ModeEnum.SPECIFIC_RULES,
          rules: [
            {
              rule_id: DEFAULT_TEST_RULE_ID,
              revision: 1,
              version: 2,
              fields: {
                required_fields: {
                  pick_version: 'MERGED',
                },
              },
            },
          ],
        });

        const upgradedRule = await securitySolutionApi.readRule({
          query: { rule_id: DEFAULT_TEST_RULE_ID },
        });

        expect(response.results.updated[0]).toMatchObject({
          required_fields: [
            {
              name: 'fieldB',
              type: 'string',
              ecs: false,
            },
          ],
        });
        expect(upgradedRule.body).toMatchObject({
          required_fields: [
            {
              name: 'fieldB',
              type: 'string',
              ecs: false,
            },
          ],
        });
      });

      it('upgrades to RESOLVED value', async () => {
        const response = await performUpgradePrebuiltRules(es, supertest, {
          mode: ModeEnum.SPECIFIC_RULES,
          rules: [
            {
              rule_id: DEFAULT_TEST_RULE_ID,
              revision: 1,
              version: 2,
              fields: {
                required_fields: {
                  pick_version: 'RESOLVED',
                  resolved_value: [
                    {
                      name: 'resolved',
                      type: 'string',
                      ecs: false,
                    },
                  ],
                },
              },
            },
          ],
        });

        const upgradedRule = await securitySolutionApi.readRule({
          query: { rule_id: DEFAULT_TEST_RULE_ID },
        });

        expect(response.results.updated[0]).toMatchObject({
          required_fields: [
            {
              name: 'resolved',
              type: 'string',
              ecs: false,
            },
          ],
        });
        expect(upgradedRule.body).toMatchObject({
          required_fields: [
            {
              name: 'resolved',
              type: 'string',
              ecs: false,
            },
          ],
        });
      });
    });

    describe('customized w/ the matching upgrade (ABB diff case)', () => {
      beforeEach(async () => {
        await setUpRuleUpgrade({
          assets: {
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
          },
          deps,
        });
      });

      it('returns upgrade preview', async () => {
        const response = await reviewPrebuiltRulesToUpgrade(supertest);

        expect(response.stats).toMatchObject({
          num_rules_to_upgrade_total: 1,
          num_rules_with_conflicts: 0,
          num_rules_with_non_solvable_conflicts: 0,
        });
        expect(response.rules[0].diff).toMatchObject({
          num_fields_with_updates: 1,
          num_fields_with_conflicts: 0,
          num_fields_with_non_solvable_conflicts: 0,
        });
        expect(response.rules[0].diff.fields).toMatchObject({
          required_fields: {
            base_version: [
              {
                name: 'fieldA',
                type: 'string',
                ecs: false,
              },
            ],
            current_version: [
              {
                name: 'fieldB',
                type: 'string',
                ecs: false,
              },
            ],
            target_version: [
              {
                name: 'fieldB',
                type: 'string',
                ecs: false,
              },
            ],
            merged_version: [
              {
                name: 'fieldB',
                type: 'string',
                ecs: false,
              },
            ],
            diff_outcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
            merge_outcome: ThreeWayMergeOutcome.Current,
            conflict: ThreeWayDiffConflict.NONE,
            has_update: false,
            has_base_version: true,
          },
        });
      });

      it('upgrades to MERGED version', async () => {
        const response = await performUpgradePrebuiltRules(es, supertest, {
          mode: ModeEnum.SPECIFIC_RULES,
          rules: [
            {
              rule_id: DEFAULT_TEST_RULE_ID,
              revision: 1,
              version: 2,
              fields: {
                required_fields: {
                  pick_version: 'MERGED',
                },
              },
            },
          ],
        });

        const upgradedRule = await securitySolutionApi.readRule({
          query: { rule_id: DEFAULT_TEST_RULE_ID },
        });

        expect(response.results.updated[0]).toMatchObject({
          required_fields: [
            {
              name: 'fieldB',
              type: 'string',
              ecs: false,
            },
          ],
        });
        expect(upgradedRule.body).toMatchObject({
          required_fields: [
            {
              name: 'fieldB',
              type: 'string',
              ecs: false,
            },
          ],
        });
      });

      it('upgrades to RESOLVED value', async () => {
        const response = await performUpgradePrebuiltRules(es, supertest, {
          mode: ModeEnum.SPECIFIC_RULES,
          rules: [
            {
              rule_id: DEFAULT_TEST_RULE_ID,
              revision: 1,
              version: 2,
              fields: {
                required_fields: {
                  pick_version: 'RESOLVED',
                  resolved_value: [
                    {
                      name: 'resolved',
                      type: 'string',
                      ecs: false,
                    },
                  ],
                },
              },
            },
          ],
        });

        const upgradedRule = await securitySolutionApi.readRule({
          query: { rule_id: DEFAULT_TEST_RULE_ID },
        });

        expect(response.results.updated[0]).toMatchObject({
          required_fields: [
            {
              name: 'resolved',
              type: 'string',
              ecs: false,
            },
          ],
        });
        expect(upgradedRule.body).toMatchObject({
          required_fields: [
            {
              name: 'resolved',
              type: 'string',
              ecs: false,
            },
          ],
        });
      });
    });

    describe('customized w/ an upgrade resulting in a conflict (ABC diff case, non-solvable conflict)', () => {
      beforeEach(async () => {
        await setUpRuleUpgrade({
          assets: {
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
          },
          deps,
        });
      });

      it('returns upgrade preview', async () => {
        const response = await reviewPrebuiltRulesToUpgrade(supertest);

        expect(response.stats).toMatchObject({
          num_rules_to_upgrade_total: 1,
          num_rules_with_conflicts: 1,
          num_rules_with_non_solvable_conflicts: 1,
        });
        expect(response.rules[0].diff).toMatchObject({
          num_fields_with_updates: 2,
          num_fields_with_conflicts: 1,
          num_fields_with_non_solvable_conflicts: 1,
        });
        expect(response.rules[0].diff.fields).toMatchObject({
          required_fields: {
            base_version: [
              {
                name: 'fieldA',
                type: 'string',
                ecs: false,
              },
            ],
            current_version: [
              {
                name: 'fieldB',
                type: 'string',
                ecs: false,
              },
            ],
            target_version: [
              {
                name: 'fieldC',
                type: 'string',
                ecs: false,
              },
            ],
            merged_version: [
              {
                name: 'fieldB',
                type: 'string',
                ecs: false,
              },
            ],
            diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
            merge_outcome: ThreeWayMergeOutcome.Current,
            conflict: ThreeWayDiffConflict.NON_SOLVABLE,
            has_update: true,
            has_base_version: true,
          },
        });
      });

      it('upgrades to RESOLVED value', async () => {
        const response = await performUpgradePrebuiltRules(es, supertest, {
          mode: ModeEnum.SPECIFIC_RULES,
          rules: [
            {
              rule_id: DEFAULT_TEST_RULE_ID,
              revision: 1,
              version: 2,
              fields: {
                required_fields: {
                  pick_version: 'RESOLVED',
                  resolved_value: [
                    {
                      name: 'resolved',
                      type: 'string',
                      ecs: false,
                    },
                  ],
                },
              },
            },
          ],
        });

        const upgradedRule = await securitySolutionApi.readRule({
          query: { rule_id: DEFAULT_TEST_RULE_ID },
        });

        expect(response.results.updated[0]).toMatchObject({
          required_fields: [
            {
              name: 'resolved',
              type: 'string',
              ecs: false,
            },
          ],
        });
        expect(upgradedRule.body).toMatchObject({
          required_fields: [
            {
              name: 'resolved',
              type: 'string',
              ecs: false,
            },
          ],
        });
      });
    });

    describe('without historical versions', () => {
      describe('customized w/ the matching upgrade (-AA diff case)', () => {
        beforeEach(async () => {
          await setUpRuleUpgrade({
            assets: {
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
            },
            removeInstalledAssets: true,
            deps,
          });
        });

        it('does NOT return upgrade review', async () => {
          const response = await reviewPrebuiltRulesToUpgrade(supertest);

          expect(response.stats).toMatchObject({
            num_rules_to_upgrade_total: 1,
            num_rules_with_conflicts: 0,
            num_rules_with_non_solvable_conflicts: 0,
          });
          expect(response.rules[0].diff).toMatchObject({
            num_fields_with_updates: 1,
            num_fields_with_conflicts: 0,
            num_fields_with_non_solvable_conflicts: 0,
          });
          expect(response.rules[0].diff.fields).not.toMatchObject({
            required_fields: expect.anything(),
          });
        });

        it('upgrades to RESOLVED value', async () => {
          const response = await performUpgradePrebuiltRules(es, supertest, {
            mode: ModeEnum.SPECIFIC_RULES,
            rules: [
              {
                rule_id: DEFAULT_TEST_RULE_ID,
                revision: 1,
                version: 2,
                fields: {
                  required_fields: {
                    pick_version: 'RESOLVED',
                    resolved_value: [
                      {
                        name: 'resolved',
                        type: 'string',
                        ecs: false,
                      },
                    ],
                  },
                },
              },
            ],
          });

          const upgradedRule = await securitySolutionApi.readRule({
            query: { rule_id: DEFAULT_TEST_RULE_ID },
          });

          expect(response.results.updated[0]).toMatchObject({
            required_fields: [
              {
                name: 'resolved',
                type: 'string',
                ecs: false,
              },
            ],
          });
          expect(upgradedRule.body).toMatchObject({
            required_fields: [
              {
                name: 'resolved',
                type: 'string',
                ecs: false,
              },
            ],
          });
        });
      });

      describe('customized w/ an upgrade (-AB diff case)', () => {
        beforeEach(async () => {
          await setUpRuleUpgrade({
            assets: {
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
            },
            removeInstalledAssets: true,
            deps,
          });
        });

        it('returns upgrade preview', async () => {
          const response = await reviewPrebuiltRulesToUpgrade(supertest);

          expect(response.rules).toHaveLength(1);
          expect(response.stats).toMatchObject({
            num_rules_to_upgrade_total: 1,
            num_rules_with_conflicts: 1,
            num_rules_with_non_solvable_conflicts: 0,
          });
          expect(response.rules[0].diff).toMatchObject({
            num_fields_with_updates: 2,
            num_fields_with_conflicts: 1,
            num_fields_with_non_solvable_conflicts: 0,
          });
          expect(response.rules[0].diff.fields).toMatchObject({
            required_fields: {
              current_version: [
                {
                  name: 'fieldB',
                  type: 'string',
                  ecs: false,
                },
              ],
              target_version: [
                {
                  name: 'fieldC',
                  type: 'string',
                  ecs: false,
                },
              ],
              merged_version: [
                {
                  name: 'fieldC',
                  type: 'string',
                  ecs: false,
                },
              ],
              diff_outcome: ThreeWayDiffOutcome.MissingBaseCanUpdate,
              merge_outcome: ThreeWayMergeOutcome.Target,
              conflict: ThreeWayDiffConflict.SOLVABLE,
              has_update: true,
              has_base_version: false,
            },
          });
        });

        it('upgrades to RESOLVED value', async () => {
          const response = await performUpgradePrebuiltRules(es, supertest, {
            mode: ModeEnum.SPECIFIC_RULES,
            rules: [
              {
                rule_id: DEFAULT_TEST_RULE_ID,
                revision: 1,
                version: 2,
                fields: {
                  required_fields: {
                    pick_version: 'RESOLVED',
                    resolved_value: [
                      {
                        name: 'resolved',
                        type: 'string',
                        ecs: false,
                      },
                    ],
                  },
                },
              },
            ],
          });

          const upgradedRule = await securitySolutionApi.readRule({
            query: { rule_id: DEFAULT_TEST_RULE_ID },
          });

          expect(response.results.updated[0]).toMatchObject({
            required_fields: [
              {
                name: 'resolved',
                type: 'string',
                ecs: false,
              },
            ],
          });
          expect(upgradedRule.body).toMatchObject({
            required_fields: [
              {
                name: 'resolved',
                type: 'string',
                ecs: false,
              },
            ],
          });
        });
      });
    });
  });
}
