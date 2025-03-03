/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { exactCheck, formatErrors, foldLeftRight } from '@kbn/securitysolution-io-ts-utils';
import { getExceptionListSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_schema.mock';
import {
  exceptionListRuleReferencesSchema,
  rulesReferencedByExceptionListsSchema,
  findExceptionReferencesOnRuleSchema,
} from './find_exception_references_route';
import type {
  ExceptionListRuleReferencesSchema,
  RulesReferencedByExceptionListsSchema,
  FindExceptionReferencesOnRuleSchema,
} from './find_exception_references_route';

describe('Find exception list references', () => {
  describe('request schema', () => {
    test('validates all fields', () => {
      const payload: FindExceptionReferencesOnRuleSchema = {
        ids: 'abc,def',
        list_ids: '123,456',
        namespace_types: 'single,agnostic',
      };

      const decoded = findExceptionReferencesOnRuleSchema.decode(payload);
      const checked = exactCheck(payload, decoded);
      const output = foldLeftRight(checked);
      expect(formatErrors(output.errors)).toEqual([]);
      expect(output.schema).toEqual({
        ids: ['abc', 'def'],
        list_ids: ['123', '456'],
        namespace_types: ['single', 'agnostic'],
      });
    });

    test('"ids" can be optional', () => {
      const payload: Omit<FindExceptionReferencesOnRuleSchema, 'ids'> = {
        list_ids: '123,456',
        namespace_types: 'single,agnostic',
      };

      const decoded = findExceptionReferencesOnRuleSchema.decode(payload);
      const checked = exactCheck(payload, decoded);
      const output = foldLeftRight(checked);
      expect(formatErrors(output.errors)).toEqual([]);
      expect(output.schema).toEqual({
        list_ids: ['123', '456'],
        namespace_types: ['single', 'agnostic'],
      });
    });

    test('"list_ids" can be undefined', () => {
      const payload: Omit<FindExceptionReferencesOnRuleSchema, 'list_ids'> = {
        ids: 'abc',
        namespace_types: 'single',
      };

      const decoded = findExceptionReferencesOnRuleSchema.decode(payload);
      const checked = exactCheck(payload, decoded);
      const output = foldLeftRight(checked);
      expect(formatErrors(output.errors)).toEqual([]);
      expect(output.schema).toEqual({
        ids: ['abc'],
        namespace_types: ['single'],
      });
    });

    test('defaults "namespacetypes" to ["single"] if none set', () => {
      const payload: Omit<FindExceptionReferencesOnRuleSchema, 'namespace_types'> = {
        ids: 'abc',
        list_ids: '123',
      };

      const decoded = findExceptionReferencesOnRuleSchema.decode(payload);
      const checked = exactCheck(payload, decoded);
      const output = foldLeftRight(checked);
      expect(formatErrors(output.errors)).toEqual([]);
      expect(output.schema).toEqual({
        ids: ['abc'],
        list_ids: ['123'],
        namespace_types: ['single'],
      });
    });

    test('cannot add extra values', () => {
      const payload: FindExceptionReferencesOnRuleSchema & { extra_value?: string } = {
        ids: 'abc,def',
        list_ids: '123,456',
        namespace_types: 'single,agnostic',
        extra_value: 'aaa',
      };

      const decoded = findExceptionReferencesOnRuleSchema.decode(payload);
      const checked = exactCheck(payload, decoded);
      const output = foldLeftRight(checked);
      expect(formatErrors(output.errors)).toEqual(['invalid keys "extra_value"']);
      expect(output.schema).toEqual({});
    });
  });

  describe('response schema', () => {
    describe('exceptionListRuleReferencesSchema', () => {
      test('validates all fields', () => {
        const payload: ExceptionListRuleReferencesSchema = {
          ...getExceptionListSchemaMock(),
          referenced_rules: [
            {
              name: 'My rule',
              id: '4656dc92-5832-11ea-8e2d-0242ac130003',
              rule_id: 'my-rule-id',
              exception_lists: [
                {
                  id: 'myListId',
                  list_id: 'my-list-id',
                  namespace_type: 'single',
                  type: 'detection',
                },
              ],
            },
          ],
        };

        const decoded = exceptionListRuleReferencesSchema.decode(payload);
        const checked = exactCheck(payload, decoded);
        const output = foldLeftRight(checked);
        expect(formatErrors(output.errors)).toEqual([]);
        expect(output.schema).toEqual(payload);
      });

      test('cannot add extra values', () => {
        const payload: ExceptionListRuleReferencesSchema & { extra_value?: string } = {
          extra_value: 'foo',
          ...getExceptionListSchemaMock(),
          referenced_rules: [
            {
              name: 'My rule',
              id: '4656dc92-5832-11ea-8e2d-0242ac130003',
              rule_id: 'my-rule-id',
              exception_lists: [
                {
                  id: 'myListId',
                  list_id: 'my-list-id',
                  namespace_type: 'single',
                  type: 'detection',
                },
              ],
            },
          ],
        };

        const decoded = exceptionListRuleReferencesSchema.decode(payload);
        const checked = exactCheck(payload, decoded);
        const output = foldLeftRight(checked);
        expect(formatErrors(output.errors)).toEqual(['invalid keys "extra_value"']);
        expect(output.schema).toEqual({});
      });
    });

    describe('rulesReferencedByExceptionListsSchema', () => {
      test('validates all fields', () => {
        const payload: RulesReferencedByExceptionListsSchema = {
          references: [
            {
              'my-list-id': {
                ...getExceptionListSchemaMock(),
                referenced_rules: [
                  {
                    name: 'My rule',
                    id: '4656dc92-5832-11ea-8e2d-0242ac130003',
                    rule_id: 'my-rule-id',
                    exception_lists: [
                      {
                        id: 'myListId',
                        list_id: 'my-list-id',
                        namespace_type: 'single',
                        type: 'detection',
                      },
                    ],
                  },
                ],
              },
            },
          ],
        };

        const decoded = rulesReferencedByExceptionListsSchema.decode(payload);
        const checked = exactCheck(payload, decoded);
        const output = foldLeftRight(checked);
        expect(formatErrors(output.errors)).toEqual([]);
        expect(output.schema).toEqual(payload);
      });

      test('validates "references" with empty array', () => {
        const payload: RulesReferencedByExceptionListsSchema = {
          references: [],
        };

        const decoded = rulesReferencedByExceptionListsSchema.decode(payload);
        const checked = exactCheck(payload, decoded);
        const output = foldLeftRight(checked);
        expect(formatErrors(output.errors)).toEqual([]);
        expect(output.schema).toEqual({
          references: [],
        });
      });

      test('cannot add extra values', () => {
        const payload: RulesReferencedByExceptionListsSchema & { extra_value?: string } = {
          extra_value: 'foo',
          references: [
            {
              'my-list-id': {
                ...getExceptionListSchemaMock(),
                referenced_rules: [
                  {
                    name: 'My rule',
                    id: '4656dc92-5832-11ea-8e2d-0242ac130003',
                    rule_id: 'my-rule-id',
                    exception_lists: [
                      {
                        id: 'myListId',
                        list_id: 'my-list-id',
                        namespace_type: 'single',
                        type: 'detection',
                      },
                    ],
                  },
                ],
              },
            },
          ],
        };

        const decoded = rulesReferencedByExceptionListsSchema.decode(payload);
        const checked = exactCheck(payload, decoded);
        const output = foldLeftRight(checked);
        expect(formatErrors(output.errors)).toEqual(['invalid keys "extra_value"']);
        expect(output.schema).toEqual({});
      });
    });
  });
});
