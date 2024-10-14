/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from 'expect';
import {
  AllFieldsDiff,
  RuleUpdateProps,
  ThreeWayDiffConflict,
  ThreeWayDiffOutcome,
  ThreeWayMergeOutcome,
} from '@kbn/security-solution-plugin/common/api/detection_engine';
import { getPrebuiltRuleMock } from '@kbn/security-solution-plugin/server/lib/detection_engine/prebuilt_rules/mocks';
import { FtrProviderContext } from '../../../../../../ftr_provider_context';
import {
  deleteAllTimelines,
  deleteAllPrebuiltRuleAssets,
  createRuleAssetSavedObject,
  installPrebuiltRules,
  createPrebuiltRuleAssetSavedObjects,
  reviewPrebuiltRulesToUpgrade,
  createHistoricalPrebuiltRuleAssetSavedObjects,
  updateRule,
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

    describe(`eql_query fields`, () => {
      const getRuleAssetSavedObjects = () => [
        createRuleAssetSavedObject({
          rule_id: 'rule-1',
          version: 1,
          type: 'eql',
          query: 'query where true',
          language: 'eql',
          filters: [],
        }),
      ];

      describe("when rule field doesn't have an update and has no custom value - scenario AAA", () => {
        it('should not show in the upgrade/_review API response', async () => {
          // Install base prebuilt detection rule
          await createHistoricalPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
          await installPrebuiltRules(es, supertest);

          // Add a v2 rule asset to make the upgrade possible, do NOT update the related eql_query field, and create the new rule assets
          const updatedRuleAssetSavedObjects = [
            createRuleAssetSavedObject({
              rule_id: 'rule-1',
              version: 2,
              type: 'eql',
              query: 'query where true',
              language: 'eql',
              filters: [],
            }),
          ];
          await createHistoricalPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

          // Call the upgrade review prebuilt rules endpoint and check that there is 1 rule eligible for update but eql_query field is NOT returned
          const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
          const fieldDiffObject = reviewResponse.rules[0].diff.fields as AllFieldsDiff;
          expect(fieldDiffObject.eql_query).toBeUndefined();

          expect(reviewResponse.rules[0].diff.num_fields_with_updates).toBe(1); // `version` is considered an updated field
          expect(reviewResponse.rules[0].diff.num_fields_with_conflicts).toBe(0);
          expect(reviewResponse.rules[0].diff.num_fields_with_non_solvable_conflicts).toBe(0);
          expect(reviewResponse.stats.num_rules_with_conflicts).toBe(0);
          expect(reviewResponse.stats.num_rules_with_non_solvable_conflicts).toBe(0);
        });
      });

      describe("when rule field doesn't have an update but has a custom value - scenario ABA", () => {
        it('should show in the upgrade/_review API response', async () => {
          // Install base prebuilt detection rule
          await createHistoricalPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
          await installPrebuiltRules(es, supertest);

          // Customize an eql_query field on the installed rule
          await updateRule(supertest, {
            ...getPrebuiltRuleMock(),
            rule_id: 'rule-1',
            type: 'eql',
            query: 'query where false',
            language: 'eql',
            filters: [],
          } as RuleUpdateProps);

          // Add a v2 rule asset to make the upgrade possible, do NOT update the related eql_query field, and create the new rule assets
          const updatedRuleAssetSavedObjects = [
            createRuleAssetSavedObject({
              rule_id: 'rule-1',
              version: 2,
              type: 'eql',
              query: 'query where true',
              language: 'eql',
              filters: [],
            }),
          ];
          await createHistoricalPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

          // Call the upgrade review prebuilt rules endpoint and check that eql_query diff field is returned but field does not have an update
          const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
          const fieldDiffObject = reviewResponse.rules[0].diff.fields as AllFieldsDiff;
          expect(fieldDiffObject.eql_query).toEqual({
            base_version: {
              query: 'query where true',
              language: 'eql',
              filters: [],
            },
            current_version: {
              query: 'query where false',
              language: 'eql',
              filters: [],
            },
            target_version: {
              query: 'query where true',
              language: 'eql',
              filters: [],
            },
            merged_version: {
              query: 'query where false',
              language: 'eql',
              filters: [],
            },
            diff_outcome: ThreeWayDiffOutcome.CustomizedValueNoUpdate,
            merge_outcome: ThreeWayMergeOutcome.Current,
            conflict: ThreeWayDiffConflict.NONE,
            has_update: false,
            has_base_version: true,
          });

          expect(reviewResponse.rules[0].diff.num_fields_with_updates).toBe(1); // `version` is considered an updated field
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

          // Add a v2 rule asset to make the upgrade possible, update an eql_query field, and create the new rule assets
          const updatedRuleAssetSavedObjects = [
            createRuleAssetSavedObject({
              rule_id: 'rule-1',
              version: 2,
              type: 'eql',
              query: 'query where false',
              language: 'eql',
              filters: [],
            }),
          ];
          await createHistoricalPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

          // Call the upgrade review prebuilt rules endpoint and check that one rule is eligible for update
          const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
          const fieldDiffObject = reviewResponse.rules[0].diff.fields as AllFieldsDiff;
          expect(fieldDiffObject.eql_query).toEqual({
            base_version: {
              query: 'query where true',
              language: 'eql',
              filters: [],
            },
            current_version: {
              query: 'query where true',
              language: 'eql',
              filters: [],
            },
            target_version: {
              query: 'query where false',
              language: 'eql',
              filters: [],
            },
            merged_version: {
              query: 'query where false',
              language: 'eql',
              filters: [],
            },
            diff_outcome: ThreeWayDiffOutcome.StockValueCanUpdate,
            merge_outcome: ThreeWayMergeOutcome.Target,
            conflict: ThreeWayDiffConflict.NONE,
            has_update: true,
            has_base_version: true,
          });

          expect(reviewResponse.rules[0].diff.num_fields_with_updates).toBe(2); // `version` is considered an updated field
          expect(reviewResponse.rules[0].diff.num_fields_with_conflicts).toBe(0);
          expect(reviewResponse.rules[0].diff.num_fields_with_non_solvable_conflicts).toBe(0);

          expect(reviewResponse.stats.num_rules_to_upgrade_total).toBe(1);
          expect(reviewResponse.stats.num_rules_with_conflicts).toBe(0);
          expect(reviewResponse.stats.num_rules_with_non_solvable_conflicts).toBe(0);
        });
      });

      describe('when rule field has an update and a custom value that are the same - scenario ABB', () => {
        it('should show in the upgrade/_review API response', async () => {
          // Install base prebuilt detection rule
          await createHistoricalPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
          await installPrebuiltRules(es, supertest);

          // Customize an eql_query field on the installed rule
          await updateRule(supertest, {
            ...getPrebuiltRuleMock(),
            rule_id: 'rule-1',
            type: 'eql',
            query: 'query where false',
            language: 'eql',
            filters: [],
          } as RuleUpdateProps);

          // Add a v2 rule asset to make the upgrade possible, update an eql_query field, and create the new rule assets
          const updatedRuleAssetSavedObjects = [
            createRuleAssetSavedObject({
              rule_id: 'rule-1',
              version: 2,
              type: 'eql',
              query: 'query where false',
              language: 'eql',
              filters: [],
            }),
          ];
          await createHistoricalPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

          // Call the upgrade review prebuilt rules endpoint and check that one rule is eligible for update and contains eql_query field
          const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
          const fieldDiffObject = reviewResponse.rules[0].diff.fields as AllFieldsDiff;
          expect(fieldDiffObject.eql_query).toEqual({
            base_version: {
              query: 'query where true',
              language: 'eql',
              filters: [],
            },
            current_version: {
              query: 'query where false',
              language: 'eql',
              filters: [],
            },
            target_version: {
              query: 'query where false',
              language: 'eql',
              filters: [],
            },
            merged_version: {
              query: 'query where false',
              language: 'eql',
              filters: [],
            },
            diff_outcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
            merge_outcome: ThreeWayMergeOutcome.Current,
            conflict: ThreeWayDiffConflict.NONE,
            has_update: false,
            has_base_version: true,
          });
          expect(reviewResponse.rules[0].diff.num_fields_with_updates).toBe(1); // `version` is considered an updated field
          expect(reviewResponse.rules[0].diff.num_fields_with_conflicts).toBe(0);
          expect(reviewResponse.rules[0].diff.num_fields_with_non_solvable_conflicts).toBe(0);

          expect(reviewResponse.stats.num_rules_to_upgrade_total).toBe(1);
          expect(reviewResponse.stats.num_rules_with_conflicts).toBe(0);
          expect(reviewResponse.stats.num_rules_with_non_solvable_conflicts).toBe(0);
        });
      });

      describe('when rule field has an update and a custom value that are different - scenario ABC', () => {
        it('should show a non-solvable conflict in the upgrade/_review API response', async () => {
          // Install base prebuilt detection rule
          await createHistoricalPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
          await installPrebuiltRules(es, supertest);

          // Customize an eql_query field on the installed rule
          await updateRule(supertest, {
            ...getPrebuiltRuleMock(),
            rule_id: 'rule-1',
            type: 'eql',
            query: 'query where true',
            language: 'eql',
            filters: [{ field: 'query' }],
          } as RuleUpdateProps);

          // Add a v2 rule asset to make the upgrade possible, update an eql_query field, and create the new rule assets
          const updatedRuleAssetSavedObjects = [
            createRuleAssetSavedObject({
              rule_id: 'rule-1',
              version: 2,
              type: 'eql',
              query: 'query where false',
              language: 'eql',
              filters: [],
            }),
          ];
          await createHistoricalPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

          // Call the upgrade review prebuilt rules endpoint and check that one rule is eligible for update
          // and eql_query field update has conflict
          const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
          const fieldDiffObject = reviewResponse.rules[0].diff.fields as AllFieldsDiff;
          expect(fieldDiffObject.eql_query).toEqual({
            base_version: {
              query: 'query where true',
              language: 'eql',
              filters: [],
            },
            current_version: {
              query: 'query where true',
              language: 'eql',
              filters: [{ field: 'query' }],
            },
            target_version: {
              query: 'query where false',
              language: 'eql',
              filters: [],
            },
            merged_version: {
              query: 'query where true',
              language: 'eql',
              filters: [{ field: 'query' }],
            },
            diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
            merge_outcome: ThreeWayMergeOutcome.Current,
            conflict: ThreeWayDiffConflict.NON_SOLVABLE,
            has_update: true,
            has_base_version: true,
          });

          expect(reviewResponse.rules[0].diff.num_fields_with_updates).toBe(2); // `version` is considered an updated field
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

            // Add a v2 rule asset to make the upgrade possible, but keep eql_query field unchanged
            const updatedRuleAssetSavedObjects = [
              createRuleAssetSavedObject({
                rule_id: 'rule-1',
                version: 2,
                type: 'eql',
                query: 'query where true',
                language: 'eql',
                filters: [],
              }),
            ];
            await createPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

            // Call the upgrade review prebuilt rules endpoint and check that one rule is eligible for update
            // but does NOT contain eql_query field
            const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
            const fieldDiffObject = reviewResponse.rules[0].diff.fields as AllFieldsDiff;
            expect(fieldDiffObject.eql_query).toBeUndefined();

            expect(reviewResponse.rules[0].diff.num_fields_with_updates).toBe(1); // `version` is considered an updated field
            expect(reviewResponse.rules[0].diff.num_fields_with_conflicts).toBe(1); // `version` is considered conflict
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

            // Customize an eql_query field on the installed rule
            await updateRule(supertest, {
              ...getPrebuiltRuleMock(),
              rule_id: 'rule-1',
              type: 'eql',
              query: 'query where false',
              language: 'eql',
              filters: [],
            } as RuleUpdateProps);

            // Add a v2 rule asset to make the upgrade possible, update an eql_query field, and create the new rule assets
            const updatedRuleAssetSavedObjects = [
              createRuleAssetSavedObject({
                rule_id: 'rule-1',
                version: 2,
                type: 'eql',
                query: 'new query where true',
                language: 'eql',
                filters: [],
              }),
            ];
            await createPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

            // Call the upgrade review prebuilt rules endpoint and check that one rule is eligible for update
            // and eql_query field update does not have a conflict
            const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
            const fieldDiffObject = reviewResponse.rules[0].diff.fields as AllFieldsDiff;
            expect(fieldDiffObject.eql_query).toEqual({
              current_version: {
                query: 'query where false',
                language: 'eql',
                filters: [],
              },
              target_version: {
                query: 'new query where true',
                language: 'eql',
                filters: [],
              },
              merged_version: {
                query: 'new query where true',
                language: 'eql',
                filters: [],
              },
              diff_outcome: ThreeWayDiffOutcome.MissingBaseCanUpdate,
              merge_outcome: ThreeWayMergeOutcome.Target,
              conflict: ThreeWayDiffConflict.SOLVABLE,
              has_update: true,
              has_base_version: false,
            });

            expect(reviewResponse.rules[0].diff.num_fields_with_updates).toBe(2); // version + query
            expect(reviewResponse.rules[0].diff.num_fields_with_conflicts).toBe(2); // version + query
            expect(reviewResponse.rules[0].diff.num_fields_with_non_solvable_conflicts).toBe(0);

            expect(reviewResponse.stats.num_rules_to_upgrade_total).toBe(1);
            expect(reviewResponse.stats.num_rules_with_conflicts).toBe(1);
            expect(reviewResponse.stats.num_rules_with_non_solvable_conflicts).toBe(0);
          });
        });
      });
    });
  });
};
