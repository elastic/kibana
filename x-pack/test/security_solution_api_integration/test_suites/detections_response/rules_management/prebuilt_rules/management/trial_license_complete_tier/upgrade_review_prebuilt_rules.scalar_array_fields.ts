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
import { SCALAR_ARRAY_FIELDS } from '@kbn/security-solution-plugin/server/lib/detection_engine/prebuilt_rules/logic/diff/calculation/calculate_rule_fields_diff';
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
  createHistoricalPrebuiltRuleAssetSavedObjects,
  createRuleAssetSavedObjectOfType,
  fetchRule,
  updateRule,
} from '../../../../utils';
import { deleteAllRules } from '../../../../../../../common/utils/security_solution';

interface ScalarArrayFieldTestValues {
  baseValue: string[];
  customValue: string[];
  updatedValue: string[];
}

const SCALAR_ARRAY_FIELDS_MAP: Record<SCALAR_ARRAY_FIELDS, ScalarArrayFieldTestValues> = {
  tags: {
    baseValue: ['one', 'two', 'three'],
    customValue: ['one', 'two', 'four'],
    updatedValue: ['one', 'two', 'five'],
  },
  references: {
    baseValue: ['ref1', 'ref2', 'ref3'],
    customValue: ['ref1', 'ref2', 'ref4'],
    updatedValue: ['ref1', 'ref2', 'ref5'],
  },
  threat_index: {
    baseValue: ['index1', 'index2', 'index3'],
    customValue: ['index1', 'index2', 'index4'],
    updatedValue: ['index1', 'index2', 'index5'],
  },
  new_terms_fields: {
    baseValue: ['field1', 'field2', 'field3'],
    customValue: ['field1', 'field2', 'field4'],
    updatedValue: ['field1', 'field2', 'field5'],
  },
};

const RULE_TYPE_FIELD_MAPPING = {
  query: ['tags', 'references'],
  threat_match: ['threat_index'],
  new_terms: ['new_terms_fields'],
} as const;

type RuleTypeToFields = typeof RULE_TYPE_FIELD_MAPPING;

const createTestSuite = (
  ruleType: keyof RuleTypeToFields,
  field: SCALAR_ARRAY_FIELDS,
  testValues: ScalarArrayFieldTestValues,
  services: { es: Client; supertest: TestAgent; log: ToolingLog }
) => {
  const { es, supertest, log } = services;
  const { baseValue, customValue, updatedValue } = testValues;

  describe(`testing field: ${field}`, () => {
    const getRuleAssetSavedObjects = () => [
      createRuleAssetSavedObjectOfType(ruleType, {
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
          createRuleAssetSavedObjectOfType(ruleType, {
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
          createRuleAssetSavedObjectOfType(ruleType, {
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
          createRuleAssetSavedObjectOfType(ruleType, {
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
          createRuleAssetSavedObjectOfType(ruleType, {
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
          createRuleAssetSavedObjectOfType(ruleType, {
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
          merged_version: [...customValue, ...updatedValue.filter((v) => !customValue.includes(v))],
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

      it('should compare values after deduplication', async () => {
        await createHistoricalPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
        await installPrebuiltRules(es, supertest);

        const rule = await fetchRule(supertest, { ruleId: 'rule-1' });
        await updateRule(supertest, {
          ...rule,
          id: undefined,
          [field]: [baseValue[0], baseValue[0], customValue[2]],
        });

        const updatedRuleAssetSavedObjects = [
          createRuleAssetSavedObjectOfType(ruleType, {
            rule_id: 'rule-1',
            version: 2,
            [field]: [customValue[2], customValue[2], baseValue[0]],
          }),
        ];
        await createHistoricalPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

        const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
        expect((reviewResponse.rules[0].diff.fields as Record<string, unknown>)[field]).toEqual({
          base_version: baseValue,
          current_version: [baseValue[0], baseValue[0], customValue[2]],
          target_version: [customValue[2], customValue[2], baseValue[0]],
          merged_version: [baseValue[0], customValue[2]],
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueSameUpdate,
          merge_outcome: ThreeWayMergeOutcome.Current,
          conflict: ThreeWayDiffConflict.NONE,
          has_update: false,
          has_base_version: true,
        });
      });

      it('should compare values sensitive of case', async () => {
        await createHistoricalPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
        await installPrebuiltRules(es, supertest);

        const rule = await fetchRule(supertest, { ruleId: 'rule-1' });
        await updateRule(supertest, {
          ...rule,
          id: undefined,
          [field]: [baseValue[0].toUpperCase(), customValue[2]],
        });

        const updatedRuleAssetSavedObjects = [
          createRuleAssetSavedObjectOfType(ruleType, {
            rule_id: 'rule-1',
            version: 2,
            [field]: [baseValue[0].toUpperCase(), updatedValue[2]],
          }),
        ];
        await createHistoricalPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

        const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
        expect((reviewResponse.rules[0].diff.fields as Record<string, unknown>)[field]).toEqual({
          base_version: baseValue,
          current_version: [baseValue[0].toUpperCase(), customValue[2]],
          target_version: [baseValue[0].toUpperCase(), updatedValue[2]],
          merged_version: [baseValue[0].toUpperCase(), customValue[2], updatedValue[2]],
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
          merge_outcome: ThreeWayMergeOutcome.Merged,
          conflict: ThreeWayDiffConflict.SOLVABLE,
          has_update: true,
          has_base_version: true,
        });
      });

      it('should handle empty arrays', async () => {
        // Skip test for new_terms_fields since field cannot be updated to empty array,
        // i.e. the array must contain at least one element
        if (field === 'new_terms_fields') {
          return;
        }

        await createHistoricalPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
        await installPrebuiltRules(es, supertest);

        const rule = await fetchRule(supertest, { ruleId: 'rule-1' });
        await updateRule(supertest, {
          ...rule,
          id: undefined,
          [field]: [],
        });

        const updatedRuleAssetSavedObjects = [
          createRuleAssetSavedObjectOfType(ruleType, {
            rule_id: 'rule-1',
            version: 2,
            [field]: [baseValue[0], baseValue[1], updatedValue[2]],
          }),
        ];
        await createHistoricalPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

        const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
        expect((reviewResponse.rules[0].diff.fields as Record<string, unknown>)[field]).toEqual({
          base_version: baseValue,
          current_version: [],
          target_version: [baseValue[0], baseValue[1], updatedValue[2]],
          merged_version: [updatedValue[2]],
          diff_outcome: ThreeWayDiffOutcome.CustomizedValueCanUpdate,
          merge_outcome: ThreeWayMergeOutcome.Merged,
          conflict: ThreeWayDiffConflict.SOLVABLE,
          has_update: true,
          has_base_version: true,
        });
      });
    });

    describe('when rule base version does not exist', () => {
      describe('when rule field has an update and a custom value that are the same - scenario -AA', () => {
        it('should not show in the upgrade/_review API response', async () => {
          await createPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
          await installPrebuiltRules(es, supertest);

          await deleteAllPrebuiltRuleAssets(es, log);

          const updatedRuleAssetSavedObjects = [
            createRuleAssetSavedObjectOfType(ruleType, {
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
            [field]: customValue,
          });

          const updatedRuleAssetSavedObjects = [
            createRuleAssetSavedObjectOfType(ruleType, {
              rule_id: 'rule-1',
              version: 2,
              [field]: updatedValue,
            }),
          ];
          await createPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

          const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
          expect((reviewResponse.rules[0].diff.fields as Record<string, unknown>)[field]).toEqual({
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

    Object.entries(RULE_TYPE_FIELD_MAPPING).forEach(([ruleType, fields]) => {
      describe(`${ruleType} rule scalar array fields`, () => {
        fields.forEach((field) => {
          const testValues = SCALAR_ARRAY_FIELDS_MAP[field as SCALAR_ARRAY_FIELDS];
          createTestSuite(
            ruleType as keyof RuleTypeToFields,
            field as SCALAR_ARRAY_FIELDS,
            testValues,
            { es, supertest, log }
          );
        });
      });
    });
  });
};
