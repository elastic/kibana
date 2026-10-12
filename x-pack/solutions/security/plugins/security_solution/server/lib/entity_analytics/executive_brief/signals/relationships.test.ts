/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { relationshipsSignal } from './relationships';
import type { EntityRef, SignalContext } from './types';

const USER: EntityRef = {
  euid: 'user:a.rodriguez@acme.example@okta',
  type: 'user',
  name: 'a.rodriguez',
};
const HOST_A: EntityRef = { euid: 'host:laptop', type: 'host', name: 'LAPTOP-FIN03' };
const HOST_B: EntityRef = { euid: 'host:jump-box', type: 'host', name: 'jump-box-01' };
const HOST_C: EntityRef = { euid: 'host:docker', type: 'host', name: 'docker-host-prod-01' };
const ALIAS = 'user:a.rodriguez@jump-box@local';
const OUTSIDER = 'host:not-a-candidate';

const timeRange = { from: '2026-10-05T00:00:00.000Z', to: '2026-10-12T00:00:00.000Z' };

const groupHits = {
  hits: {
    hits: [
      {
        fields: {
          'entity.id': [USER.euid],
          'entity.relationships.owns.ids': [HOST_A.euid],
          'entity.relationships.accesses_frequently.ids': [HOST_A.euid],
          'entity.relationships.accesses_infrequently.ids': [HOST_C.euid, OUTSIDER],
        },
      },
      {
        fields: {
          'entity.id': [ALIAS],
          'entity.relationships.resolution.resolved_to': [USER.euid],
          'entity.relationships.accesses_infrequently.ids': [HOST_B.euid],
          'entity.relationships.communicates_with.ids': [HOST_B.euid],
        },
      },
      { fields: { 'entity.id': [HOST_A.euid] } },
      { fields: { 'entity.id': [HOST_B.euid] } },
      { fields: { 'entity.id': [HOST_C.euid] } },
    ],
  },
};

const firstSeenAggregations = (communicatesStart: string) => ({
  aggregations: {
    history_accesses_frequently: { start: { value_as_string: '2026-09-20T00:00:00.000Z' } },
    history_accesses_infrequently: { start: { value_as_string: '2026-09-20T00:00:00.000Z' } },
    history_communicates_with: { start: { value_as_string: communicatesStart } },
    history_owns: { start: { value_as_string: '2026-09-20T00:00:00.000Z' } },
    scoped_accesses_frequently: {
      actors: {
        buckets: [
          {
            key: USER.euid,
            // Right after the first (backfilling) run: not a real first-seen.
            targets: {
              buckets: [
                { key: HOST_A.euid, first: { value_as_string: '2026-09-20T01:00:00.000Z' } },
              ],
            },
          },
        ],
      },
    },
    scoped_accesses_infrequently: {
      actors: {
        buckets: [
          {
            key: ALIAS,
            targets: {
              buckets: [
                { key: HOST_B.euid, first: { value_as_string: '2026-10-08T03:00:00.000Z' } },
              ],
            },
          },
          {
            key: USER.euid,
            // Before the window: the link keeps it, there is no fact.
            targets: {
              buckets: [
                { key: HOST_C.euid, first: { value_as_string: '2026-10-01T03:00:00.000Z' } },
              ],
            },
          },
        ],
      },
    },
    scoped_communicates_with: {
      actors: {
        buckets: [
          {
            key: ALIAS,
            targets: {
              buckets: [
                { key: HOST_B.euid, first: { value_as_string: '2026-10-11T10:00:00.000Z' } },
              ],
            },
          },
        ],
      },
    },
    scoped_owns: { actors: { buckets: [] } },
  },
});

describe('relationshipsSignal', () => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const abortSignal = new AbortController().signal;
  const ctx: SignalContext = {
    esClient,
    spaceId: 'default',
    timeRange,
    now: new Date(timeRange.to),
    logger: loggingSystemMock.createLogger(),
    user: { username: 'elastic' },
    getCasesClient: async () => undefined,
  };
  const entities = [USER, HOST_A, HOST_B, HOST_C];

  beforeEach(() => {
    jest.clearAllMocks();
    esClient.search.mockReset();
  });

  describe('isAvailable', () => {
    it('is available when entities carry relationships', async () => {
      esClient.count.mockResolvedValue({ count: 3 } as never);

      expect(await relationshipsSignal.isAvailable(ctx)).toEqual({ available: true });
      expect(esClient.count).toHaveBeenCalledWith(
        expect.objectContaining({ index: 'entities-latest-default', terminate_after: 1 })
      );
    });

    it('is unavailable when no relationships were computed', async () => {
      esClient.count.mockResolvedValue({ count: 0 } as never);

      expect(await relationshipsSignal.isAvailable(ctx)).toEqual({
        available: false,
        reason: 'No entity relationships have been computed yet',
      });
    });

    it('is unavailable when the Entity Store index is missing', async () => {
      esClient.count.mockRejectedValue({
        meta: { body: { error: { type: 'index_not_found_exception' } } },
      });

      expect(await relationshipsSignal.isAvailable(ctx)).toEqual({
        available: false,
        reason: 'The Entity Store has not been set up',
      });
    });

    it('rethrows other errors', async () => {
      esClient.count.mockRejectedValue(new Error('boom'));

      await expect(relationshipsSignal.isAvailable(ctx)).rejects.toThrow('boom');
    });
  });

  describe('run', () => {
    it('queries the metadata log for the actor and target groups with the abort signal', async () => {
      esClient.search
        .mockResolvedValueOnce(groupHits as never)
        .mockResolvedValueOnce(firstSeenAggregations('2026-09-20T00:00:00.000Z') as never);

      await relationshipsSignal.run(ctx, { entities }, abortSignal);

      const [groupRequest, groupOptions] = esClient.search.mock.calls[0] as [
        estypes.SearchRequest,
        { signal: AbortSignal }
      ];
      expect(groupRequest.index).toBe('entities-latest-default');
      expect(groupOptions.signal).toBe(abortSignal);

      const [request, options] = esClient.search.mock.calls[1] as [
        estypes.SearchRequest,
        { signal: AbortSignal }
      ];
      expect(request).toMatchObject({
        index: 'entities-metadata-default',
        size: 0,
        query: { term: { 'event.action': 'relationship_observed' } },
      });
      expect(Object.keys(request.aggs ?? {}).sort()).toEqual([
        'history_accesses_frequently',
        'history_accesses_infrequently',
        'history_communicates_with',
        'history_owns',
        'scoped_accesses_frequently',
        'scoped_accesses_infrequently',
        'scoped_communicates_with',
        'scoped_owns',
      ]);
      expect(JSON.stringify(request.aggs?.scoped_accesses_infrequently)).toContain(ALIAS);
      expect(options.signal).toBe(abortSignal);
    });

    it('links only candidate pairs, maps infrequent access to accesses_rarely and applies the backfill guard', async () => {
      esClient.search
        .mockResolvedValueOnce(groupHits as never)
        .mockResolvedValueOnce(firstSeenAggregations('2026-10-11T00:00:00.000Z') as never);

      const { facts, links } = await relationshipsSignal.run(ctx, { entities }, abortSignal);

      expect(links).toEqual([
        { type: 'accesses_frequently', from: USER, to: HOST_A },
        { type: 'accesses_rarely', from: USER, to: HOST_C, firstSeen: '2026-10-01T03:00:00.000Z' },
        {
          type: 'accesses_rarely',
          from: USER,
          to: HOST_B,
          factIndexes: [0],
          firstSeen: '2026-10-08T03:00:00.000Z',
        },
        // Communicates-with history is only one day long, so no first-seen is trusted.
        { type: 'communicates_with', from: USER, to: HOST_B },
        { type: 'owns', from: USER, to: HOST_A },
      ]);
      expect(JSON.stringify(links)).not.toContain(OUTSIDER);
      expect(facts).toEqual([
        {
          kind: 'relationship_first_seen',
          title: 'First-ever logon: a.rodriguez → jump-box-01',
          at: '2026-10-08T03:00:00.000Z',
          entities: [USER, HOST_B],
          details: { relationship: 'accesses_rarely' },
        },
      ]);
    });

    it('suppresses every first-seen when relationship history is shorter than three days', async () => {
      esClient.search.mockResolvedValueOnce(groupHits as never).mockResolvedValueOnce({
        aggregations: {
          ...firstSeenAggregations('2026-09-20T00:00:00.000Z').aggregations,
          history_accesses_infrequently: { start: { value_as_string: '2026-10-11T00:00:00.000Z' } },
        },
      } as never);

      const { facts, links } = await relationshipsSignal.run(ctx, { entities }, abortSignal);

      expect(facts).toEqual([]);
      expect(links?.some((link) => link.type === 'accesses_rarely' && link.firstSeen)).toBe(false);
    });

    it('returns nothing without querying when there are fewer than two candidates', async () => {
      expect(await relationshipsSignal.run(ctx, { entities: [USER] }, abortSignal)).toEqual({
        facts: [],
        links: [],
      });
      expect(esClient.search).not.toHaveBeenCalled();
    });

    it('does not query the metadata log when no candidates are related', async () => {
      esClient.search.mockResolvedValueOnce({
        hits: {
          hits: [
            { fields: { 'entity.id': [USER.euid] } },
            { fields: { 'entity.id': [HOST_A.euid] } },
          ],
        },
      } as never);

      expect(await relationshipsSignal.run(ctx, { entities: [USER, HOST_A] }, abortSignal)).toEqual(
        {
          facts: [],
          links: [],
        }
      );
      expect(esClient.search).toHaveBeenCalledTimes(1);
    });
  });
});
