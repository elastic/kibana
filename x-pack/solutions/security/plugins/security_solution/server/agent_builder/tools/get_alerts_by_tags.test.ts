/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { ALERTS_BATCH_MAX_SIZE, ESSENTIAL_ALERT_FIELDS } from '../../../common/constants';
import { getAlertsByTags } from './get_alerts_by_tags';

const makeClient = (
  hits: Array<{ _id?: string; _source?: unknown }>,
  total: number | { value: number; relation: string } = hits.length
) =>
  ({
    search: jest.fn().mockResolvedValue({ hits: { total, hits } }),
  } as unknown as ElasticsearchClient);

describe('getAlertsByTags', () => {
  const index = '.alerts-security.alerts-default';

  it('returns no alerts without calling ES when tags is empty', async () => {
    const esClient = makeClient([]);

    const result = await getAlertsByTags({ esClient, index, tags: [] });

    expect(result).toEqual({ total: 0, alerts: [] });
    expect(esClient.search).not.toHaveBeenCalled();
  });

  it('queries the most recent alerts carrying any of the tags, with the total count', async () => {
    const esClient = makeClient([]);

    await getAlertsByTags({ esClient, index, tags: ['az:proposal:p1', 'other'] });

    expect(esClient.search).toHaveBeenCalledWith({
      index,
      ignore_unavailable: true,
      allow_no_indices: true,
      size: ALERTS_BATCH_MAX_SIZE,
      track_total_hits: true,
      sort: [{ '@timestamp': { order: 'desc' } }],
      _source: ESSENTIAL_ALERT_FIELDS,
      query: {
        bool: {
          filter: [{ terms: { 'kibana.alert.workflow_tags': ['az:proposal:p1', 'other'] } }],
        },
      },
    });
  });

  it('leaves the excluded alerts out of the query', async () => {
    const esClient = makeClient([]);

    await getAlertsByTags({ esClient, index, tags: ['az:proposal:p1'], excludeIds: ['abc'] });

    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        query: {
          bool: {
            filter: [{ terms: { 'kibana.alert.workflow_tags': ['az:proposal:p1'] } }],
            must_not: [{ ids: { values: ['abc'] } }],
          },
        },
      })
    );
  });

  it('returns the total and the alerts in the order ES returned them', async () => {
    const source1 = { 'kibana.alert.rule.name': 'Rule A' };
    const source2 = { 'kibana.alert.rule.name': 'Rule B' };
    const esClient = makeClient(
      [
        { _id: 'newer', _source: source1 },
        { _id: 'older', _source: source2 },
      ],
      { value: 42, relation: 'eq' }
    );

    const result = await getAlertsByTags({ esClient, index, tags: ['az:proposal:p1'] });

    expect(result).toEqual({
      total: 42,
      alerts: [
        { id: 'newer', source: source1 },
        { id: 'older', source: source2 },
      ],
    });
  });

  it('skips hits that are missing _id or _source', async () => {
    const esClient = makeClient([
      { _id: 'abc', _source: { 'kibana.alert.rule.name': 'Rule A' } },
      { _id: 'def' },
      { _source: { 'kibana.alert.rule.name': 'Rule C' } },
    ]);

    const { alerts } = await getAlertsByTags({ esClient, index, tags: ['az:proposal:p1'] });

    expect(alerts.map(({ id }) => id)).toEqual(['abc']);
  });
});
