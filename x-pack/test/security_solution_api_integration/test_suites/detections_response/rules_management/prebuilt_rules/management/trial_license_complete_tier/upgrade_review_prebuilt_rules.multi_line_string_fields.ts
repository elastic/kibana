/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from 'expect';
import {
  ThreeWayDiffConflict,
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

    describe(`multi line string fields`, () => {
      const getRuleAssetSavedObjects = () => [
        createRuleAssetSavedObject({
          rule_id: 'rule-1',
          version: 1,
          description: 'My description.\nThis is a second line.',
        }),
      ];

      describe("when rule field doesn't have an update and has no custom value - scenario AAA", () => {
        it('should not show in the upgrade/_review API response', async () => {
          // Install base prebuilt detection rule
          await createHistoricalPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
          await installPrebuiltRules(es, supertest);

          // Increment the version of the installed rule, do NOT update the related multi line string field, and create the new rule assets
          const updatedRuleAssetSavedObjects = [
            createRuleAssetSavedObject({
              rule_id: 'rule-1',
              description: 'My description.\nThis is a second line.',
              version: 2,
            }),
          ];
          await createHistoricalPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

          // Call the upgrade review prebuilt rules endpoint and check that there is 1 rule eligible
          // for update but multi-line string field (description) is NOT returned
          const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
          expect(reviewResponse.rules[0].diff.fields.description).toBeUndefined();

          expect(reviewResponse.rules[0].diff.num_fields_with_updates).toBe(1); // version
          expect(reviewResponse.rules[0].diff.num_fields_with_conflicts).toBe(0);
          expect(reviewResponse.rules[0].diff.num_fields_with_non_solvable_conflicts).toBe(0);

          expect(reviewResponse.stats.num_rules_to_upgrade_total).toBe(1);
          expect(reviewResponse.stats.num_rules_with_conflicts).toBe(0);
          expect(reviewResponse.stats.num_rules_with_non_solvable_conflicts).toBe(0);
        });
      });

      describe("when rule field doesn't have an update but has a custom value - scenario ABA", () => {
        it('should show in the upgrade/_review API response', async () => {
          // Install base prebuilt detection rule
          await createHistoricalPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
          await installPrebuiltRules(es, supertest);

          // Customize a multi line string field on the installed rule
          await patchRule(supertest, log, {
            rule_id: 'rule-1',
            description: 'My GREAT description.\nThis is a second line.',
          });

          // Increment the version of the installed rule, do NOT update the related multi line string field, and create the new rule assets
          const updatedRuleAssetSavedObjects = [
            createRuleAssetSavedObject({
              rule_id: 'rule-1',
              description: 'My description.\nThis is a second line.',
              version: 2,
            }),
          ];
          await createHistoricalPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

          // Call the upgrade review prebuilt rules endpoint and check that multi line string diff field is returned but field does not have an update
          const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
          expect(reviewResponse.rules[0].diff.fields.description).toEqual({
            base_version: 'My description.\nThis is a second line.',
            current_version: 'My GREAT description.\nThis is a second line.',
            target_version: 'My description.\nThis is a second line.',
            merged_version: 'My GREAT description.\nThis is a second line.',
            diff_outcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
            merge_outcome: ThreeWayMergeOutcome.Current,
            conflict: ThreeWayDiffConflict.NONE,
            has_update: false,
            has_base_version: true,
          });
          expect(reviewResponse.rules[0].diff.num_fields_with_updates).toBe(1);
          expect(reviewResponse.rules[0].diff.num_fields_with_conflicts).toBe(0);
          expect(reviewResponse.rules[0].diff.num_fields_with_non_solvable_conflicts).toBe(0);

          expect(reviewResponse.stats.num_rules_to_upgrade_total).toBe(1);
          expect(reviewResponse.stats.num_rules_with_conflicts).toBe(0);
          expect(reviewResponse.stats.num_rules_with_non_solvable_conflicts).toBe(0);
        });
      });

      describe('when rule field has an update but does not have a custom value - scenario AAB', () => {
        it('should show in the upgrade/_review API response', async () => {
          // Install base prebuilt detection rule
          await createHistoricalPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
          await installPrebuiltRules(es, supertest);

          // Increment the version of the installed rule, update a multi line string field, and create the new rule assets
          const updatedRuleAssetSavedObjects = [
            createRuleAssetSavedObject({
              rule_id: 'rule-1',
              version: 2,
              description: 'My GREAT description.\nThis is a second line.',
            }),
          ];
          await createHistoricalPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

          // Call the upgrade review prebuilt rules endpoint and check that one rule is eligible for update
          const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
          expect(reviewResponse.rules[0].diff.fields.description).toEqual({
            base_version: 'My description.\nThis is a second line.',
            current_version: 'My description.\nThis is a second line.',
            target_version: 'My GREAT description.\nThis is a second line.',
            merged_version: 'My GREAT description.\nThis is a second line.',
            diff_outcome: ThreeWayDiffOutcome.StockValueCanUpdate,
            merge_outcome: ThreeWayMergeOutcome.Target,
            conflict: ThreeWayDiffConflict.NONE,
            has_update: true,
            has_base_version: true,
          });
          expect(reviewResponse.rules[0].diff.num_fields_with_updates).toBe(2);
          expect(reviewResponse.rules[0].diff.num_fields_with_conflicts).toBe(0);
          expect(reviewResponse.rules[0].diff.num_fields_with_non_solvable_conflicts).toBe(0);

          expect(reviewResponse.stats.num_rules_to_upgrade_total).toBe(1);
          expect(reviewResponse.stats.num_rules_with_conflicts).toBe(0);
          expect(reviewResponse.stats.num_rules_with_non_solvable_conflicts).toBe(0);
        });

        describe('when rule field has an update and a custom value that are the same - scenario ABB', () => {
          it('should show in the upgrade/_review API response', async () => {
            // Install base prebuilt detection rule
            await createHistoricalPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
            await installPrebuiltRules(es, supertest);

            // Customize a multi line string field on the installed rule
            await patchRule(supertest, log, {
              rule_id: 'rule-1',
              description: 'My GREAT description.\nThis is a second line.',
            });

            // Increment the version of the installed rule, update a multi line string field, and create the new rule assets
            const updatedRuleAssetSavedObjects = [
              createRuleAssetSavedObject({
                rule_id: 'rule-1',
                version: 2,
                description: 'My GREAT description.\nThis is a second line.',
              }),
            ];
            await createHistoricalPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

            // Call the upgrade review prebuilt rules endpoint and check that one rule is eligible for update
            const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
            expect(reviewResponse.rules[0].diff.fields.description).toEqual({
              base_version: 'My description.\nThis is a second line.',
              current_version: 'My GREAT description.\nThis is a second line.',
              target_version: 'My GREAT description.\nThis is a second line.',
              merged_version: 'My GREAT description.\nThis is a second line.',
              diff_outcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
              merge_outcome: ThreeWayMergeOutcome.Current,
              conflict: ThreeWayDiffConflict.NONE,
              has_update: false,
              has_base_version: true,
            });
            expect(reviewResponse.rules[0].diff.num_fields_with_updates).toBe(1);
            expect(reviewResponse.rules[0].diff.num_fields_with_conflicts).toBe(0);
            expect(reviewResponse.rules[0].diff.num_fields_with_non_solvable_conflicts).toBe(0);

            expect(reviewResponse.stats.num_rules_to_upgrade_total).toBe(1);
            expect(reviewResponse.stats.num_rules_with_conflicts).toBe(0);
            expect(reviewResponse.stats.num_rules_with_non_solvable_conflicts).toBe(0);
          });
        });

        describe('when rule field has an update and a custom value that are different - scenario ABC', () => {
          describe('when all versions are mergable', () => {
            it('should show in the upgrade/_review API response with a solvable conflict', async () => {
              // Install base prebuilt detection rule
              await createHistoricalPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
              await installPrebuiltRules(es, supertest);

              // Customize a multi line string field on the installed rule
              await patchRule(supertest, log, {
                rule_id: 'rule-1',
                description: 'My GREAT description.\nThis is a second line.',
              });

              // Increment the version of the installed rule, update a multi line string field, and create the new rule assets
              const updatedRuleAssetSavedObjects = [
                createRuleAssetSavedObject({
                  rule_id: 'rule-1',
                  version: 2,
                  description: 'My description.\nThis is a second line, now longer.',
                }),
              ];
              await createHistoricalPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

              // Call the upgrade review prebuilt rules endpoint and check that one rule is eligible for update
              // and multi line string field update has no conflict
              const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
              expect(reviewResponse.rules[0].diff.fields.description).toEqual({
                base_version: 'My description.\nThis is a second line.',
                current_version: 'My GREAT description.\nThis is a second line.',
                target_version: 'My description.\nThis is a second line, now longer.',
                merged_version: 'My GREAT description.\nThis is a second line, now longer.',
                diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
                merge_outcome: ThreeWayMergeOutcome.Merged,
                conflict: ThreeWayDiffConflict.SOLVABLE,
                has_update: true,
                has_base_version: true,
              });
              expect(reviewResponse.rules[0].diff.num_fields_with_updates).toBe(2);
              expect(reviewResponse.rules[0].diff.num_fields_with_conflicts).toBe(1);
              expect(reviewResponse.rules[0].diff.num_fields_with_non_solvable_conflicts).toBe(0);

              expect(reviewResponse.stats.num_rules_to_upgrade_total).toBe(1);
              expect(reviewResponse.stats.num_rules_with_conflicts).toBe(1);
              expect(reviewResponse.stats.num_rules_with_non_solvable_conflicts).toBe(0);
            });
          });

          describe('when all versions are not mergable', () => {
            it('should show in the upgrade/_review API response with a non-solvable conflict', async () => {
              // Install base prebuilt detection rule
              await createHistoricalPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
              await installPrebuiltRules(es, supertest);

              // Customize a multi line string field on the installed rule
              await patchRule(supertest, log, {
                rule_id: 'rule-1',
                description: 'My GREAT description.\nThis is a third line.',
              });

              // Increment the version of the installed rule, update a multi line string field, and create the new rule assets
              const updatedRuleAssetSavedObjects = [
                createRuleAssetSavedObject({
                  rule_id: 'rule-1',
                  version: 2,
                  description: 'My EXCELLENT description.\nThis is a fourth.',
                }),
              ];
              await createHistoricalPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

              // Call the upgrade review prebuilt rules endpoint and check that one rule is eligible for update
              // and multi line string field update has conflict
              const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
              expect(reviewResponse.rules[0].diff.fields.description).toEqual({
                base_version: 'My description.\nThis is a second line.',
                current_version: 'My GREAT description.\nThis is a third line.',
                target_version: 'My EXCELLENT description.\nThis is a fourth.',
                merged_version: 'My GREAT description.\nThis is a third line.',
                diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
                merge_outcome: ThreeWayMergeOutcome.Current,
                conflict: ThreeWayDiffConflict.NON_SOLVABLE,
                has_update: true,
                has_base_version: true,
              });
              expect(reviewResponse.rules[0].diff.num_fields_with_updates).toBe(2);
              expect(reviewResponse.rules[0].diff.num_fields_with_conflicts).toBe(1);
              expect(reviewResponse.rules[0].diff.num_fields_with_non_solvable_conflicts).toBe(1);

              expect(reviewResponse.stats.num_rules_to_upgrade_total).toBe(1);
              expect(reviewResponse.stats.num_rules_with_conflicts).toBe(1);
              expect(reviewResponse.stats.num_rules_with_non_solvable_conflicts).toBe(1);
            });
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

              // Customize a multi line string field on the installed rule
              await patchRule(supertest, log, {
                rule_id: 'rule-1',
                description: 'My description.\nThis is a second line.',
              });

              // Increment the version of the installed rule, update a multi line string field, and create the new rule assets
              const updatedRuleAssetSavedObjects = [
                createRuleAssetSavedObject({
                  rule_id: 'rule-1',
                  version: 2,
                  description: 'My description.\nThis is a second line.',
                }),
              ];
              await createPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

              // Call the upgrade review prebuilt rules endpoint and check that one rule is eligible for update
              // but does NOT contain multi line string field, since -AA is treated as AAA
              const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
              expect(reviewResponse.rules[0].diff.fields.description).toBeUndefined();

              expect(reviewResponse.rules[0].diff.num_fields_with_updates).toBe(1);
              expect(reviewResponse.rules[0].diff.num_fields_with_conflicts).toBe(1);
              expect(reviewResponse.rules[0].diff.num_fields_with_non_solvable_conflicts).toBe(0);
            });
          });

          describe('when rule field has an update and a custom value that are different - scenario -AB', () => {
            it('should show in the upgrade/_review API response', async () => {
              // Install base prebuilt detection rule
              await createPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
              await installPrebuiltRules(es, supertest);

              // Clear previous rule assets
              await deleteAllPrebuiltRuleAssets(es, log);

              // Customize a multi line string field on the installed rule
              await patchRule(supertest, log, {
                rule_id: 'rule-1',
                description: 'My description.\nThis is a second line.',
              });

              // Increment the version of the installed rule, update a multi line string field, and create the new rule assets
              const updatedRuleAssetSavedObjects = [
                createRuleAssetSavedObject({
                  rule_id: 'rule-1',
                  version: 2,
                  description: 'My GREAT description.\nThis is a second line.',
                }),
              ];
              await createPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

              // Call the upgrade review prebuilt rules endpoint and check that one rule is eligible for update
              // and multi line string field update does not have a conflict
              const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
              expect(reviewResponse.rules[0].diff.fields.description).toEqual({
                current_version: 'My description.\nThis is a second line.',
                target_version: 'My GREAT description.\nThis is a second line.',
                merged_version: 'My GREAT description.\nThis is a second line.',
                diff_outcome: ThreeWayDiffOutcome.MissingBaseCanUpdate,
                merge_outcome: ThreeWayMergeOutcome.Target,
                conflict: ThreeWayDiffConflict.SOLVABLE,
                has_update: true,
                has_base_version: false,
              });
              expect(reviewResponse.rules[0].diff.num_fields_with_updates).toBe(2);
              expect(reviewResponse.rules[0].diff.num_fields_with_conflicts).toBe(2);
              expect(reviewResponse.rules[0].diff.num_fields_with_non_solvable_conflicts).toBe(0);

              expect(reviewResponse.stats.num_rules_to_upgrade_total).toBe(1);
              expect(reviewResponse.stats.num_rules_with_conflicts).toBe(1);
              expect(reviewResponse.stats.num_rules_with_non_solvable_conflicts).toBe(0);
            });
          });
        });
      });
    });
  });
};
