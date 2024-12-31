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
import { SIMPLE_FIELDS } from '@kbn/security-solution-plugin/server/lib/detection_engine/prebuilt_rules/logic/diff/calculation/calculate_rule_fields_diff';
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
import {
  SIMPLE_FIELD_RULE_TYPE_MAPPING,
  mapDiffableFieldToRuleFields,
  SIMPLE_FIELDS_MOCK_VALUES,
  SimpleFieldTestValues,
} from './upgrade_prebuilt_rules.mock_data';

type RuleTypeToFields = typeof SIMPLE_FIELD_RULE_TYPE_MAPPING;

type FieldDiffs = Record<SIMPLE_FIELDS, unknown>;

const createTestSuite = (
  ruleType: keyof RuleTypeToFields,
  field: SIMPLE_FIELDS,
  testValues: SimpleFieldTestValues,
  services: { es: Client; supertest: TestAgent; log: ToolingLog }
) => {
  const { es, supertest, log } = services;
  const { baseValue, customValue, updatedValue } = testValues;

  describe(`testing field: ${field}`, () => {
    const getRuleAssetSavedObjects = () => [
      createRuleAssetSavedObjectOfType(ruleType, {
        rule_id: 'rule-1',
        version: 1,
        ...mapDiffableFieldToRuleFields(field, baseValue),
      }),
    ];

    describe("when rule field doesn't have an update and has no custom value - scenario AAA", () => {
      it('should not show in the upgrade/_review API response', async () => {
        await createHistoricalPrebuiltRuleAssetSavedObjects(es, getRuleAssetSavedObjects());
        await installPrebuiltRules(es, supertest);

        const updatedRuleAssetSavedObjects = [
          createRuleAssetSavedObjectOfType(ruleType, {
            rule_id: 'rule-1',
            ...mapDiffableFieldToRuleFields(field, baseValue),
            version: 2,
          }),
        ];
        await createHistoricalPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

        const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
        expect((reviewResponse.rules[0].diff.fields as FieldDiffs)[field]).toBeUndefined();

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
        const mappedFields = mapDiffableFieldToRuleFields(field, customValue);

        await updateRule(supertest, {
          ...rule,
          id: undefined,
          ...mappedFields,
        });
        const updatedRuleAssetSavedObjects = [
          createRuleAssetSavedObjectOfType(ruleType, {
            rule_id: 'rule-1',
            ...mapDiffableFieldToRuleFields(field, baseValue),
            version: 2,
          }),
        ];
        await createHistoricalPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

        const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
        expect((reviewResponse.rules[0].diff.fields as FieldDiffs)[field]).toEqual({
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
            ...mapDiffableFieldToRuleFields(field, updatedValue),
          }),
        ];
        await createHistoricalPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

        const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
        expect((reviewResponse.rules[0].diff.fields as FieldDiffs)[field]).toEqual({
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
        const mappedFields = mapDiffableFieldToRuleFields(field, customValue);

        await updateRule(supertest, {
          ...rule,
          id: undefined,
          ...mappedFields,
        });

        const updatedRuleAssetSavedObjects = [
          createRuleAssetSavedObjectOfType(ruleType, {
            rule_id: 'rule-1',
            version: 2,
            ...mapDiffableFieldToRuleFields(field, customValue),
          }),
        ];
        await createHistoricalPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

        const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
        expect((reviewResponse.rules[0].diff.fields as FieldDiffs)[field]).toEqual({
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
        const mappedFields = mapDiffableFieldToRuleFields(field, customValue);

        await updateRule(supertest, {
          ...rule,
          id: undefined,
          ...mappedFields,
        });

        const updatedRuleAssetSavedObjects = [
          createRuleAssetSavedObjectOfType(ruleType, {
            rule_id: 'rule-1',
            version: 2,
            ...mapDiffableFieldToRuleFields(field, updatedValue),
          }),
        ];
        await createHistoricalPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

        const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
        expect((reviewResponse.rules[0].diff.fields as FieldDiffs)[field]).toEqual({
          base_version: baseValue,
          current_version: customValue,
          target_version: updatedValue,
          merged_version: customValue,
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
            createRuleAssetSavedObjectOfType(ruleType, {
              rule_id: 'rule-1',
              version: 2,
              ...mapDiffableFieldToRuleFields(field, baseValue),
            }),
          ];
          await createPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

          const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
          expect((reviewResponse.rules[0].diff.fields as FieldDiffs)[field]).toBeUndefined();

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
            ...mapDiffableFieldToRuleFields(field, customValue),
          });

          const updatedRuleAssetSavedObjects = [
            createRuleAssetSavedObjectOfType(ruleType, {
              rule_id: 'rule-1',
              version: 2,
              ...mapDiffableFieldToRuleFields(field, updatedValue),
            }),
          ];
          await createPrebuiltRuleAssetSavedObjects(es, updatedRuleAssetSavedObjects);

          const reviewResponse = await reviewPrebuiltRulesToUpgrade(supertest);
          expect((reviewResponse.rules[0].diff.fields as FieldDiffs)[field]).toEqual({
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

    Object.entries(SIMPLE_FIELD_RULE_TYPE_MAPPING).forEach(([ruleType, fields]) => {
      describe(`${ruleType} rule simple fields`, () => {
        fields.forEach((field) => {
          const testValues = SIMPLE_FIELDS_MOCK_VALUES[field];
          createTestSuite(ruleType as keyof RuleTypeToFields, field as SIMPLE_FIELDS, testValues, {
            es,
            supertest,
            log,
          });
        });
      });
    });
  });
};
