/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectParseError, expectParseSuccess, stringifyZodError } from '@kbn/zod-helpers/v4';
import { ReadRuleExecutionResultsRequestBody } from './read_rule_execution_results_route.gen';

const validFilter = {
  from: '2026-03-11T00:00:00.000Z',
  to: '2026-03-12T00:00:00.000Z',
};

describe('Request schema of Read rule execution results endpoint', () => {
  describe('Required fields', () => {
    it('should succeed when body is empty (filter is optional)', () => {
      const result = ReadRuleExecutionResultsRequestBody.safeParse({});
      expectParseSuccess(result);
    });

    it('should fail when filter is empty object (missing from/to)', () => {
      const result = ReadRuleExecutionResultsRequestBody.safeParse({ filter: {} });
      expectParseError(result);
    });

    it('should succeed when filter has from and to', () => {
      const result = ReadRuleExecutionResultsRequestBody.safeParse({ filter: validFilter });
      expectParseSuccess(result);
    });
  });

  describe('Defaults', () => {
    it('should apply defaults for optional fields', () => {
      const result = ReadRuleExecutionResultsRequestBody.safeParse({ filter: validFilter });
      expectParseSuccess(result);
      expect(result.data).toEqual({
        filter: {
          ...validFilter,
          outcome: [],
          run_type: [],
        },
        page: 1,
        per_page: 20,
      });
    });
  });

  describe('filter.outcome', () => {
    it('should accept valid outcome values', () => {
      const result = ReadRuleExecutionResultsRequestBody.safeParse({
        filter: { ...validFilter, outcome: ['success', 'failure'] },
      });
      expectParseSuccess(result);
      expect(result.data?.filter?.outcome).toEqual(['success', 'failure']);
    });

    it('should reject invalid outcome values', () => {
      const result = ReadRuleExecutionResultsRequestBody.safeParse({
        filter: { ...validFilter, outcome: ['invalid'] },
      });
      expectParseError(result);
    });

    it('should accept empty outcome array', () => {
      const result = ReadRuleExecutionResultsRequestBody.safeParse({
        filter: { ...validFilter, outcome: [] },
      });
      expectParseSuccess(result);
      expect(result.data?.filter?.outcome).toEqual([]);
    });
  });

  describe('filter.run_type', () => {
    it('should accept valid run_type values', () => {
      const result = ReadRuleExecutionResultsRequestBody.safeParse({
        filter: { ...validFilter, run_type: ['standard'] },
      });
      expectParseSuccess(result);
      expect(result.data?.filter?.run_type).toEqual(['standard']);
    });

    it('should accept backfill run_type', () => {
      const result = ReadRuleExecutionResultsRequestBody.safeParse({
        filter: { ...validFilter, run_type: ['backfill'] },
      });
      expectParseSuccess(result);
      expect(result.data?.filter?.run_type).toEqual(['backfill']);
    });
  });

  describe('sort.field', () => {
    it.each(['execution_start', 'execution_duration_ms'])(
      'should accept "%s" as a valid sort field',
      (field) => {
        const result = ReadRuleExecutionResultsRequestBody.safeParse({
          filter: validFilter,
          sort: { field },
        });
        expectParseSuccess(result);
        expect(result.data?.sort?.field).toEqual(field);
      }
    );

    it('should reject invalid sort field values', () => {
      const result = ReadRuleExecutionResultsRequestBody.safeParse({
        filter: validFilter,
        sort: { field: 'invalid_field' },
      });
      expectParseError(result);
      expect(stringifyZodError(result.error)).toContain(
        'Invalid option: expected one of "execution_start"|"execution_duration_ms"'
      );
    });

    it('should default sort field to execution_start', () => {
      const result = ReadRuleExecutionResultsRequestBody.safeParse({
        filter: validFilter,
        sort: {},
      });
      expectParseSuccess(result);
      expect(result.data?.sort?.field).toEqual('execution_start');
    });
  });

  describe('sort.order', () => {
    it.each(['asc', 'desc'] as const)('should accept "%s" as a valid sort order', (order) => {
      const result = ReadRuleExecutionResultsRequestBody.safeParse({
        filter: validFilter,
        sort: { order },
      });
      expectParseSuccess(result);
      expect(result.data?.sort?.order).toEqual(order);
    });

    it('should default sort order to desc', () => {
      const result = ReadRuleExecutionResultsRequestBody.safeParse({
        filter: validFilter,
        sort: {},
      });
      expectParseSuccess(result);
      expect(result.data?.sort?.order).toEqual('desc');
    });
  });

  describe('page and per_page', () => {
    it('should accept page and per_page as numbers', () => {
      const result = ReadRuleExecutionResultsRequestBody.safeParse({
        filter: validFilter,
        page: 3,
        per_page: 50,
      });
      expectParseSuccess(result);
      expect(result.data?.page).toEqual(3);
      expect(result.data?.per_page).toEqual(50);
    });

    it('should default page to 1 and per_page to 20', () => {
      const result = ReadRuleExecutionResultsRequestBody.safeParse({
        filter: validFilter,
      });
      expectParseSuccess(result);
      expect(result.data?.page).toEqual(1);
      expect(result.data?.per_page).toEqual(20);
    });
  });
});
