/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectParseError, expectParseSuccess, stringifyZodError } from '@kbn/zod-helpers';
import { getCreateRulesSchemaMock } from '../../../model/rule_schema/mocks';
import { BulkCreateRulesRequestBody } from './bulk_create_rules_route.gen';

// only the basics of testing are here.
// see: rule_schemas.test.ts for the bulk of the validation tests
// this just wraps createRulesSchema in an array
describe('Bulk create rules request schema', () => {
  test('can take an empty array and validate it', () => {
    const payload: BulkCreateRulesRequestBody = [];

    const result = BulkCreateRulesRequestBody.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('made up values do not validate for a single element', () => {
    const payload: Array<{ madeUp: string }> = [{ madeUp: 'hi' }];

    const result = BulkCreateRulesRequestBody.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
      `"0.type: Invalid discriminator value. Expected 'eql' | 'query' | 'saved_query' | 'threshold' | 'threat_match' | 'machine_learning' | 'new_terms' | 'esql'"`
    );
  });

  test('single array element does validate', () => {
    const payload: BulkCreateRulesRequestBody = [getCreateRulesSchemaMock()];

    const result = BulkCreateRulesRequestBody.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('two array elements do validate', () => {
    const payload: BulkCreateRulesRequestBody = [
      getCreateRulesSchemaMock(),
      getCreateRulesSchemaMock(),
    ];

    const result = BulkCreateRulesRequestBody.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('single array element with a missing value (risk_score) will not validate', () => {
    const singleItem = getCreateRulesSchemaMock();
    // @ts-expect-error
    delete singleItem.risk_score;
    const payload: BulkCreateRulesRequestBody = [singleItem];

    const result = BulkCreateRulesRequestBody.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toMatchInlineSnapshot(`"0.risk_score: Required"`);
  });

  test('two array elements where the first is valid but the second is invalid (risk_score) will not validate', () => {
    const singleItem = getCreateRulesSchemaMock();
    const secondItem = getCreateRulesSchemaMock();
    // @ts-expect-error
    delete secondItem.risk_score;
    const payload: BulkCreateRulesRequestBody = [singleItem, secondItem];

    const result = BulkCreateRulesRequestBody.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toMatchInlineSnapshot(`"1.risk_score: Required"`);
  });

  test('two array elements where the first is invalid (risk_score) but the second is valid will not validate', () => {
    const singleItem = getCreateRulesSchemaMock();
    const secondItem = getCreateRulesSchemaMock();
    // @ts-expect-error
    delete singleItem.risk_score;
    const payload: BulkCreateRulesRequestBody = [singleItem, secondItem];

    const result = BulkCreateRulesRequestBody.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toMatchInlineSnapshot(`"0.risk_score: Required"`);
  });

  test('two array elements where both are invalid (risk_score) will not validate', () => {
    const singleItem = getCreateRulesSchemaMock();
    const secondItem = getCreateRulesSchemaMock();
    // @ts-expect-error
    delete singleItem.risk_score;
    // @ts-expect-error
    delete secondItem.risk_score;
    const payload: BulkCreateRulesRequestBody = [singleItem, secondItem];

    const result = BulkCreateRulesRequestBody.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
      `"0.risk_score: Required, 1.risk_score: Required"`
    );
  });

  test('extra keys are omitted from the payload', () => {
    const singleItem = {
      ...getCreateRulesSchemaMock(),
      madeUpValue: 'something',
    };
    const secondItem = {
      ...getCreateRulesSchemaMock(),
      madeUpValue: 'something',
    };
    const payload: BulkCreateRulesRequestBody = [singleItem, secondItem];

    const result = BulkCreateRulesRequestBody.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual([getCreateRulesSchemaMock(), getCreateRulesSchemaMock()]);
  });

  test('You cannot set the severity to a value other than low, medium, high, or critical', () => {
    const badSeverity = { ...getCreateRulesSchemaMock(), severity: 'madeup' };
    const payload = [badSeverity];

    const result = BulkCreateRulesRequestBody.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
      `"0.severity: Invalid enum value. Expected 'low' | 'medium' | 'high' | 'critical', received 'madeup'"`
    );
  });

  test('You can set "note" to a string', () => {
    const payload: BulkCreateRulesRequestBody = [
      { ...getCreateRulesSchemaMock(), note: '# test markdown' },
    ];

    const result = BulkCreateRulesRequestBody.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('You can set "note" to an empty string', () => {
    const payload: BulkCreateRulesRequestBody = [{ ...getCreateRulesSchemaMock(), note: '' }];

    const result = BulkCreateRulesRequestBody.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('You cant set "note" to anything other than string', () => {
    const payload = [
      {
        ...getCreateRulesSchemaMock(),
        note: {
          something: 'some object',
        },
      },
    ];

    const result = BulkCreateRulesRequestBody.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
      `"0.note: Expected string, received object"`
    );
  });
});
