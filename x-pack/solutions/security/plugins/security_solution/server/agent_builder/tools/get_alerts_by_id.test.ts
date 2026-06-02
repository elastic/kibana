/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { ALERTS_BATCH_MAX_SIZE, ESSENTIAL_ALERT_FIELDS } from '../../../common/constants';
import { getAlertsById } from './get_alerts_by_id';

const makeClient = (hits: Array<{ _id?: string; _source?: unknown }>) =>
  ({
    search: jest.fn().mockResolvedValue({ hits: { hits } }),
  } as unknown as ElasticsearchClient);

describe('getAlertsById', () => {
  const index = '.alerts-security.alerts-default';

  it('returns an empty object without calling ES when ids is empty', async () => {
    const esClient = makeClient([]);

    const result = await getAlertsById({ esClient, index, ids: [] });

    expect(result).toEqual({});
    expect(esClient.search).not.toHaveBeenCalled();
  });

  it('throws when more than ALERTS_BATCH_MAX_SIZE ids are provided', async () => {
    const esClient = makeClient([]);
    const ids = Array.from({ length: ALERTS_BATCH_MAX_SIZE + 1 }, (_, i) => `id-${i}`);

    await expect(getAlertsById({ esClient, index, ids })).rejects.toThrow(
      `getAlertsById: ids.length (${
        ALERTS_BATCH_MAX_SIZE + 1
      }) exceeds the maximum of ${ALERTS_BATCH_MAX_SIZE}`
    );
    expect(esClient.search).not.toHaveBeenCalled();
  });

  it('returns hits keyed by _id with _source as the value', async () => {
    const source1 = { 'kibana.alert.rule.name': 'Rule A' };
    const source2 = { 'kibana.alert.rule.name': 'Rule B' };
    const esClient = makeClient([
      { _id: 'abc', _source: source1 },
      { _id: 'def', _source: source2 },
    ]);

    const result = await getAlertsById({ esClient, index, ids: ['abc', 'def'] });

    expect(result).toEqual({ abc: source1, def: source2 });
  });

  it('skips hits that are missing _source', async () => {
    const esClient = makeClient([
      { _id: 'abc', _source: { 'kibana.alert.rule.name': 'Rule A' } },
      { _id: 'def' },
    ]);

    const result = await getAlertsById({ esClient, index, ids: ['abc', 'def'] });

    expect(result).toEqual({ abc: { 'kibana.alert.rule.name': 'Rule A' } });
    expect(result).not.toHaveProperty('def');
  });

  it('skips hits that are missing _id', async () => {
    const esClient = makeClient([
      { _source: { 'kibana.alert.rule.name': 'Rule A' } },
      { _id: 'def', _source: { 'kibana.alert.rule.name': 'Rule B' } },
    ]);

    const result = await getAlertsById({ esClient, index, ids: ['def'] });

    expect(Object.keys(result)).toEqual(['def']);
  });

  it('queries with the correct index, source fields, and id filter', async () => {
    const esClient = makeClient([]);

    await getAlertsById({ esClient, index, ids: ['abc', 'def'] });

    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        index,
        ignore_unavailable: true,
        allow_no_indices: true,
        size: 2,
        _source: ESSENTIAL_ALERT_FIELDS,
        query: { bool: { filter: [{ terms: { _id: ['abc', 'def'] } }] } },
      })
    );
  });
});
