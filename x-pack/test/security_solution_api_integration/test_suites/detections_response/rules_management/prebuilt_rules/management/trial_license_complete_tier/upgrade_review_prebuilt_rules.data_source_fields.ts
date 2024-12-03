/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from 'expect';
import {
  AllFieldsDiff,
  DataSourceType,
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
  patchRule,
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

    describe(`data_source fields`, () => {
      const getIndexRuleAssetSavedObjects = () => [
        createRuleAssetSavedObject({
          rule_id: 'rule-1',
          version: 1,
          index: ['one', 'two', 'three'],
        }),
      ];

      const getDataViewIdRuleAssetSavedObjects = () => [
        createRuleAssetSavedObject({
          rule_id: 'rule-1',
          version: 1,
          data_view_id: 'A',
        }),
      ];

      describe("when rule field doesn't have an update and has no custom value - scenario AAA", () => {
        describe('when all versions are index patterns', () => {
          it('should not show in the upgrade/_review API response', async () => {
            // Install base prebuilt detection rule
            await createHistoricalPrebuiltRuleAssetSavedObjects(
              es,
              getIndexRuleAssetSavedObjects()
            );
            await installPrebuiltRules(es, supertest);

            // Increment the version of the installed rule, do NOT update the related data_source field, and create the new rule assets
            const updatedRuleAssetSavedObjects = [
              createRuleAssetSavedObject({
                rule_id: 'rule-1',
                index: ['one', 'three', 'two'],
                version: 2,
              }),
            ];
            await createHistoricalPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

            // Call the upgrade review prebuilt rules endpoint and check that there is 1 rule eligable for update but data_source field is NOT returned
            const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
            const fieldDiffObject = reviewResponse.rules[0].diff.fields as AllFieldsDiff;
            expect(fieldDiffObject.data_source).toBeUndefined();

            expect(reviewResponse.rules[0].diff.num_fields_with_updates).toBe(1);
            expect(reviewResponse.rules[0].diff.num_fields_with_conflicts).toBe(0);
            expect(reviewResponse.rules[0].diff.num_fields_with_non_solvable_conflicts).toBe(0);
            expect(reviewResponse.stats.num_rules_with_conflicts).toBe(0);
            expect(reviewResponse.stats.num_rules_with_non_solvable_conflicts).toBe(0);
          });
        });

        describe('when all versions are data view id', () => {
          it('should not show in the upgrade/_review API response', async () => {
            // Install base prebuilt detection rule
            await createHistoricalPrebuiltRuleAssetSavedObjects(
              es,
              getDataViewIdRuleAssetSavedObjects()
            );
            await installPrebuiltRules(es, supertest);

            // Increment the version of the installed rule, do NOT update the related data_source field, and create the new rule assets
            const updatedRuleAssetSavedObjects = [
              createRuleAssetSavedObject({
                rule_id: 'rule-1',
                data_view_id: 'A',
                version: 2,
              }),
            ];
            await createHistoricalPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

            // Call the upgrade review prebuilt rules endpoint and check that there is 1 rule eligable for update but data_source field is NOT returned
            const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
            const fieldDiffObject = reviewResponse.rules[0].diff.fields as AllFieldsDiff;
            expect(fieldDiffObject.data_source).toBeUndefined();

            expect(reviewResponse.rules[0].diff.num_fields_with_updates).toBe(1);
            expect(reviewResponse.rules[0].diff.num_fields_with_conflicts).toBe(0);
            expect(reviewResponse.rules[0].diff.num_fields_with_non_solvable_conflicts).toBe(0);
            expect(reviewResponse.stats.num_rules_with_conflicts).toBe(0);
            expect(reviewResponse.stats.num_rules_with_non_solvable_conflicts).toBe(0);
          });
        });
      });

      describe("when rule field doesn't have an update but has a custom value - scenario ABA", () => {
        describe('when current version is index pattern type', () => {
          it('should show in the upgrade/_review API response', async () => {
            // Install base prebuilt detection rule
            await createHistoricalPrebuiltRuleAssetSavedObjects(
              es,
              getDataViewIdRuleAssetSavedObjects()
            );
            await installPrebuiltRules(es, supertest);

            // Customize a data_source field on the installed rule
            await updateRule(supertest, {
              ...getPrebuiltRuleMock(),
              rule_id: 'rule-1',
              index: ['one', 'two', 'four'],
              data_view_id: undefined,
            } as RuleUpdateProps);

            // Increment the version of the installed rule, do NOT update the related data_source field, and create the new rule assets
            const updatedRuleAssetSavedObjects = [
              createRuleAssetSavedObject({
                rule_id: 'rule-1',
                data_view_id: 'A',
                version: 2,
              }),
            ];
            await createHistoricalPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

            // Call the upgrade review prebuilt rules endpoint and check that data_source diff field is returned but field does not have an update
            const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
            const fieldDiffObject = reviewResponse.rules[0].diff.fields as AllFieldsDiff;
            expect(fieldDiffObject.data_source).toEqual({
              base_version: {
                data_view_id: 'A',
                type: DataSourceType.data_view,
              },
              current_version: {
                index_patterns: ['one', 'two', 'four'],
                type: DataSourceType.index_patterns,
              },
              target_version: {
                data_view_id: 'A',
                type: DataSourceType.data_view,
              },
              merged_version: {
                index_patterns: ['one', 'two', 'four'],
                type: DataSourceType.index_patterns,
              },
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

        describe('when current version is data view id type', () => {
          it('should show in the upgrade/_review API response', async () => {
            // Install base prebuilt detection rule
            await createHistoricalPrebuiltRuleAssetSavedObjects(
              es,
              getIndexRuleAssetSavedObjects()
            );
            await installPrebuiltRules(es, supertest);

            // Customize a data_source field on the installed rule
            await updateRule(supertest, {
              ...getPrebuiltRuleMock(),
              rule_id: 'rule-1',
              index: undefined,
              data_view_id: 'B',
            } as RuleUpdateProps);

            // Increment the version of the installed rule, do NOT update the related data_source field, and create the new rule assets
            const updatedRuleAssetSavedObjects = [
              createRuleAssetSavedObject({
                rule_id: 'rule-1',
                index: ['one', 'two', 'three'],
                version: 2,
              }),
            ];
            await createHistoricalPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

            // Call the upgrade review prebuilt rules endpoint and check that data_source diff field is returned but field does not have an update
            const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
            const fieldDiffObject = reviewResponse.rules[0].diff.fields as AllFieldsDiff;
            expect(fieldDiffObject.data_source).toEqual({
              base_version: {
                index_patterns: ['one', 'two', 'three'],
                type: DataSourceType.index_patterns,
              },
              current_version: {
                data_view_id: 'B',
                type: DataSourceType.data_view,
              },
              target_version: {
                index_patterns: ['one', 'two', 'three'],
                type: DataSourceType.index_patterns,
              },
              merged_version: {
                data_view_id: 'B',
                type: DataSourceType.data_view,
              },
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

        describe('when current version is undefined', () => {
          it('should show in the upgrade/_review API response', async () => {
            // Install base prebuilt detection rule
            await createHistoricalPrebuiltRuleAssetSavedObjects(
              es,
              getIndexRuleAssetSavedObjects()
            );
            await installPrebuiltRules(es, supertest);

            // Customize a data_source field on the installed rule
            await updateRule(supertest, {
              ...getPrebuiltRuleMock(),
              rule_id: 'rule-1',
              index: undefined,
            } as RuleUpdateProps);

            // Increment the version of the installed rule, do NOT update the related data_source field, and create the new rule assets
            const updatedRuleAssetSavedObjects = [
              createRuleAssetSavedObject({
                rule_id: 'rule-1',
                index: ['one', 'two', 'three'],
                version: 2,
              }),
            ];
            await createHistoricalPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

            // Call the upgrade review prebuilt rules endpoint and check that data_source diff field is returned but field does not have an update
            const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
            const fieldDiffObject = reviewResponse.rules[0].diff.fields as AllFieldsDiff;
            expect(fieldDiffObject.data_source).toEqual({
              base_version: {
                index_patterns: ['one', 'two', 'three'],
                type: DataSourceType.index_patterns,
              },
              current_version: undefined,
              target_version: {
                index_patterns: ['one', 'two', 'three'],
                type: DataSourceType.index_patterns,
              },
              merged_version: undefined,
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
      });

      describe('when rule field has an update but does not have a custom value - scenario AAB', () => {
        describe('when target version is index pattern type', () => {
          it('should show in the upgrade/_review API response', async () => {
            // Install base prebuilt detection rule
            await createHistoricalPrebuiltRuleAssetSavedObjects(
              es,
              getDataViewIdRuleAssetSavedObjects()
            );
            await installPrebuiltRules(es, supertest);

            // Increment the version of the installed rule, update a data_source field, and create the new rule assets
            const updatedRuleAssetSavedObjects = [
              createRuleAssetSavedObject({
                rule_id: 'rule-1',
                version: 2,
                index: ['one', 'two', 'four'],
              }),
            ];
            await createHistoricalPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

            // Call the upgrade review prebuilt rules endpoint and check that one rule is eligible for update
            const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
            const fieldDiffObject = reviewResponse.rules[0].diff.fields as AllFieldsDiff;
            expect(fieldDiffObject.data_source).toEqual({
              base_version: {
                data_view_id: 'A',
                type: DataSourceType.data_view,
              },
              current_version: {
                data_view_id: 'A',
                type: DataSourceType.data_view,
              },
              target_version: {
                index_patterns: ['one', 'two', 'four'],
                type: DataSourceType.index_patterns,
              },
              merged_version: {
                index_patterns: ['one', 'two', 'four'],
                type: DataSourceType.index_patterns,
              },
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
        });

        describe('when target version is data view id type', () => {
          it('should show in the upgrade/_review API response', async () => {
            // Install base prebuilt detection rule
            await createHistoricalPrebuiltRuleAssetSavedObjects(
              es,
              getIndexRuleAssetSavedObjects()
            );
            await installPrebuiltRules(es, supertest);

            // Increment the version of the installed rule, update a data_source field, and create the new rule assets
            const updatedRuleAssetSavedObjects = [
              createRuleAssetSavedObject({
                rule_id: 'rule-1',
                version: 2,
                data_view_id: 'B',
              }),
            ];
            await createHistoricalPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

            // Call the upgrade review prebuilt rules endpoint and check that one rule is eligible for update
            const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
            const fieldDiffObject = reviewResponse.rules[0].diff.fields as AllFieldsDiff;
            expect(fieldDiffObject.data_source).toEqual({
              base_version: {
                index_patterns: ['one', 'two', 'three'],
                type: DataSourceType.index_patterns,
              },
              current_version: {
                index_patterns: ['one', 'two', 'three'],
                type: DataSourceType.index_patterns,
              },
              target_version: {
                data_view_id: 'B',
                type: DataSourceType.data_view,
              },
              merged_version: {
                data_view_id: 'B',
                type: DataSourceType.data_view,
              },
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
        });
      });

      describe('when rule field has an update and a custom value that are the same - scenario ABB', () => {
        describe('when current and target version are index pattern type', () => {
          it('should show in the upgrade/_review API response', async () => {
            // Install base prebuilt detection rule
            await createHistoricalPrebuiltRuleAssetSavedObjects(
              es,
              getDataViewIdRuleAssetSavedObjects()
            );
            await installPrebuiltRules(es, supertest);

            // Customize a data_source field on the installed rule
            await updateRule(supertest, {
              ...getPrebuiltRuleMock(),
              rule_id: 'rule-1',
              index: ['one', 'two', 'four'],
              data_view_id: undefined,
            } as RuleUpdateProps);

            // Increment the version of the installed rule, update a data_source field, and create the new rule assets
            const updatedRuleAssetSavedObjects = [
              createRuleAssetSavedObject({
                rule_id: 'rule-1',
                version: 2,
                index: ['one', 'two', 'four'],
              }),
            ];
            await createHistoricalPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

            // Call the upgrade review prebuilt rules endpoint and check that one rule is eligible for update and contains data_source field
            const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
            const fieldDiffObject = reviewResponse.rules[0].diff.fields as AllFieldsDiff;
            expect(fieldDiffObject.data_source).toEqual({
              base_version: {
                data_view_id: 'A',
                type: DataSourceType.data_view,
              },
              current_version: {
                index_patterns: ['one', 'two', 'four'],
                type: DataSourceType.index_patterns,
              },
              target_version: {
                index_patterns: ['one', 'two', 'four'],
                type: DataSourceType.index_patterns,
              },
              merged_version: {
                index_patterns: ['one', 'two', 'four'],
                type: DataSourceType.index_patterns,
              },
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

        describe('when current and target version are data view id type', () => {
          it('should show in the upgrade/_review API response', async () => {
            // Install base prebuilt detection rule
            await createHistoricalPrebuiltRuleAssetSavedObjects(
              es,
              getIndexRuleAssetSavedObjects()
            );
            await installPrebuiltRules(es, supertest);

            // Customize a data_source field on the installed rule
            await updateRule(supertest, {
              ...getPrebuiltRuleMock(),
              rule_id: 'rule-1',
              index: undefined,
              data_view_id: 'B',
            } as RuleUpdateProps);

            // Increment the version of the installed rule, update a data_source field, and create the new rule assets
            const updatedRuleAssetSavedObjects = [
              createRuleAssetSavedObject({
                rule_id: 'rule-1',
                version: 2,
                data_view_id: 'B',
              }),
            ];
            await createHistoricalPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

            // Call the upgrade review prebuilt rules endpoint and check that one rule is eligible for update and contains data_source field
            const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
            const fieldDiffObject = reviewResponse.rules[0].diff.fields as AllFieldsDiff;
            expect(fieldDiffObject.data_source).toEqual({
              base_version: {
                index_patterns: ['one', 'two', 'three'],
                type: DataSourceType.index_patterns,
              },
              current_version: {
                data_view_id: 'B',
                type: DataSourceType.data_view,
              },
              target_version: {
                data_view_id: 'B',
                type: DataSourceType.data_view,
              },
              merged_version: {
                data_view_id: 'B',
                type: DataSourceType.data_view,
              },
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
      });

      describe('when rule field has an update and a custom value that are different - scenario ABC', () => {
        describe('when just current and target versions are index patterns', () => {
          it('should show a solvable conflict in the upgrade/_review API response', async () => {
            // Install base prebuilt detection rule
            await createHistoricalPrebuiltRuleAssetSavedObjects(
              es,
              getDataViewIdRuleAssetSavedObjects()
            );
            await installPrebuiltRules(es, supertest);

            // Customize a data_source field on the installed rule
            await updateRule(supertest, {
              ...getPrebuiltRuleMock(),
              rule_id: 'rule-1',
              index: ['one', 'one', 'two', 'three'],
              data_view_id: undefined,
            } as RuleUpdateProps);

            // Increment the version of the installed rule, update a data_source field, and create the new rule assets
            const updatedRuleAssetSavedObjects = [
              createRuleAssetSavedObject({
                rule_id: 'rule-1',
                version: 2,
                index: ['one', 'two', 'five'],
              }),
            ];
            await createHistoricalPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

            // Call the upgrade review prebuilt rules endpoint and check that one rule is eligible for update
            // and data_source field update has conflict
            const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
            const fieldDiffObject = reviewResponse.rules[0].diff.fields as AllFieldsDiff;
            expect(fieldDiffObject.data_source).toEqual({
              base_version: {
                data_view_id: 'A',
                type: DataSourceType.data_view,
              },
              current_version: {
                index_patterns: ['one', 'one', 'two', 'three'],
                type: DataSourceType.index_patterns,
              },
              target_version: {
                index_patterns: ['one', 'two', 'five'],
                type: DataSourceType.index_patterns,
              },
              merged_version: {
                index_patterns: ['one', 'two', 'three', 'five'],
                type: DataSourceType.index_patterns,
              },
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

        describe('when all versions are index patterns', () => {
          it('should show a solvable conflict in the upgrade/_review API response', async () => {
            // Install base prebuilt detection rule
            await createHistoricalPrebuiltRuleAssetSavedObjects(
              es,
              getIndexRuleAssetSavedObjects()
            );
            await installPrebuiltRules(es, supertest);

            // Customize a multi line string field on the installed rule
            await patchRule(supertest, log, {
              rule_id: 'rule-1',
              index: ['one', 'two', 'four'],
            });

            // Increment the version of the installed rule, update a data_source field, and create the new rule assets
            const updatedRuleAssetSavedObjects = [
              createRuleAssetSavedObject({
                rule_id: 'rule-1',
                version: 2,
                index: ['one', 'two', 'five'],
              }),
            ];
            await createHistoricalPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

            // Call the upgrade review prebuilt rules endpoint and check that one rule is eligible for update
            // and data_source field update has conflict
            const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
            const fieldDiffObject = reviewResponse.rules[0].diff.fields as AllFieldsDiff;
            expect(fieldDiffObject.data_source).toEqual({
              base_version: {
                index_patterns: ['one', 'two', 'three'],
                type: DataSourceType.index_patterns,
              },
              current_version: {
                index_patterns: ['one', 'two', 'four'],
                type: DataSourceType.index_patterns,
              },
              target_version: {
                index_patterns: ['one', 'two', 'five'],
                type: DataSourceType.index_patterns,
              },
              merged_version: {
                index_patterns: ['one', 'two', 'four', 'five'],
                type: DataSourceType.index_patterns,
              },
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

        describe('when all versions are data view id types', () => {
          it('should show a non-solvable conflict in the upgrade/_review API response', async () => {
            // Install base prebuilt detection rule
            await createHistoricalPrebuiltRuleAssetSavedObjects(
              es,
              getDataViewIdRuleAssetSavedObjects()
            );
            await installPrebuiltRules(es, supertest);

            // Customize a data_source field on the installed rule
            await updateRule(supertest, {
              ...getPrebuiltRuleMock(),
              rule_id: 'rule-1',
              index: undefined,
              data_view_id: 'B',
            } as RuleUpdateProps);

            // Increment the version of the installed rule, update a data_source field, and create the new rule assets
            const updatedRuleAssetSavedObjects = [
              createRuleAssetSavedObject({
                rule_id: 'rule-1',
                version: 2,
                data_view_id: 'C',
              }),
            ];
            await createHistoricalPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

            // Call the upgrade review prebuilt rules endpoint and check that one rule is eligible for update
            // and data_source field update has conflict
            const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
            const fieldDiffObject = reviewResponse.rules[0].diff.fields as AllFieldsDiff;
            expect(fieldDiffObject.data_source).toEqual({
              base_version: {
                data_view_id: 'A',
                type: DataSourceType.data_view,
              },
              current_version: {
                data_view_id: 'B',
                type: DataSourceType.data_view,
              },
              target_version: {
                data_view_id: 'C',
                type: DataSourceType.data_view,
              },
              merged_version: {
                data_view_id: 'B',
                type: DataSourceType.data_view,
              },
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

        describe('when current and target versions are different data types', () => {
          it('should show a non-solvable conflict in the upgrade/_review API response', async () => {
            // Install base prebuilt detection rule
            await createHistoricalPrebuiltRuleAssetSavedObjects(
              es,
              getDataViewIdRuleAssetSavedObjects()
            );
            await installPrebuiltRules(es, supertest);

            // Customize a data_source field on the installed rule
            await updateRule(supertest, {
              ...getPrebuiltRuleMock(),
              rule_id: 'rule-1',
              index: ['one', 'two', 'four'],
              data_view_id: undefined,
            } as RuleUpdateProps);

            // Increment the version of the installed rule, update a data_source field, and create the new rule assets
            const updatedRuleAssetSavedObjects = [
              createRuleAssetSavedObject({
                rule_id: 'rule-1',
                version: 2,
                data_view_id: 'C',
              }),
            ];
            await createHistoricalPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

            // Call the upgrade review prebuilt rules endpoint and check that one rule is eligible for update
            // and data_source field update has conflict
            const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
            const fieldDiffObject = reviewResponse.rules[0].diff.fields as AllFieldsDiff;
            expect(fieldDiffObject.data_source).toEqual({
              base_version: {
                data_view_id: 'A',
                type: DataSourceType.data_view,
              },
              current_version: {
                index_patterns: ['one', 'two', 'four'],
                type: DataSourceType.index_patterns,
              },
              target_version: {
                data_view_id: 'C',
                type: DataSourceType.data_view,
              },
              merged_version: {
                index_patterns: ['one', 'two', 'four'],
                type: DataSourceType.index_patterns,
              },
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

        describe('when current version is undefined', () => {
          it('should show a non-solvable conflict in the upgrade/_review API response', async () => {
            // Install base prebuilt detection rule
            await createHistoricalPrebuiltRuleAssetSavedObjects(
              es,
              getDataViewIdRuleAssetSavedObjects()
            );
            await installPrebuiltRules(es, supertest);

            // Customize a data_source field on the installed rule
            await updateRule(supertest, {
              ...getPrebuiltRuleMock(),
              rule_id: 'rule-1',
              data_view_id: undefined,
            } as RuleUpdateProps);

            // Increment the version of the installed rule, update a data_source field, and create the new rule assets
            const updatedRuleAssetSavedObjects = [
              createRuleAssetSavedObject({
                rule_id: 'rule-1',
                version: 2,
                data_view_id: 'C',
              }),
            ];
            await createHistoricalPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

            // Call the upgrade review prebuilt rules endpoint and check that one rule is eligible for update
            // and data_source field update has conflict
            const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
            const fieldDiffObject = reviewResponse.rules[0].diff.fields as AllFieldsDiff;
            expect(fieldDiffObject.data_source).toEqual({
              base_version: {
                data_view_id: 'A',
                type: DataSourceType.data_view,
              },
              current_version: undefined,
              target_version: {
                data_view_id: 'C',
                type: DataSourceType.data_view,
              },
              merged_version: undefined,
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
            await createPrebuiltRuleAssetSavedObjects(es, getIndexRuleAssetSavedObjects());
            await installPrebuiltRules(es, supertest);

            // Clear previous rule assets
            await deleteAllPrebuiltRuleAssets(es, log);

            // Increment the version of the installed rule, but keep data_source field unchanged
            const updatedRuleAssetSavedObjects = [
              createRuleAssetSavedObject({
                rule_id: 'rule-1',
                version: 2,
                index: ['one', 'two', 'three'], // unchanged
              }),
            ];
            await createPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

            // Call the upgrade review prebuilt rules endpoint and check that one rule is eligible for update
            // but does NOT contain data_source field (tags is not present, since scenario -AA is not included in response)
            const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
            const fieldDiffObject = reviewResponse.rules[0].diff.fields as AllFieldsDiff;
            expect(fieldDiffObject.data_source).toBeUndefined();

            expect(reviewResponse.rules[0].diff.num_fields_with_updates).toBe(1);
            expect(reviewResponse.rules[0].diff.num_fields_with_conflicts).toBe(0);
            expect(reviewResponse.rules[0].diff.num_fields_with_non_solvable_conflicts).toBe(0);

            expect(reviewResponse.stats.num_rules_to_upgrade_total).toBe(1);
            expect(reviewResponse.stats.num_rules_with_conflicts).toBe(0);
            expect(reviewResponse.stats.num_rules_with_non_solvable_conflicts).toBe(0);
          });
        });

        describe('when rule field has an update and a custom value that are different - scenario -AB', () => {
          it('should show in the upgrade/_review API response', async () => {
            // Install base prebuilt detection rule
            await createPrebuiltRuleAssetSavedObjects(es, getIndexRuleAssetSavedObjects());
            await installPrebuiltRules(es, supertest);

            // Clear previous rule assets
            await deleteAllPrebuiltRuleAssets(es, log);

            // Customize a data_source field on the installed rule
            await updateRule(supertest, {
              ...getPrebuiltRuleMock(),
              rule_id: 'rule-1',
              index: ['one', 'two', 'four'],
              data_view_id: undefined,
            } as RuleUpdateProps);

            // Increment the version of the installed rule, update a data_source field, and create the new rule assets
            const updatedRuleAssetSavedObjects = [
              createRuleAssetSavedObject({
                rule_id: 'rule-1',
                version: 2,
                index: ['one', 'two', 'five'],
              }),
            ];
            await createPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

            // Call the upgrade review prebuilt rules endpoint and check that one rule is eligible for update
            // and data_source field update does not have a conflict
            const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
            const fieldDiffObject = reviewResponse.rules[0].diff.fields as AllFieldsDiff;
            expect(fieldDiffObject.data_source).toEqual({
              current_version: {
                index_patterns: ['one', 'two', 'four'],
                type: DataSourceType.index_patterns,
              },
              target_version: {
                index_patterns: ['one', 'two', 'five'],
                type: DataSourceType.index_patterns,
              },
              merged_version: {
                index_patterns: ['one', 'two', 'five'],
                type: DataSourceType.index_patterns,
              },
              diff_outcome: ThreeWayDiffOutcome.MissingBaseCanUpdate,
              merge_outcome: ThreeWayMergeOutcome.Target,
              conflict: ThreeWayDiffConflict.SOLVABLE,
              has_update: true,
              has_base_version: false,
            });

            expect(reviewResponse.rules[0].diff.num_fields_with_updates).toBe(2);
            expect(reviewResponse.rules[0].diff.num_fields_with_conflicts).toBe(1); // tags
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
