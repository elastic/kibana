/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { convertPrebuiltRuleAssetToRuleResponse } from '../../../../rule_management/logic/detection_rules_client/converters/convert_prebuilt_rule_asset_to_rule_response';
import { getPrebuiltRuleMockOfType } from '../../../mocks';
import { calculateRuleFieldsDiff } from './calculate_rule_fields_diff';
import { calculateThreeWayRuleFieldsDiff } from './calculate_three_way_rule_fields_diff';
import { convertRuleToDiffable } from '../../../../../../../common/detection_engine/prebuilt_rules/diff/convert_rule_to_diffable';
import type {
  RuleResponse,
  ThreeWayRuleFieldsDiff,
} from '../../../../../../../common/api/detection_engine';
import {
  AlertSuppressionDurationUnitEnum,
  AlertSuppressionMissingFieldsStrategyEnum,
  MissingVersion,
  SeverityEnum,
} from '../../../../../../../common/api/detection_engine';
import type { TwoWayDiffRule } from '../../../../../../../common/api/detection_engine/prebuilt_rules/model/diff/two_way_diff/two_way_rule_diff';

const CUSTOM_QUERY_PREBUILT_RULE_ASSET = getPrebuiltRuleMockOfType('query');
const CUSTOM_QUERY_PREBUILT_RULE_RESPONSE = convertPrebuiltRuleAssetToRuleResponse(
  CUSTOM_QUERY_PREBUILT_RULE_ASSET
);

const SAVED_QUERY_PREBUILT_RULE_ASSET = getPrebuiltRuleMockOfType('saved_query');
const SAVED_QUERY_PREBUILT_RULE_RESPONSE = convertPrebuiltRuleAssetToRuleResponse(
  SAVED_QUERY_PREBUILT_RULE_ASSET
);

const EQL_PREBUILT_RULE_ASSET = getPrebuiltRuleMockOfType('eql');
const EQL_PREBUILT_RULE_RESPONSE = convertPrebuiltRuleAssetToRuleResponse(EQL_PREBUILT_RULE_ASSET);

const ESQL_PREBUILT_RULE_ASSET = getPrebuiltRuleMockOfType('esql');
const ESQL_PREBUILT_RULE_RESPONSE =
  convertPrebuiltRuleAssetToRuleResponse(ESQL_PREBUILT_RULE_ASSET);

const THREAT_MATCH_PREBUILT_RULE_ASSET = getPrebuiltRuleMockOfType('threat_match');
const THREAT_MATCH_PREBUILT_RULE_RESPONSE = convertPrebuiltRuleAssetToRuleResponse(
  THREAT_MATCH_PREBUILT_RULE_ASSET
);

const THRESHOLD_PREBUILT_RULE_ASSET = getPrebuiltRuleMockOfType('threshold');
const THRESHOLD_PREBUILT_RULE_RESPONSE = convertPrebuiltRuleAssetToRuleResponse(
  THRESHOLD_PREBUILT_RULE_ASSET
);

const MACHINE_LEARNING_PREBUILT_RULE_ASSET = getPrebuiltRuleMockOfType('machine_learning');
const MACHINE_LEARNING_PREBUILT_RULE_RESPONSE = convertPrebuiltRuleAssetToRuleResponse(
  MACHINE_LEARNING_PREBUILT_RULE_ASSET
);

const NEW_TERMS_PREBUILT_RULE_ASSET = getPrebuiltRuleMockOfType('new_terms');
const NEW_TERMS_PREBUILT_RULE_RESPONSE = convertPrebuiltRuleAssetToRuleResponse(
  NEW_TERMS_PREBUILT_RULE_ASSET
);

/**
 * This test suite's purpose is to ensure uniformity between the two different types of rule
 * diff calculation we utilize in the prebuilt rule customization code. We have a two-way comparison
 * (calculateRuleFieldsDiff) and a three-way comparison (calculateThreeWayRuleFieldsDiff) that share
 * underlying comparison logic, but perform calculate their results from different rule structures.
 *
 * The two-way diff uses the `RuleResponse` type for its rule comparison schema while the three-way
 * diff uses the `DiffableRule` schema. While the results for each of these diffing calculations have
 * differences in return structure and schema, the determination for if a field is customized should
 * be the same across both functions.
 *
 * In these tests, we test for every field we diff on in `RuleResponse` to determine if both our two-
 * way diff and our three-way diff functions return the same result and don't diverge in logical
 * comparison. We do this by explicitly defining a base rule field and a modified rule field, and then
 * calculating diff objects with both diff methods and ensuring both comparisons give equatable results.
 */
describe('synchronizing 2-way and 3-way rule diff calculations', () => {
  const testDiffCalculationEquality = ({
    fieldName,
    diffableFieldName,
    baseRule,
    modifiedRule,
  }: {
    fieldName: string;
    diffableFieldName: string;
    baseRule: RuleResponse;
    modifiedRule: RuleResponse;
  }) => {
    const twoWayDiff = calculateRuleFieldsDiff({
      ruleA: baseRule,
      ruleB: modifiedRule,
    });
    const threeWayDiff = calculateThreeWayRuleFieldsDiff({
      base_version: MissingVersion,
      current_version: convertRuleToDiffable(baseRule),
      target_version: convertRuleToDiffable(modifiedRule),
    });

    expect(twoWayDiff[fieldName as keyof TwoWayDiffRule]?.is_equal).toEqual(false);
    expect(threeWayDiff[diffableFieldName as keyof ThreeWayRuleFieldsDiff]?.has_update).toEqual(
      true
    );
  };

  it('unmodified rule objects', () => {
    const twoWayDiff = calculateRuleFieldsDiff({
      ruleA: CUSTOM_QUERY_PREBUILT_RULE_RESPONSE,
      ruleB: CUSTOM_QUERY_PREBUILT_RULE_RESPONSE,
    });
    const threeWayDiff = calculateThreeWayRuleFieldsDiff({
      base_version: MissingVersion,
      current_version: convertRuleToDiffable(CUSTOM_QUERY_PREBUILT_RULE_RESPONSE),
      target_version: convertRuleToDiffable(CUSTOM_QUERY_PREBUILT_RULE_RESPONSE),
    });

    expect(Object.values(twoWayDiff).every((field) => field.is_equal === true)).toEqual(true);
    expect(Object.values(threeWayDiff).every((diff) => diff.has_update === false)).toEqual(true);
  });

  describe('common fields', () => {
    it('"name" field', () => {
      const BASE_PREBUILT_RULE_RESPONSE = {
        ...CUSTOM_QUERY_PREBUILT_RULE_RESPONSE,
        name: 'base name',
      };
      const MODIFIED_PREBUILT_RULE_RESPONSE = {
        ...CUSTOM_QUERY_PREBUILT_RULE_RESPONSE,
        name: 'updated name',
      };

      testDiffCalculationEquality({
        fieldName: 'name',
        diffableFieldName: 'name',
        baseRule: BASE_PREBUILT_RULE_RESPONSE,
        modifiedRule: MODIFIED_PREBUILT_RULE_RESPONSE,
      });
    });

    it('"version" field', () => {
      const BASE_PREBUILT_RULE_RESPONSE = {
        ...CUSTOM_QUERY_PREBUILT_RULE_RESPONSE,
        version: 1,
      };
      const MODIFIED_PREBUILT_RULE_RESPONSE = {
        ...CUSTOM_QUERY_PREBUILT_RULE_RESPONSE,
        version: 2,
      };

      testDiffCalculationEquality({
        fieldName: 'version',
        diffableFieldName: 'version',
        baseRule: BASE_PREBUILT_RULE_RESPONSE,
        modifiedRule: MODIFIED_PREBUILT_RULE_RESPONSE,
      });
    });

    it('"tags" field', () => {
      const BASE_PREBUILT_RULE_RESPONSE = {
        ...CUSTOM_QUERY_PREBUILT_RULE_RESPONSE,
        tags: ['test one'],
      };
      const MODIFIED_PREBUILT_RULE_RESPONSE = {
        ...CUSTOM_QUERY_PREBUILT_RULE_RESPONSE,
        tags: ['test one', 'test two'],
      };

      testDiffCalculationEquality({
        fieldName: 'tags',
        diffableFieldName: 'tags',
        baseRule: BASE_PREBUILT_RULE_RESPONSE,
        modifiedRule: MODIFIED_PREBUILT_RULE_RESPONSE,
      });
    });

    it('"description" field', () => {
      const BASE_PREBUILT_RULE_RESPONSE = {
        ...CUSTOM_QUERY_PREBUILT_RULE_RESPONSE,
        description: 'test description',
      };
      const MODIFIED_PREBUILT_RULE_RESPONSE = {
        ...CUSTOM_QUERY_PREBUILT_RULE_RESPONSE,
        description: 'updated test description',
      };

      testDiffCalculationEquality({
        fieldName: 'description',
        diffableFieldName: 'description',
        baseRule: BASE_PREBUILT_RULE_RESPONSE,
        modifiedRule: MODIFIED_PREBUILT_RULE_RESPONSE,
      });
    });

    it('"severity" field', () => {
      const BASE_PREBUILT_RULE_RESPONSE = {
        ...CUSTOM_QUERY_PREBUILT_RULE_RESPONSE,
        severity: SeverityEnum.low,
      };
      const MODIFIED_PREBUILT_RULE_RESPONSE = {
        ...CUSTOM_QUERY_PREBUILT_RULE_RESPONSE,
        severity: SeverityEnum.high,
      };

      testDiffCalculationEquality({
        fieldName: 'severity',
        diffableFieldName: 'severity',
        baseRule: BASE_PREBUILT_RULE_RESPONSE,
        modifiedRule: MODIFIED_PREBUILT_RULE_RESPONSE,
      });
    });

    it('"severity_mapping" field', () => {
      const BASE_PREBUILT_RULE_RESPONSE = {
        ...CUSTOM_QUERY_PREBUILT_RULE_RESPONSE,
        severity_mapping: [
          {
            field: 'event.severity',
            operator: 'equals' as const,
            severity: SeverityEnum.low,
            value: 'LOW',
          },
        ],
      };
      const MODIFIED_PREBUILT_RULE_RESPONSE = {
        ...CUSTOM_QUERY_PREBUILT_RULE_RESPONSE,
        severity_mapping: [
          {
            field: 'event.severity',
            operator: 'equals' as const,
            severity: SeverityEnum.high,
            value: 'HIGH',
          },
        ],
      };

      testDiffCalculationEquality({
        fieldName: 'severity_mapping',
        diffableFieldName: 'severity_mapping',
        baseRule: BASE_PREBUILT_RULE_RESPONSE,
        modifiedRule: MODIFIED_PREBUILT_RULE_RESPONSE,
      });
    });

    it('"risk_score" field', () => {
      const BASE_PREBUILT_RULE_RESPONSE = {
        ...CUSTOM_QUERY_PREBUILT_RULE_RESPONSE,
        risk_score: 30,
      };
      const MODIFIED_PREBUILT_RULE_RESPONSE = {
        ...CUSTOM_QUERY_PREBUILT_RULE_RESPONSE,
        risk_score: 40,
      };

      testDiffCalculationEquality({
        fieldName: 'risk_score',
        diffableFieldName: 'risk_score',
        baseRule: BASE_PREBUILT_RULE_RESPONSE,
        modifiedRule: MODIFIED_PREBUILT_RULE_RESPONSE,
      });
    });

    it('"risk_score_mapping" field', () => {
      const BASE_PREBUILT_RULE_RESPONSE = {
        ...CUSTOM_QUERY_PREBUILT_RULE_RESPONSE,
        risk_score_mapping: [],
      };
      const MODIFIED_PREBUILT_RULE_RESPONSE = {
        ...CUSTOM_QUERY_PREBUILT_RULE_RESPONSE,
        risk_score_mapping: [
          { field: 'event.risk_score', operator: 'equals' as const, value: 'updated value' },
        ],
      };

      testDiffCalculationEquality({
        fieldName: 'risk_score_mapping',
        diffableFieldName: 'risk_score_mapping',
        baseRule: BASE_PREBUILT_RULE_RESPONSE,
        modifiedRule: MODIFIED_PREBUILT_RULE_RESPONSE,
      });
    });

    it('"references" field', () => {
      const BASE_PREBUILT_RULE_RESPONSE = {
        ...CUSTOM_QUERY_PREBUILT_RULE_RESPONSE,
        references: [],
      };
      const MODIFIED_PREBUILT_RULE_RESPONSE = {
        ...CUSTOM_QUERY_PREBUILT_RULE_RESPONSE,
        references: ['http://test.test'],
      };

      testDiffCalculationEquality({
        fieldName: 'references',
        diffableFieldName: 'references',
        baseRule: BASE_PREBUILT_RULE_RESPONSE,
        modifiedRule: MODIFIED_PREBUILT_RULE_RESPONSE,
      });
    });

    it('"false_positives" field', () => {
      const BASE_PREBUILT_RULE_RESPONSE = {
        ...CUSTOM_QUERY_PREBUILT_RULE_RESPONSE,
        false_positives: [],
      };
      const MODIFIED_PREBUILT_RULE_RESPONSE = {
        ...CUSTOM_QUERY_PREBUILT_RULE_RESPONSE,
        false_positives: ['test false positive'],
      };

      testDiffCalculationEquality({
        fieldName: 'false_positives',
        diffableFieldName: 'false_positives',
        baseRule: BASE_PREBUILT_RULE_RESPONSE,
        modifiedRule: MODIFIED_PREBUILT_RULE_RESPONSE,
      });
    });

    it('"threat" field', () => {
      const BASE_PREBUILT_RULE_RESPONSE = {
        ...CUSTOM_QUERY_PREBUILT_RULE_RESPONSE,
        threat: [],
      };
      const MODIFIED_PREBUILT_RULE_RESPONSE = {
        ...CUSTOM_QUERY_PREBUILT_RULE_RESPONSE,
        threat: [
          {
            framework: 'MITRE ATT&CK',
            tactic: {
              id: 'TA0000',
              name: 'test tactic',
              reference: 'https://attack.mitre.org/tactics/TA0000/',
            },
          },
        ],
      };

      testDiffCalculationEquality({
        fieldName: 'threat',
        diffableFieldName: 'threat',
        baseRule: BASE_PREBUILT_RULE_RESPONSE,
        modifiedRule: MODIFIED_PREBUILT_RULE_RESPONSE,
      });
    });

    it('"note" field', () => {
      const BASE_PREBUILT_RULE_RESPONSE = {
        ...CUSTOM_QUERY_PREBUILT_RULE_RESPONSE,
        note: '## base markdown',
      };
      const MODIFIED_PREBUILT_RULE_RESPONSE = {
        ...CUSTOM_QUERY_PREBUILT_RULE_RESPONSE,
        note: '## updated markdown',
      };

      testDiffCalculationEquality({
        fieldName: 'note',
        diffableFieldName: 'note',
        baseRule: BASE_PREBUILT_RULE_RESPONSE,
        modifiedRule: MODIFIED_PREBUILT_RULE_RESPONSE,
      });
    });

    it('"setup" field', () => {
      const BASE_PREBUILT_RULE_RESPONSE = {
        ...CUSTOM_QUERY_PREBUILT_RULE_RESPONSE,
        setup: '## base markdown',
      };
      const MODIFIED_PREBUILT_RULE_RESPONSE = {
        ...CUSTOM_QUERY_PREBUILT_RULE_RESPONSE,
        setup: '## updated markdown',
      };

      testDiffCalculationEquality({
        fieldName: 'setup',
        diffableFieldName: 'setup',
        baseRule: BASE_PREBUILT_RULE_RESPONSE,
        modifiedRule: MODIFIED_PREBUILT_RULE_RESPONSE,
      });
    });

    it('"related_integrations" field', () => {
      const BASE_PREBUILT_RULE_RESPONSE = {
        ...CUSTOM_QUERY_PREBUILT_RULE_RESPONSE,
        related_integrations: [],
      };
      const MODIFIED_PREBUILT_RULE_RESPONSE = {
        ...CUSTOM_QUERY_PREBUILT_RULE_RESPONSE,
        related_integrations: [{ package: 'package-test', version: '^1.2.3' }],
      };

      testDiffCalculationEquality({
        fieldName: 'related_integrations',
        diffableFieldName: 'related_integrations',
        baseRule: BASE_PREBUILT_RULE_RESPONSE,
        modifiedRule: MODIFIED_PREBUILT_RULE_RESPONSE,
      });
    });

    it('"required_fields" field', () => {
      const BASE_PREBUILT_RULE_RESPONSE = {
        ...CUSTOM_QUERY_PREBUILT_RULE_RESPONSE,
        required_fields: [],
      };
      const MODIFIED_PREBUILT_RULE_RESPONSE = {
        ...CUSTOM_QUERY_PREBUILT_RULE_RESPONSE,
        required_fields: [{ name: '@timestamp', type: 'date', ecs: true }],
      };

      testDiffCalculationEquality({
        fieldName: 'required_fields',
        diffableFieldName: 'required_fields',
        baseRule: BASE_PREBUILT_RULE_RESPONSE,
        modifiedRule: MODIFIED_PREBUILT_RULE_RESPONSE,
      });
    });

    it('"max_signals" field', () => {
      const BASE_PREBUILT_RULE_RESPONSE = {
        ...CUSTOM_QUERY_PREBUILT_RULE_RESPONSE,
        max_signals: 100,
      };
      const MODIFIED_PREBUILT_RULE_RESPONSE = {
        ...CUSTOM_QUERY_PREBUILT_RULE_RESPONSE,
        max_signals: 50,
      };

      testDiffCalculationEquality({
        fieldName: 'max_signals',
        diffableFieldName: 'max_signals',
        baseRule: BASE_PREBUILT_RULE_RESPONSE,
        modifiedRule: MODIFIED_PREBUILT_RULE_RESPONSE,
      });
    });

    it('"investigation_fields" field', () => {
      const BASE_PREBUILT_RULE_RESPONSE = {
        ...CUSTOM_QUERY_PREBUILT_RULE_RESPONSE,
        investigation_fields: { field_names: ['foo', 'bar'] },
      };
      const MODIFIED_PREBUILT_RULE_RESPONSE = {
        ...CUSTOM_QUERY_PREBUILT_RULE_RESPONSE,
        investigation_fields: { field_names: ['blob', 'boop'] },
      };

      testDiffCalculationEquality({
        fieldName: 'investigation_fields',
        diffableFieldName: 'investigation_fields',
        baseRule: BASE_PREBUILT_RULE_RESPONSE,
        modifiedRule: MODIFIED_PREBUILT_RULE_RESPONSE,
      });
    });

    it('"rule_name_override" field', () => {
      const BASE_PREBUILT_RULE_RESPONSE = {
        ...CUSTOM_QUERY_PREBUILT_RULE_RESPONSE,
        rule_name_override: 'field.name',
      };
      const MODIFIED_PREBUILT_RULE_RESPONSE = {
        ...CUSTOM_QUERY_PREBUILT_RULE_RESPONSE,
        rule_name_override: 'field.updated.name',
      };

      testDiffCalculationEquality({
        fieldName: 'rule_name_override',
        diffableFieldName: 'rule_name_override',
        baseRule: BASE_PREBUILT_RULE_RESPONSE,
        modifiedRule: MODIFIED_PREBUILT_RULE_RESPONSE,
      });
    });

    it('"timestamp_override" field', () => {
      const BASE_PREBUILT_RULE_RESPONSE = {
        ...CUSTOM_QUERY_PREBUILT_RULE_RESPONSE,
        timestamp_override: 'field.name',
      };
      const MODIFIED_PREBUILT_RULE_RESPONSE = {
        ...CUSTOM_QUERY_PREBUILT_RULE_RESPONSE,
        timestamp_override: 'field.updated.name',
      };

      testDiffCalculationEquality({
        fieldName: 'timestamp_override',
        diffableFieldName: 'timestamp_override',
        baseRule: BASE_PREBUILT_RULE_RESPONSE,
        modifiedRule: MODIFIED_PREBUILT_RULE_RESPONSE,
      });
    });

    it('"timestamp_override_fallback_disabled" field', () => {
      const BASE_PREBUILT_RULE_RESPONSE = {
        ...CUSTOM_QUERY_PREBUILT_RULE_RESPONSE,
        /**
         * `timestamp_override` field has to be present in both fields
         * because we only extract `timestamp_override_fallback_disabled`
         * out in diffable rules if `timestamp_override` exists. Field value
         * will be unchanged between the versions and doesn't affect diff output.
         */
        timestamp_override: 'field.name',
        timestamp_override_fallback_disabled: false,
      };
      const MODIFIED_PREBUILT_RULE_RESPONSE = {
        ...CUSTOM_QUERY_PREBUILT_RULE_RESPONSE,
        timestamp_override: 'field.name',
        timestamp_override_fallback_disabled: true,
      };

      testDiffCalculationEquality({
        fieldName: 'timestamp_override_fallback_disabled',
        diffableFieldName: 'timestamp_override',
        baseRule: BASE_PREBUILT_RULE_RESPONSE,
        modifiedRule: MODIFIED_PREBUILT_RULE_RESPONSE,
      });
    });

    it('"timeline_id" field', () => {
      const BASE_PREBUILT_RULE_RESPONSE = {
        ...CUSTOM_QUERY_PREBUILT_RULE_RESPONSE,
        timeline_id: 'base-timeline-id',
      };
      const MODIFIED_PREBUILT_RULE_RESPONSE = {
        ...CUSTOM_QUERY_PREBUILT_RULE_RESPONSE,
        timeline_id: 'updated-timeline-id',
      };

      testDiffCalculationEquality({
        fieldName: 'timeline_id',
        diffableFieldName: 'timeline_template',
        baseRule: BASE_PREBUILT_RULE_RESPONSE,
        modifiedRule: MODIFIED_PREBUILT_RULE_RESPONSE,
      });
    });

    it('"timeline_title" field', () => {
      const BASE_PREBUILT_RULE_RESPONSE = {
        ...CUSTOM_QUERY_PREBUILT_RULE_RESPONSE,
        /**
         * `timeline_id` field has to be present in both fields
         * because we only extract `timeline_title` out in diffable
         * rules if `timeline_id` exists. Field value will be
         * unchanged between the versions and doesn't affect diff output.
         */
        timeline_id: 'timeline-id-123',
        timeline_title: 'base timeline title',
      };
      const MODIFIED_PREBUILT_RULE_RESPONSE = {
        ...CUSTOM_QUERY_PREBUILT_RULE_RESPONSE,
        timeline_id: 'timeline-id-123',
        timeline_title: 'updated timeline title',
      };

      testDiffCalculationEquality({
        fieldName: 'timeline_title',
        diffableFieldName: 'timeline_template',
        baseRule: BASE_PREBUILT_RULE_RESPONSE,
        modifiedRule: MODIFIED_PREBUILT_RULE_RESPONSE,
      });
    });

    it('"building_block_type" field', () => {
      const BASE_PREBUILT_RULE_RESPONSE = {
        ...CUSTOM_QUERY_PREBUILT_RULE_RESPONSE,
        building_block_type: 'base type',
      };
      const MODIFIED_PREBUILT_RULE_RESPONSE = {
        ...CUSTOM_QUERY_PREBUILT_RULE_RESPONSE,
        building_block_type: 'updated type',
      };

      testDiffCalculationEquality({
        fieldName: 'building_block_type',
        diffableFieldName: 'building_block',
        baseRule: BASE_PREBUILT_RULE_RESPONSE,
        modifiedRule: MODIFIED_PREBUILT_RULE_RESPONSE,
      });
    });

    it('"from" field', () => {
      const BASE_PREBUILT_RULE_RESPONSE = {
        ...CUSTOM_QUERY_PREBUILT_RULE_RESPONSE,
        from: 'now-10m',
      };
      const MODIFIED_PREBUILT_RULE_RESPONSE = {
        ...CUSTOM_QUERY_PREBUILT_RULE_RESPONSE,
        from: 'now-5m',
      };

      testDiffCalculationEquality({
        fieldName: 'from',
        diffableFieldName: 'rule_schedule',
        baseRule: BASE_PREBUILT_RULE_RESPONSE,
        modifiedRule: MODIFIED_PREBUILT_RULE_RESPONSE,
      });
    });

    it('"to" field', () => {
      const BASE_PREBUILT_RULE_RESPONSE = {
        ...CUSTOM_QUERY_PREBUILT_RULE_RESPONSE,
        to: 'now',
      };
      const MODIFIED_PREBUILT_RULE_RESPONSE = {
        ...CUSTOM_QUERY_PREBUILT_RULE_RESPONSE,
        to: 'now-5m',
      };

      testDiffCalculationEquality({
        fieldName: 'to',
        diffableFieldName: 'rule_schedule',
        baseRule: BASE_PREBUILT_RULE_RESPONSE,
        modifiedRule: MODIFIED_PREBUILT_RULE_RESPONSE,
      });
    });

    it('"interval" field', () => {
      const BASE_PREBUILT_RULE_RESPONSE = {
        ...CUSTOM_QUERY_PREBUILT_RULE_RESPONSE,
        interval: '5m',
      };
      const MODIFIED_PREBUILT_RULE_RESPONSE = {
        ...CUSTOM_QUERY_PREBUILT_RULE_RESPONSE,
        interval: '10m',
      };

      testDiffCalculationEquality({
        fieldName: 'interval',
        diffableFieldName: 'rule_schedule',
        baseRule: BASE_PREBUILT_RULE_RESPONSE,
        modifiedRule: MODIFIED_PREBUILT_RULE_RESPONSE,
      });
    });

    it('"type" field', () => {
      testDiffCalculationEquality({
        fieldName: 'type',
        diffableFieldName: 'type',
        baseRule: CUSTOM_QUERY_PREBUILT_RULE_RESPONSE,
        modifiedRule: EQL_PREBUILT_RULE_RESPONSE,
      });
    });
  });

  describe('custom query rule fields', () => {
    it('"query" field', () => {
      const BASE_PREBUILT_RULE_RESPONSE = {
        ...CUSTOM_QUERY_PREBUILT_RULE_RESPONSE,
        query: 'event.code: "test"',
      };
      const MODIFIED_PREBUILT_RULE_RESPONSE = {
        ...CUSTOM_QUERY_PREBUILT_RULE_RESPONSE,
        query: 'event.code: "updated test"',
      };

      testDiffCalculationEquality({
        fieldName: 'query',
        diffableFieldName: 'kql_query',
        baseRule: BASE_PREBUILT_RULE_RESPONSE,
        modifiedRule: MODIFIED_PREBUILT_RULE_RESPONSE,
      });
    });

    it('"language" field', () => {
      const BASE_PREBUILT_RULE_RESPONSE = {
        ...CUSTOM_QUERY_PREBUILT_RULE_RESPONSE,
        language: 'lucene' as const,
      } as RuleResponse;

      const MODIFIED_PREBUILT_RULE_RESPONSE: RuleResponse = {
        ...CUSTOM_QUERY_PREBUILT_RULE_RESPONSE,
        language: 'kuery' as const,
      } as RuleResponse;

      testDiffCalculationEquality({
        fieldName: 'language',
        diffableFieldName: 'kql_query',
        baseRule: BASE_PREBUILT_RULE_RESPONSE,
        modifiedRule: MODIFIED_PREBUILT_RULE_RESPONSE,
      });
    });

    it('"filters" field', () => {
      const BASE_PREBUILT_RULE_RESPONSE = {
        ...CUSTOM_QUERY_PREBUILT_RULE_RESPONSE,
        filters: [],
      };
      const MODIFIED_PREBUILT_RULE_RESPONSE = {
        ...CUSTOM_QUERY_PREBUILT_RULE_RESPONSE,
        filters: [
          {
            meta: {
              negate: false,
              disabled: false,
              type: 'phrase',
              key: 'test',
              params: {
                query: 'value',
              },
            },
            query: {
              term: {
                field: 'value',
              },
            },
          },
        ],
      };

      testDiffCalculationEquality({
        fieldName: 'filters',
        diffableFieldName: 'kql_query',
        baseRule: BASE_PREBUILT_RULE_RESPONSE,
        modifiedRule: MODIFIED_PREBUILT_RULE_RESPONSE,
      });
    });

    it('"data_view_id" field', () => {
      const BASE_PREBUILT_RULE_RESPONSE = {
        ...CUSTOM_QUERY_PREBUILT_RULE_RESPONSE,
        data_view_id: 'test-data-view',
      };
      const MODIFIED_PREBUILT_RULE_RESPONSE = {
        ...CUSTOM_QUERY_PREBUILT_RULE_RESPONSE,
        data_view_id: 'updated-test-data-view',
      };

      testDiffCalculationEquality({
        fieldName: 'data_view_id',
        diffableFieldName: 'data_source',
        baseRule: BASE_PREBUILT_RULE_RESPONSE,
        modifiedRule: MODIFIED_PREBUILT_RULE_RESPONSE,
      });
    });

    it('"index" field', () => {
      const BASE_PREBUILT_RULE_RESPONSE = {
        ...CUSTOM_QUERY_PREBUILT_RULE_RESPONSE,
        index: ['pattern-1', 'pattern-2'],
      };
      const MODIFIED_PREBUILT_RULE_RESPONSE = {
        ...CUSTOM_QUERY_PREBUILT_RULE_RESPONSE,
        index: ['pattern-1', 'pattern-2', 'pattern-3'],
      };

      testDiffCalculationEquality({
        fieldName: 'index',
        diffableFieldName: 'data_source',
        baseRule: BASE_PREBUILT_RULE_RESPONSE,
        modifiedRule: MODIFIED_PREBUILT_RULE_RESPONSE,
      });
    });

    it('"alert_suppression" field', () => {
      const BASE_PREBUILT_RULE_RESPONSE = {
        ...CUSTOM_QUERY_PREBUILT_RULE_RESPONSE,
        alert_suppression: undefined,
      };
      const MODIFIED_PREBUILT_RULE_RESPONSE = {
        ...CUSTOM_QUERY_PREBUILT_RULE_RESPONSE,
        alert_suppression: {
          group_by: ['host.name'],
          duration: { value: 5, unit: AlertSuppressionDurationUnitEnum.m },
          missing_fields_strategy: AlertSuppressionMissingFieldsStrategyEnum.suppress,
        },
      };

      testDiffCalculationEquality({
        fieldName: 'alert_suppression',
        diffableFieldName: 'alert_suppression',
        baseRule: BASE_PREBUILT_RULE_RESPONSE,
        modifiedRule: MODIFIED_PREBUILT_RULE_RESPONSE,
      });
    });
  });

  describe('saved_query rule fields', () => {
    it('"saved_id" field', () => {
      const BASE_PREBUILT_RULE_RESPONSE = {
        ...SAVED_QUERY_PREBUILT_RULE_RESPONSE,
        saved_id: 'saved-id',
      };
      const MODIFIED_PREBUILT_RULE_RESPONSE = {
        ...SAVED_QUERY_PREBUILT_RULE_RESPONSE,
        saved_id: 'updated-saved-id',
      };

      testDiffCalculationEquality({
        fieldName: 'saved_id',
        diffableFieldName: 'kql_query',
        baseRule: BASE_PREBUILT_RULE_RESPONSE,
        modifiedRule: MODIFIED_PREBUILT_RULE_RESPONSE,
      });
    });

    it('"data_view_id" field', () => {
      const BASE_PREBUILT_RULE_RESPONSE = {
        ...SAVED_QUERY_PREBUILT_RULE_RESPONSE,
        data_view_id: 'test-data-view',
      };
      const MODIFIED_PREBUILT_RULE_RESPONSE = {
        ...SAVED_QUERY_PREBUILT_RULE_RESPONSE,
        data_view_id: 'updated-test-data-view',
      };

      testDiffCalculationEquality({
        fieldName: 'data_view_id',
        diffableFieldName: 'data_source',
        baseRule: BASE_PREBUILT_RULE_RESPONSE,
        modifiedRule: MODIFIED_PREBUILT_RULE_RESPONSE,
      });
    });

    it('"index" field', () => {
      const BASE_PREBUILT_RULE_RESPONSE = {
        ...SAVED_QUERY_PREBUILT_RULE_RESPONSE,
        index: ['pattern-1', 'pattern-2'],
      };
      const MODIFIED_PREBUILT_RULE_RESPONSE = {
        ...SAVED_QUERY_PREBUILT_RULE_RESPONSE,
        index: ['pattern-1', 'pattern-2', 'pattern-3'],
      };

      testDiffCalculationEquality({
        fieldName: 'index',
        diffableFieldName: 'data_source',
        baseRule: BASE_PREBUILT_RULE_RESPONSE,
        modifiedRule: MODIFIED_PREBUILT_RULE_RESPONSE,
      });
    });

    it('"alert_suppression" field', () => {
      const BASE_PREBUILT_RULE_RESPONSE = {
        ...SAVED_QUERY_PREBUILT_RULE_RESPONSE,
        alert_suppression: undefined,
      };
      const MODIFIED_PREBUILT_RULE_RESPONSE = {
        ...SAVED_QUERY_PREBUILT_RULE_RESPONSE,
        alert_suppression: {
          group_by: ['host.name'],
          duration: { value: 5, unit: AlertSuppressionDurationUnitEnum.m },
          missing_fields_strategy: AlertSuppressionMissingFieldsStrategyEnum.suppress,
        },
      };

      testDiffCalculationEquality({
        fieldName: 'alert_suppression',
        diffableFieldName: 'alert_suppression',
        baseRule: BASE_PREBUILT_RULE_RESPONSE,
        modifiedRule: MODIFIED_PREBUILT_RULE_RESPONSE,
      });
    });
  });

  describe('eql rule fields', () => {
    it('"query" field', () => {
      const BASE_PREBUILT_RULE_RESPONSE = {
        ...EQL_PREBUILT_RULE_RESPONSE,
        query: 'process where true',
      };
      const MODIFIED_PREBUILT_RULE_RESPONSE = {
        ...EQL_PREBUILT_RULE_RESPONSE,
        query: 'process where false',
      };

      testDiffCalculationEquality({
        fieldName: 'query',
        diffableFieldName: 'eql_query',
        baseRule: BASE_PREBUILT_RULE_RESPONSE,
        modifiedRule: MODIFIED_PREBUILT_RULE_RESPONSE,
      });
    });

    it('"filters" field', () => {
      const BASE_PREBUILT_RULE_RESPONSE = {
        ...EQL_PREBUILT_RULE_RESPONSE,
        filters: [],
      };
      const MODIFIED_PREBUILT_RULE_RESPONSE = {
        ...EQL_PREBUILT_RULE_RESPONSE,
        filters: [
          {
            meta: {
              negate: false,
              disabled: false,
              type: 'phrase',
              key: 'test',
              params: {
                query: 'value',
              },
            },
            query: {
              term: {
                field: 'value',
              },
            },
          },
        ],
      };

      testDiffCalculationEquality({
        fieldName: 'filters',
        diffableFieldName: 'eql_query',
        baseRule: BASE_PREBUILT_RULE_RESPONSE,
        modifiedRule: MODIFIED_PREBUILT_RULE_RESPONSE,
      });
    });

    it('"event_category_override" field', () => {
      const BASE_PREBUILT_RULE_RESPONSE = {
        ...EQL_PREBUILT_RULE_RESPONSE,
        event_category_override: 'host.name',
      };
      const MODIFIED_PREBUILT_RULE_RESPONSE = {
        ...EQL_PREBUILT_RULE_RESPONSE,
        event_category_override: 'host.type',
      };

      testDiffCalculationEquality({
        fieldName: 'event_category_override',
        diffableFieldName: 'eql_query',
        baseRule: BASE_PREBUILT_RULE_RESPONSE,
        modifiedRule: MODIFIED_PREBUILT_RULE_RESPONSE,
      });
    });

    it('"tiebreaker_field" field', () => {
      const BASE_PREBUILT_RULE_RESPONSE = {
        ...EQL_PREBUILT_RULE_RESPONSE,
        tiebreaker_field: 'host.name',
      };
      const MODIFIED_PREBUILT_RULE_RESPONSE = {
        ...EQL_PREBUILT_RULE_RESPONSE,
        tiebreaker_field: 'host.type',
      };

      testDiffCalculationEquality({
        fieldName: 'tiebreaker_field',
        diffableFieldName: 'eql_query',
        baseRule: BASE_PREBUILT_RULE_RESPONSE,
        modifiedRule: MODIFIED_PREBUILT_RULE_RESPONSE,
      });
    });

    it('"timestamp_field" field', () => {
      const BASE_PREBUILT_RULE_RESPONSE = {
        ...EQL_PREBUILT_RULE_RESPONSE,
        timestamp_field: 'event.ingested',
      };
      const MODIFIED_PREBUILT_RULE_RESPONSE = {
        ...EQL_PREBUILT_RULE_RESPONSE,
        timestamp_field: 'event.occurance',
      };

      testDiffCalculationEquality({
        fieldName: 'timestamp_field',
        diffableFieldName: 'eql_query',
        baseRule: BASE_PREBUILT_RULE_RESPONSE,
        modifiedRule: MODIFIED_PREBUILT_RULE_RESPONSE,
      });
    });

    it('"data_view_id" field', () => {
      const BASE_PREBUILT_RULE_RESPONSE = {
        ...EQL_PREBUILT_RULE_RESPONSE,
        data_view_id: 'test-data-view',
      };
      const MODIFIED_PREBUILT_RULE_RESPONSE = {
        ...EQL_PREBUILT_RULE_RESPONSE,
        data_view_id: 'updated-test-data-view',
      };

      testDiffCalculationEquality({
        fieldName: 'data_view_id',
        diffableFieldName: 'data_source',
        baseRule: BASE_PREBUILT_RULE_RESPONSE,
        modifiedRule: MODIFIED_PREBUILT_RULE_RESPONSE,
      });
    });

    it('"index" field', () => {
      const BASE_PREBUILT_RULE_RESPONSE = {
        ...EQL_PREBUILT_RULE_RESPONSE,
        index: ['pattern-1', 'pattern-2'],
      };
      const MODIFIED_PREBUILT_RULE_RESPONSE = {
        ...EQL_PREBUILT_RULE_RESPONSE,
        index: ['pattern-1', 'pattern-2', 'pattern-3'],
      };

      testDiffCalculationEquality({
        fieldName: 'index',
        diffableFieldName: 'data_source',
        baseRule: BASE_PREBUILT_RULE_RESPONSE,
        modifiedRule: MODIFIED_PREBUILT_RULE_RESPONSE,
      });
    });

    it('"alert_suppression" field', () => {
      const BASE_PREBUILT_RULE_RESPONSE = {
        ...EQL_PREBUILT_RULE_RESPONSE,
        alert_suppression: undefined,
      };
      const MODIFIED_PREBUILT_RULE_RESPONSE = {
        ...EQL_PREBUILT_RULE_RESPONSE,
        alert_suppression: {
          group_by: ['host.name'],
          duration: { value: 5, unit: AlertSuppressionDurationUnitEnum.m },
          missing_fields_strategy: AlertSuppressionMissingFieldsStrategyEnum.suppress,
        },
      };

      testDiffCalculationEquality({
        fieldName: 'alert_suppression',
        diffableFieldName: 'alert_suppression',
        baseRule: BASE_PREBUILT_RULE_RESPONSE,
        modifiedRule: MODIFIED_PREBUILT_RULE_RESPONSE,
      });
    });
  });

  describe('esql rule fields', () => {
    it('"query" field', () => {
      const BASE_PREBUILT_RULE_RESPONSE = {
        ...ESQL_PREBUILT_RULE_RESPONSE,
        query: 'GET event IN *',
      };
      const MODIFIED_PREBUILT_RULE_RESPONSE = {
        ...ESQL_PREBUILT_RULE_RESPONSE,
        query: 'GET host IN *',
      };

      testDiffCalculationEquality({
        fieldName: 'query',
        diffableFieldName: 'esql_query',
        baseRule: BASE_PREBUILT_RULE_RESPONSE,
        modifiedRule: MODIFIED_PREBUILT_RULE_RESPONSE,
      });
    });

    it('"alert_suppression" field', () => {
      const BASE_PREBUILT_RULE_RESPONSE = {
        ...ESQL_PREBUILT_RULE_RESPONSE,
        alert_suppression: undefined,
      };
      const MODIFIED_PREBUILT_RULE_RESPONSE = {
        ...ESQL_PREBUILT_RULE_RESPONSE,
        alert_suppression: {
          group_by: ['host.name'],
          duration: { value: 5, unit: AlertSuppressionDurationUnitEnum.m },
          missing_fields_strategy: AlertSuppressionMissingFieldsStrategyEnum.suppress,
        },
      };

      testDiffCalculationEquality({
        fieldName: 'alert_suppression',
        diffableFieldName: 'alert_suppression',
        baseRule: BASE_PREBUILT_RULE_RESPONSE,
        modifiedRule: MODIFIED_PREBUILT_RULE_RESPONSE,
      });
    });
  });

  describe('threat match rule fields', () => {
    it('"query" field', () => {
      const BASE_PREBUILT_RULE_RESPONSE = {
        ...THREAT_MATCH_PREBUILT_RULE_RESPONSE,
        query: 'event.code: "test"',
      };
      const MODIFIED_PREBUILT_RULE_RESPONSE = {
        ...THREAT_MATCH_PREBUILT_RULE_RESPONSE,
        query: 'event.code: "updated test"',
      };

      testDiffCalculationEquality({
        fieldName: 'query',
        diffableFieldName: 'kql_query',
        baseRule: BASE_PREBUILT_RULE_RESPONSE,
        modifiedRule: MODIFIED_PREBUILT_RULE_RESPONSE,
      });
    });

    it('"language" field', () => {
      const BASE_PREBUILT_RULE_RESPONSE = {
        ...THREAT_MATCH_PREBUILT_RULE_RESPONSE,
        language: 'lucene' as const,
      } as RuleResponse;

      const MODIFIED_PREBUILT_RULE_RESPONSE: RuleResponse = {
        ...THREAT_MATCH_PREBUILT_RULE_RESPONSE,
        language: 'kuery' as const,
      } as RuleResponse;

      testDiffCalculationEquality({
        fieldName: 'language',
        diffableFieldName: 'kql_query',
        baseRule: BASE_PREBUILT_RULE_RESPONSE,
        modifiedRule: MODIFIED_PREBUILT_RULE_RESPONSE,
      });
    });

    it('"filters" field', () => {
      const BASE_PREBUILT_RULE_RESPONSE = {
        ...THREAT_MATCH_PREBUILT_RULE_RESPONSE,
        filters: [],
      };
      const MODIFIED_PREBUILT_RULE_RESPONSE = {
        ...THREAT_MATCH_PREBUILT_RULE_RESPONSE,
        filters: [
          {
            meta: {
              negate: false,
              disabled: false,
              type: 'phrase',
              key: 'test',
              params: {
                query: 'value',
              },
            },
            query: {
              term: {
                field: 'value',
              },
            },
          },
        ],
      };

      testDiffCalculationEquality({
        fieldName: 'filters',
        diffableFieldName: 'kql_query',
        baseRule: BASE_PREBUILT_RULE_RESPONSE,
        modifiedRule: MODIFIED_PREBUILT_RULE_RESPONSE,
      });
    });

    it('"threat_query" field', () => {
      const BASE_PREBUILT_RULE_RESPONSE = {
        ...THREAT_MATCH_PREBUILT_RULE_RESPONSE,
        threat_query: 'event.code: "test"',
      };
      const MODIFIED_PREBUILT_RULE_RESPONSE = {
        ...THREAT_MATCH_PREBUILT_RULE_RESPONSE,
        threat_query: 'event.code: "updated test"',
      };

      testDiffCalculationEquality({
        fieldName: 'threat_query',
        diffableFieldName: 'threat_query',
        baseRule: BASE_PREBUILT_RULE_RESPONSE,
        modifiedRule: MODIFIED_PREBUILT_RULE_RESPONSE,
      });
    });

    it('"threat_filters" field', () => {
      const BASE_PREBUILT_RULE_RESPONSE = {
        ...THREAT_MATCH_PREBUILT_RULE_RESPONSE,
        threat_filters: [
          {
            meta: {
              negate: false,
              disabled: false,
              type: 'phrase',
              key: 'test',
              params: {
                query: 'value',
              },
            },
            query: {
              term: {
                field: 'value',
              },
            },
          },
        ],
      };
      const MODIFIED_PREBUILT_RULE_RESPONSE = {
        ...THREAT_MATCH_PREBUILT_RULE_RESPONSE,
        threat_filters: [],
      };

      testDiffCalculationEquality({
        fieldName: 'threat_filters',
        diffableFieldName: 'threat_query',
        baseRule: BASE_PREBUILT_RULE_RESPONSE,
        modifiedRule: MODIFIED_PREBUILT_RULE_RESPONSE,
      });
    });

    it('"threat_language" field', () => {
      const BASE_PREBUILT_RULE_RESPONSE = {
        ...THREAT_MATCH_PREBUILT_RULE_RESPONSE,
        threat_language: 'kuery' as const,
      };
      const MODIFIED_PREBUILT_RULE_RESPONSE = {
        ...THREAT_MATCH_PREBUILT_RULE_RESPONSE,
        threat_language: 'lucene' as const,
      };

      testDiffCalculationEquality({
        fieldName: 'threat_language',
        diffableFieldName: 'threat_query',
        baseRule: BASE_PREBUILT_RULE_RESPONSE,
        modifiedRule: MODIFIED_PREBUILT_RULE_RESPONSE,
      });
    });

    it('"threat_index" field', () => {
      const BASE_PREBUILT_RULE_RESPONSE = {
        ...THREAT_MATCH_PREBUILT_RULE_RESPONSE,
        threat_index: ['test-index-1'],
      };
      const MODIFIED_PREBUILT_RULE_RESPONSE = {
        ...THREAT_MATCH_PREBUILT_RULE_RESPONSE,
        threat_index: ['test-index-2'],
      };

      testDiffCalculationEquality({
        fieldName: 'threat_index',
        diffableFieldName: 'threat_index',
        baseRule: BASE_PREBUILT_RULE_RESPONSE,
        modifiedRule: MODIFIED_PREBUILT_RULE_RESPONSE,
      });
    });

    it('"threat_indicator_path" field', () => {
      const BASE_PREBUILT_RULE_RESPONSE = {
        ...THREAT_MATCH_PREBUILT_RULE_RESPONSE,
        threat_indicator_path: 'C:over/there.exe',
      };
      const MODIFIED_PREBUILT_RULE_RESPONSE = {
        ...THREAT_MATCH_PREBUILT_RULE_RESPONSE,
        threat_indicator_path: 'C:over/here.exe',
      };

      testDiffCalculationEquality({
        fieldName: 'threat_indicator_path',
        diffableFieldName: 'threat_indicator_path',
        baseRule: BASE_PREBUILT_RULE_RESPONSE,
        modifiedRule: MODIFIED_PREBUILT_RULE_RESPONSE,
      });
    });

    it('"threat_mapping" field', () => {
      const BASE_PREBUILT_RULE_RESPONSE = {
        ...THREAT_MATCH_PREBUILT_RULE_RESPONSE,
        threat_mapping: [
          {
            entries: [
              {
                field: 'Endpoint.capabilities',
                type: 'mapping' as const,
                value: 'Target.dll.pe.description',
              },
            ],
          },
        ],
      };
      const MODIFIED_PREBUILT_RULE_RESPONSE = {
        ...THREAT_MATCH_PREBUILT_RULE_RESPONSE,
        threat_mapping: [
          {
            entries: [
              {
                field: 'Endpoint.capabilities',
                type: 'mapping' as const,
                value: 'Target.dll.pe.name',
              },
            ],
          },
        ],
      };

      testDiffCalculationEquality({
        fieldName: 'threat_mapping',
        diffableFieldName: 'threat_mapping',
        baseRule: BASE_PREBUILT_RULE_RESPONSE,
        modifiedRule: MODIFIED_PREBUILT_RULE_RESPONSE,
      });
    });

    it('"data_view_id" field', () => {
      const BASE_PREBUILT_RULE_RESPONSE = {
        ...THREAT_MATCH_PREBUILT_RULE_RESPONSE,
        data_view_id: 'test-data-view',
      };
      const MODIFIED_PREBUILT_RULE_RESPONSE = {
        ...THREAT_MATCH_PREBUILT_RULE_RESPONSE,
        data_view_id: 'updated-test-data-view',
      };

      testDiffCalculationEquality({
        fieldName: 'data_view_id',
        diffableFieldName: 'data_source',
        baseRule: BASE_PREBUILT_RULE_RESPONSE,
        modifiedRule: MODIFIED_PREBUILT_RULE_RESPONSE,
      });
    });

    it('"index" field', () => {
      const BASE_PREBUILT_RULE_RESPONSE = {
        ...THREAT_MATCH_PREBUILT_RULE_RESPONSE,
        index: ['pattern-1', 'pattern-2'],
      };
      const MODIFIED_PREBUILT_RULE_RESPONSE = {
        ...THREAT_MATCH_PREBUILT_RULE_RESPONSE,
        index: ['pattern-1', 'pattern-2', 'pattern-3'],
      };

      testDiffCalculationEquality({
        fieldName: 'index',
        diffableFieldName: 'data_source',
        baseRule: BASE_PREBUILT_RULE_RESPONSE,
        modifiedRule: MODIFIED_PREBUILT_RULE_RESPONSE,
      });
    });

    it('"alert_suppression" field', () => {
      const BASE_PREBUILT_RULE_RESPONSE = {
        ...THREAT_MATCH_PREBUILT_RULE_RESPONSE,
        alert_suppression: undefined,
      };
      const MODIFIED_PREBUILT_RULE_RESPONSE = {
        ...THREAT_MATCH_PREBUILT_RULE_RESPONSE,
        alert_suppression: {
          group_by: ['host.name'],
          duration: { value: 5, unit: AlertSuppressionDurationUnitEnum.m },
          missing_fields_strategy: AlertSuppressionMissingFieldsStrategyEnum.suppress,
        },
      };

      testDiffCalculationEquality({
        fieldName: 'alert_suppression',
        diffableFieldName: 'alert_suppression',
        baseRule: BASE_PREBUILT_RULE_RESPONSE,
        modifiedRule: MODIFIED_PREBUILT_RULE_RESPONSE,
      });
    });
  });

  describe('threshold rule fields', () => {
    it('"query" field', () => {
      const BASE_PREBUILT_RULE_RESPONSE = {
        ...THRESHOLD_PREBUILT_RULE_RESPONSE,
        query: 'event.code: "test"',
      };
      const MODIFIED_PREBUILT_RULE_RESPONSE = {
        ...THRESHOLD_PREBUILT_RULE_RESPONSE,
        query: 'event.code: "updated test"',
      };

      testDiffCalculationEquality({
        fieldName: 'query',
        diffableFieldName: 'kql_query',
        baseRule: BASE_PREBUILT_RULE_RESPONSE,
        modifiedRule: MODIFIED_PREBUILT_RULE_RESPONSE,
      });
    });

    it('"language" field', () => {
      const BASE_PREBUILT_RULE_RESPONSE = {
        ...THRESHOLD_PREBUILT_RULE_RESPONSE,
        language: 'lucene' as const,
      } as RuleResponse;

      const MODIFIED_PREBUILT_RULE_RESPONSE: RuleResponse = {
        ...THRESHOLD_PREBUILT_RULE_RESPONSE,
        language: 'kuery' as const,
      } as RuleResponse;

      testDiffCalculationEquality({
        fieldName: 'language',
        diffableFieldName: 'kql_query',
        baseRule: BASE_PREBUILT_RULE_RESPONSE,
        modifiedRule: MODIFIED_PREBUILT_RULE_RESPONSE,
      });
    });

    it('"filters" field', () => {
      const BASE_PREBUILT_RULE_RESPONSE = {
        ...THRESHOLD_PREBUILT_RULE_RESPONSE,
        filters: [],
      };
      const MODIFIED_PREBUILT_RULE_RESPONSE = {
        ...THRESHOLD_PREBUILT_RULE_RESPONSE,
        filters: [
          {
            meta: {
              negate: false,
              disabled: false,
              type: 'phrase',
              key: 'test',
              params: {
                query: 'value',
              },
            },
            query: {
              term: {
                field: 'value',
              },
            },
          },
        ],
      };

      testDiffCalculationEquality({
        fieldName: 'filters',
        diffableFieldName: 'kql_query',
        baseRule: BASE_PREBUILT_RULE_RESPONSE,
        modifiedRule: MODIFIED_PREBUILT_RULE_RESPONSE,
      });
    });

    it('"threshold" field', () => {
      const BASE_PREBUILT_RULE_RESPONSE = {
        ...THRESHOLD_PREBUILT_RULE_RESPONSE,
        threshold: {
          field: ['Responses.process.pid'],
          value: 100,
          cardinality: [{ field: 'host.id', value: 2 }],
        },
      };
      const MODIFIED_PREBUILT_RULE_RESPONSE = {
        ...THRESHOLD_PREBUILT_RULE_RESPONSE,
        threshold: {
          field: ['host.name'],
          value: 50,
          cardinality: [{ field: 'host.id', value: 2 }],
        },
      };

      testDiffCalculationEquality({
        fieldName: 'threshold',
        diffableFieldName: 'threshold',
        baseRule: BASE_PREBUILT_RULE_RESPONSE,
        modifiedRule: MODIFIED_PREBUILT_RULE_RESPONSE,
      });
    });

    it('"data_view_id" field', () => {
      const BASE_PREBUILT_RULE_RESPONSE = {
        ...THRESHOLD_PREBUILT_RULE_RESPONSE,
        data_view_id: 'test-data-view',
      };
      const MODIFIED_PREBUILT_RULE_RESPONSE = {
        ...THRESHOLD_PREBUILT_RULE_RESPONSE,
        data_view_id: 'updated-test-data-view',
      };

      testDiffCalculationEquality({
        fieldName: 'data_view_id',
        diffableFieldName: 'data_source',
        baseRule: BASE_PREBUILT_RULE_RESPONSE,
        modifiedRule: MODIFIED_PREBUILT_RULE_RESPONSE,
      });
    });

    it('"index" field', () => {
      const BASE_PREBUILT_RULE_RESPONSE = {
        ...THRESHOLD_PREBUILT_RULE_RESPONSE,
        index: ['pattern-1', 'pattern-2'],
      };
      const MODIFIED_PREBUILT_RULE_RESPONSE = {
        ...THRESHOLD_PREBUILT_RULE_RESPONSE,
        index: ['pattern-1', 'pattern-2', 'pattern-3'],
      };

      testDiffCalculationEquality({
        fieldName: 'index',
        diffableFieldName: 'data_source',
        baseRule: BASE_PREBUILT_RULE_RESPONSE,
        modifiedRule: MODIFIED_PREBUILT_RULE_RESPONSE,
      });
    });

    it('"alert_suppression" field', () => {
      const BASE_PREBUILT_RULE_RESPONSE = {
        ...THRESHOLD_PREBUILT_RULE_RESPONSE,
        alert_suppression: {
          group_by: ['host.name'],
          duration: { value: 1, unit: AlertSuppressionDurationUnitEnum.h },
          missing_fields_strategy: AlertSuppressionMissingFieldsStrategyEnum.suppress,
        },
      };
      const MODIFIED_PREBUILT_RULE_RESPONSE = {
        ...THRESHOLD_PREBUILT_RULE_RESPONSE,
        alert_suppression: {
          group_by: ['host.name'],
          duration: { value: 5, unit: AlertSuppressionDurationUnitEnum.m },
          missing_fields_strategy: AlertSuppressionMissingFieldsStrategyEnum.suppress,
        },
      };

      testDiffCalculationEquality({
        fieldName: 'alert_suppression',
        diffableFieldName: 'alert_suppression',
        baseRule: BASE_PREBUILT_RULE_RESPONSE,
        modifiedRule: MODIFIED_PREBUILT_RULE_RESPONSE,
      });
    });
  });

  describe('machine learning rule fields', () => {
    it('"machine_learning_job_id" field', () => {
      const BASE_PREBUILT_RULE_RESPONSE = {
        ...MACHINE_LEARNING_PREBUILT_RULE_RESPONSE,
        machine_learning_job_id: 'base-ml-test-id',
      };
      const MODIFIED_PREBUILT_RULE_RESPONSE = {
        ...MACHINE_LEARNING_PREBUILT_RULE_RESPONSE,
        machine_learning_job_id: 'updated-ml-test-id',
      };

      testDiffCalculationEquality({
        fieldName: 'machine_learning_job_id',
        diffableFieldName: 'machine_learning_job_id',
        baseRule: BASE_PREBUILT_RULE_RESPONSE,
        modifiedRule: MODIFIED_PREBUILT_RULE_RESPONSE,
      });
    });

    it('"anomaly_threshold" field', () => {
      const BASE_PREBUILT_RULE_RESPONSE = {
        ...MACHINE_LEARNING_PREBUILT_RULE_RESPONSE,
        anomaly_threshold: 20,
      };
      const MODIFIED_PREBUILT_RULE_RESPONSE = {
        ...MACHINE_LEARNING_PREBUILT_RULE_RESPONSE,
        anomaly_threshold: 45,
      };

      testDiffCalculationEquality({
        fieldName: 'anomaly_threshold',
        diffableFieldName: 'anomaly_threshold',
        baseRule: BASE_PREBUILT_RULE_RESPONSE,
        modifiedRule: MODIFIED_PREBUILT_RULE_RESPONSE,
      });
    });

    it('"alert_suppression" field', () => {
      const BASE_PREBUILT_RULE_RESPONSE = {
        ...MACHINE_LEARNING_PREBUILT_RULE_RESPONSE,
        alert_suppression: {
          group_by: ['host.name'],
          duration: { value: 10, unit: AlertSuppressionDurationUnitEnum.m },
          missing_fields_strategy: AlertSuppressionMissingFieldsStrategyEnum.suppress,
        },
      };
      const MODIFIED_PREBUILT_RULE_RESPONSE = {
        ...MACHINE_LEARNING_PREBUILT_RULE_RESPONSE,
        alert_suppression: {
          group_by: ['host.name'],
          duration: { value: 5, unit: AlertSuppressionDurationUnitEnum.m },
          missing_fields_strategy: AlertSuppressionMissingFieldsStrategyEnum.suppress,
        },
      };

      testDiffCalculationEquality({
        fieldName: 'alert_suppression',
        diffableFieldName: 'alert_suppression',
        baseRule: BASE_PREBUILT_RULE_RESPONSE,
        modifiedRule: MODIFIED_PREBUILT_RULE_RESPONSE,
      });
    });
  });

  describe('new terms fields', () => {
    it('"query" field', () => {
      const BASE_PREBUILT_RULE_RESPONSE = {
        ...NEW_TERMS_PREBUILT_RULE_RESPONSE,
        query: 'event.code: "test"',
      };
      const MODIFIED_PREBUILT_RULE_RESPONSE = {
        ...NEW_TERMS_PREBUILT_RULE_RESPONSE,
        query: 'event.code: "updated test"',
      };

      testDiffCalculationEquality({
        fieldName: 'query',
        diffableFieldName: 'kql_query',
        baseRule: BASE_PREBUILT_RULE_RESPONSE,
        modifiedRule: MODIFIED_PREBUILT_RULE_RESPONSE,
      });
    });

    it('"language" field', () => {
      const BASE_PREBUILT_RULE_RESPONSE = {
        ...NEW_TERMS_PREBUILT_RULE_RESPONSE,
        language: 'lucene' as const,
      } as RuleResponse;

      const MODIFIED_PREBUILT_RULE_RESPONSE: RuleResponse = {
        ...NEW_TERMS_PREBUILT_RULE_RESPONSE,
        language: 'kuery' as const,
      } as RuleResponse;

      testDiffCalculationEquality({
        fieldName: 'language',
        diffableFieldName: 'kql_query',
        baseRule: BASE_PREBUILT_RULE_RESPONSE,
        modifiedRule: MODIFIED_PREBUILT_RULE_RESPONSE,
      });
    });

    it('"filters" field', () => {
      const BASE_PREBUILT_RULE_RESPONSE = {
        ...NEW_TERMS_PREBUILT_RULE_RESPONSE,
        filters: [],
      };
      const MODIFIED_PREBUILT_RULE_RESPONSE = {
        ...NEW_TERMS_PREBUILT_RULE_RESPONSE,
        filters: [
          {
            meta: {
              negate: false,
              disabled: false,
              type: 'phrase',
              key: 'test',
              params: {
                query: 'value',
              },
            },
            query: {
              term: {
                field: 'value',
              },
            },
          },
        ],
      };

      testDiffCalculationEquality({
        fieldName: 'filters',
        diffableFieldName: 'kql_query',
        baseRule: BASE_PREBUILT_RULE_RESPONSE,
        modifiedRule: MODIFIED_PREBUILT_RULE_RESPONSE,
      });
    });

    it('"new_terms_fields" field', () => {
      const BASE_PREBUILT_RULE_RESPONSE = {
        ...NEW_TERMS_PREBUILT_RULE_RESPONSE,
        new_terms_fields: ['host.name'],
      };
      const MODIFIED_PREBUILT_RULE_RESPONSE = {
        ...NEW_TERMS_PREBUILT_RULE_RESPONSE,
        new_terms_fields: ['host.name', 'event.action'],
      };

      testDiffCalculationEquality({
        fieldName: 'new_terms_fields',
        diffableFieldName: 'new_terms_fields',
        baseRule: BASE_PREBUILT_RULE_RESPONSE,
        modifiedRule: MODIFIED_PREBUILT_RULE_RESPONSE,
      });
    });

    it('"history_window_start" field', () => {
      const BASE_PREBUILT_RULE_RESPONSE = {
        ...NEW_TERMS_PREBUILT_RULE_RESPONSE,
        history_window_start: 'now-7d',
      };
      const MODIFIED_PREBUILT_RULE_RESPONSE = {
        ...NEW_TERMS_PREBUILT_RULE_RESPONSE,
        history_window_start: 'now-21d',
      };

      testDiffCalculationEquality({
        fieldName: 'history_window_start',
        diffableFieldName: 'history_window_start',
        baseRule: BASE_PREBUILT_RULE_RESPONSE,
        modifiedRule: MODIFIED_PREBUILT_RULE_RESPONSE,
      });
    });

    it('"data_view_id" field', () => {
      const BASE_PREBUILT_RULE_RESPONSE = {
        ...NEW_TERMS_PREBUILT_RULE_RESPONSE,
        data_view_id: 'test-data-view',
      };
      const MODIFIED_PREBUILT_RULE_RESPONSE = {
        ...NEW_TERMS_PREBUILT_RULE_RESPONSE,
        data_view_id: 'updated-test-data-view',
      };

      testDiffCalculationEquality({
        fieldName: 'data_view_id',
        diffableFieldName: 'data_source',
        baseRule: BASE_PREBUILT_RULE_RESPONSE,
        modifiedRule: MODIFIED_PREBUILT_RULE_RESPONSE,
      });
    });

    it('"index" field', () => {
      const BASE_PREBUILT_RULE_RESPONSE = {
        ...NEW_TERMS_PREBUILT_RULE_RESPONSE,
        index: ['pattern-1', 'pattern-2'],
      };
      const MODIFIED_PREBUILT_RULE_RESPONSE = {
        ...NEW_TERMS_PREBUILT_RULE_RESPONSE,
        index: ['pattern-1', 'pattern-2', 'pattern-3'],
      };

      testDiffCalculationEquality({
        fieldName: 'index',
        diffableFieldName: 'data_source',
        baseRule: BASE_PREBUILT_RULE_RESPONSE,
        modifiedRule: MODIFIED_PREBUILT_RULE_RESPONSE,
      });
    });

    it('"alert_suppression" field', () => {
      const BASE_PREBUILT_RULE_RESPONSE = {
        ...NEW_TERMS_PREBUILT_RULE_RESPONSE,
        alert_suppression: {
          group_by: ['event.code'],
          duration: { value: 5, unit: AlertSuppressionDurationUnitEnum.m },
          missing_fields_strategy: AlertSuppressionMissingFieldsStrategyEnum.suppress,
        },
      };
      const MODIFIED_PREBUILT_RULE_RESPONSE = {
        ...NEW_TERMS_PREBUILT_RULE_RESPONSE,
        alert_suppression: {
          group_by: ['host.name'],
          duration: { value: 5, unit: AlertSuppressionDurationUnitEnum.m },
          missing_fields_strategy: AlertSuppressionMissingFieldsStrategyEnum.suppress,
        },
      };

      testDiffCalculationEquality({
        fieldName: 'alert_suppression',
        diffableFieldName: 'alert_suppression',
        baseRule: BASE_PREBUILT_RULE_RESPONSE,
        modifiedRule: MODIFIED_PREBUILT_RULE_RESPONSE,
      });
    });
  });

  describe('non-customizable fields', () => {
    it('"actions" field', () => {
      const BASE_PREBUILT_RULE_RESPONSE = {
        ...CUSTOM_QUERY_PREBUILT_RULE_RESPONSE,
        actions: [],
      };
      const MODIFIED_PREBUILT_RULE_RESPONSE = {
        ...CUSTOM_QUERY_PREBUILT_RULE_RESPONSE,
        actions: [
          {
            id: 'id',
            group: 'group',
            params: {},
            action_type_id: 'action_type_id',
          },
        ],
      };
      const twoWayDiff = calculateRuleFieldsDiff({
        ruleA: BASE_PREBUILT_RULE_RESPONSE,
        ruleB: MODIFIED_PREBUILT_RULE_RESPONSE,
      });
      const threeWayDiff = calculateThreeWayRuleFieldsDiff({
        base_version: MissingVersion,
        current_version: convertRuleToDiffable(BASE_PREBUILT_RULE_RESPONSE),
        target_version: convertRuleToDiffable(MODIFIED_PREBUILT_RULE_RESPONSE),
      });

      expect(twoWayDiff).not.toHaveProperty('actions');
      expect(threeWayDiff).not.toHaveProperty('actions');
    });

    it('"exceptions_list" field', () => {
      const BASE_PREBUILT_RULE_RESPONSE = {
        ...CUSTOM_QUERY_PREBUILT_RULE_RESPONSE,
        exceptions_list: [],
      };
      const MODIFIED_PREBUILT_RULE_RESPONSE = {
        ...CUSTOM_QUERY_PREBUILT_RULE_RESPONSE,
        exceptions_list: [
          {
            id: 'endpoint_list',
            list_id: 'endpoint_list',
            namespace_type: 'agnostic' as const,
            type: 'endpoint' as const,
          },
        ],
      };
      const twoWayDiff = calculateRuleFieldsDiff({
        ruleA: BASE_PREBUILT_RULE_RESPONSE,
        ruleB: MODIFIED_PREBUILT_RULE_RESPONSE,
      });
      const threeWayDiff = calculateThreeWayRuleFieldsDiff({
        base_version: MissingVersion,
        current_version: convertRuleToDiffable(BASE_PREBUILT_RULE_RESPONSE),
        target_version: convertRuleToDiffable(MODIFIED_PREBUILT_RULE_RESPONSE),
      });

      expect(twoWayDiff).not.toHaveProperty('exceptions_list');
      expect(threeWayDiff).not.toHaveProperty('exceptions_list');
    });

    it('"enabled" field', () => {
      const BASE_PREBUILT_RULE_RESPONSE = {
        ...CUSTOM_QUERY_PREBUILT_RULE_RESPONSE,
        enabled: true,
      };
      const MODIFIED_PREBUILT_RULE_RESPONSE = {
        ...CUSTOM_QUERY_PREBUILT_RULE_RESPONSE,
        enabled: false,
      };
      const twoWayDiff = calculateRuleFieldsDiff({
        ruleA: BASE_PREBUILT_RULE_RESPONSE,
        ruleB: MODIFIED_PREBUILT_RULE_RESPONSE,
      });
      const threeWayDiff = calculateThreeWayRuleFieldsDiff({
        base_version: MissingVersion,
        current_version: convertRuleToDiffable(BASE_PREBUILT_RULE_RESPONSE),
        target_version: convertRuleToDiffable(MODIFIED_PREBUILT_RULE_RESPONSE),
      });

      expect(twoWayDiff).not.toHaveProperty('enabled');
      expect(threeWayDiff).not.toHaveProperty('enabled');
    });

    it('"author" field', () => {
      const BASE_PREBUILT_RULE_RESPONSE = {
        ...CUSTOM_QUERY_PREBUILT_RULE_RESPONSE,
        author: ['base author'],
      };
      const MODIFIED_PREBUILT_RULE_RESPONSE = {
        ...CUSTOM_QUERY_PREBUILT_RULE_RESPONSE,
        author: ['new author'],
      };
      const twoWayDiff = calculateRuleFieldsDiff({
        ruleA: BASE_PREBUILT_RULE_RESPONSE,
        ruleB: MODIFIED_PREBUILT_RULE_RESPONSE,
      });
      const threeWayDiff = calculateThreeWayRuleFieldsDiff({
        base_version: MissingVersion,
        current_version: convertRuleToDiffable(BASE_PREBUILT_RULE_RESPONSE),
        target_version: convertRuleToDiffable(MODIFIED_PREBUILT_RULE_RESPONSE),
      });

      expect(twoWayDiff).not.toHaveProperty('author');
      expect(threeWayDiff).not.toHaveProperty('author');
    });

    it('"license" field', () => {
      const BASE_PREBUILT_RULE_RESPONSE = {
        ...CUSTOM_QUERY_PREBUILT_RULE_RESPONSE,
        license: 'base-license',
      };
      const MODIFIED_PREBUILT_RULE_RESPONSE = {
        ...CUSTOM_QUERY_PREBUILT_RULE_RESPONSE,
        license: 'updated-license',
      };
      const twoWayDiff = calculateRuleFieldsDiff({
        ruleA: BASE_PREBUILT_RULE_RESPONSE,
        ruleB: MODIFIED_PREBUILT_RULE_RESPONSE,
      });
      const threeWayDiff = calculateThreeWayRuleFieldsDiff({
        base_version: MissingVersion,
        current_version: convertRuleToDiffable(BASE_PREBUILT_RULE_RESPONSE),
        target_version: convertRuleToDiffable(MODIFIED_PREBUILT_RULE_RESPONSE),
      });

      expect(twoWayDiff).not.toHaveProperty('license');
      expect(threeWayDiff).not.toHaveProperty('license');
    });
  });
});
