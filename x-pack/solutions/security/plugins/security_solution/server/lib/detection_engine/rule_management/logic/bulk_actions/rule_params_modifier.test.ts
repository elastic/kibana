/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { addItemsToArray, deleteItemsFromArray, ruleParamsModifier } from './rule_params_modifier';
import { BulkActionEditTypeEnum } from '../../../../../../common/api/detection_engine/rule_management';
import type { RuleAlertType } from '../../../rule_schema';

describe('addItemsToArray', () => {
  test('should add single item to array', () => {
    expect(addItemsToArray(['a', 'b', 'c'], ['d'])).toEqual(['a', 'b', 'c', 'd']);
  });

  test('should add multiple items to array', () => {
    expect(addItemsToArray(['a', 'b', 'c'], ['d', 'e'])).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  test('should not allow to add duplicated items', () => {
    expect(addItemsToArray(['a', 'c'], ['b', 'c'])).toEqual(['a', 'c', 'b']);
  });
});

describe('deleteItemsFromArray', () => {
  test('should remove single item from array', () => {
    expect(deleteItemsFromArray(['a', 'b', 'c'], ['c'])).toEqual(['a', 'b']);
  });

  test('should remove multiple items from array', () => {
    expect(deleteItemsFromArray(['a', 'b', 'c'], ['b', 'c'])).toEqual(['a']);
  });

  test('should return array unchanged if items to remove absent in array', () => {
    expect(deleteItemsFromArray(['a', 'c'], ['x', 'z'])).toEqual(['a', 'c']);
  });
});

describe('ruleParamsModifier', () => {
  const ruleParamsMock = {
    index: ['initial-index-*'],
    version: 1,
    immutable: false,
  } as RuleAlertType['params'];

  test('should increment version if rule is custom (immutable === false)', () => {
    const { modifiedParams } = ruleParamsModifier(ruleParamsMock, [
      {
        type: BulkActionEditTypeEnum.add_index_patterns,
        value: ['my-index-*'],
      },
    ]);
    expect(modifiedParams).toHaveProperty('version', ruleParamsMock.version + 1);
  });

  test('should not increment version if rule is prebuilt (immutable === true)', () => {
    const { modifiedParams } = ruleParamsModifier({ ...ruleParamsMock, immutable: true }, [
      {
        type: BulkActionEditTypeEnum.add_index_patterns,
        value: ['my-index-*'],
      },
    ]);
    expect(modifiedParams).toHaveProperty('version', ruleParamsMock.version);
  });

  describe('index_patterns', () => {
    describe('add_index_patterns action', () => {
      test.each([
        [
          '3 existing patterns + 2 of them = 3 patterns',
          {
            existingIndexPatterns: ['index-1-*', 'index-2-*', 'index-3-*'],
            indexPatternsToAdd: ['index-2-*', 'index-3-*'],
            resultingIndexPatterns: ['index-1-*', 'index-2-*', 'index-3-*'],
            isParamsUpdateSkipped: true,
          },
        ],
        [
          '3 existing patterns + 2 other patterns(none of them) = 5 patterns',
          {
            existingIndexPatterns: ['index-1-*', 'index-2-*', 'index-3-*'],
            indexPatternsToAdd: ['index-4-*', 'index-5-*'],
            resultingIndexPatterns: [
              'index-1-*',
              'index-2-*',
              'index-3-*',
              'index-4-*',
              'index-5-*',
            ],
            isParamsUpdateSkipped: false,
          },
        ],
        [
          '3 existing patterns + 1 of them + 2 other patterns(none of them) = 5 patterns',
          {
            existingIndexPatterns: ['index-1-*', 'index-2-*', 'index-3-*'],
            indexPatternsToAdd: ['index-3-*', 'index-4-*', 'index-5-*'],
            resultingIndexPatterns: [
              'index-1-*',
              'index-2-*',
              'index-3-*',
              'index-4-*',
              'index-5-*',
            ],
            isParamsUpdateSkipped: false,
          },
        ],
        [
          '3 existing patterns + 0 patterns = 3 patterns',
          {
            existingIndexPatterns: ['index-1-*', 'index-2-*', 'index-3-*'],
            indexPatternsToAdd: [],
            resultingIndexPatterns: ['index-1-*', 'index-2-*', 'index-3-*'],
            isParamsUpdateSkipped: true,
          },
        ],
      ])(
        'should add index patterns to rule, case:"%s"',
        (
          caseName,
          {
            existingIndexPatterns,
            indexPatternsToAdd,
            resultingIndexPatterns,
            isParamsUpdateSkipped,
          }
        ) => {
          const { modifiedParams, isParamsUpdateSkipped: isUpdateSkipped } = ruleParamsModifier(
            { ...ruleParamsMock, index: existingIndexPatterns } as RuleAlertType['params'],
            [
              {
                type: BulkActionEditTypeEnum.add_index_patterns,
                value: indexPatternsToAdd,
              },
            ]
          );
          expect(modifiedParams).toHaveProperty('index', resultingIndexPatterns);
          expect(isParamsUpdateSkipped).toBe(isUpdateSkipped);
        }
      );
    });

    describe('delete_index_patterns action', () => {
      test.each([
        [
          '3 existing patterns - 2 of them = 1 pattern',
          {
            existingIndexPatterns: ['index-1-*', 'index-2-*', 'index-3-*'],
            indexPatternsToDelete: ['index-2-*', 'index-3-*'],
            resultingIndexPatterns: ['index-1-*'],
            isParamsUpdateSkipped: false,
          },
        ],
        [
          '3 existing patterns - 2 other patterns(none of them) = 3 patterns',
          {
            existingIndexPatterns: ['index-1-*', 'index-2-*', 'index-3-*'],
            indexPatternsToDelete: ['index-4-*', 'index-5-*'],
            resultingIndexPatterns: ['index-1-*', 'index-2-*', 'index-3-*'],
            isParamsUpdateSkipped: true,
          },
        ],
        [
          '3 existing patterns - 1 of them - 2 other patterns(none of them) = 2 patterns',
          {
            existingIndexPatterns: ['index-1-*', 'index-2-*', 'index-3-*'],
            indexPatternsToDelete: ['index-3-*', 'index-4-*', 'index-5-*'],
            resultingIndexPatterns: ['index-1-*', 'index-2-*'],
            isParamsUpdateSkipped: false,
          },
        ],
        [
          '3 existing patterns - 0 patterns = 3 patterns',
          {
            existingIndexPatterns: ['index-1-*', 'index-2-*', 'index-3-*'],
            indexPatternsToDelete: [],
            resultingIndexPatterns: ['index-1-*', 'index-2-*', 'index-3-*'],
            isParamsUpdateSkipped: true,
          },
        ],
      ])(
        'should delete index patterns from rule, case:"%s"',
        (
          caseName,
          {
            existingIndexPatterns,
            indexPatternsToDelete,
            resultingIndexPatterns,
            isParamsUpdateSkipped,
          }
        ) => {
          const { modifiedParams, isParamsUpdateSkipped: isUpdateSkipped } = ruleParamsModifier(
            { ...ruleParamsMock, index: existingIndexPatterns } as RuleAlertType['params'],
            [
              {
                type: BulkActionEditTypeEnum.delete_index_patterns,
                value: indexPatternsToDelete,
              },
            ]
          );
          expect(modifiedParams).toHaveProperty('index', resultingIndexPatterns);
          expect(isParamsUpdateSkipped).toBe(isUpdateSkipped);
        }
      );
    });

    describe('set_index_patterns action', () => {
      test.each([
        [
          '3 existing patterns overwritten with 2 of them = 2 existing patterns',
          {
            existingIndexPatterns: ['index-1-*', 'index-2-*', 'index-3-*'],
            indexPatternsToOverwrite: ['index-2-*', 'index-3-*'],
            resultingIndexPatterns: ['index-2-*', 'index-3-*'],
            isParamsUpdateSkipped: false,
          },
        ],
        [
          '3 existing patterns overwritten with  2 other patterns = 2 other patterns',
          {
            existingIndexPatterns: ['index-1-*', 'index-2-*', 'index-3-*'],
            indexPatternsToOverwrite: ['index-4-*', 'index-5-*'],
            resultingIndexPatterns: ['index-4-*', 'index-5-*'],
            isParamsUpdateSkipped: false,
          },
        ],
        [
          '3 existing patterns overwritten with  1 of them + 2 other patterns = 1 existing pattern + 2 other patterns',
          {
            existingIndexPatterns: ['index-1-*', 'index-2-*', 'index-3-*'],
            indexPatternsToOverwrite: ['index-3-*', 'index-4-*', 'index-5-*'],
            resultingIndexPatterns: ['index-3-*', 'index-4-*', 'index-5-*'],
            isParamsUpdateSkipped: false,
          },
        ],
      ])(
        'should overwrite index patterns in rule, case:"%s"',
        (
          caseName,
          {
            existingIndexPatterns,
            indexPatternsToOverwrite,
            resultingIndexPatterns,
            isParamsUpdateSkipped,
          }
        ) => {
          const { modifiedParams, isParamsUpdateSkipped: isUpdateSkipped } = ruleParamsModifier(
            { ...ruleParamsMock, index: existingIndexPatterns } as RuleAlertType['params'],
            [
              {
                type: BulkActionEditTypeEnum.set_index_patterns,
                value: indexPatternsToOverwrite,
              },
            ]
          );
          expect(modifiedParams).toHaveProperty('index', resultingIndexPatterns);
          expect(isParamsUpdateSkipped).toBe(isUpdateSkipped);
        }
      );
    });

    test('should return undefined index patterns on remove action if rule has dataViewId only', () => {
      const testDataViewId = 'test-data-view-id';

      const { modifiedParams, isParamsUpdateSkipped } = ruleParamsModifier(
        { dataViewId: testDataViewId } as RuleAlertType['params'],
        [
          {
            type: BulkActionEditTypeEnum.delete_index_patterns,
            value: ['index-2-*'],
          },
        ]
      );
      expect(modifiedParams).not.toHaveProperty('index');
      expect(isParamsUpdateSkipped).toBe(true);
    });

    test('should set dataViewId to undefined if overwrite_data_views=true on set_index_patterns action', () => {
      const { modifiedParams, isParamsUpdateSkipped } = ruleParamsModifier(
        { dataViewId: 'test-data-view', index: ['test-*'] } as RuleAlertType['params'],
        [
          {
            type: BulkActionEditTypeEnum.set_index_patterns,
            value: ['index'],
            overwrite_data_views: true,
          },
        ]
      );
      expect(modifiedParams).toHaveProperty('dataViewId', undefined);
      expect(isParamsUpdateSkipped).toBe(false);
    });

    test('should set dataViewId to undefined if overwrite_data_views=true on add_index_patterns action', () => {
      const { modifiedParams, isParamsUpdateSkipped } = ruleParamsModifier(
        { dataViewId: 'test-data-view', index: ['test-*'] } as RuleAlertType['params'],
        [
          {
            type: BulkActionEditTypeEnum.add_index_patterns,
            value: ['index'],
            overwrite_data_views: true,
          },
        ]
      );
      expect(modifiedParams).toHaveProperty('dataViewId', undefined);
      expect(isParamsUpdateSkipped).toBe(false);
    });

    test('should set dataViewId to undefined if overwrite_data_views=true on delete_index_patterns action', () => {
      const { modifiedParams, isParamsUpdateSkipped } = ruleParamsModifier(
        { dataViewId: 'test-data-view', index: ['test-*', 'index'] } as RuleAlertType['params'],
        [
          {
            type: BulkActionEditTypeEnum.delete_index_patterns,
            value: ['index'],
            overwrite_data_views: true,
          },
        ]
      );
      expect(modifiedParams).toHaveProperty('dataViewId', undefined);
      expect(modifiedParams).toHaveProperty('index', ['test-*']);
      expect(isParamsUpdateSkipped).toBe(false);
    });

    test('should set dataViewId to undefined and index to undefined if overwrite_data_views=true on delete_index_patterns action and rule had no index patterns to begin with', () => {
      const { modifiedParams, isParamsUpdateSkipped } = ruleParamsModifier(
        { dataViewId: 'test-data-view', index: undefined } as RuleAlertType['params'],
        [
          {
            type: BulkActionEditTypeEnum.delete_index_patterns,
            value: ['index'],
            overwrite_data_views: true,
          },
        ]
      );
      expect(modifiedParams).toHaveProperty('dataViewId', undefined);
      expect(modifiedParams).toHaveProperty('index', undefined);
      expect(isParamsUpdateSkipped).toBe(false);
    });

    test('should throw error on adding index pattern if rule is of machine learning type', () => {
      expect(() =>
        ruleParamsModifier({ type: 'machine_learning' } as RuleAlertType['params'], [
          {
            type: BulkActionEditTypeEnum.add_index_patterns,
            value: ['my-index-*'],
          },
        ])
      ).toThrow(
        "Index patterns can't be added. Machine learning rule doesn't have index patterns property"
      );
    });

    test('should throw error on deleting index pattern if rule is of machine learning type', () => {
      expect(() =>
        ruleParamsModifier({ type: 'machine_learning' } as RuleAlertType['params'], [
          {
            type: BulkActionEditTypeEnum.delete_index_patterns,
            value: ['my-index-*'],
          },
        ])
      ).toThrow(
        "Index patterns can't be deleted. Machine learning rule doesn't have index patterns property"
      );
    });

    test('should throw error on overwriting index pattern if rule is of machine learning type', () => {
      expect(() =>
        ruleParamsModifier({ type: 'machine_learning' } as RuleAlertType['params'], [
          {
            type: BulkActionEditTypeEnum.set_index_patterns,
            value: ['my-index-*'],
          },
        ])
      ).toThrow(
        "Index patterns can't be overwritten. Machine learning rule doesn't have index patterns property"
      );
    });

    test('should throw error on adding index pattern if rule is of ES|QL type', () => {
      expect(() =>
        ruleParamsModifier({ type: 'esql' } as RuleAlertType['params'], [
          {
            type: BulkActionEditTypeEnum.add_index_patterns,
            value: ['my-index-*'],
          },
        ])
      ).toThrow("Index patterns can't be added. ES|QL rule doesn't have index patterns property");
    });

    test('should throw error on deleting index pattern if rule is of ES|QL type', () => {
      expect(() =>
        ruleParamsModifier({ type: 'esql' } as RuleAlertType['params'], [
          {
            type: BulkActionEditTypeEnum.delete_index_patterns,
            value: ['my-index-*'],
          },
        ])
      ).toThrow("Index patterns can't be deleted. ES|QL rule doesn't have index patterns property");
    });

    test('should throw error on overwriting index pattern if rule is of ES|QL type', () => {
      expect(() =>
        ruleParamsModifier({ type: 'esql' } as RuleAlertType['params'], [
          {
            type: BulkActionEditTypeEnum.set_index_patterns,
            value: ['my-index-*'],
          },
        ])
      ).toThrow(
        "Index patterns can't be overwritten. ES|QL rule doesn't have index patterns property"
      );
    });
  });

  describe('investigation_fields', () => {
    describe('add_investigation_fields action', () => {
      test.each([
        [
          '3 existing investigation fields + 2 of them = 3 investigation fields',
          {
            existingInvestigationFields: { field_names: ['field-1', 'field-2', 'field-3'] },
            investigationFieldsToAdd: { field_names: ['field-2', 'field-3'] },
            resultingInvestigationFields: { field_names: ['field-1', 'field-2', 'field-3'] },
            isParamsUpdateSkipped: true,
          },
        ],
        [
          '3 existing investigation fields + 2 other investigation fields (none of them) = 5 investigation fields',
          {
            existingInvestigationFields: { field_names: ['field-1', 'field-2', 'field-3'] },
            investigationFieldsToAdd: { field_names: ['field-4', 'field-5'] },
            resultingInvestigationFields: {
              field_names: ['field-1', 'field-2', 'field-3', 'field-4', 'field-5'],
            },
            isParamsUpdateSkipped: false,
          },
        ],
        [
          '3 existing investigation fields + 1 of them + 2 other investigation fields (none of them) = 5 investigation fields',
          {
            existingInvestigationFields: { field_names: ['field-1', 'field-2', 'field-3'] },
            investigationFieldsToAdd: { field_names: ['field-3', 'field-4', 'field-5'] },
            resultingInvestigationFields: {
              field_names: ['field-1', 'field-2', 'field-3', 'field-4', 'field-5'],
            },
            isParamsUpdateSkipped: false,
          },
        ],
        [
          '3 existing investigation fields + 0 investigation fields = 3 investigation fields',
          {
            existingInvestigationFields: { field_names: ['field-1', 'field-2', 'field-3'] },
            investigationFieldsToAdd: { field_names: [] },
            resultingInvestigationFields: { field_names: ['field-1', 'field-2', 'field-3'] },
            isParamsUpdateSkipped: true,
          },
        ],
        [
          '`undefined` existing investigation fields + 1 investigation field = 1 investigation field',
          {
            existingInvestigationFields: undefined,
            investigationFieldsToAdd: { field_names: ['field-1'] },
            resultingInvestigationFields: { field_names: ['field-1'] },
            isParamsUpdateSkipped: false,
          },
        ],
        [
          '`undefined` existing investigation fields + 1 investigation field = 1 investigation field',
          {
            existingInvestigationFields: undefined,
            investigationFieldsToAdd: { field_names: ['field-1'] },
            resultingInvestigationFields: { field_names: ['field-1'] },
            isParamsUpdateSkipped: false,
          },
        ],
        [
          '3 existing `legacy` investigation fields + 2 other investigation fields (none of them) = 5 investigation fields',
          {
            existingInvestigationFields: ['field-1', 'field-2', 'field-3'],
            investigationFieldsToAdd: { field_names: ['field-4', 'field-5'] },
            resultingInvestigationFields: {
              field_names: ['field-1', 'field-2', 'field-3', 'field-4', 'field-5'],
            },
            isParamsUpdateSkipped: false,
          },
        ],
      ])(
        'should add investigation fields to rule, case:"%s"',
        (
          caseName,
          {
            existingInvestigationFields,
            investigationFieldsToAdd,
            resultingInvestigationFields,
            isParamsUpdateSkipped,
          }
        ) => {
          const { modifiedParams, isParamsUpdateSkipped: isUpdateSkipped } = ruleParamsModifier(
            {
              ...ruleParamsMock,
              investigationFields: existingInvestigationFields,
            } as RuleAlertType['params'],
            [
              {
                type: BulkActionEditTypeEnum.add_investigation_fields,
                value: investigationFieldsToAdd,
              },
            ]
          );
          expect(modifiedParams).toHaveProperty(
            'investigationFields',
            resultingInvestigationFields
          );
          expect(isParamsUpdateSkipped).toBe(isUpdateSkipped);
        }
      );
    });

    describe('delete_investigation_fields action', () => {
      test.each([
        [
          '3 existing investigation fields - 2 of them = 1 investigation field',
          {
            existingInvestigationFields: { field_names: ['field-1', 'field-2', 'field-3'] },
            investigationFieldsToDelete: { field_names: ['field-2', 'field-3'] },
            resultingInvestigationFields: { field_names: ['field-1'] },
            isParamsUpdateSkipped: false,
          },
        ],
        [
          '3 existing investigation fields - 2 other investigation fields (none of them) = 3 investigation fields',
          {
            existingInvestigationFields: { field_names: ['field-1', 'field-2', 'field-3'] },
            investigationFieldsToDelete: { field_names: ['field-4', 'field-5'] },
            resultingInvestigationFields: { field_names: ['field-1', 'field-2', 'field-3'] },
            isParamsUpdateSkipped: true,
          },
        ],
        [
          '3 existing investigation fields - 1 of them - 2 other investigation fields (none of them) = 2 investigation fields',
          {
            existingInvestigationFields: { field_names: ['field-1', 'field-2', 'field-3'] },
            investigationFieldsToDelete: { field_names: ['field-3', 'field-4', 'field-5'] },
            resultingInvestigationFields: { field_names: ['field-1', 'field-2'] },
            isParamsUpdateSkipped: false,
          },
        ],
        [
          '3 existing investigation fields - 0 investigation fields = 3 investigation fields',
          {
            existingInvestigationFields: { field_names: ['field-1', 'field-2', 'field-3'] },
            investigationFieldsToDelete: { field_names: [] },
            resultingInvestigationFields: { field_names: ['field-1', 'field-2', 'field-3'] },
            isParamsUpdateSkipped: true,
          },
        ],
        [
          '`undefined` existing investigation fields - 2 of them = `undeinfed` investigation fields',
          {
            existingInvestigationFields: undefined,
            investigationFieldsToDelete: { field_names: ['field-2', 'field-3'] },
            resultingInvestigationFields: undefined,
            isParamsUpdateSkipped: true,
          },
        ],
        [
          '3 existing `legacy` investigation fields - 2 of them = 1 investigation field',
          {
            existingInvestigationFields: ['field-1', 'field-2', 'field-3'],
            investigationFieldsToDelete: { field_names: ['field-2', 'field-3'] },
            resultingInvestigationFields: { field_names: ['field-1'] },
            isParamsUpdateSkipped: false,
          },
        ],
      ])(
        'should delete investigation fields from rule, case:"%s"',
        (
          caseName,
          {
            existingInvestigationFields,
            investigationFieldsToDelete,
            resultingInvestigationFields,
            isParamsUpdateSkipped,
          }
        ) => {
          const { modifiedParams, isParamsUpdateSkipped: isUpdateSkipped } = ruleParamsModifier(
            {
              ...ruleParamsMock,
              investigationFields: existingInvestigationFields,
            } as RuleAlertType['params'],
            [
              {
                type: BulkActionEditTypeEnum.delete_investigation_fields,
                value: investigationFieldsToDelete,
              },
            ]
          );
          expect(modifiedParams).toHaveProperty(
            'investigationFields',
            resultingInvestigationFields
          );
          expect(isParamsUpdateSkipped).toBe(isUpdateSkipped);
        }
      );
    });

    describe('set_investigation_fields action', () => {
      test.each([
        [
          '3 existing investigation fields overwritten with 2 of them = 2 existing investigation fields',
          {
            existingInvestigationFields: { field_names: ['field-1', 'field-2', 'field-3'] },
            investigationFieldsToOverwrite: { field_names: ['field-2', 'field-3'] },
            resultingInvestigationFields: { field_names: ['field-2', 'field-3'] },
            isParamsUpdateSkipped: false,
          },
        ],
        [
          '3 existing investigation fields overwritten with 2 other investigation fields = 2 other investigation fields',
          {
            existingInvestigationFields: { field_names: ['field-1', 'field-2', 'field-3'] },
            investigationFieldsToOverwrite: { field_names: ['field-4', 'field-5'] },
            resultingInvestigationFields: { field_names: ['field-4', 'field-5'] },
            isParamsUpdateSkipped: false,
          },
        ],
        [
          '3 existing investigation fields overwritten with 1 of them + 2 other investigation fields = 1 existing investigation field + 2 other investigation fields',
          {
            existingInvestigationFields: { field_names: ['field-1', 'field-2', 'field-3'] },
            investigationFieldsToOverwrite: { field_names: ['field-3', 'field-4', 'field-5'] },
            resultingInvestigationFields: { field_names: ['field-3', 'field-4', 'field-5'] },
            isParamsUpdateSkipped: false,
          },
        ],
        [
          '`undefined` existing investigation fields overwritten with 2 of them = 2 existing investigation fields',
          {
            existingInvestigationFields: undefined,
            investigationFieldsToOverwrite: { field_names: ['field-2', 'field-3'] },
            resultingInvestigationFields: { field_names: ['field-2', 'field-3'] },
            isParamsUpdateSkipped: false,
          },
        ],
        [
          '3 existing `legacy` investigation fields overwritten with 1 of them + 2 other investigation fields = 1 existing investigation field + 2 other investigation fields',
          {
            existingInvestigationFields: ['field-1', 'field-2', 'field-3'],
            investigationFieldsToOverwrite: { field_names: ['field-3', 'field-4', 'field-5'] },
            resultingInvestigationFields: { field_names: ['field-3', 'field-4', 'field-5'] },
            isParamsUpdateSkipped: false,
          },
        ],
      ])(
        'should overwrite investigation fields in rule, case:"%s"',
        (
          caseName,
          {
            existingInvestigationFields,
            investigationFieldsToOverwrite,
            resultingInvestigationFields,
            isParamsUpdateSkipped,
          }
        ) => {
          const { modifiedParams, isParamsUpdateSkipped: isUpdateSkipped } = ruleParamsModifier(
            {
              ...ruleParamsMock,
              investigationFields: existingInvestigationFields,
            } as RuleAlertType['params'],
            [
              {
                type: BulkActionEditTypeEnum.set_investigation_fields,
                value: investigationFieldsToOverwrite,
              },
            ]
          );
          expect(modifiedParams).toHaveProperty(
            'investigationFields',
            resultingInvestigationFields
          );
          expect(isParamsUpdateSkipped).toBe(isUpdateSkipped);
        }
      );
    });
  });

  describe('alert_suppression', () => {
    describe('add_alert_suppression action', () => {
      test.each([
        [
          '3 existing groupBy fields + 2 of them = 3 groupBy fields + skip update',
          {
            existingAlertSuppression: {
              groupBy: ['field-1', 'field-2', 'field-3'],
            },
            alertSuppressionToAdd: { group_by: ['field-2', 'field-3'] },
            resultingAlertSuppression: {
              groupBy: ['field-1', 'field-2', 'field-3'],
            },
            isParamsUpdateSkipped: true,
            ruleType: 'query',
          },
        ],
        [
          '3 existing groupBy fields + 2 other groupBy fields (none of them) = 5 groupBy fields',
          {
            existingAlertSuppression: { groupBy: ['field-1', 'field-2', 'field-3'] },
            alertSuppressionToAdd: { group_by: ['field-4', 'field-5'] },
            resultingAlertSuppression: {
              groupBy: ['field-1', 'field-2', 'field-3', 'field-4', 'field-5'],
            },
            isParamsUpdateSkipped: false,
            ruleType: 'query',
          },
        ],
        [
          '`undefined` existing alert suppression + 2 groupBy fields = 2 groupBy fields',
          {
            existingAlertSuppression: undefined,
            alertSuppressionToAdd: { group_by: ['field-1', 'field-2'] },
            resultingAlertSuppression: { groupBy: ['field-1', 'field-2'] },
            isParamsUpdateSkipped: false,
            ruleType: 'query',
          },
        ],
        [
          'threshold rule with matching duration = skip update',
          {
            existingAlertSuppression: { duration: { value: 5, unit: 'm' } },
            alertSuppressionToAdd: {
              group_by: [],
              suppression_config: { duration: { value: 5, unit: 'm' as const } },
            },
            resultingAlertSuppression: { duration: { value: 5, unit: 'm' } },
            isParamsUpdateSkipped: true,
            ruleType: 'threshold',
          },
        ],
        [
          'threshold rule with non-matching duration = update',
          {
            existingAlertSuppression: { duration: { value: 5, unit: 'm' } },
            alertSuppressionToAdd: {
              group_by: [],
              suppression_config: { duration: { value: 10, unit: 'm' as const } },
            },
            resultingAlertSuppression: { duration: { value: 10, unit: 'm' } },
            isParamsUpdateSkipped: false,
            ruleType: 'threshold',
          },
        ],
        [
          'skips update to threshold rule when duration is not provided',
          {
            existingAlertSuppression: {
              duration: { value: 5, unit: 'h' },
            },
            alertSuppressionToAdd: {
              group_by: ['field-1', 'field-2', 'field-3'],
              suppression_config: {
                missing_fields_strategy: 'suppress' as const,
              },
            },
            resultingAlertSuppression: {
              duration: { value: 5, unit: 'h' },
            },
            isParamsUpdateSkipped: true,
            ruleType: 'threshold',
          },
        ],
        [
          'updates threshold rule when groupBy is empty but duration is provided and alertSuppression is not defined',
          {
            existingAlertSuppression: undefined,
            alertSuppressionToAdd: {
              group_by: [],
              suppression_config: {
                duration: { value: 5, unit: 'h' as const },
              },
            },
            resultingAlertSuppression: {
              duration: { value: 5, unit: 'h' },
            },
            isParamsUpdateSkipped: false,
            ruleType: 'threshold',
          },
        ],
        [
          'existing missing_fields_strategy matches = skip update',
          {
            existingAlertSuppression: {
              groupBy: ['field-1', 'field-2', 'field-3'],
              duration: { value: 5, unit: 'h' },
              missingFieldsStrategy: 'suppress',
            },
            alertSuppressionToAdd: {
              group_by: [],
              suppression_config: {
                missing_fields_strategy: 'suppress' as const,
                duration: { value: 5, unit: 'h' as const },
              },
            },
            resultingAlertSuppression: {
              groupBy: ['field-1', 'field-2', 'field-3'],
              duration: { value: 5, unit: 'h' },
              missingFieldsStrategy: 'suppress',
            },
            isParamsUpdateSkipped: true,
            ruleType: 'query',
          },
        ],
        [
          'existing missing_fields_strategy does not match = update',
          {
            existingAlertSuppression: {
              groupBy: ['field-1', 'field-2', 'field-3'],
              duration: { value: 5, unit: 'h' },
              missingFieldsStrategy: 'doNotSuppress',
            },
            alertSuppressionToAdd: {
              group_by: [],
              suppression_config: {
                duration: { value: 5, unit: 'h' as const },
                missing_fields_strategy: 'suppress' as const,
              },
            },
            resultingAlertSuppression: {
              groupBy: ['field-1', 'field-2', 'field-3'],
              duration: { value: 5, unit: 'h' },
              missingFieldsStrategy: 'suppress',
            },
            isParamsUpdateSkipped: false,
            ruleType: 'query',
          },
        ],
        [
          'does not update duration when suppression_config is undefined',
          {
            existingAlertSuppression: {
              groupBy: ['field-1'],
              duration: { value: 5, unit: 'h' },
            },
            alertSuppressionToAdd: { group_by: ['field-2'] },
            resultingAlertSuppression: {
              groupBy: ['field-1', 'field-2'],
              duration: { value: 5, unit: 'h' },
            },
            isParamsUpdateSkipped: false,
            ruleType: 'query',
          },
        ],
        [
          'does not update missing_fields_strategy when suppression_config is undefined',
          {
            existingAlertSuppression: {
              groupBy: ['field-1'],
              missingFieldsStrategy: 'doNotSuppress',
            },
            alertSuppressionToAdd: { group_by: ['field-2'] },
            resultingAlertSuppression: {
              groupBy: ['field-1', 'field-2'],
              missingFieldsStrategy: 'doNotSuppress',
            },
            isParamsUpdateSkipped: false,
            ruleType: 'query',
          },
        ],
        [
          'does not update suppression config when action group_by is empty and alert suppression is not defined',
          {
            existingAlertSuppression: undefined,
            alertSuppressionToAdd: {
              group_by: [],
              suppression_config: {
                duration: { value: 5, unit: 'h' as const },
                missing_fields_strategy: 'suppress' as const,
              },
            },
            resultingAlertSuppression: undefined,
            isParamsUpdateSkipped: true,
            ruleType: 'query',
          },
        ],
      ])(
        'should add alert suppression with missing_fields_strategy, case:"%s"',
        (
          caseName,
          {
            existingAlertSuppression,
            alertSuppressionToAdd,
            resultingAlertSuppression,
            isParamsUpdateSkipped,
            ruleType,
          }
        ) => {
          const { modifiedParams, isParamsUpdateSkipped: isUpdateSkipped } = ruleParamsModifier(
            {
              ...ruleParamsMock,
              alertSuppression: existingAlertSuppression,
              ...(ruleType ? { type: ruleType } : {}),
            } as RuleAlertType['params'],
            [
              {
                type: BulkActionEditTypeEnum.add_alert_suppression,
                value: alertSuppressionToAdd,
              },
            ]
          );
          expect(modifiedParams).toHaveProperty('alertSuppression', resultingAlertSuppression);
          expect(isParamsUpdateSkipped).toBe(isUpdateSkipped);
        }
      );
    });

    describe('delete_alert_suppression action', () => {
      test.each([
        [
          '3 existing groupBy fields - 2 of them = 1 groupBy field',
          {
            existingAlertSuppression: { groupBy: ['field-1', 'field-2', 'field-3'] },
            alertSuppressionToDelete: { group_by: ['field-2', 'field-3'] },
            resultingAlertSuppression: { groupBy: ['field-1'] },
            isParamsUpdateSkipped: false,
            ruleType: 'query',
          },
        ],
        [
          '3 existing groupBy fields - 2 other groupBy fields (none of them) = 3 groupBy fields',
          {
            existingAlertSuppression: { groupBy: ['field-1', 'field-2', 'field-3'] },
            alertSuppressionToDelete: { group_by: ['field-4', 'field-5'] },
            resultingAlertSuppression: { groupBy: ['field-1', 'field-2', 'field-3'] },
            isParamsUpdateSkipped: true,
            ruleType: 'query',
          },
        ],
        [
          '`undefined` existing alert suppression - 2 groupBy fields = `undefined` alert suppression',
          {
            existingAlertSuppression: undefined,
            alertSuppressionToDelete: { group_by: ['field-1', 'field-2'] },
            resultingAlertSuppression: undefined,
            isParamsUpdateSkipped: true,
            ruleType: 'query',
          },
        ],
        [
          'removes alert suppression if all groupBy fields are removed',
          {
            existingAlertSuppression: {
              groupBy: ['field-1', 'field-2'],
              duration: { value: 5, unit: 'h' },
              missingFieldsStrategy: 'suppress',
            },
            alertSuppressionToDelete: { group_by: ['field-1', 'field-2'] },
            resultingAlertSuppression: undefined,
            isParamsUpdateSkipped: false,
            ruleType: 'query',
          },
        ],
        [
          'threshold rule with matching duration = skip update',
          {
            existingAlertSuppression: { duration: { value: 5, unit: 'm' } },
            alertSuppressionToDelete: {
              group_by: [],
              suppression_config: { duration: { value: 5, unit: 'm' as const } },
            },
            resultingAlertSuppression: { duration: { value: 5, unit: 'm' } },
            isParamsUpdateSkipped: true,
            ruleType: 'threshold',
          },
        ],
        [
          'threshold rule with non-matching duration = update',
          {
            existingAlertSuppression: { duration: { value: 5, unit: 'm' } },
            alertSuppressionToDelete: {
              group_by: [],
              suppression_config: { duration: { value: 10, unit: 'm' as const } },
            },
            resultingAlertSuppression: { duration: { value: 10, unit: 'm' } },
            isParamsUpdateSkipped: false,
            ruleType: 'threshold',
          },
        ],
        [
          'skips update to threshold rule when duration is not provided',
          {
            existingAlertSuppression: {
              duration: { value: 5, unit: 'h' },
            },
            alertSuppressionToDelete: {
              group_by: ['field-1', 'field-2', 'field-3'],
              suppression_config: {
                missing_fields_strategy: 'suppress' as const,
              },
            },
            resultingAlertSuppression: {
              duration: { value: 5, unit: 'h' },
            },
            isParamsUpdateSkipped: true,
            ruleType: 'threshold',
          },
        ],
        [
          'updates threshold rule when groupBy is empty but duration is provided and alertSuppression is not defined',
          {
            existingAlertSuppression: undefined,
            alertSuppressionToDelete: {
              group_by: [],
              suppression_config: {
                duration: { value: 5, unit: 'h' as const },
              },
            },
            resultingAlertSuppression: {
              duration: { value: 5, unit: 'h' },
            },
            isParamsUpdateSkipped: false,
            ruleType: 'threshold',
          },
        ],
        [
          'existing missing_fields_strategy matches = skip update',
          {
            existingAlertSuppression: {
              groupBy: ['field-1', 'field-2', 'field-3'],
              duration: { value: 5, unit: 'h' },
              missingFieldsStrategy: 'suppress',
            },
            alertSuppressionToDelete: {
              group_by: [],
              suppression_config: {
                missing_fields_strategy: 'suppress' as const,
                duration: { value: 5, unit: 'h' as const },
              },
            },
            resultingAlertSuppression: {
              groupBy: ['field-1', 'field-2', 'field-3'],
              duration: { value: 5, unit: 'h' },
              missingFieldsStrategy: 'suppress',
            },
            isParamsUpdateSkipped: true,
            ruleType: 'query',
          },
        ],
        [
          'existing missing_fields_strategy does not match = update',
          {
            existingAlertSuppression: {
              groupBy: ['field-1', 'field-2', 'field-3'],
              duration: { value: 5, unit: 'h' },
              missingFieldsStrategy: 'doNotSuppress',
            },
            alertSuppressionToDelete: {
              group_by: [],
              suppression_config: {
                duration: { value: 5, unit: 'h' as const },
                missing_fields_strategy: 'suppress' as const,
              },
            },
            resultingAlertSuppression: {
              groupBy: ['field-1', 'field-2', 'field-3'],
              duration: { value: 5, unit: 'h' },
              missingFieldsStrategy: 'suppress',
            },
            isParamsUpdateSkipped: false,
            ruleType: 'query',
          },
        ],
        [
          'does not update duration when suppression_config is undefined',
          {
            existingAlertSuppression: {
              groupBy: ['field-1'],
              duration: { value: 5, unit: 'h' },
            },
            alertSuppressionToDelete: { group_by: ['field-2'] },
            resultingAlertSuppression: {
              groupBy: ['field-1'],
              duration: { value: 5, unit: 'h' },
            },
            isParamsUpdateSkipped: false,
            ruleType: 'query',
          },
        ],
        [
          'does not update missing_fields_strategy when suppression_config is undefined',
          {
            existingAlertSuppression: {
              groupBy: ['field-1'],
              missingFieldsStrategy: 'doNotSuppress',
            },
            alertSuppressionToDelete: { group_by: ['field-2'] },
            resultingAlertSuppression: {
              groupBy: ['field-1'],
              missingFieldsStrategy: 'doNotSuppress',
            },
            isParamsUpdateSkipped: false,
            ruleType: 'query',
          },
        ],
        [
          'does not update suppression config when action group_by is empty and alert suppression is not defined',
          {
            existingAlertSuppression: undefined,
            alertSuppressionToDelete: {
              group_by: [],
              suppression_config: {
                duration: { value: 5, unit: 'h' as const },
                missing_fields_strategy: 'suppress' as const,
              },
            },
            resultingAlertSuppression: undefined,
            isParamsUpdateSkipped: true,
            ruleType: 'query',
          },
        ],
      ])(
        'should delete alert suppression, case:"%s"',
        (
          caseName,
          {
            existingAlertSuppression,
            alertSuppressionToDelete,
            resultingAlertSuppression,
            isParamsUpdateSkipped,
            ruleType,
          }
        ) => {
          const { modifiedParams, isParamsUpdateSkipped: isUpdateSkipped } = ruleParamsModifier(
            {
              ...ruleParamsMock,
              alertSuppression: existingAlertSuppression,
              ...(ruleType ? { type: ruleType } : {}),
            } as RuleAlertType['params'],
            [
              {
                type: BulkActionEditTypeEnum.delete_alert_suppression,
                value: alertSuppressionToDelete,
              },
            ]
          );
          expect(modifiedParams).toHaveProperty('alertSuppression', resultingAlertSuppression);
          expect(isParamsUpdateSkipped).toBe(isUpdateSkipped);
        }
      );
    });

    describe('set_alert_suppression action', () => {
      test.each([
        [
          '3 existing groupBy fields overwritten with 2 of them = 2 groupBy fields',
          {
            existingAlertSuppression: { groupBy: ['field-1', 'field-2', 'field-3'] },
            alertSuppressionToSet: { group_by: ['field-2', 'field-3'] },
            resultingAlertSuppression: { groupBy: ['field-2', 'field-3'] },
            isParamsUpdateSkipped: false,
            ruleType: 'query',
          },
        ],
        [
          '`undefined` existing alert suppression overwritten with 2 groupBy fields = 2 groupBy fields',
          {
            existingAlertSuppression: undefined,
            alertSuppressionToSet: { group_by: ['field-1', 'field-2'] },
            resultingAlertSuppression: { groupBy: ['field-1', 'field-2'] },
            isParamsUpdateSkipped: false,
            ruleType: 'query',
          },
        ],
        [
          'removes alert suppression if all groupBy fields are set to empty',
          {
            existingAlertSuppression: {
              groupBy: ['field-1', 'field-2'],
              duration: { value: 5, unit: 'h' },
              missingFieldsStrategy: 'suppress',
            },
            alertSuppressionToSet: { group_by: [] },
            resultingAlertSuppression: undefined,
            isParamsUpdateSkipped: false,
            ruleType: 'query',
          },
        ],
        [
          'threshold rule with matching duration = skip update',
          {
            existingAlertSuppression: { duration: { value: 5, unit: 'm' } },
            alertSuppressionToSet: {
              group_by: [],
              suppression_config: { duration: { value: 5, unit: 'm' as const } },
            },
            resultingAlertSuppression: { duration: { value: 5, unit: 'm' } },
            isParamsUpdateSkipped: true,
            ruleType: 'threshold',
          },
        ],
        [
          'threshold rule with non-matching duration = update',
          {
            existingAlertSuppression: { duration: { value: 5, unit: 'm' } },
            alertSuppressionToSet: {
              group_by: [],
              suppression_config: { duration: { value: 10, unit: 'm' as const } },
            },
            resultingAlertSuppression: { duration: { value: 10, unit: 'm' } },
            isParamsUpdateSkipped: false,
            ruleType: 'threshold',
          },
        ],
        [
          'skips update to threshold rule when duration is not provided',
          {
            existingAlertSuppression: {
              duration: { value: 5, unit: 'h' },
            },
            alertSuppressionToSet: {
              group_by: ['field-1', 'field-2', 'field-3'],
              suppression_config: {
                missing_fields_strategy: 'suppress' as const,
              },
            },
            resultingAlertSuppression: {
              duration: { value: 5, unit: 'h' },
            },
            isParamsUpdateSkipped: true,
            ruleType: 'threshold',
          },
        ],
        [
          'updates threshold rule when groupBy is empty but duration is provided and alertSuppression is not defined',
          {
            existingAlertSuppression: undefined,
            alertSuppressionToSet: {
              group_by: [],
              suppression_config: {
                duration: { value: 5, unit: 'h' as const },
              },
            },
            resultingAlertSuppression: {
              duration: { value: 5, unit: 'h' },
            },
            isParamsUpdateSkipped: false,
            ruleType: 'threshold',
          },
        ],
        // [
        //   'existing missing_fields_strategy matches = skip update',
        //   {
        //     existingAlertSuppression: {
        //       groupBy: ['field-1', 'field-2', 'field-3'],
        //       duration: { value: 5, unit: 'h' },
        //       missingFieldsStrategy: 'suppress',
        //     },
        //     alertSuppressionToSet: {
        //       group_by: ['field-1', 'field-2', 'field-3'],
        //       suppression_config: {
        //         missing_fields_strategy: 'suppress' as const,
        //         duration: { value: 5, unit: 'h' as const },
        //       },
        //     },
        //     resultingAlertSuppression: {
        //       groupBy: ['field-1', 'field-2', 'field-3'],
        //       duration: { value: 5, unit: 'h' },
        //       missingFieldsStrategy: 'suppress',
        //     },
        //     isParamsUpdateSkipped: true,
        //     ruleType: 'query',
        //   },
        // ],
        [
          'existing missing_fields_strategy does not match = update',
          {
            existingAlertSuppression: {
              groupBy: ['field-1', 'field-2', 'field-3'],
              duration: { value: 5, unit: 'h' },
              missingFieldsStrategy: 'doNotSuppress',
            },
            alertSuppressionToSet: {
              group_by: ['field-1', 'field-2', 'field-3'],
              suppression_config: {
                duration: { value: 5, unit: 'h' as const },
                missing_fields_strategy: 'suppress' as const,
              },
            },
            resultingAlertSuppression: {
              groupBy: ['field-1', 'field-2', 'field-3'],
              duration: { value: 5, unit: 'h' },
              missingFieldsStrategy: 'suppress',
            },
            isParamsUpdateSkipped: false,
            ruleType: 'query',
          },
        ],
        [
          'does not update duration when suppression_config is undefined',
          {
            existingAlertSuppression: {
              groupBy: ['field-1'],
              duration: { value: 5, unit: 'h' },
            },
            alertSuppressionToSet: { group_by: ['field-2'] },
            resultingAlertSuppression: {
              groupBy: ['field-2'],
              duration: { value: 5, unit: 'h' },
            },
            isParamsUpdateSkipped: false,
            ruleType: 'query',
          },
        ],
        [
          'does not update missing_fields_strategy when suppression_config is undefined',
          {
            existingAlertSuppression: {
              groupBy: ['field-1'],
              missingFieldsStrategy: 'doNotSuppress',
            },
            alertSuppressionToSet: { group_by: ['field-2'] },
            resultingAlertSuppression: {
              groupBy: ['field-2'],
              missingFieldsStrategy: 'doNotSuppress',
            },
            isParamsUpdateSkipped: false,
            ruleType: 'query',
          },
        ],
      ])(
        'should set alert suppression, case:"%s"',
        (
          caseName,
          {
            existingAlertSuppression,
            alertSuppressionToSet,
            resultingAlertSuppression,
            isParamsUpdateSkipped,
            ruleType,
          }
        ) => {
          const { modifiedParams, isParamsUpdateSkipped: isUpdateSkipped } = ruleParamsModifier(
            {
              ...ruleParamsMock,
              alertSuppression: existingAlertSuppression,
              ...(ruleType ? { type: ruleType } : {}),
            } as RuleAlertType['params'],
            [
              {
                type: BulkActionEditTypeEnum.set_alert_suppression,
                value: alertSuppressionToSet,
              },
            ]
          );
          expect(modifiedParams).toHaveProperty('alertSuppression', resultingAlertSuppression);
          expect(isParamsUpdateSkipped).toBe(isUpdateSkipped);
        }
      );
    });
  });
  describe('timeline', () => {
    test('should set timeline', () => {
      const { modifiedParams, isParamsUpdateSkipped } = ruleParamsModifier(ruleParamsMock, [
        {
          type: BulkActionEditTypeEnum.set_timeline,
          value: {
            timeline_id: '91832785-286d-4ebe-b884-1a208d111a70',
            timeline_title: 'Test timeline',
          },
        },
      ]);

      expect(modifiedParams.timelineId).toBe('91832785-286d-4ebe-b884-1a208d111a70');
      expect(modifiedParams.timelineTitle).toBe('Test timeline');
      expect(isParamsUpdateSkipped).toBe(false);
    });
  });

  describe('schedule', () => {
    test('should set schedule', () => {
      const INTERVAL_IN_MINUTES = 5;
      const LOOKBACK_IN_MINUTES = 1;
      const FROM_IN_SECONDS = (INTERVAL_IN_MINUTES + LOOKBACK_IN_MINUTES) * 60;
      const { modifiedParams, isParamsUpdateSkipped } = ruleParamsModifier(ruleParamsMock, [
        {
          type: BulkActionEditTypeEnum.set_schedule,
          value: {
            interval: `${INTERVAL_IN_MINUTES}m`,
            lookback: `${LOOKBACK_IN_MINUTES}m`,
          },
        },
      ]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((modifiedParams as any).interval).toBeUndefined();
      expect(modifiedParams.meta).toStrictEqual({
        from: '1m',
      });
      expect(modifiedParams.from).toBe(`now-${FROM_IN_SECONDS}s`);
      expect(isParamsUpdateSkipped).toBe(false);
    });
  });
});
