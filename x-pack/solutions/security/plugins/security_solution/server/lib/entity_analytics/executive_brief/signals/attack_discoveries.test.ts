/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { getAlertEntities } from '../../../../workflows/step_types/get_alert_entities_step/get_alert_entities';
import {
  attackDiscoveriesSignal,
  buildDiscoveryVisibilityQuery,
  dedupeDiscoveries,
} from './attack_discoveries';
import type { DiscoveryInfo } from './attack_discoveries';
import type { SignalContext } from './types';

jest.mock('../../../../workflows/step_types/get_alert_entities_step/get_alert_entities', () => ({
  getAlertEntities: jest.fn(),
}));
const getAlertEntitiesMock = getAlertEntities as jest.MockedFunction<typeof getAlertEntities>;

const SCHEDULED = '.alerts-security.attack.discovery.alerts-default';
const AD_HOC = '.adhoc.alerts-security.attack.discovery.alerts-default';
const ALERTS = '.alerts-security.alerts-default';
const USERS = 'kibana.alert.attack_discovery.users';

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

const indexNotFound = () =>
  Object.assign(new Error('index_not_found_exception'), {
    meta: { body: { error: { type: 'index_not_found_exception' } } },
  });

const discoveryHit = (id: string, alertIds: string[]): Partial<estypes.SearchHit<unknown>> => ({
  _id: id,
  fields: {
    '@timestamp': ['2026-10-07T10:00:00.000Z'],
    'kibana.alert.attack_discovery.alert_ids': alertIds,
    'kibana.alert.attack_discovery.title': [`Discovery ${id}`],
    'kibana.alert.attack_discovery.mitre_attack_tactics': ['Initial Access', 'Lateral Movement'],
    'kibana.alert.workflow_status': ['open'],
  },
});

const createCtx = () => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const ctx: SignalContext = {
    esClient,
    spaceId: 'default',
    timeRange: { from: '2026-10-05T00:00:00.000Z', to: '2026-10-12T00:00:00.000Z' },
    now: new Date('2026-10-12T00:00:00.000Z'),
    logger: loggingSystemMock.createLogger(),
    user: { username: 'analyst' },
    getCasesClient: async () => undefined,
  };
  return { ctx, esClient };
};

const info = (
  id: string,
  alertIds: string[],
  extra: Partial<DiscoveryInfo> = {}
): DiscoveryInfo => ({
  id,
  title: id,
  alertIds,
  at: '2026-10-07T10:00:00.000Z',
  tactics: [],
  workflowStatus: 'open',
  ...extra,
});

describe('attack_discoveries', () => {
  beforeEach(() => getAlertEntitiesMock.mockReset());

  describe('buildDiscoveryVisibilityQuery', () => {
    const shared = {
      bool: {
        must_not: [{ nested: { path: USERS, query: { exists: { field: `${USERS}.name` } } } }],
      },
    };

    it("matches shared discoveries and the user's own", () => {
      expect(buildDiscoveryVisibilityQuery('analyst')).toEqual({
        bool: {
          should: [
            shared,
            { nested: { path: USERS, query: { term: { [`${USERS}.name`]: 'analyst' } } } },
          ],
          minimum_should_match: 1,
        },
      });
    });

    it('matches only shared discoveries when there is no username', () => {
      expect(buildDiscoveryVisibilityQuery(undefined)).toEqual({
        bool: { should: [shared], minimum_should_match: 1 },
      });
    });
  });

  describe('dedupeDiscoveries', () => {
    it.each([
      {
        name: 'keeps the riskiest of overlapping regenerations',
        input: [info('a', ['1', '2', '3']), info('b', ['1', '2', '3', '4'], { riskScore: 90 })],
        kept: ['b'],
      },
      {
        name: 'keeps the newest when risk is equal',
        input: [
          info('old', ['1', '2'], { at: '2026-10-06T00:00:00.000Z' }),
          info('new', ['1', '2'], { at: '2026-10-08T00:00:00.000Z' }),
        ],
        kept: ['new'],
      },
      {
        name: 'collapses at exactly 0.5 overlap',
        input: [info('a', ['1', '2', '3'], { riskScore: 50 }), info('b', ['2', '3', '4'])],
        kept: ['a'],
      },
      {
        name: 'keeps discoveries below 0.5 overlap',
        input: [info('a', ['1', '2', '3'], { riskScore: 50 }), info('b', ['3', '4', '5'])],
        kept: ['a', 'b'],
      },
    ])('$name', ({ input, kept }) => {
      expect(dedupeDiscoveries(input).map(({ id }) => id)).toEqual(kept);
    });
  });

  it('reads only visible, non-closed discoveries and collapses regenerations before resolving entities', async () => {
    const { ctx, esClient } = createCtx();
    esClient.search.mockImplementation((async (request: estypes.SearchRequest) => {
      if (request.index === SCHEDULED) {
        return response([
          discoveryHit('ad-1', ['a1', 'a2', 'a3']),
          // Overlaps ad-1 almost fully: a regeneration of the same attack.
          discoveryHit('ad-1b', ['a1', 'a2', 'a3', 'a4']),
        ]);
      }
      if (request.index === AD_HOC) {
        throw indexNotFound();
      }
      if (request.index === ALERTS) {
        return response([], { discoveries: { buckets: { 'ad-1': { risk: { value: 73 } } } } });
      }
      // Entity store: the alias resolves to the golden user.
      return response([
        {
          _source: {
            entity: {
              id: 'user:ann@h1@local',
              relationships: { resolution: { resolved_to: 'user:ann@okta' } },
            },
          },
        },
        {
          _source: {
            entity: { id: 'user:ann@okta', name: 'ann', EngineMetadata: { Type: 'user' } },
          },
        },
      ]);
    }) as unknown as typeof esClient.search);
    getAlertEntitiesMock.mockResolvedValue({
      entities: [
        { id: 'host:h1', name: 'h1', type: 'host' },
        { id: 'user:ann@h1@local', name: 'ann', type: 'user' },
        { id: 'user:ann@okta', name: 'ann', type: 'user' },
      ],
      total: 3,
      truncated: false,
    });

    const output = await attackDiscoveriesSignal.run(ctx, {}, new AbortController().signal);

    const discoveryRequest = esClient.search.mock.calls
      .map(([request]) => request as estypes.SearchRequest)
      .find(({ index }) => index === SCHEDULED);
    expect(discoveryRequest?.query).toEqual({
      bool: {
        filter: [
          {
            range: {
              '@timestamp': { gte: '2026-10-05T00:00:00.000Z', lte: '2026-10-12T00:00:00.000Z' },
            },
          },
          buildDiscoveryVisibilityQuery('analyst'),
        ],
        must_not: [{ term: { 'kibana.alert.workflow_status': 'closed' } }],
      },
    });
    expect(getAlertEntitiesMock).toHaveBeenCalledTimes(1);
    expect(getAlertEntitiesMock.mock.calls[0][0].alertIds).toEqual(['a1', 'a2', 'a3']);

    const golden = { euid: 'user:ann@okta', type: 'user', name: 'ann' };
    const host = { euid: 'host:h1', type: 'host', name: 'h1' };
    expect(output).toEqual({
      facts: [
        {
          kind: 'attack_discovery',
          title: 'Discovery ad-1',
          at: '2026-10-07T10:00:00.000Z',
          severity: 'high',
          entities: [host, golden],
          numbers: { alerts: 3 },
          details: { status: 'open', tactics: 'Initial Access, Lateral Movement' },
          source: { type: 'attack_discovery', id: 'ad-1', name: 'Discovery ad-1' },
        },
      ],
      links: [{ type: 'same_attack', from: host, to: golden, factIndexes: [0] }],
      candidates: [host, golden],
    });
  });
});
