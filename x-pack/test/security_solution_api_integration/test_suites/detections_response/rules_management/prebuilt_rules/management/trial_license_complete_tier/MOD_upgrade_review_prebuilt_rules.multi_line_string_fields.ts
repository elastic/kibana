/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from 'expect';
import {
  CommonFieldsDiff,
  ThreeWayDiffConflict,
  ThreeWayDiffOutcome,
  ThreeWayMergeOutcome,
} from '@kbn/security-solution-plugin/common/api/detection_engine';
import { MULTI_LINE_STRING_FIELDS } from '@kbn/security-solution-plugin/server/lib/detection_engine/prebuilt_rules/logic/diff/calculation/calculate_rule_fields_diff';
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

interface MultiLineStringFieldTestValues {
  baseValue: string;
  customValue: string;
  updatedValue: string;
  mergedValue?: string;
}

const MULTI_LINE_STRING_FIELDS_MAP: Record<
  MULTI_LINE_STRING_FIELDS,
  MultiLineStringFieldTestValues
> = {
  description: {
    baseValue: 'My description.\nThis is a second line.',
    customValue: 'My GREAT description.\nThis is a second line.',
    updatedValue: 'My description.\nThis is a second line, now longer.',
    mergedValue: 'My GREAT description.\nThis is a second line, now longer.',
  },
  note: {
    baseValue: 'Note line one.\nNote line two.',
    customValue: 'Custom note line one.\nNote line two.',
    updatedValue: 'Updated note line one.\nNote line two extended.',
    mergedValue: 'Custom note line one.\nNote line two extended.',
  },
  setup: {
    baseValue: 'Setup step 1.\nSetup step 2.',
    customValue: 'Modified setup step 1.\nSetup step 2.',
    updatedValue: 'Setup step 1 updated.\nSetup step 2 extended.',
    mergedValue: 'Modified setup step 1.\nSetup step 2 extended.',
  },
};

const RULE_TYPE_FIELD_MAPPING = {
  query: ['description', 'note', 'setup'],
  threat_match: ['description', 'note', 'setup'],
  new_terms: ['description', 'note', 'setup'],
} as const;

type RuleTypeToFields = typeof RULE_TYPE_FIELD_MAPPING;

const getValidFieldsForRuleType = <T extends keyof RuleTypeToFields>(
  ruleType: T
): { [K in RuleTypeToFields[T][number]]: MultiLineStringFieldTestValues } => {
  return (
    Object.entries(MULTI_LINE_STRING_FIELDS_MAP) as Array<
      [MULTI_LINE_STRING_FIELDS, MultiLineStringFieldTestValues]
    >
  )
    .filter(([field]) =>
      (RULE_TYPE_FIELD_MAPPING[ruleType] as readonly MULTI_LINE_STRING_FIELDS[]).includes(field)
    )
    .reduce((acc, [field, values]) => ({ ...acc, [field]: values }), {}) as {
    [K in RuleTypeToFields[T][number]]: MultiLineStringFieldTestValues;
  };
};

export default ({ getService }: FtrProviderContext): void => {
  const es = getService('es');
  const supertest = getService('supertest');
  const log = getService('log');

  describe('@ess @serverless @skipInServerlessMKI review prebuilt rules updates from package with mock rule assets', () => {
    // All multi-line string fields are present in all rule types, so we just test for query rule type.
    describe('Query rule multi line string fields', () => {
      beforeEach(async () => {
        await deleteAllRules(supertest, log);
        await deleteAllTimelines(es, log);
        await deleteAllPrebuiltRuleAssets(es, log);
      });

      const queryRuleFields = getValidFieldsForRuleType('query');
      (
        Object.entries(queryRuleFields) as Array<
          [
            Extract<MULTI_LINE_STRING_FIELDS, keyof typeof queryRuleFields>,
            MultiLineStringFieldTestValues
          ]
        >
      ).map(([field, testValues]) => {
        const { baseValue, customValue, updatedValue, mergedValue } = testValues;

        describe(`testing field: ${field}`, () => {
          const getRuleAssetSavedObjects = () => [
            createRuleAssetSavedObject({
              rule_id: 'rule-1',
              version: 1,
              [field]: baseValue,
            }),
          ];

          describe("when rule field doesn't have an update and has no custom value - scenario AAA", () => {
            it('should not show in the upgrade/_review API response', async () => {
              await createHistoricalPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
              await installPrebuiltRules(es, supertest);

              const updatedRuleAssetSavedObjects = [
                createRuleAssetSavedObject({
                  rule_id: 'rule-1',
                  [field]: baseValue,
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
                [field]: customValue,
              });

              const updatedRuleAssetSavedObjects = [
                createRuleAssetSavedObject({
                  rule_id: 'rule-1',
                  [field]: baseValue,
                  version: 2,
                }),
              ];
              await createHistoricalPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

              const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
              expect(reviewResponse.rules[0].diff.fields[field]).toEqual({
                base_version: baseValue,
                current_version: customValue,
                target_version: baseValue,
                merged_version: customValue,
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
                  [field]: updatedValue,
                }),
              ];
              await createHistoricalPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

              const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
              expect(reviewResponse.rules[0].diff.fields[field]).toEqual({
                base_version: baseValue,
                current_version: baseValue,
                target_version: updatedValue,
                merged_version: updatedValue,
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
                [field]: customValue,
              });

              const updatedRuleAssetSavedObjects = [
                createRuleAssetSavedObject({
                  rule_id: 'rule-1',
                  version: 2,
                  [field]: customValue,
                }),
              ];
              await createHistoricalPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

              const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
              expect(reviewResponse.rules[0].diff.fields[field]).toEqual({
                base_version: baseValue,
                current_version: customValue,
                target_version: customValue,
                merged_version: customValue,
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
                await createHistoricalPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
                await installPrebuiltRules(es, supertest);

                await patchRule(supertest, log, {
                  rule_id: 'rule-1',
                  [field]: customValue,
                });

                const updatedRuleAssetSavedObjects = [
                  createRuleAssetSavedObject({
                    rule_id: 'rule-1',
                    version: 2,
                    [field]: updatedValue,
                  }),
                ];
                await createHistoricalPrebuiltRuleAssetSavedObjects(
                  es,
                  updatedRuleAssetSavedObjects
                );

                const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
                expect(reviewResponse.rules[0].diff.fields[field]).toEqual({
                  base_version: baseValue,
                  current_version: customValue,
                  target_version: updatedValue,
                  merged_version: mergedValue,
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

              it('should handle long multi-line strings without timing out', async () => {
                await createHistoricalPrebuiltRuleAssetSavedObjects(es, [
                  createRuleAssetSavedObject({
                    rule_id: 'rule-1',
                    version: 1,
                    [field]: TEXT_XL_A,
                  }),
                ]);
                await installPrebuiltRules(es, supertest);

                await patchRule(supertest, log, {
                  rule_id: 'rule-1',
                  [field]: TEXT_XL_B,
                });

                const updatedRuleAssetSavedObjects = [
                  createRuleAssetSavedObject({
                    rule_id: 'rule-1',
                    version: 2,
                    [field]: TEXT_XL_C,
                  }),
                ];
                await createHistoricalPrebuiltRuleAssetSavedObjects(
                  es,
                  updatedRuleAssetSavedObjects
                );

                const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
                expect(reviewResponse.rules[0].diff.fields[field]).toEqual({
                  base_version: TEXT_XL_A,
                  current_version: TEXT_XL_B,
                  target_version: TEXT_XL_C,
                  merged_version: TEXT_XL_MERGED,
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
          });

          describe('when rule base version does not exist', () => {
            describe('when rule field has an update and a custom value that are the same - scenario -AA', () => {
              it('should not show in the upgrade/_review API response', async () => {
                await createPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
                await installPrebuiltRules(es, supertest);

                await deleteAllPrebuiltRuleAssets(es, log);

                await patchRule(supertest, log, {
                  rule_id: 'rule-1',
                  [field]: baseValue,
                });

                const updatedRuleAssetSavedObjects = [
                  createRuleAssetSavedObject({
                    rule_id: 'rule-1',
                    version: 2,
                    [field]: baseValue,
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
                  [field]: customValue,
                });

                const updatedRuleAssetSavedObjects = [
                  createRuleAssetSavedObject({
                    rule_id: 'rule-1',
                    version: 2,
                    [field]: updatedValue,
                  }),
                ];
                await createPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

                const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
                expect(reviewResponse.rules[0].diff.fields[field]).toEqual({
                  current_version: customValue,
                  target_version: updatedValue,
                  merged_version: updatedValue,
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
