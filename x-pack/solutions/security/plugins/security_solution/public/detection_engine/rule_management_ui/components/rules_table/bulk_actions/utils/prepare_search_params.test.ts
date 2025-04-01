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
});
