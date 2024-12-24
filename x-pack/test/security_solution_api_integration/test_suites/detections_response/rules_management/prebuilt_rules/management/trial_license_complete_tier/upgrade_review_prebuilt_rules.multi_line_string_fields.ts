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
import { MULTI_LINE_STRING_FIELDS } from '@kbn/security-solution-plugin/server/lib/detection_engine/prebuilt_rules/logic/diff/calculation/calculate_rule_fields_diff';
import {
  TEXT_XL_A,
  TEXT_XL_B,
  TEXT_XL_C,
  TEXT_XL_MERGED,
} from '@kbn/security-solution-plugin/server/lib/detection_engine/prebuilt_rules/logic/diff/calculation/algorithms/multi_line_string_diff_algorithm.mock';
import { Client } from '@elastic/elasticsearch';
import TestAgent from 'supertest/lib/agent';
import { ToolingLog } from '@kbn/tooling-log';
import { FtrProviderContext } from '../../../../../../ftr_provider_context';
import {
  deleteAllTimelines,
  deleteAllPrebuiltRuleAssets,
  installPrebuiltRules,
  createPrebuiltRuleAssetSavedObjects,
  reviewPrebuiltRulesToUpgrade,
  updateRule,
  fetchRule,
  createHistoricalPrebuiltRuleAssetSavedObjects,
  createRuleAssetSavedObjectOfType,
} from '../../../../utils';
import { deleteAllRules } from '../../../../../../../common/utils/security_solution';

interface MultiLineStringFieldTestValues {
  baseValue: string;
  customValue: string;
  updatedValue: string;
  mergedValue: string;
  longBaseValue?: string;
  longCustomValue?: string;
  longUpdatedValue?: string;
  longMergedValue?: string;
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
    longBaseValue: TEXT_XL_A,
    longCustomValue: TEXT_XL_B,
    longUpdatedValue: TEXT_XL_C,
    longMergedValue: TEXT_XL_MERGED,
  },
  note: {
    baseValue: 'My note.\nThis is a second line.',
    customValue: 'My GREAT note.\nThis is a second line.',
    updatedValue: 'My note.\nThis is a second line, now longer.',
    mergedValue: 'My GREAT note.\nThis is a second line, now longer.',
  },
  setup: {
    baseValue: 'My setup.\nThis is a second line.',
    customValue: 'My GREAT setup.\nThis is a second line.',
    updatedValue: 'My setup.\nThis is a second line, now longer.',
    mergedValue: 'My GREAT setup.\nThis is a second line, now longer.',
  },
};

const createTestSuite = (
  field: MULTI_LINE_STRING_FIELDS,
  testValues: MultiLineStringFieldTestValues,
  services: { es: Client; supertest: TestAgent; log: ToolingLog }
) => {
  const { es, supertest, log } = services;
  const { baseValue, customValue, updatedValue, mergedValue } = testValues;

  describe(`testing field: ${field}`, () => {
    const getRuleAssetSavedObjects = () => [
      createRuleAssetSavedObjectOfType('query', {
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
          createRuleAssetSavedObjectOfType('query', {
            rule_id: 'rule-1',
            [field]: baseValue,
            version: 2,
          }),
        ];
        await createHistoricalPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

        const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
        expect(
          (reviewResponse.rules[0].diff.fields as Record<string, unknown>)[field]
        ).toBeUndefined();

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

        const rule = await fetchRule(supertest, { ruleId: 'rule-1' });
        await updateRule(supertest, {
          ...rule,
          id: undefined,
          [field]: customValue,
        });

        const updatedRuleAssetSavedObjects = [
          createRuleAssetSavedObjectOfType('query', {
            rule_id: 'rule-1',
            [field]: baseValue,
            version: 2,
          }),
        ];
        await createHistoricalPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

        const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
        expect((reviewResponse.rules[0].diff.fields as Record<string, unknown>)[field]).toEqual({
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
          createRuleAssetSavedObjectOfType('query', {
            rule_id: 'rule-1',
            version: 2,
            [field]: updatedValue,
          }),
        ];
        await createHistoricalPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

        const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
        expect((reviewResponse.rules[0].diff.fields as Record<string, unknown>)[field]).toEqual({
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

        const rule = await fetchRule(supertest, { ruleId: 'rule-1' });
        await updateRule(supertest, {
          ...rule,
          id: undefined,
          [field]: customValue,
        });

        const updatedRuleAssetSavedObjects = [
          createRuleAssetSavedObjectOfType('query', {
            rule_id: 'rule-1',
            version: 2,
            [field]: customValue,
          }),
        ];
        await createHistoricalPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

        const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
        expect((reviewResponse.rules[0].diff.fields as Record<string, unknown>)[field]).toEqual({
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
      it('should show in the upgrade/_review API response with a solvable conflict', async () => {
        await createHistoricalPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
        await installPrebuiltRules(es, supertest);

        const rule = await fetchRule(supertest, { ruleId: 'rule-1' });
        await updateRule(supertest, {
          ...rule,
          id: undefined,
          [field]: customValue,
        });

        const updatedRuleAssetSavedObjects = [
          createRuleAssetSavedObjectOfType('query', {
            rule_id: 'rule-1',
            version: 2,
            [field]: updatedValue,
          }),
        ];
        await createHistoricalPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

        const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
        expect((reviewResponse.rules[0].diff.fields as Record<string, unknown>)[field]).toEqual({
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

      if (field === 'description' && testValues.longBaseValue) {
        it('should handle long multi-line strings without timing out', async () => {
          await createHistoricalPrebuiltRuleAssetSavedObjects(es, [
            createRuleAssetSavedObjectOfType('query', {
              rule_id: 'rule-1',
              version: 1,
              [field]: testValues.longBaseValue,
            }),
          ]);
          await installPrebuiltRules(es, supertest);

          const rule = await fetchRule(supertest, { ruleId: 'rule-1' });
          await updateRule(supertest, {
            ...rule,
            id: undefined,
            [field]: testValues.longCustomValue as string,
          });

          const updatedRuleAssetSavedObjects = [
            createRuleAssetSavedObjectOfType('query', {
              rule_id: 'rule-1',
              version: 2,
              [field]: testValues.longUpdatedValue,
            }),
          ];
          await createHistoricalPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);
          const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
          expect((reviewResponse.rules[0].diff.fields as Record<string, unknown>)[field]).toEqual({
            base_version: testValues.longBaseValue,
            current_version: testValues.longCustomValue,
            target_version: testValues.longUpdatedValue,
            merged_version: testValues.longMergedValue,
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
      }
    });

    describe('when rule base version does not exist', () => {
      describe('when rule field has an update and a custom value that are the same - scenario -AA', () => {
        it('should not show in the upgrade/_review API response', async () => {
          await createPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
          await installPrebuiltRules(es, supertest);

          await deleteAllPrebuiltRuleAssets(es, log);

          const rule = await fetchRule(supertest, { ruleId: 'rule-1' });
          await updateRule(supertest, {
            ...rule,
            id: undefined,
            [field]: baseValue,
          });

          const updatedRuleAssetSavedObjects = [
            createRuleAssetSavedObjectOfType('query', {
              rule_id: 'rule-1',
              version: 2,
              [field]: baseValue,
            }),
          ];
          await createPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

          const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
          expect(
            (reviewResponse.rules[0].diff.fields as Record<string, unknown>)[field]
          ).toBeUndefined();

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

          const rule = await fetchRule(supertest, { ruleId: 'rule-1' });
          await updateRule(supertest, {
            ...rule,
            id: undefined,
            [field]: baseValue,
          });

          const updatedRuleAssetSavedObjects = [
            createRuleAssetSavedObjectOfType('query', {
              rule_id: 'rule-1',
              version: 2,
              [field]: updatedValue,
            }),
          ];
          await createPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

          const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
          expect((reviewResponse.rules[0].diff.fields as Record<string, unknown>)[field]).toEqual({
            current_version: baseValue,
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
};

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

    Object.entries(MULTI_LINE_STRING_FIELDS_MAP).forEach(([field, testValues]) => {
      createTestSuite(field as MULTI_LINE_STRING_FIELDS, testValues, { es, supertest, log });
    });
  });
};
