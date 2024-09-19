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

    describe(`rule type fields`, () => {
      const getRuleAssetSavedObjects = () => [
        createRuleAssetSavedObject({ rule_id: 'rule-1', version: 1, type: 'query' }),
      ];

      describe("when rule field doesn't have an update and has no custom value - scenario AAA", () => {
        it('should not show in the upgrade/_review API response', async () => {
          // Install base prebuilt detection rule
          await createHistoricalPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
          await installPrebuiltRules(es, supertest);

          // Increment the version of the installed rule, do NOT update the related type field, and create the new rule assets
          const updatedRuleAssetSavedObjects = [
            createRuleAssetSavedObject({
              rule_id: 'rule-1',
              version: 2,
              type: 'query',
            }),
          ];
          await createHistoricalPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

          // Call the upgrade review prebuilt rules endpoint and check that there is 1 rule eligible for update
          // but type field is NOT returned
          const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
          expect(reviewResponse.rules[0].diff.fields.name).toBeUndefined();

          expect(reviewResponse.rules[0].diff.num_fields_with_updates).toBe(1);
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

          // Customize a type field on the installed rule
          await patchRule(supertest, log, {
            rule_id: 'rule-1',
            type: 'eql',
          });

          // Increment the version of the installed rule, do NOT update the related type field, and create the new rule assets
          const updatedRuleAssetSavedObjects = [
            createRuleAssetSavedObject({
              rule_id: 'rule-1',
              version: 2,
              type: 'query',
            }),
          ];
          await createHistoricalPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

          // Call the upgrade review prebuilt rules endpoint and check that type diff field
          // is returned but field does not have an update, and the merge outcome is "Target"
          const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
          expect(reviewResponse.rules[0].diff.fields.name).toEqual({
            base_version: 'query',
            current_version: 'eql',
            target_version: 'query',
            merged_version: 'query',
            diff_outcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
            merge_outcome: ThreeWayMergeOutcome.Target,
            conflict: ThreeWayDiffConflict.NON_SOLVABLE,
            has_update: false,
            has_base_version: true,
          });

          expect(reviewResponse.rules[0].diff.num_fields_with_updates).toBe(1); // version field counts as upgraded
          expect(reviewResponse.rules[0].diff.num_fields_with_conflicts).toBe(1);
          expect(reviewResponse.rules[0].diff.num_fields_with_non_solvable_conflicts).toBe(1);

          expect(reviewResponse.stats.num_rules_to_upgrade_total).toBe(1);
          expect(reviewResponse.stats.num_rules_with_conflicts).toBe(1);
          expect(reviewResponse.stats.num_rules_with_non_solvable_conflicts).toBe(1);
        });
      });

      describe('when rule field has an update but does not have a custom value - scenario AAB', () => {
        it('should show in the upgrade/_review API response', async () => {
          // Install base prebuilt detection rule
          await createHistoricalPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
          await installPrebuiltRules(es, supertest);

          // Increment the version of the installed rule, update a type field, and create the new rule assets
          const updatedRuleAssetSavedObjects = [
            createRuleAssetSavedObject({
              rule_id: 'rule-1',
              version: 2,
              type: 'eql',
            }),
          ];
          await createHistoricalPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

          // Call the upgrade review prebuilt rules endpoint and check that one rule is eligible for update
          const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
          expect(reviewResponse.rules[0].diff.fields.name).toEqual({
            base_version: 'query',
            current_version: 'query',
            target_version: 'eql',
            merged_version: 'eql',
            diff_outcome: ThreeWayDiffOutcome.StockValueCanUpdate,
            merge_outcome: ThreeWayMergeOutcome.Target,
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

      describe('when rule field has an update and a custom value that are the same - scenario ABB', () => {
        it('should show in the upgrade/_review API response', async () => {
          // Install base prebuilt detection rule
          await createHistoricalPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
          await installPrebuiltRules(es, supertest);

          // Customize a type field on the installed rule
          await patchRule(supertest, log, {
            rule_id: 'rule-1',
            type: 'eql',
          });

          // Increment the version of the installed rule, update a type field, and create the new rule assets
          const updatedRuleAssetSavedObjects = [
            createRuleAssetSavedObject({
              rule_id: 'rule-1',
              version: 2,
              type: 'eql',
            }),
          ];
          await createHistoricalPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

          // Call the upgrade review prebuilt rules endpoint and check that one rule is eligible for update
          const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
          expect(reviewResponse.rules[0].diff.fields.name).toEqual({
            base_version: 'query',
            current_version: 'eql',
            target_version: 'eql',
            merged_version: 'eql',
            diff_outcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
            merge_outcome: ThreeWayMergeOutcome.Target,
            conflict: ThreeWayDiffConflict.NON_SOLVABLE,
            has_update: false,
            has_base_version: true,
          });

          expect(reviewResponse.rules[0].diff.num_fields_with_updates).toBe(1);
          expect(reviewResponse.rules[0].diff.num_fields_with_conflicts).toBe(1);
          expect(reviewResponse.rules[0].diff.num_fields_with_non_solvable_conflicts).toBe(1);

          expect(reviewResponse.stats.num_rules_to_upgrade_total).toBe(1);
          expect(reviewResponse.stats.num_rules_with_conflicts).toBe(1);
          expect(reviewResponse.stats.num_rules_with_non_solvable_conflicts).toBe(1);
        });
      });

      describe('when rule field has an update and a custom value that are different - scenario ABC', () => {
        it('should show in the upgrade/_review API response', async () => {
          // Install base prebuilt detection rule
          await createHistoricalPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
          await installPrebuiltRules(es, supertest);

          // Customize a type field on the installed rule
          await patchRule(supertest, log, {
            rule_id: 'rule-1',
            type: 'eql',
          });

          // Increment the version of the installed rule, update a type field, and create the new rule assets
          const updatedRuleAssetSavedObjects = [
            createRuleAssetSavedObject({
              rule_id: 'rule-1',
              version: 2,
              type: 'esql',
            }),
          ];
          await createHistoricalPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

          // Call the upgrade review prebuilt rules endpoint and check that one rule is eligible for update
          // and type field update has NON_SOLVABLE conflict, and merged version is TARGET
          const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
          expect(reviewResponse.rules[0].diff.fields.name).toEqual({
            base_version: 'query',
            current_version: 'eql',
            target_version: 'esql',
            merged_version: 'esql',
            diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
            merge_outcome: ThreeWayMergeOutcome.Target,
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

      describe('when rule base version does not exist', () => {
        describe('when rule field has an update and a custom value that are the same - scenario -AA', () => {
          it('should not show in the upgrade/_review API response', async () => {
            // Install base prebuilt detection rule
            await createPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
            await installPrebuiltRules(es, supertest);

            // Clear previous rule assets
            await deleteAllPrebuiltRuleAssets(es, log);

            // Increment the version of the installed rule, but keep type field unchanged
            const updatedRuleAssetSavedObjects = [
              createRuleAssetSavedObject({
                rule_id: 'rule-1',
                version: 2,
                type: 'query', // unchanged
              }),
            ];
            await createPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

            // Call the upgrade review prebuilt rules endpoint and check that one rule is eligible for update
            // but does NOT contain type field
            const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
            expect(reviewResponse.rules[0].diff.fields.name).toBeUndefined();

            expect(reviewResponse.rules[0].diff.num_fields_with_updates).toBe(1);
            expect(reviewResponse.rules[0].diff.num_fields_with_conflicts).toBe(1); // version is considered a conflict
            expect(reviewResponse.rules[0].diff.num_fields_with_non_solvable_conflicts).toBe(0);

            expect(reviewResponse.stats.num_rules_to_upgrade_total).toBe(1);
            expect(reviewResponse.stats.num_rules_with_conflicts).toBe(1);
            expect(reviewResponse.stats.num_rules_with_non_solvable_conflicts).toBe(0);
          });
        });

        describe('when rule field has an update and a custom value that are different - scenario -AB', () => {
          it('should show in the upgrade/_review API response', async () => {
            // Install base prebuilt detection rule
            await createPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
            await installPrebuiltRules(es, supertest);

            // Clear previous rule assets
            await deleteAllPrebuiltRuleAssets(es, log);

            // Customize a type field on the installed rule
            await patchRule(supertest, log, {
              rule_id: 'rule-1',
              type: 'query',
            });

            // Increment the version of the installed rule, update a type field, and create the new rule assets
            const updatedRuleAssetSavedObjects = [
              createRuleAssetSavedObject({
                rule_id: 'rule-1',
                version: 2,
                type: 'eql',
              }),
            ];
            await createPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

            // Call the upgrade review prebuilt rules endpoint and check that one rule is eligible for update
            // and type field update does not have a conflict
            const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
            expect(reviewResponse.rules[0].diff.fields.name).toEqual({
              current_version: 'query',
              target_version: 'eql',
              merged_version: 'eql',
              diff_outcome: ThreeWayDiffOutcome.MissingBaseCanUpdate,
              merge_outcome: ThreeWayMergeOutcome.Target,
              conflict: ThreeWayDiffConflict.NON_SOLVABLE,
              has_update: true,
              has_base_version: false,
            });

            expect(reviewResponse.rules[0].diff.num_fields_with_updates).toBe(2);
            expect(reviewResponse.rules[0].diff.num_fields_with_conflicts).toBe(2); // type + version are both considered conflicts
            expect(reviewResponse.rules[0].diff.num_fields_with_non_solvable_conflicts).toBe(1);

            expect(reviewResponse.stats.num_rules_to_upgrade_total).toBe(1);
            expect(reviewResponse.stats.num_rules_with_conflicts).toBe(1);
            expect(reviewResponse.stats.num_rules_with_non_solvable_conflicts).toBe(1);
          });
        });
      });
    });
  });
};
