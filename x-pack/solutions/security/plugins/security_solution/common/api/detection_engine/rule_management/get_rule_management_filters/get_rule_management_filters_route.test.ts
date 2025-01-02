/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { left } from 'fp-ts/lib/Either';
import { exactCheck, foldLeftRight, getPaths } from '@kbn/securitysolution-io-ts-utils';

import { GetRuleManagementFiltersResponse } from './get_rule_management_filters_route';

describe('Rule management filters response schema', () => {
  test('it should validate an empty response with defaults', () => {
    const payload: GetRuleManagementFiltersResponse = {
      rules_summary: {
        custom_count: 0,
        prebuilt_installed_count: 0,
      },
      aggregated_fields: {
        tags: [],
      },
    };
    const decoded = GetRuleManagementFiltersResponse.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = foldLeftRight(checked);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should validate an non empty response with defaults', () => {
    const payload: GetRuleManagementFiltersResponse = {
      rules_summary: {
        custom_count: 10,
        prebuilt_installed_count: 20,
      },
      aggregated_fields: {
        tags: ['a', 'b', 'c'],
      },
    };
    const decoded = GetRuleManagementFiltersResponse.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = foldLeftRight(checked);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should not validate an extra invalid field added', () => {
    const payload: GetRuleManagementFiltersResponse & { invalid_field: string } = {
      rules_summary: {
        custom_count: 0,
        prebuilt_installed_count: 0,
      },
      aggregated_fields: {
        tags: [],
      },
      invalid_field: 'invalid',
    };
    const decoded = GetRuleManagementFiltersResponse.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = foldLeftRight(checked);

    expect(getPaths(left(message.errors))).toEqual(['invalid keys "invalid_field"']);
    expect(message.schema).toEqual({});
  });

  test('it should NOT validate an empty response with a negative "summary.prebuilt_installed_count" number', () => {
    const payload: GetRuleManagementFiltersResponse = {
      rules_summary: {
        custom_count: 0,
        prebuilt_installed_count: -1,
      },
      aggregated_fields: {
        tags: [],
      },
    };
    const decoded = GetRuleManagementFiltersResponse.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = foldLeftRight(checked);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "-1" supplied to "rules_summary,prebuilt_installed_count"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT validate an empty response with a negative "summary.custom_count"', () => {
    const payload: GetRuleManagementFiltersResponse = {
      rules_summary: {
        custom_count: -1,
        prebuilt_installed_count: 0,
      },
      aggregated_fields: {
        tags: [],
      },
    };
    const decoded = GetRuleManagementFiltersResponse.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = foldLeftRight(checked);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "-1" supplied to "rules_summary,custom_count"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT validate an empty prepackaged response if "summary.prebuilt_installed_count" is not there', () => {
    const payload: GetRuleManagementFiltersResponse = {
      rules_summary: {
        custom_count: 0,
        prebuilt_installed_count: 0,
      },
      aggregated_fields: {
        tags: [],
      },
    };
    // @ts-expect-error
    delete payload.rules_summary.prebuilt_installed_count;
    const decoded = GetRuleManagementFiltersResponse.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = foldLeftRight(checked);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "rules_summary,prebuilt_installed_count"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT validate an empty response with wrong "aggregated_fields.tags"', () => {
    const payload: GetRuleManagementFiltersResponse = {
      rules_summary: {
        custom_count: 0,
        prebuilt_installed_count: 0,
      },
      aggregated_fields: {
        // @ts-expect-error Passing an invalid value for the test
        tags: [1],
      },
    };
    const decoded = GetRuleManagementFiltersResponse.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = foldLeftRight(checked);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "1" supplied to "aggregated_fields,tags"',
    ]);
    expect(message.schema).toEqual({});
  });
});
