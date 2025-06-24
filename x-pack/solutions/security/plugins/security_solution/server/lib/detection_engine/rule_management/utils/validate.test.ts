/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformValidateBulkError } from './validate';
import type { BulkError } from '../../routes/utils';
import { getRuleMock } from '../../routes/__mocks__/request_responses';
import { getQueryRuleParams } from '../../rule_schema/mocks';
import { getOutputRuleAlertForRest } from '../../routes/__mocks__/utils';

describe('validate', () => {
  describe('transformValidateBulkError', () => {
    test('it should do a validation correctly of a rule id', () => {
      const ruleAlert = getRuleMock(getQueryRuleParams());
      const validatedOrError = transformValidateBulkError('rule-1', ruleAlert);
      expect(validatedOrError).toEqual(getOutputRuleAlertForRest());
    });

    test('it should do an in-validation correctly of a rule id', () => {
      const ruleAlert = getRuleMock(getQueryRuleParams());
      // @ts-expect-error
      delete ruleAlert.name;
      const validatedOrError = transformValidateBulkError('rule-1', ruleAlert);
      const expected: BulkError = {
        error: {
          message: 'name: Required',
          status_code: 500,
        },
        rule_id: 'rule-1',
      };
      expect(validatedOrError).toEqual(expected);
    });

    test('it should return error object if "alert" is not expected alert type', () => {
      const ruleAlert = getRuleMock(getQueryRuleParams());
      // @ts-expect-error
      delete ruleAlert.alertTypeId;
      const validatedOrError = transformValidateBulkError('rule-1', ruleAlert);
      const expected: BulkError = {
        error: {
          message: 'Internal error transforming',
          status_code: 500,
        },
        rule_id: 'rule-1',
      };
      expect(validatedOrError).toEqual(expected);
    });
  });
});
