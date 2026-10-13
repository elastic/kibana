/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_BULK_ITEMS, type BulkResponse } from '@kbn/alerting-v2-schemas';
import { ALERTING_ERROR_CODES } from '@kbn/alerting-v2-plugin/server';
import { runRulesInBatches } from './rules';

const makeRuleIds = (count: number, prefix = 'rule'): string[] =>
  Array.from({ length: count }, (_, index) => `${prefix}-${index}`);

describe('runRulesInBatches', () => {
  it('fails every id of a rejected batch and still runs the remaining batches', async () => {
    const firstBatch = makeRuleIds(MAX_BULK_ITEMS, 'first');
    const secondBatch = makeRuleIds(1, 'second');
    const run = jest.fn(async (chunk: string[]): Promise<BulkResponse> => {
      if (chunk[0] === firstBatch[0]) {
        throw new Error('bulk request failed');
      }
      return { affected_count: chunk.length, errors: [] };
    });

    const result = await runRulesInBatches([...firstBatch, ...secondBatch], run);

    expect(run.mock.calls.map(([chunk]) => chunk)).toEqual([firstBatch, secondBatch]);
    expect(result).toEqual({
      affectedCount: 1,
      toggledIds: secondBatch,
      failedIds: firstBatch,
      failures: firstBatch.map((id) => ({ target: `rule:${id}`, error: 'bulk request failed' })),
    });
  });

  it('records per-rule errors of a successful batch and treats missing rules as already gone', async () => {
    const run = jest.fn(
      async (): Promise<BulkResponse> => ({
        affected_count: 1,
        errors: [
          {
            id: 'rule-missing',
            error: { code: ALERTING_ERROR_CODES.RULE_NOT_FOUND, message: 'Rule not found' },
          },
          {
            id: 'rule-conflict',
            error: { code: ALERTING_ERROR_CODES.RULE_VERSION_CONFLICT, message: 'Conflict' },
          },
        ],
      })
    );

    const result = await runRulesInBatches(['rule-ok', 'rule-missing', 'rule-conflict'], run);

    expect(result).toEqual({
      affectedCount: 1,
      toggledIds: ['rule-ok'],
      failedIds: ['rule-conflict'],
      failures: [{ target: 'rule:rule-conflict', error: 'Conflict' }],
    });
  });
});
