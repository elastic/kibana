/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { alertActivitySignal, mergePairs } from './alert_activity';
import type { CoAlertPair } from './alert_activity';
import { identityResolution } from './resolve_entities';
import type { EntityRef, SignalContext } from './types';

type SearchRequest = estypes.SearchRequest;

const ALERTS = '.alerts-security.alerts-default';
const GOLDEN = 'user:ann@okta';
const ALIAS_1 = 'user:ann@h1@local';
const ALIAS_2 = 'user:ann@h2@local';

const response = (
  hits: Array<Partial<estypes.SearchHit<unknown>>>,
  aggregations?: Record<string, unknown>
): estypes.SearchResponse<unknown> =>
  ({
    took: 1,
    timed_out: false,
    _shards: { total: 1, successful: 1, failed: 0, skipped: 0 },
    hits: { hits: hits.map((hit) => ({ _index: 'i', ...hit })) },
    ...(aggregations ? { aggregations } : {}),
  } as estypes.SearchResponse<unknown>);

const entityBucket = (
  key: string,
  count: number,
  options: { risk?: number; open?: number; name?: string; nameField?: string; first?: string } = {}
) => ({
  key,
  doc_count: count,
  risk: { value: options.risk ?? 47 },
  open: { doc_count: options.open ?? count },
  first: { value_as_string: options.first ?? '2026-10-06T00:00:00.000Z' },
  last: { value_as_string: '2026-10-07T00:00:00.000Z' },
  rule_count: { value: 1 },
  tactics: { buckets: [{ key: 'Execution', doc_count: count }] },
  rules: { buckets: [{ key: 'Rule A', doc_count: count }] },
  latest: {
    hits: { hits: [{ fields: { [options.nameField ?? 'user.name']: [options.name ?? key] } }] },
  },
});

const pairBucket = (u: string, h: string, count: number, risk = 47) => ({
  key: { u, h },
  doc_count: count,
  first: { value_as_string: '2026-10-06T00:00:00.000Z' },
  risk: { value: risk },
  tactics: { buckets: [{ key: 'Execution', doc_count: count }] },
  rules: {
    buckets: [
      { key: 'rule-a', doc_count: count, name: { buckets: [{ key: 'Rule A', doc_count: count }] } },
    ],
  },
});

const createCtx = (): SignalContext & {
  esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
} => ({
  esClient: elasticsearchServiceMock.createElasticsearchClient(),
  spaceId: 'default',
  timeRange: { from: '2026-10-05T00:00:00.000Z', to: '2026-10-12T00:00:00.000Z' },
  now: new Date('2026-10-12T00:00:00.000Z'),
  logger: loggingSystemMock.createLogger(),
  user: { username: 'analyst' },
  getCasesClient: async () => undefined,
});

const pair = (user: string, host: string, count: number, maxRisk = 47): CoAlertPair => ({
  user,
  host,
  count,
  maxRisk,
  tactics: new Map(),
  rules: new Map([['rule-a', { name: 'Rule A', count }]]),
});

const refOf = (euid: string): EntityRef => ({ euid, type: 'user', name: euid });

describe('alert_activity', () => {
  describe('mergePairs', () => {
    const resolution = {
      golden: (euid: string) => (euid === ALIAS_1 || euid === ALIAS_2 ? GOLDEN : euid),
      get: () => undefined,
    };

    it('sums alias pairs onto golden pairs before applying the threshold', () => {
      const merged = mergePairs(
        [pair(ALIAS_1, 'host:h1', 1), pair(ALIAS_2, 'host:h1', 1)],
        resolution,
        refOf,
        new Set([GOLDEN])
      );
      expect(merged).toHaveLength(1);
      expect(merged[0]).toMatchObject({ count: 2, user: { euid: GOLDEN } });
      expect(merged[0].rules.get('rule-a')?.count).toBe(2);
    });

    it('keeps a single shared alert only at a high risk score, and only pairs touching the focus', () => {
      const focus = new Set(['host:h1', 'host:h2', 'host:h3']);
      const merged = mergePairs(
        [
          pair('user:x', 'host:h1', 1, 47),
          pair('user:y', 'host:h2', 1, 73),
          pair('user:z', 'host:elsewhere', 5, 99),
          pair('user:w', 'host:h3', 3),
        ],
        identityResolution([]),
        refOf,
        focus
      );
      expect(merged.map(({ user }) => user.euid)).toEqual(['user:w', 'user:y']);
    });

    it('drops pairs that collapse onto one entity', () => {
      expect(mergePairs([pair(ALIAS_1, GOLDEN, 3)], resolution, refOf, new Set([GOLDEN]))).toEqual(
        []
      );
    });
  });

  it('summarises alerted entities per golden entity and links co-alerted users and hosts', async () => {
    const ctx = createCtx();
    ctx.esClient.search.mockImplementation((async (request: SearchRequest) => {
      if (request.index === ALERTS && request.aggs?.users) {
        return response([], {
          users: {
            buckets: [
              entityBucket(ALIAS_1, 3, {
                risk: 73,
                open: 2,
                name: 'ann',
                first: '2026-10-05T10:00:00.000Z',
              }),
              entityBucket(ALIAS_2, 2, { name: 'ann' }),
              entityBucket('user:bob@h9@local', 1, { name: 'bob' }),
            ],
          },
          hosts: {
            buckets: [entityBucket('host:h1', 3, { name: 'h1', nameField: 'host.name' })],
          },
        });
      }
      if (request.index === ALERTS && request.aggs?.pairs) {
        return response([], {
          pairs: {
            buckets: [
              pairBucket(ALIAS_1, 'host:h1', 3, 73),
              pairBucket('user:bob@h9@local', 'host:h9', 1),
            ],
          },
        });
      }
      // Entity store.
      return response([
        {
          _source: {
            entity: { id: ALIAS_1, relationships: { resolution: { resolved_to: GOLDEN } } },
          },
        },
        {
          _source: {
            entity: { id: ALIAS_2, relationships: { resolution: { resolved_to: GOLDEN } } },
          },
        },
        { _source: { entity: { id: GOLDEN, name: 'ann', EngineMetadata: { Type: 'user' } } } },
        {
          _source: {
            entity: { id: 'host:h1', name: 'LAPTOP-1', EngineMetadata: { Type: 'host' } },
          },
        },
      ]);
    }) as unknown as typeof ctx.esClient.search);

    const output = await alertActivitySignal.run(ctx, {}, new AbortController().signal);

    const alertRequests = ctx.esClient.search.mock.calls
      .map(([request]) => request as SearchRequest)
      .filter(({ index }) => index === ALERTS);
    expect(alertRequests).toHaveLength(2);
    alertRequests.forEach((request) => {
      expect(Object.keys(request.runtime_mappings ?? {})).toEqual(['entity_user', 'entity_host']);
      expect(JSON.stringify(request.query)).toContain('kibana.alert.building_block_type');
    });

    const ann = { euid: GOLDEN, type: 'user', name: 'ann' };
    const host = { euid: 'host:h1', type: 'host', name: 'LAPTOP-1' };
    expect(output.facts[0]).toEqual({
      kind: 'alert_activity',
      title: 'ann: 5 alerts',
      at: '2026-10-05T10:00:00.000Z',
      severity: 'high',
      entities: [ann],
      numbers: { alerts: 5, openAlerts: 4, rules: 1 },
      details: { tactics: 'Execution', topRules: 'Rule A', lastAlert: '2026-10-07T00:00:00.000Z' },
    });
    expect(output.facts.slice(1, 3).map(({ title }) => title)).toEqual([
      'LAPTOP-1: 3 alerts',
      'bob: 1 alert',
    ]);
    const pairFact = output.facts[3];
    expect(pairFact).toMatchObject({
      title: 'ann and LAPTOP-1: 3 alerts together',
      entities: [ann, host],
      numbers: { alerts: 3 },
      details: { rules: 'Rule A', tactics: 'Execution' },
      source: { type: 'rule', id: 'rule-a', name: 'Rule A' },
    });
    // bob / h9 shares a single medium alert: below the co-alert threshold.
    expect(output.facts).toHaveLength(4);
    expect(output.links).toEqual([
      {
        type: 'co_alert',
        from: ann,
        to: host,
        factIndexes: [3, 0, 1],
        firstSeen: '2026-10-06T00:00:00.000Z',
      },
    ]);
    expect(output.candidates?.map(({ euid }) => euid)).toEqual([
      GOLDEN,
      'host:h1',
      'user:bob@h9@local',
    ]);
  });

  it('returns nothing for a window without alerts', async () => {
    const ctx = createCtx();
    ctx.esClient.search.mockResolvedValue(
      response([], { users: { buckets: [] }, hosts: { buckets: [] }, pairs: { buckets: [] } })
    );
    const output = await alertActivitySignal.run(ctx, {}, new AbortController().signal);
    expect(output).toEqual({ facts: [] });
  });
});
