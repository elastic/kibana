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

export function threatIndexField({ getService }: FtrProviderContext): void {
  const es = getService('es');
  const supertest = getService('supertest');
  const log = getService('log');
  const securitySolutionApi = getService('securitySolutionApi');

  const deps = {
    es,
    supertest,
    log,
  };

  describe('"threat_index"', () => {
    describe('non-customized w/o an upgrade (AAA diff case)', () => {
      beforeEach(async () => {
        await setUpRuleUpgrade({
          assets: {
            installed: {
              type: 'threat_match',
              threat_index: ['indexA'],
            },
            patch: {},
            upgrade: {
              type: 'threat_match',
              threat_index: ['indexA'],
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
          threat_index: expect.anything(),
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
                threat_index: {
                  pick_version: 'RESOLVED',
                  resolved_value: ['resolved'],
                },
              },
            },
          ],
        });

        const upgradedRule = await securitySolutionApi.readRule({
          query: { rule_id: DEFAULT_TEST_RULE_ID },
        });

        expect(response.results.updated[0]).toMatchObject({
          threat_index: ['resolved'],
        });
        expect(upgradedRule.body).toMatchObject({
          threat_index: ['resolved'],
        });
      });
    });

    describe('non-customized w/ an upgrade (AAB diff case)', () => {
      beforeEach(async () => {
        await setUpRuleUpgrade({
          assets: {
            installed: {
              type: 'threat_match',
              threat_index: ['indexA'],
            },
            patch: {},
            upgrade: {
              type: 'threat_match',
              threat_index: ['indexB'],
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
          threat_index: {
            base_version: ['indexA'],
            current_version: ['indexA'],
            target_version: ['indexB'],
            merged_version: ['indexB'],
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
                threat_index: {
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
          threat_index: ['indexB'],
        });
        expect(upgradedRule.body).toMatchObject({
          threat_index: ['indexB'],
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
                threat_index: {
                  pick_version: 'RESOLVED',
                  resolved_value: ['resolved'],
                },
              },
            },
          ],
        });

        const upgradedRule = await securitySolutionApi.readRule({
          query: { rule_id: DEFAULT_TEST_RULE_ID },
        });

        expect(response.results.updated[0]).toMatchObject({
          threat_index: ['resolved'],
        });
        expect(upgradedRule.body).toMatchObject({
          threat_index: ['resolved'],
        });
      });
    });

    describe('customized w/o an upgrade (ABA diff case)', () => {
      beforeEach(async () => {
        await setUpRuleUpgrade({
          assets: {
            installed: {
              type: 'threat_match',
              threat_index: ['indexA'],
            },
            patch: {
              type: 'threat_match',
              threat_index: ['indexB'],
            },
            upgrade: {
              type: 'threat_match',
              threat_index: ['indexA'],
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
          threat_index: {
            base_version: ['indexA'],
            current_version: ['indexB'],
            target_version: ['indexA'],
            merged_version: ['indexB'],
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
                threat_index: {
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
          threat_index: ['indexB'],
        });
        expect(upgradedRule.body).toMatchObject({
          threat_index: ['indexB'],
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
                threat_index: {
                  pick_version: 'RESOLVED',
                  resolved_value: ['resolved'],
                },
              },
            },
          ],
        });

        const upgradedRule = await securitySolutionApi.readRule({
          query: { rule_id: DEFAULT_TEST_RULE_ID },
        });

        expect(response.results.updated[0]).toMatchObject({
          threat_index: ['resolved'],
        });
        expect(upgradedRule.body).toMatchObject({
          threat_index: ['resolved'],
        });
      });
    });

    describe('customized w/ the matching upgrade (ABB diff case)', () => {
      beforeEach(async () => {
        await setUpRuleUpgrade({
          assets: {
            installed: {
              type: 'threat_match',
              threat_index: ['indexA'],
            },
            patch: {
              type: 'threat_match',
              threat_index: ['indexB'],
            },
            upgrade: {
              type: 'threat_match',
              threat_index: ['indexB'],
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
          threat_index: {
            base_version: ['indexA'],
            current_version: ['indexB'],
            target_version: ['indexB'],
            merged_version: ['indexB'],
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
                threat_index: {
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
          threat_index: ['indexB'],
        });
        expect(upgradedRule.body).toMatchObject({
          threat_index: ['indexB'],
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
                threat_index: {
                  pick_version: 'RESOLVED',
                  resolved_value: ['resolved'],
                },
              },
            },
          ],
        });

        const upgradedRule = await securitySolutionApi.readRule({
          query: { rule_id: DEFAULT_TEST_RULE_ID },
        });

        expect(response.results.updated[0]).toMatchObject({
          threat_index: ['resolved'],
        });
        expect(upgradedRule.body).toMatchObject({
          threat_index: ['resolved'],
        });
      });
    });

    describe('customized w/ an upgrade resulting in a conflict (ABC diff case, solvable conflict)', () => {
      beforeEach(async () => {
        await setUpRuleUpgrade({
          assets: {
            installed: {
              type: 'threat_match',
              threat_index: ['indexA'],
            },
            patch: {
              type: 'threat_match',
              threat_index: ['indexD'],
            },
            upgrade: {
              type: 'threat_match',
              threat_index: ['indexB', 'indexC'],
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
          num_rules_with_non_solvable_conflicts: 0,
        });
        expect(response.rules[0].diff).toMatchObject({
          num_fields_with_updates: 2,
          num_fields_with_conflicts: 1,
          num_fields_with_non_solvable_conflicts: 0,
        });
        expect(response.rules[0].diff.fields).toMatchObject({
          threat_index: {
            base_version: ['indexA'],
            current_version: ['indexD'],
            target_version: ['indexB', 'indexC'],
            merged_version: ['indexD', 'indexB', 'indexC'],
            diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
            merge_outcome: ThreeWayMergeOutcome.Merged,
            conflict: ThreeWayDiffConflict.SOLVABLE,
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
                threat_index: {
                  pick_version: 'RESOLVED',
                  resolved_value: ['resolved'],
                },
              },
            },
          ],
        });

        const upgradedRule = await securitySolutionApi.readRule({
          query: { rule_id: DEFAULT_TEST_RULE_ID },
        });

        expect(response.results.updated[0]).toMatchObject({
          threat_index: ['resolved'],
        });
        expect(upgradedRule.body).toMatchObject({
          threat_index: ['resolved'],
        });
      });
    });

    describe('without historical versions', () => {
      describe('customized w/ the matching upgrade (-AA diff case)', () => {
        beforeEach(async () => {
          await setUpRuleUpgrade({
            assets: {
              installed: {
                type: 'threat_match',
                threat_index: ['indexA'],
              },
              patch: {
                type: 'threat_match',
                threat_index: ['indexD'],
              },
              upgrade: {
                type: 'threat_match',
                threat_index: ['indexD'],
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
            threat_index: expect.anything(),
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
                  threat_index: {
                    pick_version: 'RESOLVED',
                    resolved_value: ['resolved'],
                  },
                },
              },
            ],
          });

          const upgradedRule = await securitySolutionApi.readRule({
            query: { rule_id: DEFAULT_TEST_RULE_ID },
          });

          expect(response.results.updated[0]).toMatchObject({
            threat_index: ['resolved'],
          });
          expect(upgradedRule.body).toMatchObject({
            threat_index: ['resolved'],
          });
        });
      });

      describe('customized w/ an upgrade (-AB diff case)', () => {
        beforeEach(async () => {
          await setUpRuleUpgrade({
            assets: {
              installed: {
                type: 'threat_match',
                threat_index: ['indexA'],
              },
              patch: {
                type: 'threat_match',
                threat_index: ['indexD'],
              },
              upgrade: {
                type: 'threat_match',
                threat_index: ['indexB', 'indexC'],
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
            threat_index: {
              current_version: ['indexD'],
              target_version: ['indexB', 'indexC'],
              merged_version: ['indexB', 'indexC'],
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
                  threat_index: {
                    pick_version: 'RESOLVED',
                    resolved_value: ['resolved'],
                  },
                },
              },
            ],
          });

          const upgradedRule = await securitySolutionApi.readRule({
            query: { rule_id: DEFAULT_TEST_RULE_ID },
          });

          expect(response.results.updated[0]).toMatchObject({
            threat_index: ['resolved'],
          });
          expect(upgradedRule.body).toMatchObject({
            threat_index: ['resolved'],
          });
        });
      });
    });
  });
}
