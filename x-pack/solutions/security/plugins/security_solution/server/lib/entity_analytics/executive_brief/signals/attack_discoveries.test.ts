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
  sameAttackLinks,
} from './attack_discoveries';
import type { DiscoveryInfo } from './attack_discoveries';
import { SignalUnavailableError } from './define_signal';
import type { EntityRef, SignalContext } from './types';

jest.mock('../../../../workflows/step_types/get_alert_entities_step/get_alert_entities', () => ({
  getAlertEntities: jest.fn(),
}));
const getAlertEntitiesMock = getAlertEntities as jest.MockedFunction<typeof getAlertEntities>;

type SearchRequest = estypes.SearchRequest;

const SCHEDULED = '.alerts-security.attack.discovery.alerts-default';
const AD_HOC = '.adhoc.alerts-security.attack.discovery.alerts-default';

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

const discoveryHit = (
  id: string,
  alertIds: string[],
  extra: Record<string, unknown[]> = {}
): Partial<estypes.SearchHit<unknown>> => ({
  _id: id,
  fields: {
    '@timestamp': ['2026-10-07T10:00:00.000Z'],
    'kibana.alert.attack_discovery.alert_ids': alertIds,
    'kibana.alert.attack_discovery.title': [`Discovery ${id}`],
    'kibana.alert.attack_discovery.mitre_attack_tactics': ['Initial Access', 'Lateral Movement'],
    'kibana.alert.workflow_status': ['open'],
    ...extra,
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

const info = (id: string, alertIds: string[], riskScore?: number): DiscoveryInfo => ({
  id,
  title: id,
  alertIds,
  at: '2026-10-07T10:00:00.000Z',
  tactics: [],
  workflowStatus: 'open',
  ...(riskScore !== undefined ? { riskScore } : {}),
});

const ref = (euid: string): EntityRef => ({ euid, type: 'host', name: euid });

describe('attack_discoveries', () => {
  beforeEach(() => getAlertEntitiesMock.mockReset());

  it('builds an own-or-shared visibility filter', () => {
    expect(JSON.stringify(buildDiscoveryVisibilityQuery('analyst'))).toContain('"analyst"');
    const query = buildDiscoveryVisibilityQuery(undefined) as { bool: { should: unknown[] } };
    expect(query.bool.should).toHaveLength(1);
  });

  it('collapses regenerated discoveries by alert-id overlap, keeping the riskiest', () => {
    const kept = dedupeDiscoveries([
      info('a', ['1', '2', '3']),
      info('b', ['1', '2', '3', '4'], 90),
      info('c', ['7', '8']),
    ]);
    expect(kept.map(({ id }) => id)).toEqual(['b', 'c']);
  });

  it('links every pair of a small discovery, and a star for a large one', () => {
    expect(sameAttackLinks([ref('a'), ref('b'), ref('c')], 0)).toHaveLength(3);
    const star = sameAttackLinks(
      Array.from({ length: 8 }, (_, i) => ref(`e${i}`)),
      2
    );
    expect(star).toHaveLength(7);
    expect(
      star.every(({ from, factIndexes }) => from.euid === 'e0' && factIndexes?.[0] === 2)
    ).toBe(true);
  });

  it('emits a fact per discovery, same_attack links between golden entities, and candidates', async () => {
    const ctx = createCtx();
    ctx.esClient.search.mockImplementation((async (request: SearchRequest) => {
      if (request.index === SCHEDULED) {
        return response([
          discoveryHit('ad-1', ['a1', 'a2', 'a3']),
          // Overlaps ad-1 almost fully: a regeneration.
          discoveryHit('ad-1b', ['a1', 'a2', 'a3', 'a4']),
        ]);
      }
      if (request.index === AD_HOC) {
        throw indexNotFound();
      }
      if (request.index === '.alerts-security.alerts-default') {
        const filters = Object.keys(
          (request.aggs?.discoveries?.filters?.filters ?? {}) as Record<string, unknown>
        );
        return response([], {
          discoveries: {
            buckets: Object.fromEntries(filters.map((id) => [id, { risk: { value: 73 } }])),
          },
        });
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
    }) as unknown as typeof ctx.esClient.search);
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

    const scheduledRequest = ctx.esClient.search.mock.calls
      .map(([request]) => request as SearchRequest)
      .find(({ index }) => index === SCHEDULED);
    expect(JSON.stringify(scheduledRequest?.query)).toContain('"analyst"');
    expect(JSON.stringify(scheduledRequest?.query)).toContain('closed');
    expect(getAlertEntitiesMock).toHaveBeenCalledTimes(1);

    const golden = { euid: 'user:ann@okta', type: 'user', name: 'ann' };
    const host = { euid: 'host:h1', type: 'host', name: 'h1' };
    expect(output.facts).toEqual([
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
    ]);
    expect(output.links).toEqual([
      { type: 'same_attack', from: host, to: golden, factIndexes: [0] },
    ]);
    expect(output.candidates).toEqual([host, golden]);
  });

  it('is unavailable when neither discovery index exists', async () => {
    const ctx = createCtx();
    ctx.esClient.search.mockRejectedValue(indexNotFound());
    await expect(
      attackDiscoveriesSignal.run(ctx, {}, new AbortController().signal)
    ).rejects.toBeInstanceOf(SignalUnavailableError);
  });

  it('keeps a discovery whose entities could not be resolved', async () => {
    const ctx = createCtx();
    ctx.esClient.search.mockImplementation((async (request: SearchRequest) =>
      request.index === SCHEDULED
        ? response([discoveryHit('ad-1', ['a1'], { 'kibana.alert.risk_score': [99] })])
        : response([])) as unknown as typeof ctx.esClient.search);
    getAlertEntitiesMock.mockRejectedValue(new Error('alerts unreadable'));

    const output = await attackDiscoveriesSignal.run(ctx, {}, new AbortController().signal);
    expect(output.facts).toHaveLength(1);
    expect(output.facts[0]).toMatchObject({ severity: 'critical', entities: [] });
    expect(output.links).toEqual([]);
    expect(ctx.logger.warn).toHaveBeenCalledWith(expect.stringContaining('alerts unreadable'));
  });
});
