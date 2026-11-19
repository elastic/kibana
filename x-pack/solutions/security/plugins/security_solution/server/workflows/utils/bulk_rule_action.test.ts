/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaApiCallError } from '@kbn/workflows-extensions/server';
import { ExecutionError } from '@kbn/workflows/server';
import type { NormalizedRuleError } from '../../../common/api/detection_engine/rule_management';
import { handleBulkRuleActionError, toBulkRuleActionOutput } from './bulk_rule_action';

const summary = (
  overrides: Partial<{
    succeeded: number;
    failed: number;
    skipped: number;
    total: number;
  }> = {}
) => ({ succeeded: 0, failed: 0, skipped: 0, total: 0, ...overrides });

const body = (summaryOverrides: Parameters<typeof summary>[0], errors?: NormalizedRuleError[]) => ({
  message: 'Bulk edit partially failed',
  status_code: 500,
  attributes: {
    results: { updated: [], created: [], deleted: [], skipped: [] },
    summary: summary(summaryOverrides),
    ...(errors ? { errors } : {}),
  },
});

const errorFor = (id: string): NormalizedRuleError => ({
  message: 'Rule not found',
  status_code: 500,
  rules: [{ id }],
});

describe('bulk_rule_action', () => {
  describe('toBulkRuleActionOutput', () => {
    it('maps the summary counts', () => {
      const result = toBulkRuleActionOutput(
        body({ succeeded: 3, failed: 0, skipped: 1, total: 4 })
      );

      expect(result).toEqual({ output: { succeeded: 3, failed: 0, skipped: 1, total: 4 } });
    });

    it('forwards errors when present', () => {
      const errors = [errorFor('rule-2')];
      const result = toBulkRuleActionOutput(body({ succeeded: 1, failed: 1, total: 2 }, errors));

      expect(result.output).toEqual({
        succeeded: 1,
        failed: 1,
        skipped: 0,
        total: 2,
        errors,
      });
    });

    it('omits errors when the array is empty', () => {
      const result = toBulkRuleActionOutput(body({ succeeded: 2, total: 2 }, []));

      expect(result.output).not.toHaveProperty('errors');
    });
  });

  describe('handleBulkRuleActionError', () => {
    it('recovers a partial-failure 500 body, forwarding the reported errors', () => {
      const errors: NormalizedRuleError[] = [
        {
          message: 'BOOM SOMETHING BROKE for rule 9b90200e-0314-4dc4-8799-387c78f218d4',
          status_code: 500,
          rules: [
            {
              id: '9b90200e-0314-4dc4-8799-387c78f218d4',
              name: 'Attempt to Modify an Okta Policy Rule',
            },
          ],
        },
      ];
      const error = new KibanaApiCallError({
        status: 500,
        headers: {},
        body: {
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'Bulk edit partially failed',
          attributes: {
            errors,
            summary: { failed: 1, succeeded: 3, skipped: 0, total: 4 },
          },
        },
        message: 'HTTP 500: Bulk edit partially failed',
      });

      expect(handleBulkRuleActionError(error, 'enable rules')).toEqual({
        output: { succeeded: 3, failed: 1, skipped: 0, total: 4, errors },
      });
    });

    it('tolerates unknown fields in the response body (extra keys are stripped, not rejected)', () => {
      const errors = [errorFor('rule-2')];
      const error = new KibanaApiCallError({
        status: 500,
        headers: {},
        body: {
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'Bulk edit partially failed',
          unexpectedTopLevel: 'ignored',
          attributes: {
            results: { updated: [{ id: 'rule-1' }], created: [], deleted: [], skipped: [] },
            summary: { succeeded: 1, failed: 1, skipped: 0, total: 2 },
            errors,
            unexpectedNested: 'ignored',
          },
        },
        message: 'HTTP 500: bulk action partially failed',
      });

      expect(handleBulkRuleActionError(error, 'enable rules')).toEqual({
        output: { succeeded: 1, failed: 1, skipped: 0, total: 2, errors },
      });
    });

    it('recovers a 500 where no rule succeeded but at least one was skipped', () => {
      const errors = [errorFor('rule-1')];
      const error = new KibanaApiCallError({
        status: 500,
        headers: {},
        body: body({ succeeded: 0, failed: 1, skipped: 1, total: 2 }, errors),
        message: 'HTTP 500: bulk action partially failed',
      });

      expect(handleBulkRuleActionError(error, 'enable rules')).toEqual({
        output: { succeeded: 0, failed: 1, skipped: 1, total: 2, errors },
      });
    });

    it('throws when every rule failed (nothing succeeded or skipped)', () => {
      const error = new KibanaApiCallError({
        status: 500,
        headers: {},
        body: body({ succeeded: 0, failed: 2, total: 2 }, [errorFor('rule-1')]),
        message: 'HTTP 500: bulk action failed',
      });

      expect(() => handleBulkRuleActionError(error, 'enable rules')).toThrow(ExecutionError);
    });

    it('does not leak the response body or headers into the thrown error details', () => {
      const error = new KibanaApiCallError({
        status: 500,
        headers: { 'x-leaky-header': 'header-value' },
        body: body({ succeeded: 0, failed: 1, total: 1 }, [
          { message: 'sensitive-payload', status_code: 500, rules: [{ id: 'rule-1' }] },
        ]),
        message: 'HTTP 500: bulk action failed',
      });

      let thrown: unknown;
      try {
        handleBulkRuleActionError(error, 'enable rules');
      } catch (e) {
        thrown = e;
      }

      expect(thrown).toBeInstanceOf(ExecutionError);
      const serialized = (thrown as ExecutionError).toSerializableObject();
      expect(serialized.type).toBe('ApiError');
      expect(serialized.details).toEqual({ status: 500 });
      expect(JSON.stringify(serialized.details)).not.toContain('sensitive-payload');
      expect(JSON.stringify(serialized.details)).not.toContain('x-leaky-header');
    });

    it('throws when the 500 body does not match the bulk-action schema', () => {
      const error = new KibanaApiCallError({
        status: 500,
        headers: {},
        body: { message: 'Internal Server Error' },
        message: 'HTTP 500: Internal Server Error',
      });

      expect(() => handleBulkRuleActionError(error, 'enable rules')).toThrow(ExecutionError);
    });

    it('throws on a non-500 KibanaApiCallError even if the body looks recoverable', () => {
      const error = new KibanaApiCallError({
        status: 400,
        headers: {},
        body: body({ succeeded: 1, failed: 1, total: 2 }),
        message: 'HTTP 400: bad request',
      });

      expect(() => handleBulkRuleActionError(error, 'disable rules')).toThrow(ExecutionError);
    });

    it('wraps a generic (non-KibanaApiCallError) error', () => {
      expect(() => handleBulkRuleActionError(new Error('Network error'), 'disable rules')).toThrow(
        ExecutionError
      );
    });
  });
});
