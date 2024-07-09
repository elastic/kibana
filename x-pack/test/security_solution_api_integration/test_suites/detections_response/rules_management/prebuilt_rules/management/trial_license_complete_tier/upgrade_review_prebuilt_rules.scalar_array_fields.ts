/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from 'expect';
import {
  ThreeWayDiffOutcome,
  ThreeWayMergeOutcome,
} from '@kbn/security-solution-plugin/common/api/detection_engine';
import { FtrProviderContext } from '../../../../../../ftr_provider_context';
import {
  deleteAllTimelines,
  deleteAllPrebuiltRuleAssets,
  createRuleAssetSavedObject,
  installPrebuiltRules,
  createPrebuiltRuleAssetSavedObjects,
  reviewPrebuiltRulesToUpgrade,
  patchRule,
  createHistoricalPrebuiltRuleAssetSavedObjects,
} from '../../../../utils';
import { deleteAllRules } from '../../../../../../../common/utils/security_solution';

export default ({ getService }: FtrProviderContext): void => {
  const es = getService('es');
  const supertest = getService('supertest');
  const log = getService('log');

  describe('@ess @serverless @skipInServerlessMKI review prebuilt rules updates from package with mock rule assets', () => {
    beforeEach(async () => {
      await deleteAllRules(supertest, log);
      await deleteAllTimelines(es, log);
      await deleteAllPrebuiltRuleAssets(es, log);
    });

    describe(`scalar array fields`, () => {
      const getRuleAssetSavedObjects = () => [
        createRuleAssetSavedObject({
          rule_id: 'rule-1',
          version: 1,
          tags: ['one', 'two', 'three'],
        }),
      ];

      describe("when rule field doesn't have an update and has no custom value - scenario AAA", () => {
        it('should not show in the upgrade/_review API response', async () => {
          // Install base prebuilt detection rule
          await createHistoricalPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
          await installPrebuiltRules(es, supertest);

          // Increment the version of the installed rule, do NOT update the related scalar array field, and create the new rule assets
          const updatedRuleAssetSavedObjects = [
            createRuleAssetSavedObject({
              rule_id: 'rule-1',
              tags: ['one', 'three', 'two'],
              version: 2,
            }),
          ];
          await createHistoricalPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

          // Call the upgrade review prebuilt rules endpoint and check that there is 1 rule eligable for update but scalar array field is NOT returned
          const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
          expect(reviewResponse.rules[0].diff.fields).toEqual({
            version: {
              base_version: 1,
              current_version: 1,
              target_version: 2,
              merged_version: 2,
              diff_outcome: ThreeWayDiffOutcome.StockValueCanUpdate,
              merge_outcome: ThreeWayMergeOutcome.Target,
              has_conflict: false,
              has_update: true,
            },
          });
          expect(reviewResponse.rules[0].diff.has_conflict).toBe(false);
          expect(reviewResponse.stats.num_rules_to_upgrade_total).toBe(1);
        });
      });

      describe("when rule field doesn't have an update but has a custom value - scenario ABA", () => {
        it('should show in the upgrade/_review API response', async () => {
          // Install base prebuilt detection rule
          await createHistoricalPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
          await installPrebuiltRules(es, supertest);

          // Customize a scalar array field on the installed rule
          await patchRule(supertest, log, {
            rule_id: 'rule-1',
            tags: ['one', 'two', 'four'],
          });

          // Increment the version of the installed rule, do NOT update the related scalar array field, and create the new rule assets
          const updatedRuleAssetSavedObjects = [
            createRuleAssetSavedObject({
              rule_id: 'rule-1',
              tags: ['one', 'two', 'three'],
              version: 2,
            }),
          ];
          await createHistoricalPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

          // Call the upgrade review prebuilt rules endpoint and check that scalar array diff field is returned but field does not have an update
          const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
          expect(reviewResponse.rules[0].diff.fields).toEqual({
            tags: {
              base_version: ['one', 'two', 'three'],
              current_version: ['one', 'two', 'four'],
              target_version: ['one', 'two', 'three'],
              merged_version: ['one', 'two', 'four'],
              diff_outcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
              merge_outcome: ThreeWayMergeOutcome.Current,
              has_conflict: false,
              has_update: false,
            },
            version: {
              base_version: 1,
              current_version: 1,
              target_version: 2,
              merged_version: 2,
              diff_outcome: ThreeWayDiffOutcome.StockValueCanUpdate,
              merge_outcome: ThreeWayMergeOutcome.Target,
              has_conflict: false,
              has_update: true,
            },
          });
          expect(reviewResponse.rules[0].diff.has_conflict).toBe(false);
          expect(reviewResponse.stats.num_rules_to_upgrade_total).toBe(1);
        });
      });

      describe('when rule field has an update but does not have a custom value - scenario AAB', () => {
        it('should show in the upgrade/_review API response', async () => {
          // Install base prebuilt detection rule
          await createHistoricalPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
          await installPrebuiltRules(es, supertest);

          // Increment the version of the installed rule, update a scalar array field, and create the new rule assets
          const updatedRuleAssetSavedObjects = [
            createRuleAssetSavedObject({
              rule_id: 'rule-1',
              version: 2,
              tags: ['one', 'two', 'four'],
            }),
          ];
          await createHistoricalPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

          // Call the upgrade review prebuilt rules endpoint and check that one rule is eligible for update
          const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
          expect(reviewResponse.rules[0].diff.fields).toEqual({
            tags: {
              base_version: ['one', 'two', 'three'],
              current_version: ['one', 'two', 'three'],
              target_version: ['one', 'two', 'four'],
              merged_version: ['one', 'two', 'four'],
              diff_outcome: ThreeWayDiffOutcome.StockValueCanUpdate,
              merge_outcome: ThreeWayMergeOutcome.Target,
              has_conflict: false,
              has_update: true,
            },
            version: {
              base_version: 1,
              current_version: 1,
              target_version: 2,
              merged_version: 2,
              diff_outcome: ThreeWayDiffOutcome.StockValueCanUpdate,
              merge_outcome: ThreeWayMergeOutcome.Target,
              has_conflict: false,
              has_update: true,
            },
          });
          expect(reviewResponse.rules[0].diff.has_conflict).toBe(false);
          expect(reviewResponse.stats.num_rules_to_upgrade_total).toBe(1);
        });

        describe('when rule field has an update and a custom value that are the same - scenario ABB', () => {
          it('should show in the upgrade/_review API response', async () => {
            // Install base prebuilt detection rule
            await createHistoricalPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
            await installPrebuiltRules(es, supertest);

            // Customize a scalar array field on the installed rule
            await patchRule(supertest, log, {
              rule_id: 'rule-1',
              tags: ['one', 'two', 'four'],
            });

            // Increment the version of the installed rule, update a scalar array field, and create the new rule assets
            const updatedRuleAssetSavedObjects = [
              createRuleAssetSavedObject({
                rule_id: 'rule-1',
                version: 2,
                tags: ['one', 'two', 'four'],
              }),
            ];
            await createHistoricalPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

            // Call the upgrade review prebuilt rules endpoint and check that one rule is eligible for update and contains scalar array field
            const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
            expect(reviewResponse.rules[0].diff.fields).toEqual({
              tags: {
                base_version: ['one', 'two', 'three'],
                current_version: ['one', 'two', 'four'],
                target_version: ['one', 'two', 'four'],
                merged_version: ['one', 'two', 'four'],
                diff_outcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
                merge_outcome: ThreeWayMergeOutcome.Current,
                has_conflict: false,
                has_update: false,
              },
              version: {
                base_version: 1,
                current_version: 1,
                target_version: 2,
                merged_version: 2,
                diff_outcome: ThreeWayDiffOutcome.StockValueCanUpdate,
                merge_outcome: ThreeWayMergeOutcome.Target,
                has_conflict: false,
                has_update: true,
              },
            });
            expect(reviewResponse.rules[0].diff.has_conflict).toBe(false);
            expect(reviewResponse.stats.num_rules_to_upgrade_total).toBe(1);
          });
        });

        describe('when rule field has an update and a custom value that are different - scenario ABC', () => {
          it('should show in the upgrade/_review API response', async () => {
            // Install base prebuilt detection rule
            await createHistoricalPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
            await installPrebuiltRules(es, supertest);

            // Customize a scalar array field on the installed rule
            await patchRule(supertest, log, {
              rule_id: 'rule-1',
              tags: ['one', 'two', 'four'],
            });

            // Increment the version of the installed rule, update a scalar array field, and create the new rule assets
            const updatedRuleAssetSavedObjects = [
              createRuleAssetSavedObject({
                rule_id: 'rule-1',
                version: 2,
                tags: ['one', 'two', 'five'],
              }),
            ];
            await createHistoricalPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

            // Call the upgrade review prebuilt rules endpoint and check that one rule is eligible for update
            // and scalar array field update has conflict
            const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
            expect(reviewResponse.rules[0].diff.fields).toEqual({
              tags: {
                base_version: ['one', 'two', 'three'],
                current_version: ['one', 'two', 'four'],
                target_version: ['one', 'two', 'five'],
                merged_version: ['one', 'two', 'four', 'five'],
                diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
                merge_outcome: ThreeWayMergeOutcome.Merged,
                has_conflict: false,
                has_update: true,
              },
              version: {
                base_version: 1,
                current_version: 1,
                target_version: 2,
                merged_version: 2,
                diff_outcome: ThreeWayDiffOutcome.StockValueCanUpdate,
                merge_outcome: ThreeWayMergeOutcome.Target,
                has_conflict: false,
                has_update: true,
              },
            });
            expect(reviewResponse.rules[0].diff.has_conflict).toBe(false);
            expect(reviewResponse.stats.num_rules_to_upgrade_total).toBe(1);
          });

          it('should compare values after deduplication', async () => {
            // Install base prebuilt detection rule
            await createHistoricalPrebuiltRuleAssetSavedObjects(es, [
              createRuleAssetSavedObject({
                rule_id: 'rule-1',
                version: 1,
                tags: ['one', 'two', 'two'],
              }),
            ]);
            await installPrebuiltRules(es, supertest);

            // Customize a scalar array field on the installed rule
            await patchRule(supertest, log, {
              rule_id: 'rule-1',
              tags: ['two', 'one', 'three'],
            });

            // Increment the version of the installed rule, update a scalar array field, and create the new rule assets
            const updatedRuleAssetSavedObjects = [
              createRuleAssetSavedObject({
                rule_id: 'rule-1',
                version: 2,
                tags: ['three', 'three', 'one'],
              }),
            ];
            await createHistoricalPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

            // Call the upgrade review prebuilt rules endpoint and check that one rule is eligible for update
            // and scalar array field update has conflict
            const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
            expect(reviewResponse.rules[0].diff.fields).toEqual({
              tags: {
                base_version: ['one', 'two', 'two'],
                current_version: ['two', 'one', 'three'],
                target_version: ['three', 'three', 'one'],
                merged_version: ['one', 'three'],
                diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
                merge_outcome: ThreeWayMergeOutcome.Merged,
                has_conflict: false,
                has_update: true,
              },
              version: {
                base_version: 1,
                current_version: 1,
                target_version: 2,
                merged_version: 2,
                diff_outcome: ThreeWayDiffOutcome.StockValueCanUpdate,
                merge_outcome: ThreeWayMergeOutcome.Target,
                has_conflict: false,
                has_update: true,
              },
            });
            expect(reviewResponse.rules[0].diff.has_conflict).toBe(false);
            expect(reviewResponse.stats.num_rules_to_upgrade_total).toBe(1);
          });

          it('should compare values sensitive of case', async () => {
            // Install base prebuilt detection rule
            await createHistoricalPrebuiltRuleAssetSavedObjects(es, [
              createRuleAssetSavedObject({
                rule_id: 'rule-1',
                version: 1,
                tags: ['ONE', 'TWO'],
              }),
            ]);
            await installPrebuiltRules(es, supertest);

            // Customize a scalar array field on the installed rule
            await patchRule(supertest, log, {
              rule_id: 'rule-1',
              tags: ['one', 'ONE'],
            });

            // Increment the version of the installed rule, update a scalar array field, and create the new rule assets
            const updatedRuleAssetSavedObjects = [
              createRuleAssetSavedObject({
                rule_id: 'rule-1',
                version: 2,
                tags: ['ONE', 'THREE'],
              }),
            ];
            await createHistoricalPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

            // Call the upgrade review prebuilt rules endpoint and check that one rule is eligible for update
            // and scalar array field update has conflict
            const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
            expect(reviewResponse.rules[0].diff.fields).toEqual({
              tags: {
                base_version: ['ONE', 'TWO'],
                current_version: ['one', 'ONE'],
                target_version: ['ONE', 'THREE'],
                merged_version: ['ONE', 'one', 'THREE'],
                diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
                merge_outcome: ThreeWayMergeOutcome.Merged,
                has_conflict: false,
                has_update: true,
              },
              version: {
                base_version: 1,
                current_version: 1,
                target_version: 2,
                merged_version: 2,
                diff_outcome: ThreeWayDiffOutcome.StockValueCanUpdate,
                merge_outcome: ThreeWayMergeOutcome.Target,
                has_conflict: false,
                has_update: true,
              },
            });
            expect(reviewResponse.rules[0].diff.has_conflict).toBe(false);
            expect(reviewResponse.stats.num_rules_to_upgrade_total).toBe(1);
          });

          it('should handle empty arrays', async () => {
            // Install base prebuilt detection rule
            await createHistoricalPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
            await installPrebuiltRules(es, supertest);

            // Customize a scalar array field on the installed rule
            await patchRule(supertest, log, {
              rule_id: 'rule-1',
              tags: [],
            });

            // Increment the version of the installed rule, update a scalar array field, and create the new rule assets
            const updatedRuleAssetSavedObjects = [
              createRuleAssetSavedObject({
                rule_id: 'rule-1',
                version: 2,
                tags: ['one', 'two', 'five'],
              }),
            ];
            await createHistoricalPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

            // Call the upgrade review prebuilt rules endpoint and check that one rule is eligible for update
            // and scalar array field update has conflict
            const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
            expect(reviewResponse.rules[0].diff.fields).toEqual({
              tags: {
                base_version: ['one', 'two', 'three'],
                current_version: [],
                target_version: ['one', 'two', 'five'],
                merged_version: ['five'],
                diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
                merge_outcome: ThreeWayMergeOutcome.Merged,
                has_conflict: false,
                has_update: true,
              },
              version: {
                base_version: 1,
                current_version: 1,
                target_version: 2,
                merged_version: 2,
                diff_outcome: ThreeWayDiffOutcome.StockValueCanUpdate,
                merge_outcome: ThreeWayMergeOutcome.Target,
                has_conflict: false,
                has_update: true,
              },
            });
            expect(reviewResponse.rules[0].diff.has_conflict).toBe(false);
            expect(reviewResponse.stats.num_rules_to_upgrade_total).toBe(1);
          });
        });

        describe('when rule base version does not exist', () => {
          describe('when rule field has an update and a custom value that are the same - scenario -AA', () => {
            it('should not show in the upgrade/_review API response', async () => {
              // Install base prebuilt detection rule
              await createPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
              await installPrebuiltRules(es, supertest);

              // Clear previous rule assets
              await deleteAllPrebuiltRuleAssets(es, log);

              // Customize a scalar array field on the installed rule
              await patchRule(supertest, log, {
                rule_id: 'rule-1',
                tags: ['one', 'three', 'two'],
              });

              // Increment the version of the installed rule, update a scalar array field, and create the new rule assets
              const updatedRuleAssetSavedObjects = [
                createRuleAssetSavedObject({
                  rule_id: 'rule-1',
                  version: 2,
                  tags: ['one', 'three', 'two'],
                }),
              ];
              await createPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

              // Call the upgrade review prebuilt rules endpoint and check that one rule is eligible for update
              // but does NOT contain scalar array field
              const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
              expect(reviewResponse.rules[0].diff.fields).toEqual({
                version: {
                  current_version: 1,
                  target_version: 2,
                  merged_version: 2,
                  diff_outcome: ThreeWayDiffOutcome.StockValueCanUpdate,
                  merge_outcome: ThreeWayMergeOutcome.Target,
                  has_conflict: false,
                  has_update: true,
                },
              });
              expect(reviewResponse.rules[0].diff.has_conflict).toBe(false);
              expect(reviewResponse.stats.num_rules_to_upgrade_total).toBe(1);
            });
          });

          describe('when rule field has an update and a custom value that are different - scenario -AB', () => {
            it('should show in the upgrade/_review API response', async () => {
              // Install base prebuilt detection rule
              await createPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
              await installPrebuiltRules(es, supertest);

              // Clear previous rule assets
              await deleteAllPrebuiltRuleAssets(es, log);

              // Customize a scalar array field on the installed rule
              await patchRule(supertest, log, {
                rule_id: 'rule-1',
                tags: ['one', 'two', 'four'],
              });

              // Increment the version of the installed rule, update a scalar array field, and create the new rule assets
              const updatedRuleAssetSavedObjects = [
                createRuleAssetSavedObject({
                  rule_id: 'rule-1',
                  version: 2,
                  tags: ['one', 'two', 'five'],
                }),
              ];
              await createPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

              // Call the upgrade review prebuilt rules endpoint and check that one rule is eligible for update
              // and scalar array field update does not have a conflict
              const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
              expect(reviewResponse.rules[0].diff.fields).toEqual({
                tags: {
                  current_version: ['one', 'two', 'four'],
                  target_version: ['one', 'two', 'five'],
                  merged_version: ['one', 'two', 'five'],
                  diff_outcome: ThreeWayDiffOutcome.StockValueCanUpdate,
                  merge_outcome: ThreeWayMergeOutcome.Target,
                  has_conflict: false,
                  has_update: true,
                },
                version: {
                  current_version: 1,
                  target_version: 2,
                  merged_version: 2,
                  diff_outcome: ThreeWayDiffOutcome.StockValueCanUpdate,
                  merge_outcome: ThreeWayMergeOutcome.Target,
                  has_conflict: false,
                  has_update: true,
                },
              });
              expect(reviewResponse.rules[0].diff.has_conflict).toBe(false);
              expect(reviewResponse.stats.num_rules_to_upgrade_total).toBe(1);
            });
          });
        });
      });
    });
  });
};
