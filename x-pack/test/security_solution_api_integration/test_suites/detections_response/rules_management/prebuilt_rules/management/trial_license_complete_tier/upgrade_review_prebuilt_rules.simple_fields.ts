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
import { calculateFromValue } from '@kbn/security-solution-plugin/server/lib/detection_engine/rule_types/utils/utils';
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

interface SimpleFieldTestValues {
  baseValue: any;
  customValue: any;
  updatedValue: any;
}

const mapDiffableFieldToRuleFields = (diffableField: string, value: any) => {
  const updatePayload: Record<string, any> = {};

  switch (diffableField) {
    case 'rule_schedule':
      updatePayload.interval = value.interval;
      updatePayload.from = calculateFromValue(value.interval, value.lookback);
      updatePayload.to = 'now';
      break;
    case 'timestamp_override':
      updatePayload.timestamp_override = value.field_name;
      break;
    case 'rule_name_override':
      updatePayload.rule_name_override = value.field_name;
    case 'timeline_template':
      updatePayload.timeline_id = value.timeline_id;
      updatePayload.timeline_title = value.timeline_title;
    case 'timestamp_override_fallback_disabled':
      updatePayload.fallback_disabled = value;
      break;
    case 'building_block':
      updatePayload.building_block_type = value.type;
      break;
    default:
      updatePayload[diffableField] = value;
  }

  return updatePayload;
};

const SIMPLE_FIELDS_MAP: Record<Exclude<SIMPLE_FIELDS, 'rule_id'>, SimpleFieldTestValues> = {
  severity_mapping: {
    baseValue: [
      {
        field: 'base.field',
        value: 'base-value',
        operator: 'equals',
        severity: 'low',
      },
    ],
    customValue: [
      {
        field: 'custom.field',
        value: 'custom-value',
        operator: 'equals',
        severity: 'medium',
      },
    ],
    updatedValue: [
      {
        field: 'updated.field',
        value: 'updated-value',
        operator: 'equals',
        severity: 'high',
      },
    ],
  },
  risk_score_mapping: {
    baseValue: [
      {
        field: 'base.field',
        value: 'base-value',
        operator: 'equals',
        risk_score: 10,
      },
    ],
    customValue: [
      {
        field: 'custom.field',
        value: 'custom-value',
        operator: 'equals',
        risk_score: 20,
      },
    ],
    updatedValue: [
      {
        field: 'updated.field',
        value: 'updated-value',
        operator: 'equals',
        risk_score: 30,
      },
    ],
  },
  false_positives: {
    baseValue: ['base-false-positive'],
    customValue: ['custom-false-positive'],
    updatedValue: ['updated-false-positive'],
  },
  threat: {
    baseValue: [{ framework: 'MITRE', tactic: { id: 'base', name: 'base', reference: 'base' } }],
    customValue: [
      { framework: 'MITRE', tactic: { id: 'custom', name: 'custom', reference: 'custom' } },
    ],
    updatedValue: [
      { framework: 'MITRE', tactic: { id: 'updated', name: 'updated', reference: 'updated' } },
    ],
  },
  related_integrations: {
    baseValue: [
      {
        package: 'base-package',
        version: '1.0.0',
        integration: 'base-integration',
      },
    ],
    customValue: [
      {
        package: 'custom-package',
        version: '1.0.0',
        integration: 'custom-integration',
      },
    ],
    updatedValue: [
      {
        package: 'updated-package',
        version: '1.0.0',
        integration: 'updated-integration',
      },
    ],
  },
  required_fields: {
    baseValue: [
      {
        name: 'base.field',
        type: 'keyword',
        ecs: false,
      },
    ],
    customValue: [
      {
        name: 'custom.field',
        type: 'keyword',
        ecs: false,
      },
    ],
    updatedValue: [
      {
        name: 'updated.field',
        type: 'keyword',
        ecs: false,
      },
    ],
  },
  rule_schedule: {
    baseValue: { interval: '5m', lookback: '60s' },
    customValue: { interval: '10m', lookback: '0s' },
    updatedValue: { interval: '15m', lookback: '60s' },
  },
  rule_name_override: {
    baseValue: { field_name: 'base-override' },
    customValue: { field_name: 'custom-override' },
    updatedValue: { field_name: 'updated-override' },
  },
  timestamp_override: {
    baseValue: { field_name: 'base-timestamp', fallback_disabled: false },
    customValue: { field_name: 'custom-timestamp', fallback_disabled: false },
    updatedValue: { field_name: 'updated-timestamp', fallback_disabled: false },
  },
  timeline_template: {
    baseValue: { timeline_id: 'base-template', timeline_title: 'base-template' },
    customValue: { timeline_id: 'custom-template', timeline_title: 'base-template' },
    updatedValue: { timeline_id: 'updated-template', timeline_title: 'base-template' },
  },
  building_block: {
    baseValue: { type: 'a' },
    customValue: { type: 'b' },
    updatedValue: { type: 'c' },
  },
  investigation_fields: {
    baseValue: {
      field_names: ['base.field'],
    },
    customValue: {
      field_names: ['custom.field'],
    },
    updatedValue: {
      field_names: ['updated.field'],
    },
  },
  alert_suppression: {
    baseValue: { group_by: ['base-field'] },
    customValue: { group_by: ['custom-field'] },
    updatedValue: { group_by: ['updated-field'] },
  },
  threshold: {
    baseValue: { field: ['base-field'], value: 100 },
    customValue: { field: ['custom-field'], value: 200 },
    updatedValue: { field: ['updated-field'], value: 300 },
  },
  machine_learning_job_id: {
    baseValue: ['base-job-id'],
    customValue: ['custom-job-id'],
    updatedValue: ['updated-job-id'],
  },
};

const RULE_TYPE_FIELD_MAPPING = {
  query: [
    'severity_mapping',
    'risk_score_mapping',
    'false_positives',
    'threat',
    'related_integrations',
    'required_fields',
    'rule_schedule',
    'rule_name_override',
    'timestamp_override',
    'timeline_template',
    'building_block',
    'investigation_fields',
    'alert_suppression',
  ],
  threshold: ['threshold'],
  machine_learning: ['machine_learning_job_id'],
} as const;

type RuleTypeToFields = typeof RULE_TYPE_FIELD_MAPPING;

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

    Object.entries(RULE_TYPE_FIELD_MAPPING).forEach(([ruleType, fields]) => {
      describe(`${ruleType} rule simple fields`, () => {
        fields.forEach((field) => {
          const testValues = SIMPLE_FIELDS_MAP[field as SIMPLE_FIELDS];
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
