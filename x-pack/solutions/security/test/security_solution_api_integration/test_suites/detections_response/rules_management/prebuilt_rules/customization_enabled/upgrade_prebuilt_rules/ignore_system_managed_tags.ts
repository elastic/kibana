/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import {
  LEGACY_MISSING_UIAM_API_KEY_TAG,
  MISSING_UIAM_API_KEY_TAG,
} from '@kbn/alerting-plugin/common';
import {
  ModeEnum,
  ThreeWayDiffConflict,
  ThreeWayDiffOutcome,
  ThreeWayMergeOutcome,
} from '@kbn/security-solution-plugin/common/api/detection_engine';
import { deleteAllRules } from '@kbn/detections-response-ftr-services';
import type { FtrProviderContext } from '../../../../../../ftr_provider_context';
import {
  addTagsToRuleSavedObject,
  deleteAllPrebuiltRuleAssets,
  fetchFirstPrebuiltRuleUpgradeReviewDiff,
  performUpgradePrebuiltRules,
} from '../../../../utils';
import type { RuleUpgradeAssets } from '../../../../utils/rules/prebuilt_rules/set_up_rule_upgrade';
import {
  DEFAULT_RULE_UPDATE_VERSION,
  DEFAULT_TEST_RULE_ID,
  setUpRuleUpgrade,
} from '../../../../utils/rules/prebuilt_rules/set_up_rule_upgrade';

export default ({ getService }: FtrProviderContext): void => {
  const es = getService('es');
  const supertest = getService('supertest');
  const log = getService('log');
  const detectionsApi = getService('detectionsApi');
  const deps = {
    es,
    supertest,
    log,
  };

  describe('@ess @serverless @skipInServerlessMKI Ignore system-managed tags in prebuilt rules upgrade', () => {
    beforeEach(async () => {
      await deleteAllRules(supertest, log);
      await deleteAllPrebuiltRuleAssets(es, log);
    });

    for (const systemManagedTag of [MISSING_UIAM_API_KEY_TAG, LEGACY_MISSING_UIAM_API_KEY_TAG]) {
      describe(`"${systemManagedTag}" tag added by the Alerting Framework`, () => {
        const setUpRuleUpgradeWithSystemManagedTag = async ({
          assets,
          removeInstalledAssets = false,
        }: {
          assets: RuleUpgradeAssets;
          removeInstalledAssets?: boolean;
        }) => {
          await setUpRuleUpgrade({ assets, removeInstalledAssets, deps });
          await addTagsToRuleSavedObject(es, log, {
            ruleId: DEFAULT_TEST_RULE_ID,
            tags: [systemManagedTag],
          });
        };

        const readTestRule = async () => {
          const { body } = await detectionsApi
            .readRule({ query: { rule_id: DEFAULT_TEST_RULE_ID } })
            .expect(200);

          return body;
        };

        describe('non-customized without an upgrade (AAA diff case)', () => {
          const assets: RuleUpgradeAssets = {
            installed: { type: 'query', tags: ['tagA'] },
            patch: {},
            upgrade: { type: 'query', tags: ['tagA'] },
          };

          it('does NOT return "tags" in the upgrade review', async () => {
            await setUpRuleUpgradeWithSystemManagedTag({ assets });

            const diff = await fetchFirstPrebuiltRuleUpgradeReviewDiff(supertest);

            expect(diff).toMatchObject({
              num_fields_with_updates: 1, // counts version field
              num_fields_with_conflicts: 0,
              num_fields_with_non_solvable_conflicts: 0,
            });
            expect(diff.fields).not.toMatchObject({ tags: expect.anything() });
          });

          it('upgrades the rule without marking it as customized', async () => {
            await setUpRuleUpgradeWithSystemManagedTag({ assets });

            const response = await performUpgradePrebuiltRules(es, supertest, {
              mode: ModeEnum.SPECIFIC_RULES,
              rules: [
                {
                  rule_id: DEFAULT_TEST_RULE_ID,
                  revision: 0,
                  version: DEFAULT_RULE_UPDATE_VERSION,
                  pick_version: 'MERGED',
                },
              ],
            });

            expect(response.results.updated[0]).toMatchObject({
              rule_id: DEFAULT_TEST_RULE_ID,
              version: DEFAULT_RULE_UPDATE_VERSION,
            });

            const upgradedRule = await readTestRule();

            expect(upgradedRule.tags).toEqual(['tagA']);
            expect(upgradedRule.rule_source).toMatchObject({
              type: 'external',
              is_customized: false,
              customized_fields: [],
            });
          });
        });

        describe('non-customized with an upgrade (AAB diff case)', () => {
          const assets: RuleUpgradeAssets = {
            installed: { type: 'query', tags: ['tagA'] },
            patch: {},
            upgrade: { type: 'query', tags: ['tagB'] },
          };

          it('returns "tags" as a stock value update in the upgrade review', async () => {
            await setUpRuleUpgradeWithSystemManagedTag({ assets });

            const diff = await fetchFirstPrebuiltRuleUpgradeReviewDiff(supertest);

            expect(diff).toMatchObject({
              num_fields_with_updates: 2, // counts tags + version field
              num_fields_with_conflicts: 0,
              num_fields_with_non_solvable_conflicts: 0,
            });
            expect(diff.fields).toMatchObject({
              tags: {
                base_version: ['tagA'],
                current_version: ['tagA'],
                target_version: ['tagB'],
                merged_version: ['tagB'],
                diff_outcome: ThreeWayDiffOutcome.StockValueCanUpdate,
                merge_outcome: ThreeWayMergeOutcome.Target,
                conflict: ThreeWayDiffConflict.NONE,
              },
            });
          });

          it('upgrades "tags" to the target value without marking the rule as customized', async () => {
            await setUpRuleUpgradeWithSystemManagedTag({ assets });

            const response = await performUpgradePrebuiltRules(es, supertest, {
              mode: ModeEnum.SPECIFIC_RULES,
              rules: [
                {
                  rule_id: DEFAULT_TEST_RULE_ID,
                  revision: 0,
                  version: DEFAULT_RULE_UPDATE_VERSION,
                  pick_version: 'MERGED',
                },
              ],
            });

            expect(response.results.updated[0]).toMatchObject({
              rule_id: DEFAULT_TEST_RULE_ID,
              version: DEFAULT_RULE_UPDATE_VERSION,
            });

            const upgradedRule = await readTestRule();

            expect(upgradedRule.tags).toEqual(['tagB']);
            expect(upgradedRule.rule_source).toMatchObject({
              type: 'external',
              is_customized: false,
              customized_fields: [],
            });
          });
        });

        describe('customized without an upgrade (ABA diff case)', () => {
          const assets: RuleUpgradeAssets = {
            installed: { type: 'query', tags: ['tagA'] },
            patch: { tags: ['tagB'] },
            upgrade: { type: 'query', tags: ['tagA'] },
          };

          it('returns "tags" as a customized value without an update in the upgrade review', async () => {
            await setUpRuleUpgradeWithSystemManagedTag({ assets });

            const diff = await fetchFirstPrebuiltRuleUpgradeReviewDiff(supertest);

            expect(diff).toMatchObject({
              num_fields_with_updates: 1, // counts version field
              num_fields_with_conflicts: 0,
              num_fields_with_non_solvable_conflicts: 0,
            });
            expect(diff.fields).toMatchObject({
              tags: {
                base_version: ['tagA'],
                current_version: ['tagB'],
                target_version: ['tagA'],
                merged_version: ['tagB'],
                diff_outcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
                merge_outcome: ThreeWayMergeOutcome.Current,
                conflict: ThreeWayDiffConflict.NONE,
              },
            });
          });

          it('keeps the customized "tags" value after the upgrade', async () => {
            await setUpRuleUpgradeWithSystemManagedTag({ assets });

            const response = await performUpgradePrebuiltRules(es, supertest, {
              mode: ModeEnum.SPECIFIC_RULES,
              rules: [
                {
                  rule_id: DEFAULT_TEST_RULE_ID,
                  revision: 1,
                  version: DEFAULT_RULE_UPDATE_VERSION,
                  pick_version: 'MERGED',
                },
              ],
            });

            expect(response.results.updated[0]).toMatchObject({
              rule_id: DEFAULT_TEST_RULE_ID,
              version: DEFAULT_RULE_UPDATE_VERSION,
            });

            const upgradedRule = await readTestRule();

            expect(upgradedRule.tags).toEqual(['tagB']);
            expect(upgradedRule.rule_source).toMatchObject({
              type: 'external',
              is_customized: true,
              customized_fields: [{ field_name: 'tags' }],
            });
          });
        });

        describe('customized with an upgrade resulting in a conflict (ABC diff case, solvable conflict)', () => {
          const assets: RuleUpgradeAssets = {
            installed: { type: 'query', tags: ['tagA'] },
            patch: { tags: ['tagB'] },
            upgrade: { type: 'query', tags: ['tagC'] },
          };

          it('returns "tags" as a solvable conflict in the upgrade review', async () => {
            await setUpRuleUpgradeWithSystemManagedTag({ assets });

            const diff = await fetchFirstPrebuiltRuleUpgradeReviewDiff(supertest);

            expect(diff).toMatchObject({
              num_fields_with_updates: 2, // counts tags + version field
              num_fields_with_conflicts: 1,
              num_fields_with_non_solvable_conflicts: 0,
            });
            expect(diff.fields).toMatchObject({
              tags: {
                base_version: ['tagA'],
                current_version: ['tagB'],
                target_version: ['tagC'],
                merged_version: ['tagB', 'tagC'],
                diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
                merge_outcome: ThreeWayMergeOutcome.Merged,
                conflict: ThreeWayDiffConflict.SOLVABLE,
              },
            });
          });

          it('upgrades "tags" to the resolved value', async () => {
            await setUpRuleUpgradeWithSystemManagedTag({ assets });

            const response = await performUpgradePrebuiltRules(es, supertest, {
              mode: ModeEnum.SPECIFIC_RULES,
              rules: [
                {
                  rule_id: DEFAULT_TEST_RULE_ID,
                  revision: 1,
                  version: DEFAULT_RULE_UPDATE_VERSION,
                  fields: {
                    tags: {
                      pick_version: 'RESOLVED',
                      resolved_value: ['tagB', 'tagC'],
                    },
                  },
                },
              ],
            });

            expect(response.results.updated[0]).toMatchObject({
              rule_id: DEFAULT_TEST_RULE_ID,
              version: DEFAULT_RULE_UPDATE_VERSION,
            });

            const upgradedRule = await readTestRule();

            expect(upgradedRule.tags).toEqual(['tagB', 'tagC']);
            expect(upgradedRule.rule_source).toMatchObject({
              type: 'external',
              is_customized: true,
              customized_fields: [{ field_name: 'tags' }],
            });
          });
        });

        describe('without historical versions', () => {
          describe('non-customized with the matching upgrade (-AA diff case)', () => {
            const assets: RuleUpgradeAssets = {
              installed: { type: 'query', tags: ['tagA'] },
              patch: {},
              upgrade: { type: 'query', tags: ['tagA'] },
            };

            it('does NOT return "tags" in the upgrade review', async () => {
              await setUpRuleUpgradeWithSystemManagedTag({ assets, removeInstalledAssets: true });

              const diff = await fetchFirstPrebuiltRuleUpgradeReviewDiff(supertest);

              expect(diff).toMatchObject({
                num_fields_with_updates: 1, // counts version field
                num_fields_with_conflicts: 0,
                num_fields_with_non_solvable_conflicts: 0,
              });
              expect(diff.fields).not.toMatchObject({ tags: expect.anything() });
            });
          });

          describe('non-customized with an upgrade (-AB diff case)', () => {
            const assets: RuleUpgradeAssets = {
              installed: { type: 'query', tags: ['tagA'] },
              patch: {},
              upgrade: { type: 'query', tags: ['tagB'] },
            };

            it('returns "tags" as a missing base value update in the upgrade review', async () => {
              await setUpRuleUpgradeWithSystemManagedTag({ assets, removeInstalledAssets: true });

              const diff = await fetchFirstPrebuiltRuleUpgradeReviewDiff(supertest);

              expect(diff).toMatchObject({
                num_fields_with_updates: 2, // counts tags + version field
                num_fields_with_conflicts: 0,
                num_fields_with_non_solvable_conflicts: 0,
              });
              expect(diff.fields).toMatchObject({
                tags: {
                  current_version: ['tagA'],
                  target_version: ['tagB'],
                  merged_version: ['tagB'],
                  diff_outcome: ThreeWayDiffOutcome.MissingBaseCanUpdate,
                  merge_outcome: ThreeWayMergeOutcome.Target,
                  conflict: ThreeWayDiffConflict.NONE,
                },
              });
            });
          });
        });
      });
    }
  });
};
