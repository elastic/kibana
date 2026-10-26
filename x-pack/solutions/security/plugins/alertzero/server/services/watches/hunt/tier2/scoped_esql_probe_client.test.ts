/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { scopedEsqlProbeClient } from './scoped_esql_probe_client';

const ALLOWED = ['logs-aws.*'];

const buildEsClient = () => {
  const query = jest.fn().mockResolvedValue({ columns: [], values: [] });
  const asyncQuery = jest.fn().mockResolvedValue({ id: 'q1' });
  const ping = jest.fn().mockResolvedValue(true);
  const esClient = {
    esql: { query, asyncQuery },
    ping,
  } as unknown as ElasticsearchClient;
  return { esClient, query, asyncQuery, ping };
};

describe('scopedEsqlProbeClient', () => {
  it('delegates an in-scope FROM to the underlying esql.query', async () => {
    const { esClient, query } = buildEsClient();
    const scoped = scopedEsqlProbeClient(esClient, ALLOWED);

    await scoped.esql.query({ query: 'FROM logs-aws.cloudtrail-* | LIMIT 1' });

    expect(query).toHaveBeenCalledWith({ query: 'FROM logs-aws.cloudtrail-* | LIMIT 1' });
  });

  it('returns the underlying response for an in-scope query', async () => {
    const { esClient, query } = buildEsClient();
    query.mockResolvedValue({ columns: [{ name: 'a' }], values: [['x']] });
    const scoped = scopedEsqlProbeClient(esClient, ALLOWED);

    await expect(scoped.esql.query({ query: 'FROM logs-aws.* | LIMIT 1' })).resolves.toEqual({
      columns: [{ name: 'a' }],
      values: [['x']],
    });
  });

  it('rejects an out-of-scope FROM without touching the underlying client', async () => {
    const { esClient, query } = buildEsClient();
    const scoped = scopedEsqlProbeClient(esClient, ALLOWED);

    await expect(scoped.esql.query({ query: 'FROM .kibana-secrets | LIMIT 1' })).rejects.toThrow(
      'refused to probe an out-of-scope generated query'
    );
    expect(query).not.toHaveBeenCalled();
  });

  it('rejects a query that does not start with FROM without touching the underlying client', async () => {
    const { esClient, query } = buildEsClient();
    const scoped = scopedEsqlProbeClient(esClient, ALLOWED);

    await expect(scoped.esql.query({ query: 'ROW x = 1 | LIMIT 1' })).rejects.toThrow(
      'refused to probe an out-of-scope generated query'
    );
    expect(query).not.toHaveBeenCalled();
  });

  it('rejects a query whose later command reaches outside the scope', async () => {
    const { esClient, query } = buildEsClient();
    const scoped = scopedEsqlProbeClient(esClient, ALLOWED);

    await expect(
      scoped.esql.query({
        query: 'FROM logs-aws.* | LOOKUP JOIN .kibana-secrets ON host.name | LIMIT 1',
      })
    ).rejects.toThrow('refused to probe an out-of-scope generated query');
    expect(query).not.toHaveBeenCalled();
  });

  it('passes other esql methods through to the underlying client, bound to it', async () => {
    const { esClient, asyncQuery } = buildEsClient();
    const scoped = scopedEsqlProbeClient(esClient, ALLOWED);

    await scoped.esql.asyncQuery({ query: 'FROM anything' });

    expect(asyncQuery).toHaveBeenCalledWith({ query: 'FROM anything' });
  });

  it('passes non-esql methods through to the underlying client', async () => {
    const { esClient, ping } = buildEsClient();
    const scoped = scopedEsqlProbeClient(esClient, ALLOWED);

    await scoped.ping();

    expect(ping).toHaveBeenCalledTimes(1);
  });
});
