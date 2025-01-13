/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectParseError, expectParseSuccess, stringifyZodError } from '@kbn/zod-helpers';
import { InstallPrebuiltRulesAndTimelinesResponse } from './install_prebuilt_rules_and_timelines_route.gen';

describe('Install prebuilt rules and timelines response schema', () => {
  test('it should validate an empty prepackaged response with defaults', () => {
    const payload: InstallPrebuiltRulesAndTimelinesResponse = {
      rules_installed: 0,
      rules_updated: 0,
      timelines_installed: 0,
      timelines_updated: 0,
    };
    const result = InstallPrebuiltRulesAndTimelinesResponse.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('it should not validate an extra invalid field added', () => {
    const payload: InstallPrebuiltRulesAndTimelinesResponse & { invalid_field: string } = {
      rules_installed: 0,
      rules_updated: 0,
      invalid_field: 'invalid',
      timelines_installed: 0,
      timelines_updated: 0,
    };
    const result = InstallPrebuiltRulesAndTimelinesResponse.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toEqual(
      "Unrecognized key(s) in object: 'invalid_field'"
    );
  });

  test('it should NOT validate an empty prepackaged response with a negative "rules_installed" number', () => {
    const payload: InstallPrebuiltRulesAndTimelinesResponse = {
      rules_installed: -1,
      rules_updated: 0,
      timelines_installed: 0,
      timelines_updated: 0,
    };
    const result = InstallPrebuiltRulesAndTimelinesResponse.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toEqual(
      'rules_installed: Number must be greater than or equal to 0'
    );
  });

  test('it should NOT validate an empty prepackaged response with a negative "rules_updated"', () => {
    const payload: InstallPrebuiltRulesAndTimelinesResponse = {
      rules_installed: 0,
      rules_updated: -1,
      timelines_installed: 0,
      timelines_updated: 0,
    };
    const result = InstallPrebuiltRulesAndTimelinesResponse.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toEqual(
      'rules_updated: Number must be greater than or equal to 0'
    );
  });

  test('it should NOT validate an empty prepackaged response if "rules_installed" is not there', () => {
    const payload: InstallPrebuiltRulesAndTimelinesResponse = {
      rules_installed: 0,
      rules_updated: 0,
      timelines_installed: 0,
      timelines_updated: 0,
    };
    // @ts-expect-error
    delete payload.rules_installed;
    const result = InstallPrebuiltRulesAndTimelinesResponse.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toEqual('rules_installed: Required');
  });

  test('it should NOT validate an empty prepackaged response if "rules_updated" is not there', () => {
    const payload: InstallPrebuiltRulesAndTimelinesResponse = {
      rules_installed: 0,
      rules_updated: 0,
      timelines_installed: 0,
      timelines_updated: 0,
    };
    // @ts-expect-error
    delete payload.rules_updated;
    const result = InstallPrebuiltRulesAndTimelinesResponse.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toEqual('rules_updated: Required');
  });
});
