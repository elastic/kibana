/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import type { BriefTimeRange } from '../../../../../common/entity_analytics/executive_brief/types';
import { buildEntityRefs } from './alert_queries';
import {
  buildCoAlertEdges,
  buildReverseRelationshipEdges,
  fetchCoAlertPairs,
  fetchInteractionDegrees,
  fetchReverseRelationshipDocs,
  isTrivialLocalPair,
} from './edges';
import type { CoAlertPair } from './edges';
import { parseEntityDoc } from './entity_docs';
import {
  buildDiscoveryVisibilityQuery,
  buildRiskSeeds,
  dedupeDiscoveries,
  discoveryToSeed,
  fetchDiscoveries,
  leadRelatedEdges,
  leadToSeed,
  parseDiscoveryHit,
} from './seeds';
import type { DiscoveryInfo, LeadInfo } from './seeds';
import { FIXTURE_NOW, day } from './__fixtures__/cluster_scenarios';

const timeRange: BriefTimeRange = { from: day(-7), to: FIXTURE_NOW, range: '7d' };

const discovery = (
  id: string,
  alertIds: string[],
  riskScore?: number,
  at = day(-1)
): DiscoveryInfo => ({
  id,
  title: id,
  riskScore,
  workflowStatus: 'open',
  alertIds,
  at,
  tacticNames: [],
});

describe('attack discovery seeds', () => {
  it('dedupes discoveries by alert overlap (Jaccard >= 0.5), keeping the highest risk', () => {
    const kept = dedupeDiscoveries([
      discovery('low', ['a', 'b', 'c', 'd'], 40),
      discovery('high', ['a', 'b', 'c', 'e'], 90), // Jaccard with low = 3/5
      discovery('other', ['x', 'y'], 10),
      discovery('barely', ['a', 'q', 'r', 's'], 30), // 1/7 with high: kept
    ]);
    expect(kept.map((d) => d.id)).toEqual(['high', 'barely', 'other']);
  });

  it('breaks risk ties by recency then id, and caps the count', () => {
    const many = Array.from({ length: 15 }, (_, i) =>
      discovery(`d${String(i).padStart(2, '0')}`, [`x${i}`], 50)
    );
    expect(dedupeDiscoveries(many)).toHaveLength(10);
    const tie = dedupeDiscoveries([
      discovery('old', ['a'], 50, day(-3)),
      discovery('new', ['b'], 50, day(-1)),
    ]);
    expect(tie.map((d) => d.id)).toEqual(['new', 'old']);
  });

  it('builds an own-or-shared visibility filter, shared only when the user is unknown', () => {
    const withUser = JSON.stringify(buildDiscoveryVisibilityQuery('alice'));
    expect(withUser).toContain('"term":{"kibana.alert.attack_discovery.users.name":"alice"}');
    expect(withUser).toContain('"must_not"');
    const sharedOnly = JSON.stringify(buildDiscoveryVisibilityQuery(undefined));
    expect(sharedOnly).not.toContain('"term"');
    expect(sharedOnly).toContain('"must_not"');
  });

  it('parses a hit and rejects hits without alert ids or timestamp', () => {
    const hit = {
      _id: 'ad-1',
      fields: {
        '@timestamp': [day(-1)],
        'kibana.alert.attack_discovery.alert_ids': ['b', 'a', 'a'],
        'kibana.alert.attack_discovery.title': ['Credential theft'],
        'kibana.alert.risk_score': [92],
        'kibana.alert.workflow_status': ['acknowledged'],
      },
    };
    expect(parseDiscoveryHit(hit as never)).toMatchObject({
      id: 'ad-1',
      title: 'Credential theft',
      riskScore: 92,
      workflowStatus: 'acknowledged',
      alertIds: ['a', 'b'],
    });
    expect(
      parseDiscoveryHit({ _id: 'x', fields: { '@timestamp': [day(0)] } } as never)
    ).toBeUndefined();
    expect(
      parseDiscoveryHit({
        _id: 'x',
        fields: { 'kibana.alert.attack_discovery.alert_ids': ['a'] },
      } as never)
    ).toBeUndefined();
  });

  it('converts to a seed with severity risk/100', () => {
    expect(discoveryToSeed(discovery('ad-1', ['a'], 92), ['user:a'])).toMatchObject({
      kind: 'attack_discovery',
      refKey: 'ad:ad-1',
      severity: 0.92,
    });
  });

  describe('fetchDiscoveries', () => {
    const notFound = Object.assign(new Error('missing'), {
      meta: { body: { error: { type: 'index_not_found_exception' } } },
    });
    const hit = {
      _id: 'ad-1',
      fields: {
        '@timestamp': [day(-1)],
        'kibana.alert.attack_discovery.alert_ids': ['a'],
        'kibana.alert.risk_score': [80],
      },
    };

    it('queries both indices, excludes closed, and reads shared-only when the user is unknown', async () => {
      const es = elasticsearchServiceMock.createElasticsearchClient();
      es.security.authenticate.mockRejectedValue(new Error('no'));
      es.search.mockResolvedValue({ hits: { hits: [hit] } } as never);
      const result = await fetchDiscoveries({ esClient: es, spaceId: 'default', timeRange });
      expect(result.ownVisibility).toBe(false);
      expect(result.discoveries.map((d) => d.id)).toEqual(['ad-1']);
      const indices = es.search.mock.calls.map(([request]) => (request as { index: string }).index);
      expect(indices).toEqual([
        '.alerts-security.attack.discovery.alerts-default',
        '.adhoc.alerts-security.attack.discovery.alerts-default',
      ]);
      expect(JSON.stringify(es.search.mock.calls[0][0])).toContain(
        '"kibana.alert.workflow_status":"closed"'
      );
    });

    it('tolerates one missing index but not both, and surfaces other errors', async () => {
      const es = elasticsearchServiceMock.createElasticsearchClient();
      es.security.authenticate.mockResolvedValue({ username: 'alice' } as never);
      es.search
        .mockRejectedValueOnce(notFound)
        .mockResolvedValueOnce({ hits: { hits: [hit] } } as never);
      await expect(
        fetchDiscoveries({ esClient: es, spaceId: 'default', timeRange })
      ).resolves.toMatchObject({
        ownVisibility: true,
      });

      es.search.mockReset();
      es.search.mockRejectedValue(notFound);
      await expect(fetchDiscoveries({ esClient: es, spaceId: 'default', timeRange })).rejects.toBe(
        notFound
      );

      es.search.mockReset();
      es.search.mockRejectedValueOnce(new Error('security_exception')).mockResolvedValueOnce({
        hits: { hits: [] },
      } as never);
      await expect(
        fetchDiscoveries({ esClient: es, spaceId: 'default', timeRange })
      ).rejects.toThrow('security_exception');
    });
  });
});

describe('lead seeds', () => {
  const lead: LeadInfo = {
    id: 'lead-1',
    title: 'Privileged user',
    priority: 8,
    status: 'active',
    entityEuid: 'user:alias',
    createdAt: day(-1, 6),
    timestamp: day(0, 6),
    related: [{ id: 'host:x', kinds: ['owns'] }],
  };

  it('normalises priority to 0..1 and uses the golden subject', () => {
    expect(leadToSeed(lead, 'user:golden')).toEqual({
      kind: 'lead',
      refKey: 'lead:lead-1',
      entityEuids: ['user:golden'],
      severity: 0.8,
      at: day(0, 6),
    });
  });

  it('emits attach-only lead_related edges to golden related entities', () => {
    const golden = (euid: string) => (euid === 'user:alias' ? 'user:golden' : euid);
    expect(leadRelatedEdges(lead, golden)).toEqual([
      { type: 'lead_related', from: 'user:golden', to: 'host:x', refKeys: ['lead:lead-1'] },
    ]);
  });
});

describe('risk seeds', () => {
  it('uses score/100, adds a capped mover bonus, and reports unscored entities', () => {
    const series = [
      { t: day(-3), v: 40 },
      { t: day(-2), v: 80 },
    ];
    const material = buildRiskSeeds({
      kind: 'material_risk',
      candidates: [{ euid: 'host:a', scoreNorm: 75, series }, { euid: 'host:none' }],
      fallbackAt: FIXTURE_NOW,
    });
    expect(material.skipped).toEqual(['host:none']);
    expect(material.seeds).toEqual([
      {
        kind: 'material_risk',
        refKey: 'ent:host:a',
        entityEuids: ['host:a'],
        severity: 0.75,
        at: day(-2),
      },
    ]);

    const movers = buildRiskSeeds({
      kind: 'risk_mover',
      candidates: [
        { euid: 'host:a', scoreNorm: 75, series },
        { euid: 'host:b', scoreNorm: 99, series },
      ],
      fallbackAt: FIXTURE_NOW,
    });
    expect(movers.seeds.map((s) => [s.entityEuids[0], s.severity])).toEqual([
      ['host:b', 1],
      ['host:a', 0.85],
    ]);
  });

  it('falls back to "now" when there is no history and caps at 25', () => {
    const candidates = Array.from({ length: 30 }, (_, i) => ({
      euid: `host:h${String(i).padStart(2, '0')}`,
      scoreNorm: 50 + i,
    }));
    const { seeds } = buildRiskSeeds({
      kind: 'material_risk',
      candidates,
      fallbackAt: FIXTURE_NOW,
    });
    expect(seeds).toHaveLength(25);
    expect(seeds[0].entityEuids).toEqual(['host:h29']);
    expect(seeds[0].at).toBe(FIXTURE_NOW);
  });
});

describe('co-alert edges', () => {
  const rule = (uuid: string, alertCount: number) => ({
    uuid,
    name: uuid,
    severity: 'high' as const,
    tacticIds: ['TA0008'],
    techniqueIds: [],
    alertCount,
  });
  const pair = (
    user: string,
    host: string,
    count: number,
    maxRisk = 21,
    rules = [rule('r1', count)]
  ): CoAlertPair => ({
    user,
    host,
    count,
    first: day(-3),
    last: day(-1),
    maxRisk,
    rules,
  });
  const golden = (euid: string) =>
    euid.endsWith('@local') && euid.startsWith('user:a.') ? 'user:a.golden' : euid;
  const seedGoldens = new Set(['user:a.golden', 'host:svc']);

  it('collapses aliases to the golden entity and sums counts before thresholding', () => {
    const { edges, rules, firstSeen } = buildCoAlertEdges({
      pairs: [
        pair('user:a.x@h1@local', 'host:jump', 1, 20, [rule('r1', 1)]),
        pair('user:a.y@h2@local', 'host:jump', 1, 20, [rule('r1', 1), rule('r2', 1)]),
      ],
      golden,
      seedGoldens,
    });
    expect(edges).toEqual([
      { type: 'co_alert', from: 'host:jump', to: 'user:a.golden', refKeys: ['rule:r1', 'rule:r2'] },
    ]);
    expect(rules.get('r1')?.alertCount).toBe(2);
    expect(firstSeen.get('host:jump|user:a.golden')).toBe(day(-3));
  });

  it('applies the threshold: 1 low alert is dropped, 2 alerts or 1 high-risk alert pass', () => {
    const run = (count: number, maxRisk: number) =>
      buildCoAlertEdges({
        pairs: [pair('user:a.x@h1@local', 'host:jump', count, maxRisk)],
        golden,
        seedGoldens,
      }).edges.length;
    expect(run(1, 47)).toBe(0);
    expect(run(2, 21)).toBe(1);
    expect(run(1, 73)).toBe(1);
  });

  it('keeps only pairs touching a seed and drops self pairs', () => {
    const { edges } = buildCoAlertEdges({
      pairs: [pair('user:other', 'host:other', 5), pair('host:svc', 'host:svc', 5)],
      golden,
      seedGoldens,
    });
    expect(edges).toEqual([]);
  });

  it('keeps trivial local pairs by default and drops them when configured', () => {
    const local = pair('user:svc-build@build-runner-02@local', 'host:build-runner-02', 7);
    const seeds = new Set(['host:build-runner-02']);
    expect(
      buildCoAlertEdges({ pairs: [local], golden: (e) => e, seedGoldens: seeds }).edges
    ).toHaveLength(1);
    expect(
      buildCoAlertEdges({ pairs: [local], golden: (e) => e, seedGoldens: seeds, dropTrivial: true })
        .edges
    ).toHaveLength(0);
    // A local user that resolved to a golden entity is not trivial.
    expect(
      buildCoAlertEdges({
        pairs: [pair('user:a.x@h1@local', 'host:h1', 7)],
        golden,
        seedGoldens,
        dropTrivial: true,
      }).edges
    ).toHaveLength(1);
  });

  it('recognises host-scoped local users', () => {
    expect(isTrivialLocalPair('user:svc@box@local', 'host:box')).toBe(true);
    expect(isTrivialLocalPair('user:svc@box@local', 'host:other')).toBe(false);
    expect(isTrivialLocalPair('user:svc@acme.com@okta', 'host:box')).toBe(false);
  });
});

describe('co-alert query', () => {
  const refs = buildEntityRefs([{ euid: 'host:a', name: 'a' }]);
  const bucket = (u: string, h: string, count: number) => ({
    key: { u, h },
    doc_count: count,
    first: { value_as_string: day(-3) },
    last: { value_as_string: day(-1) },
    sev: { value: 47 },
    rules: {
      buckets: [
        {
          key: 'r1',
          doc_count: count,
          details: { hits: { hits: [{ fields: { 'kibana.alert.rule.name': ['Rule 1'] } }] } },
        },
        { key: 'r-nameless', doc_count: 1, details: { hits: { hits: [] } } },
      ],
    },
  });

  it('parses pairs, drops rules without a name, and does not page on a short page', async () => {
    const es = elasticsearchServiceMock.createElasticsearchClient();
    es.search.mockResolvedValue({
      aggregations: {
        pairs: {
          buckets: [bucket('user:u', 'host:a', 3)],
          after_key: { u: 'user:u', h: 'host:a' },
        },
      },
    } as never);
    const pairs = await fetchCoAlertPairs({ esClient: es, spaceId: 'default', timeRange, refs });
    expect(es.search).toHaveBeenCalledTimes(1);
    expect(pairs).toEqual([
      {
        user: 'user:u',
        host: 'host:a',
        count: 3,
        first: day(-3),
        last: day(-1),
        maxRisk: 47,
        rules: [
          {
            uuid: 'r1',
            name: 'Rule 1',
            severity: 'medium',
            tacticIds: [],
            techniqueIds: [],
            alertCount: 3,
          },
        ],
      },
    ]);
  });

  it('pages with after_key up to two pages', async () => {
    const es = elasticsearchServiceMock.createElasticsearchClient();
    const fullPage = Array.from({ length: 1000 }, (_, i) => bucket(`user:${i}`, 'host:a', 1));
    es.search.mockResolvedValue({
      aggregations: { pairs: { buckets: fullPage, after_key: { u: 'user:999', h: 'host:a' } } },
    } as never);
    const pairs = await fetchCoAlertPairs({ esClient: es, spaceId: 'default', timeRange, refs });
    expect(es.search).toHaveBeenCalledTimes(2);
    expect(pairs).toHaveLength(2000);
    expect(JSON.stringify(es.search.mock.calls[1][0])).toContain(
      '"after":{"u":"user:999","h":"host:a"}'
    );
  });

  it('does not query without entities and propagates errors', async () => {
    const es = elasticsearchServiceMock.createElasticsearchClient();
    await expect(
      fetchCoAlertPairs({ esClient: es, spaceId: 'default', timeRange, refs: buildEntityRefs([]) })
    ).resolves.toEqual([]);
    expect(es.search).not.toHaveBeenCalled();
    es.search.mockRejectedValue(new Error('shard failure'));
    await expect(
      fetchCoAlertPairs({ esClient: es, spaceId: 'default', timeRange, refs })
    ).rejects.toThrow('shard failure');
  });
});

describe('reverse relationships and hub degree', () => {
  it('builds edges from actors to the golden target they point at', () => {
    const doc = parseEntityDoc({
      entity: {
        id: 'user:u@x@okta',
        name: 'u',
        relationships: { owns: { ids: ['host:laptop', 'host:other'] } },
      },
    });
    expect(doc).toBeDefined();
    const edges = buildReverseRelationshipEdges({
      docs: doc ? [doc] : [],
      targetGoldenOf: new Map([['host:laptop', 'host:laptop']]),
      golden: (e) => e,
    });
    expect(edges).toEqual([
      { type: 'owns', from: 'user:u@x@okta', to: 'host:laptop', refKeys: [] },
    ]);
  });

  it('queries the entity alias for actors pointing at the targets', async () => {
    const es = elasticsearchServiceMock.createElasticsearchClient();
    es.search.mockResolvedValue({
      hits: {
        hits: [
          { _source: { entity: { id: 'user:u', relationships: { owns: { ids: ['host:t'] } } } } },
        ],
      },
    } as never);
    const docs = await fetchReverseRelationshipDocs({
      esClient: es,
      spaceId: 'default',
      targetEuids: ['host:t'],
    });
    expect(docs.map((d) => d.euid)).toEqual(['user:u']);
    expect(es.search.mock.calls[0][0]).toMatchObject({
      index: 'entities-latest-default',
      size: 200,
    });
    await expect(
      fetchReverseRelationshipDocs({ esClient: es, spaceId: 'default', targetEuids: [] })
    ).resolves.toEqual([]);
  });

  it('takes the max in-degree over interaction kinds and propagates errors', async () => {
    const es = elasticsearchServiceMock.createElasticsearchClient();
    es.search.mockResolvedValue({
      aggregations: {
        accesses_frequently: { buckets: [{ key: 'host:dc', doc_count: 30 }] },
        accesses_infrequently: { buckets: [{ key: 'host:dc', doc_count: 37 }] },
        communicates_with: { buckets: [] },
      },
    } as never);
    const degrees = await fetchInteractionDegrees({
      esClient: es,
      spaceId: 'default',
      euids: ['host:dc'],
    });
    expect(degrees.get('host:dc')).toBe(37);
    es.search.mockRejectedValue(new Error('denied'));
    await expect(
      fetchInteractionDegrees({ esClient: es, spaceId: 'default', euids: ['host:dc'] })
    ).rejects.toThrow('denied');
  });
});
