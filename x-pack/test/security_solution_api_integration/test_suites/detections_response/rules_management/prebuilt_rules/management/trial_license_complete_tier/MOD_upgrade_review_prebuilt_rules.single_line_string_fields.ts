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

const SINGLE_LINE_STRING_FIELDS = ['name', 'license'] as const;

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

    describe(`single line string fields`, () => {
      SINGLE_LINE_STRING_FIELDS.forEach((field) => {
        describe(`testing field: ${field}`, () => {
          const getRuleAssetSavedObjects = () => [
            createRuleAssetSavedObject({ rule_id: 'rule-1', version: 1, [field]: 'A' }),
          ];

          describe("when rule field doesn't have an update and has no custom value - scenario AAA", () => {
            it('should not show in the upgrade/_review API response', async () => {
              await createHistoricalPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
              await installPrebuiltRules(es, supertest);

              const updatedRuleAssetSavedObjects = [
                createRuleAssetSavedObject({
                  rule_id: 'rule-1',
                  [field]: 'A',
                  version: 2,
                }),
              ];
              await createHistoricalPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

              const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
              expect(reviewResponse.rules[0].diff.fields[field]).toBeUndefined();

              expect(reviewResponse.rules[0].diff.num_fields_with_updates).toBe(1);
              expect(reviewResponse.rules[0].diff.num_fields_with_conflicts).toBe(0);
              expect(reviewResponse.rules[0].diff.num_fields_with_non_solvable_conflicts).toBe(0);

              expect(reviewResponse.stats.num_rules_to_upgrade_total).toBe(1);
              expect(reviewResponse.stats.num_rules_with_conflicts).toBe(0);
              expect(reviewResponse.stats.num_rules_with_non_solvable_conflicts).toBe(0);
            });

            it('should trim all whitespace before version comparison', async () => {
              await createHistoricalPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
              await installPrebuiltRules(es, supertest);

              await patchRule(supertest, log, {
                rule_id: 'rule-1',
                [field]: 'A\n',
              });

              const updatedRuleAssetSavedObjects = [
                createRuleAssetSavedObject({
                  rule_id: 'rule-1',
                  [field]: '\nA',
                  version: 2,
                }),
              ];
              await createHistoricalPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

              const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
              expect(reviewResponse.rules[0].diff.fields[field]).toBeUndefined();

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
              await createHistoricalPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
              await installPrebuiltRules(es, supertest);

              await patchRule(supertest, log, {
                rule_id: 'rule-1',
                [field]: 'B',
              });

              const updatedRuleAssetSavedObjects = [
                createRuleAssetSavedObject({
                  rule_id: 'rule-1',
                  [field]: 'A',
                  version: 2,
                }),
              ];
              await createHistoricalPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

              const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
              expect(reviewResponse.rules[0].diff.fields[field]).toEqual({
                base_version: 'A',
                current_version: 'B',
                target_version: 'A',
                merged_version: 'B',
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
              await createHistoricalPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
              await installPrebuiltRules(es, supertest);

              const updatedRuleAssetSavedObjects = [
                createRuleAssetSavedObject({
                  rule_id: 'rule-1',
                  version: 2,
                  [field]: 'B',
                }),
              ];
              await createHistoricalPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

              const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
              expect(reviewResponse.rules[0].diff.fields[field]).toEqual({
                base_version: 'A',
                current_version: 'A',
                target_version: 'B',
                merged_version: 'B',
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

          describe('when rule field has an update and a custom value that are the same - scenario ABB', () => {
            it('should show in the upgrade/_review API response', async () => {
              await createHistoricalPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
              await installPrebuiltRules(es, supertest);

              await patchRule(supertest, log, {
                rule_id: 'rule-1',
                [field]: 'B',
              });

              const updatedRuleAssetSavedObjects = [
                createRuleAssetSavedObject({
                  rule_id: 'rule-1',
                  version: 2,
                  [field]: 'B',
                }),
              ];
              await createHistoricalPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

              const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
              expect(reviewResponse.rules[0].diff.fields[field]).toEqual({
                base_version: 'A',
                current_version: 'B',
                target_version: 'B',
                merged_version: 'B',
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
            it('should show in the upgrade/_review API response', async () => {
              await createHistoricalPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
              await installPrebuiltRules(es, supertest);

              await patchRule(supertest, log, {
                rule_id: 'rule-1',
                [field]: 'B',
              });

              const updatedRuleAssetSavedObjects = [
                createRuleAssetSavedObject({
                  rule_id: 'rule-1',
                  version: 2,
                  [field]: 'C',
                }),
              ];
              await createHistoricalPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

              const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
              expect(reviewResponse.rules[0].diff.fields[field]).toEqual({
                base_version: 'A',
                current_version: 'B',
                target_version: 'C',
                merged_version: 'B',
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

          describe('when rule base version does not exist', () => {
            describe('when rule field has an update and a custom value that are the same - scenario -AA', () => {
              it('should not show in the upgrade/_review API response', async () => {
                await createPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
                await installPrebuiltRules(es, supertest);

                await deleteAllPrebuiltRuleAssets(es, log);

                const updatedRuleAssetSavedObjects = [
                  createRuleAssetSavedObject({
                    rule_id: 'rule-1',
                    version: 2,
                    [field]: 'A',
                  }),
                ];
                await createPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

                const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
                expect(reviewResponse.rules[0].diff.fields[field]).toBeUndefined();

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
                await createPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
                await installPrebuiltRules(es, supertest);

                await deleteAllPrebuiltRuleAssets(es, log);

                await patchRule(supertest, log, {
                  rule_id: 'rule-1',
                  [field]: 'B',
                });

                const updatedRuleAssetSavedObjects = [
                  createRuleAssetSavedObject({
                    rule_id: 'rule-1',
                    version: 2,
                    [field]: 'C',
                  }),
                ];
                await createPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

                const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
                expect(reviewResponse.rules[0].diff.fields[field]).toEqual({
                  current_version: 'B',
                  target_version: 'C',
                  merged_version: 'C',
                  diff_outcome: ThreeWayDiffOutcome.MissingBaseCanUpdate,
                  merge_outcome: ThreeWayMergeOutcome.Target,
                  conflict: ThreeWayDiffConflict.SOLVABLE,
                  has_update: true,
                  has_base_version: false,
                });

                expect(reviewResponse.rules[0].diff.num_fields_with_updates).toBe(2);
                expect(reviewResponse.rules[0].diff.num_fields_with_conflicts).toBe(1);
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
  });
};
