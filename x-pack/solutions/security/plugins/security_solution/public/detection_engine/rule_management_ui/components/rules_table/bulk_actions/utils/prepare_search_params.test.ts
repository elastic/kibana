/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DryRunResult } from '../types';
import type { FilterOptions } from '../../../../../rule_management/logic/types';

import { convertRulesFilterToKQL } from '../../../../../../../common/detection_engine/rule_management/rule_filtering';

import { prepareSearchParams } from './prepare_search_params';
import { BulkActionsDryRunErrCodeEnum } from '../../../../../../../common/api/detection_engine';

jest.mock('../../../../../../../common/detection_engine/rule_management/rule_filtering', () => ({
  convertRulesFilterToKQL: jest.fn().mockReturnValue('str'),
}));

const mockConvertRulesFilterToKQL = convertRulesFilterToKQL as jest.Mock;

describe('prepareSearchParams', () => {
  test('should remove ids from selectedRuleIds if dryRunResult has failed ids', () => {
    const selectedRuleIds = ['rule:1', 'rule:2', 'rule:3'];
    const dryRunResult: DryRunResult = {
      ruleErrors: [
        {
          message: 'test failure',
          ruleIds: ['rule:2'],
        },
        {
          message: 'test failure N2',
          ruleIds: ['rule:3'],
        },
      ],
    };
    const result = prepareSearchParams({
      selectedRuleIds,
      dryRunResult,
    });

    expect(result).toEqual({ ids: ['rule:1'] });
  });

  test.each([
    [
      BulkActionsDryRunErrCodeEnum.MACHINE_LEARNING_INDEX_PATTERN,
      {
        filter: '',
        tags: [],
        showCustomRules: false,
        showElasticRules: false,
        excludeRuleTypes: ['machine_learning'],
      },
    ],
    [
      BulkActionsDryRunErrCodeEnum.MACHINE_LEARNING_AUTH,
      {
        filter: '',
        tags: [],
        showCustomRules: false,
        showElasticRules: false,
        excludeRuleTypes: ['machine_learning'],
      },
    ],
    [
      BulkActionsDryRunErrCodeEnum.ESQL_INDEX_PATTERN,
      {
        filter: '',
        tags: [],
        showCustomRules: false,
        showElasticRules: false,
        excludeRuleTypes: ['esql'],
      },
    ],
    [
      BulkActionsDryRunErrCodeEnum.IMMUTABLE,
      {
        filter: '',
        tags: [],
        showCustomRules: true,
        showElasticRules: false,
      },
    ],
    [
      BulkActionsDryRunErrCodeEnum.THRESHOLD_RULE_TYPE_IN_SUPPRESSION,
      {
        filter: '',
        tags: [],
        showCustomRules: false,
        showElasticRules: false,
        excludeRuleTypes: ['threshold'],
      },
    ],
    [
      BulkActionsDryRunErrCodeEnum.UNSUPPORTED_RULE_IN_SUPPRESSION_FOR_THRESHOLD,
      {
        filter: '',
        tags: [],
        showCustomRules: false,
        showElasticRules: false,
        includeRuleTypes: ['threshold'],
      },
    ],
    [
      undefined,
      {
        filter: '',
        tags: [],
        showCustomRules: false,
        showElasticRules: false,
      },
    ],
  ])(
    'should call convertRulesFilterToKQL with correct filter if "%s" errorCode present in dryRunResult',
    (errorCode, value) => {
      const filterOptions: FilterOptions = {
        filter: '',
        tags: [],
        showCustomRules: false,
        showElasticRules: false,
      };
      const dryRunResult: DryRunResult = {
        ruleErrors: [
          {
            message: 'test failure',
            errorCode,
            ruleIds: ['rule:2'],
          },
        ],
      };
      const result = prepareSearchParams({
        filterOptions,
        dryRunResult,
      });

      expect(mockConvertRulesFilterToKQL).toHaveBeenCalledWith(value);
      expect(result).toEqual({ query: expect.any(String) });
    }
  );

  test('should not include gapRange in the output when provided with ids', () => {
    const selectedRuleIds = ['rule:1', 'rule:2'];
    const dryRunResult: DryRunResult = {
      ruleErrors: [],
    };
    const gapRange = { start: '2025-01-01T00:00:00.000Z', end: '2025-01-02T00:00:00.000Z' };
    const result = prepareSearchParams({
      selectedRuleIds,
      dryRunResult,
      gapRange,
    });

    expect(result).toEqual({ ids: ['rule:1', 'rule:2'] });
  });

  test('should include gapRange in the query when provided with query', () => {
    const filterOptions: FilterOptions = {
      filter: '',
      tags: [],
      showCustomRules: false,
      showElasticRules: false,
    };
    const dryRunResult: DryRunResult = {
      ruleErrors: [],
    };
    const gapRange = { start: '2025-01-01T00:00:00.000Z', end: '2025-01-02T00:00:00.000Z' };
    const result = prepareSearchParams({
      filterOptions,
      dryRunResult,
      gapRange,
    });

    expect(result).toEqual({ query: expect.any(String), gapRange });
  });

  test('should include gapFillStatuses in the query when provided', () => {
    const filterOptions: FilterOptions = {
      filter: '',
      tags: [],
      showCustomRules: false,
      showElasticRules: false,
      gapFillStatuses: ['unfilled', 'filled'],
    };
    const dryRunResult: DryRunResult = {
      ruleErrors: [],
    };
    const result = prepareSearchParams({
      filterOptions,
      dryRunResult,
      gapFillStatuses: filterOptions.gapFillStatuses,
    });

    expect(result).toEqual({
      query: expect.any(String),
      gapFillStatuses: ['unfilled', 'filled'],
    });
  });

  test('should return only query when neither selectedRuleIds nor gapRange are provided', () => {
    const dryRunResult: DryRunResult = { ruleErrors: [] };

    const filterOptions: FilterOptions = {
      filter: '',
      tags: [],
      showCustomRules: false,
      showElasticRules: false,
    };

    const result = prepareSearchParams({ dryRunResult, filterOptions });

    expect(result).toEqual({ query: expect.any(String) });
  });
});
