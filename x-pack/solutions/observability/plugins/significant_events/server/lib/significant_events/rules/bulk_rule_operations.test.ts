/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_BULK_ITEMS, type BulkResponse } from '@kbn/alerting-v2-schemas';
import { ALERTING_ERROR_CODES } from '@kbn/alerting-v2-plugin/server';
import { deleteRules, runBulkRuleOperation, toBulkRuleResult } from './bulk_rule_operations';

const makeRuleIds = (count: number): string[] =>
  Array.from({ length: count }, (_, index) => `rule-${index}`);

describe('toBulkRuleResult', () => {
  it('preserves the affected count and fatal failures without counting missing rules as successes', () => {
    expect(
      toBulkRuleResult(['ok', 'missing', 'conflict'], {
        affected_count: 1,
        errors: [
          {
            id: 'missing',
            error: { code: ALERTING_ERROR_CODES.RULE_NOT_FOUND, message: 'Gone' },
          },
          {
            id: 'conflict',
            error: { code: ALERTING_ERROR_CODES.RULE_VERSION_CONFLICT, message: 'Conflict' },
          },
        ],
      })
    ).toEqual({
      affectedCount: 1,
      succeededIds: ['ok'],
      failures: [{ id: 'conflict', message: 'Conflict' }],
    });
  });
});

describe('runBulkRuleOperation', () => {
  it('returns an empty result without making a request for no ids', async () => {
    const run = jest.fn();
    await expect(runBulkRuleOperation([], run)).resolves.toEqual({
      affectedCount: 0,
      succeededIds: [],
      failures: [],
    });
    expect(run).not.toHaveBeenCalled();
  });

  it('aggregates counts, successful ids and failures across supported-size batches in order', async () => {
    const ids = makeRuleIds(MAX_BULK_ITEMS + 2);
    const run = jest.fn(async (chunk: string[]): Promise<BulkResponse> => ({
      affected_count: chunk.length - 1,
      errors: [
        {
          id: chunk[0],
          error: { code: ALERTING_ERROR_CODES.RULE_VERSION_CONFLICT, message: 'Conflict' },
        },
      ],
    }));

    await expect(runBulkRuleOperation(ids, run)).resolves.toEqual({
      affectedCount: ids.length - 2,
      succeededIds: [...ids.slice(1, MAX_BULK_ITEMS), ids[MAX_BULK_ITEMS + 1]],
      failures: [
        { id: ids[0], message: 'Conflict' },
        { id: ids[MAX_BULK_ITEMS], message: 'Conflict' },
      ],
    });
    expect(run.mock.calls).toEqual([[ids.slice(0, MAX_BULK_ITEMS)], [ids.slice(MAX_BULK_ITEMS)]]);
  });

  it('reports every id in a rejected batch and continues the remaining batches', async () => {
    const ids = makeRuleIds(MAX_BULK_ITEMS + 1);
    const run = jest
      .fn()
      .mockRejectedValueOnce(new Error('Request failed'))
      .mockResolvedValueOnce({ affected_count: 1, errors: [] });

    await expect(runBulkRuleOperation(ids, run)).resolves.toEqual({
      affectedCount: 1,
      succeededIds: ids.slice(MAX_BULK_ITEMS),
      failures: ids.slice(0, MAX_BULK_ITEMS).map((id) => ({ id, message: 'Request failed' })),
    });
    expect(run).toHaveBeenCalledTimes(2);
  });

  it('normalizes non-Error request rejections', async () => {
    const run = jest.fn().mockRejectedValue('Request failed');
    await expect(runBulkRuleOperation(['a'], run)).resolves.toEqual({
      affectedCount: 0,
      succeededIds: [],
      failures: [{ id: 'a', message: 'Request failed' }],
    });
  });
});

describe('deleteRules', () => {
  it('uses the supplied client for every batch', async () => {
    const ids = makeRuleIds(MAX_BULK_ITEMS + 1);
    const rulesClient = {
      bulkDeleteRules: jest.fn(
        async ({ ids: chunk }: { ids: string[] }): Promise<BulkResponse> => ({
          affected_count: chunk.length,
          errors: [],
        })
      ),
    };

    await expect(deleteRules(rulesClient, ids)).resolves.toEqual({
      affectedCount: ids.length,
      succeededIds: ids,
      failures: [],
    });
    expect(rulesClient.bulkDeleteRules.mock.calls).toEqual([
      [{ ids: ids.slice(0, MAX_BULK_ITEMS) }],
      [{ ids: ids.slice(MAX_BULK_ITEMS) }],
    ]);
  });
});
