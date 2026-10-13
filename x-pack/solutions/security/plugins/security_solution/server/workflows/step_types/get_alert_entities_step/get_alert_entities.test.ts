/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { getAlertEntities } from './get_alert_entities';

const response = {
  aggregations: {
    host_count: { value: 1 },
    host_entities: {
      buckets: [
        {
          doc_count: 2,
          key: 'host:572750b8',
          latest: { hits: { hits: [{ fields: { 'host.name': ['SRVWIN01'] } }] } },
        },
      ],
    },
    user_count: { value: 1 },
    user_entities: {
      buckets: [
        {
          doc_count: 2,
          key: 'user:Administrator@572750b8@local',
          latest: {
            hits: {
              hits: [{ fields: { 'host.name': ['SRVWIN01'], 'user.name': ['Administrator'] } }],
            },
          },
        },
      ],
    },
  },
};

const responseError = (statusCode: number, type: string): errors.ResponseError =>
  new errors.ResponseError({
    body: { error: { type } },
    headers: {},
    meta: {},
    statusCode,
    warnings: null,
  } as unknown as ConstructorParameters<typeof errors.ResponseError>[0]);

const createClient = (value: unknown = response) => {
  const search = jest.fn().mockResolvedValue(value);

  return { client: { search } as unknown as ElasticsearchClient, search };
};

describe('getAlertEntities', () => {
  it('returns the entities of the alerts, named and ranked', async () => {
    const { client } = createClient();

    expect(
      await getAlertEntities({
        alertIds: ['a', 'b'],
        entityTypes: ['host', 'user'],
        esClient: client,
        maxEntities: 50,
        spaceId: 'default',
      })
    ).toEqual({
      entities: [
        { id: 'host:572750b8', name: 'SRVWIN01', type: 'host' },
        { id: 'user:Administrator@572750b8@local', name: 'Administrator@SRVWIN01', type: 'user' },
      ],
      total: 2,
      truncated: false,
    });
  });

  it('searches only the alerts index of the space', async () => {
    const { client, search } = createClient();

    await getAlertEntities({
      alertIds: ['a'],
      entityTypes: ['host'],
      esClient: client,
      maxEntities: 5,
      spaceId: 'agent-1',
    });

    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({ index: '.alerts-security.alerts-agent-1' }),
      expect.anything()
    );
  });

  it('reads only the alerts it was given, and no documents', async () => {
    const { client, search } = createClient();

    await getAlertEntities({
      alertIds: ['a', 'b'],
      entityTypes: ['host'],
      esClient: client,
      maxEntities: 5,
      spaceId: 'default',
    });

    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({ query: { ids: { values: ['a', 'b'] } }, size: 0 }),
      expect.anything()
    );
  });

  it('reaches alerts in rolled-over and hidden backing indices', async () => {
    const { client, search } = createClient();

    await getAlertEntities({
      alertIds: ['a'],
      entityTypes: ['host'],
      esClient: client,
      maxEntities: 5,
      spaceId: 'default',
    });

    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({ expand_wildcards: ['open', 'hidden'] }),
      expect.anything()
    );
  });

  // `ignore_unavailable` would turn an alerts index the principal cannot read into an empty
  // result, which reads as "the alerts name no host or user".
  it('does not ignore an index it cannot search', async () => {
    const { client, search } = createClient();

    await getAlertEntities({
      alertIds: ['a'],
      entityTypes: ['host'],
      esClient: client,
      maxEntities: 5,
      spaceId: 'default',
    });

    expect(search.mock.calls[0][0]).not.toHaveProperty('ignore_unavailable');
  });

  // A smaller `size` would let Elasticsearch drop an entity from a shard's candidate list when
  // the alerts span several backing indices, and the cap could then keep the wrong entities.
  it('counts every entity the alerts reference, and caps only after ranking', async () => {
    const { client, search } = createClient();

    await getAlertEntities({
      alertIds: ['a', 'b', 'c'],
      entityTypes: ['host'],
      esClient: client,
      maxEntities: 1,
      spaceId: 'default',
    });

    expect(search.mock.calls[0][0].aggs.host_entities.terms.size).toBe(3);
  });

  // A partial result would be a short entity list reported as complete.
  it('asks Elasticsearch to reject partial results', async () => {
    const { client, search } = createClient();

    await getAlertEntities({
      alertIds: ['a'],
      entityTypes: ['host'],
      esClient: client,
      maxEntities: 5,
      spaceId: 'default',
    });

    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({ allow_partial_search_results: false }),
      expect.anything()
    );
  });

  it.each([
    ['timed out', { ...response, timed_out: true }],
    ['had a shard fail', { ...response, _shards: { failed: 1, successful: 1, total: 2 } }],
  ])(
    'rejects a response that %s rather than returning partial entities',
    async (_label, partial) => {
      const { client } = createClient(partial);

      await expect(
        getAlertEntities({
          alertIds: ['a'],
          entityTypes: ['host', 'user'],
          esClient: client,
          maxEntities: 5,
          spaceId: 'default',
        })
      ).rejects.toThrow('Could not read every alert: the search returned partial results');
    }
  );

  it('accepts a complete response', async () => {
    const { client } = createClient({
      ...response,
      _shards: { failed: 0, successful: 2, total: 2 },
      timed_out: false,
    });

    expect(
      (
        await getAlertEntities({
          alertIds: ['a'],
          entityTypes: ['host', 'user'],
          esClient: client,
          maxEntities: 5,
          spaceId: 'default',
        })
      ).total
    ).toBe(2);
  });

  // A space where detection has never written an alert has no alerts index yet.
  it('is empty when the space has no alerts index', async () => {
    const search = jest.fn().mockRejectedValue(responseError(404, 'index_not_found_exception'));

    expect(
      await getAlertEntities({
        alertIds: ['a'],
        entityTypes: ['host', 'user'],
        esClient: { search } as unknown as ElasticsearchClient,
        maxEntities: 5,
        spaceId: 'default',
      })
    ).toEqual({ entities: [], total: 0, truncated: false });
  });

  it('lets a search the principal may not run reject', async () => {
    const search = jest.fn().mockRejectedValue(responseError(403, 'security_exception'));

    await expect(
      getAlertEntities({
        alertIds: ['a'],
        entityTypes: ['host'],
        esClient: { search } as unknown as ElasticsearchClient,
        maxEntities: 5,
        spaceId: 'default',
      })
    ).rejects.toBeInstanceOf(errors.ResponseError);
  });

  // The index name is built from the space id, so a wildcard or a comma would widen the
  // search to other spaces' alerts.
  it.each([['*'], ['default,agent-1'], ['']])(
    'rejects the space id %p without searching',
    async (spaceId) => {
      const { client, search } = createClient();

      await expect(
        getAlertEntities({
          alertIds: ['a'],
          entityTypes: ['host'],
          esClient: client,
          maxEntities: 5,
          spaceId,
        })
      ).rejects.toThrow('Invalid space id');
      expect(search).not.toHaveBeenCalled();
    }
  );

  it('asks for only the requested types', async () => {
    const { client, search } = createClient();

    await getAlertEntities({
      alertIds: ['a'],
      entityTypes: ['service'],
      esClient: client,
      maxEntities: 5,
      spaceId: 'default',
    });

    const request = search.mock.calls[0][0];

    expect(Object.keys(request.runtime_mappings)).toEqual(['entity_service']);
  });

  it('passes the abort signal to the search', async () => {
    const { client, search } = createClient();
    const { signal } = new AbortController();

    await getAlertEntities({
      abortSignal: signal,
      alertIds: ['a'],
      entityTypes: ['host'],
      esClient: client,
      maxEntities: 5,
      spaceId: 'default',
    });

    expect(search).toHaveBeenCalledWith(expect.anything(), { signal });
  });

  it('is empty when the search found no aggregations', async () => {
    const { client } = createClient({});

    expect(
      await getAlertEntities({
        alertIds: ['a'],
        entityTypes: ['host', 'user'],
        esClient: client,
        maxEntities: 5,
        spaceId: 'default',
      })
    ).toEqual({ entities: [], total: 0, truncated: false });
  });

  it('lets a failed search reject', async () => {
    const search = jest.fn().mockRejectedValue(new Error('boom'));

    await expect(
      getAlertEntities({
        alertIds: ['a'],
        entityTypes: ['host'],
        esClient: { search } as unknown as ElasticsearchClient,
        maxEntities: 5,
        spaceId: 'default',
      })
    ).rejects.toThrow('boom');
  });
});
