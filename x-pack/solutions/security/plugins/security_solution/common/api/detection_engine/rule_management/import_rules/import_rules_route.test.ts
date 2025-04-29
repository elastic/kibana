/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectParseError, expectParseSuccess, stringifyZodError } from '@kbn/zod-helpers';
import type { ErrorSchema } from '../../model/error_schema.gen';
import { ImportRulesResponse } from './import_rules_route.gen';

describe('Import rules schema', () => {
  describe('response schema', () => {
    test('it should validate an empty import response with no errors', () => {
      const payload: ImportRulesResponse = {
        success: true,
        success_count: 0,
        rules_count: 0,
        errors: [],
        exceptions_errors: [],
        exceptions_success: true,
        exceptions_success_count: 0,
        action_connectors_success: true,
        action_connectors_success_count: 0,
        action_connectors_errors: [],
        action_connectors_warnings: [],
      };
      const result = ImportRulesResponse.safeParse(payload);
      expectParseSuccess(result);
      expect(result.data).toEqual(payload);
    });

    test('it should validate an empty import response with a single error', () => {
      const payload: ImportRulesResponse = {
        success: false,
        success_count: 0,
        rules_count: 0,
        errors: [{ error: { status_code: 400, message: 'some message' } }],
        exceptions_errors: [],
        exceptions_success: true,
        exceptions_success_count: 0,
        action_connectors_success: true,
        action_connectors_success_count: 0,
        action_connectors_errors: [],
        action_connectors_warnings: [],
      };
      const result = ImportRulesResponse.safeParse(payload);
      expectParseSuccess(result);
      expect(result.data).toEqual(payload);
    });

    test('it should validate an empty import response with a single exceptions error', () => {
      const payload: ImportRulesResponse = {
        success: false,
        success_count: 0,
        rules_count: 0,
        errors: [],
        exceptions_errors: [{ error: { status_code: 400, message: 'some message' } }],
        exceptions_success: true,
        exceptions_success_count: 0,
        action_connectors_success: true,
        action_connectors_success_count: 0,
        action_connectors_errors: [],
        action_connectors_warnings: [],
      };
      const result = ImportRulesResponse.safeParse(payload);
      expectParseSuccess(result);
      expect(result.data).toEqual(payload);
    });

    test('it should validate an empty import response with two errors', () => {
      const payload: ImportRulesResponse = {
        success: false,
        success_count: 0,
        rules_count: 0,
        errors: [
          { error: { status_code: 400, message: 'some message' } },
          { error: { status_code: 500, message: 'some message' } },
        ],
        exceptions_errors: [],
        exceptions_success: true,
        exceptions_success_count: 0,
        action_connectors_success: true,
        action_connectors_success_count: 0,
        action_connectors_errors: [],
        action_connectors_warnings: [],
      };
      const result = ImportRulesResponse.safeParse(payload);
      expectParseSuccess(result);
      expect(result.data).toEqual(payload);
    });

    test('it should validate an empty import response with two exception errors', () => {
      const payload: ImportRulesResponse = {
        success: false,
        success_count: 0,
        rules_count: 0,
        errors: [],
        exceptions_errors: [
          { error: { status_code: 400, message: 'some message' } },
          { error: { status_code: 500, message: 'some message' } },
        ],
        exceptions_success: true,
        exceptions_success_count: 0,
        action_connectors_success: true,
        action_connectors_success_count: 0,
        action_connectors_errors: [],
        action_connectors_warnings: [],
      };
      const result = ImportRulesResponse.safeParse(payload);
      expectParseSuccess(result);
      expect(result.data).toEqual(payload);
    });

    test('it should NOT validate a success_count that is a negative number', () => {
      const payload: ImportRulesResponse = {
        success: false,
        success_count: -1,
        rules_count: 0,
        errors: [],
        exceptions_errors: [],
        exceptions_success: true,
        exceptions_success_count: 0,
        action_connectors_success: true,
        action_connectors_success_count: 0,
        action_connectors_errors: [],
        action_connectors_warnings: [],
      };
      const result = ImportRulesResponse.safeParse(payload);
      expectParseError(result);
      expect(stringifyZodError(result.error)).toEqual(
        'success_count: Number must be greater than or equal to 0'
      );
    });

    test('it should NOT validate a exceptions_success_count that is a negative number', () => {
      const payload: ImportRulesResponse = {
        success: false,
        success_count: 0,
        rules_count: 0,
        errors: [],
        exceptions_errors: [],
        exceptions_success: true,
        exceptions_success_count: -1,
        action_connectors_success: true,
        action_connectors_success_count: 0,
        action_connectors_errors: [],
        action_connectors_warnings: [],
      };
      const result = ImportRulesResponse.safeParse(payload);
      expectParseError(result);
      expect(stringifyZodError(result.error)).toEqual(
        'exceptions_success_count: Number must be greater than or equal to 0'
      );
    });

    test('it should NOT validate a success that is not a boolean', () => {
      const payload: Omit<ImportRulesResponse, 'success'> & { success: string } = {
        success: 'hello',
        success_count: 0,
        rules_count: 0,
        errors: [],
        exceptions_errors: [],
        exceptions_success: true,
        exceptions_success_count: 0,
        action_connectors_success: true,
        action_connectors_success_count: 0,
        action_connectors_errors: [],
        action_connectors_warnings: [],
      };
      const result = ImportRulesResponse.safeParse(payload);
      expectParseError(result);
      expect(stringifyZodError(result.error)).toEqual('success: Expected boolean, received string');
    });

    test('it should NOT validate a exceptions_success that is not a boolean', () => {
      const payload: Omit<ImportRulesResponse, 'exceptions_success'> & {
        exceptions_success: string;
      } = {
        success: true,
        success_count: 0,
        rules_count: 0,
        errors: [],
        exceptions_errors: [],
        exceptions_success: 'hello',
        exceptions_success_count: 0,
        action_connectors_success: true,
        action_connectors_success_count: 0,
        action_connectors_errors: [],
        action_connectors_warnings: [],
      };
      const result = ImportRulesResponse.safeParse(payload);
      expectParseError(result);
      expect(stringifyZodError(result.error)).toEqual(
        'exceptions_success: Expected boolean, received string'
      );
    });

    test('it should NOT validate a success an extra invalid field', () => {
      const payload: ImportRulesResponse & { invalid_field: string } = {
        success: true,
        success_count: 0,
        rules_count: 0,
        errors: [],
        invalid_field: 'invalid_data',
        exceptions_errors: [],
        exceptions_success: true,
        exceptions_success_count: 0,
        action_connectors_success: true,
        action_connectors_success_count: 0,
        action_connectors_errors: [],
        action_connectors_warnings: [],
      };
      const result = ImportRulesResponse.safeParse(payload);
      expectParseError(result);
      expect(stringifyZodError(result.error)).toEqual(
        "Unrecognized key(s) in object: 'invalid_field'"
      );
    });

    test('it should NOT validate an extra field in the second position of the errors array', () => {
      type InvalidError = ErrorSchema & { invalid_data?: string };
      const payload: Omit<ImportRulesResponse, 'errors'> & {
        errors: InvalidError[];
      } = {
        success: true,
        success_count: 0,
        rules_count: 0,
        errors: [
          { error: { status_code: 400, message: 'some message' } },
          { invalid_data: 'something', error: { status_code: 500, message: 'some message' } },
        ],
        exceptions_errors: [],
        exceptions_success: true,
        exceptions_success_count: 0,
        action_connectors_success: true,
        action_connectors_success_count: 0,
        action_connectors_errors: [],
        action_connectors_warnings: [],
      };
      const result = ImportRulesResponse.safeParse(payload);
      expectParseError(result);
      expect(stringifyZodError(result.error)).toEqual(
        "errors.1: Unrecognized key(s) in object: 'invalid_data'"
      );
    });

    test('it should validate an empty import response with a single connectors error', () => {
      const payload: ImportRulesResponse = {
        success: false,
        success_count: 0,
        rules_count: 0,
        errors: [],
        exceptions_errors: [],
        exceptions_success: true,
        exceptions_success_count: 0,
        action_connectors_success: true,
        action_connectors_success_count: 0,
        action_connectors_errors: [{ error: { status_code: 400, message: 'some message' } }],
        action_connectors_warnings: [],
      };
      const result = ImportRulesResponse.safeParse(payload);
      expectParseSuccess(result);
      expect(result.data).toEqual(payload);
    });

    test('it should validate an empty import response with multiple errors', () => {
      const payload: ImportRulesResponse = {
        success: false,
        success_count: 0,
        rules_count: 0,
        errors: [
          { error: { status_code: 400, message: 'some message' } },
          { error: { status_code: 500, message: 'some message' } },
        ],
        exceptions_errors: [],
        exceptions_success: true,
        exceptions_success_count: 0,
        action_connectors_success: true,
        action_connectors_success_count: 0,
        action_connectors_errors: [{ error: { status_code: 400, message: 'some message' } }],
        action_connectors_warnings: [],
      };
      const result = ImportRulesResponse.safeParse(payload);
      expectParseSuccess(result);
      expect(result.data).toEqual(payload);
    });

    test('it should NOT validate action_connectors_success that is not boolean', () => {
      const payload: Omit<ImportRulesResponse, 'action_connectors_success'> & {
        action_connectors_success: string;
      } = {
        success: true,
        success_count: 0,
        rules_count: 0,
        errors: [],
        exceptions_errors: [],
        exceptions_success: true,
        exceptions_success_count: 0,
        action_connectors_success: 'invalid',
        action_connectors_success_count: 0,
        action_connectors_errors: [],
        action_connectors_warnings: [],
      };
      const result = ImportRulesResponse.safeParse(payload);
      expectParseError(result);
      expect(stringifyZodError(result.error)).toEqual(
        'action_connectors_success: Expected boolean, received string'
      );
    });

    test('it should NOT validate a action_connectors_success_count that is a negative number', () => {
      const payload: ImportRulesResponse = {
        success: false,
        success_count: 0,
        rules_count: 0,
        errors: [],
        exceptions_errors: [],
        exceptions_success: true,
        exceptions_success_count: 0,
        action_connectors_success: true,
        action_connectors_success_count: -1,
        action_connectors_errors: [],
        action_connectors_warnings: [],
      };
      const result = ImportRulesResponse.safeParse(payload);
      expectParseError(result);
      expect(stringifyZodError(result.error)).toEqual(
        'action_connectors_success_count: Number must be greater than or equal to 0'
      );
    });
    test('it should validate a action_connectors_warnings after importing successfully', () => {
      const payload: ImportRulesResponse = {
        success: false,
        success_count: 0,
        rules_count: 0,
        errors: [],
        exceptions_errors: [],
        exceptions_success: true,
        exceptions_success_count: 0,
        action_connectors_success: true,
        action_connectors_success_count: 1,
        action_connectors_errors: [],
        action_connectors_warnings: [
          { type: 'type', message: 'message', actionPath: 'actionPath' },
        ],
      };
      const result = ImportRulesResponse.safeParse(payload);
      expectParseSuccess(result);
      expect(result.data).toEqual(payload);
    });

    test('it should NOT validate a action_connectors_warnings that is not WarningSchema', () => {
      const payload: Omit<ImportRulesResponse, 'action_connectors_warnings'> & {
        action_connectors_warnings: string;
      } = {
        success: true,
        success_count: 0,
        rules_count: 0,
        errors: [],
        exceptions_errors: [],
        exceptions_success: true,
        exceptions_success_count: 0,
        action_connectors_success: true,
        action_connectors_success_count: 0,
        action_connectors_errors: [],
        action_connectors_warnings: 'invalid',
      };
      const result = ImportRulesResponse.safeParse(payload);
      expectParseError(result);
      expect(stringifyZodError(result.error)).toEqual(
        'action_connectors_warnings: Expected array, received string'
      );
    });
  });
});
