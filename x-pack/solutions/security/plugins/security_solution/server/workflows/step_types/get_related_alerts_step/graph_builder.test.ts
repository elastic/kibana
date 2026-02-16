/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRelatedAlertsGraph } from './graph_builder';

type Doc = {
  _id: string;
  _index: string;
  _source: Record<string, unknown>;
};

const iso = (ms: number) => new Date(ms).toISOString();

const get = (obj: any, path: string) => {
  const parts = path.split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
};

const makeEsClient = (params: { seedIndex: string; seedId: string; docs: Doc[] }) => {
  const { seedIndex, seedId, docs } = params;

  return {
    search: jest.fn(async (req: any) => {
      // Seed fetch
      if (req.index === seedIndex) {
        const hit = docs.find((d) => d._index === seedIndex && d._id === seedId);
        return { hits: { hits: hit ? [hit] : [] } };
      }

      // Search queries
      const filters = req.query?.bool?.filter ?? [];
      const range = filters.find((f: any) => f.range?.['@timestamp'])?.range?.['@timestamp'];
      const gte = Date.parse(range.gte);
      const lte = Date.parse(range.lte);

      const should = filters.find((f: any) => f.bool?.should)?.bool?.should ?? [];
      const mustNot = req.query?.bool?.must_not ?? [];

      const after = req.search_after as [string, string] | undefined;

      let hits = docs
        .filter((d) => d._index === req.index)
        .filter((d) => {
          const ts = get(d._source, '@timestamp');
          const ms = typeof ts === 'string' ? Date.parse(ts) : NaN;
          return Number.isFinite(ms) && ms >= gte && ms <= lte;
        })
        .filter((d) => {
          // OR of terms clauses
          if (!should.length) return false;
          return should.some((clause: any) => {
            const terms = clause.terms;
            const field = Object.keys(terms)[0];
            const values: string[] = terms[field];
            const v = get(d._source, field);
            if (typeof v === 'string') return values.includes(v);
            if (Array.isArray(v)) return v.some((x) => typeof x === 'string' && values.includes(x));
            return false;
          });
        })
        .filter((d) => {
          // must_not terms
          return !mustNot.some((clause: any) => {
            const terms = clause.terms;
            const field = Object.keys(terms)[0];
            const values: string[] = terms[field];
            const v = get(d._source, field);
            if (typeof v === 'string') return values.includes(v);
            if (Array.isArray(v)) return v.some((x) => typeof x === 'string' && values.includes(x));
            return false;
          });
        })
        .sort((a, b) => {
          const ta = Date.parse(get(a._source, '@timestamp') as string);
          const tb = Date.parse(get(b._source, '@timestamp') as string);
          return ta === tb ? a._id.localeCompare(b._id) : ta - tb;
        });

      if (after) {
        const [afterTs, afterId] = after;
        hits = hits.filter((d) => {
          const ts = get(d._source, '@timestamp') as string;
          return ts > afterTs || (ts === afterTs && d._id > afterId);
        });
      }

      const size = req.size ?? 10;
      const page = hits.slice(0, size).map((h) => ({
        ...h,
        sort: [get(h._source, '@timestamp'), h._id],
      }));

      return { hits: { hits: page } };
    }),
  };
};

describe('buildRelatedAlertsGraph', () => {
  it('expands via entity-delta and time-delta and builds traversal edges', async () => {
    const t0 = Date.UTC(2026, 0, 1, 0, 0, 0);
    const seedIndex = 'seed-index';
    const searchIndex = 'alerts-index';

    const docs: Doc[] = [
      {
        _id: 'A',
        _index: seedIndex,
        _source: {
          '@timestamp': iso(t0),
          host: { name: 'host-1' },
        },
      },
      {
        _id: 'B',
        _index: searchIndex,
        _source: {
          '@timestamp': iso(t0 + 50 * 60 * 1000), // within seed window
          host: { name: 'host-1' },
          'kibana.alert.rule.name': 'rule-b',
        },
      },
      {
        _id: 'C',
        _index: searchIndex,
        _source: {
          '@timestamp': iso(t0 + 80 * 60 * 1000), // outside seed window, inside expanded window
          host: { name: 'host-1' },
          'kibana.alert.rule.name': 'rule-c',
        },
      },
    ];

    const esClient = makeEsClient({ seedIndex, seedId: 'A', docs });

    const result = await buildRelatedAlertsGraph({
      esClient,
      seed: { alertId: 'A', alertIndex: seedIndex },
      searchIndex,
      entityFields: ['host.name'],
      seedWindowMs: 60 * 60 * 1000,
      expandWindowMs: 60 * 60 * 1000,
      maxDepth: 3,
      maxAlerts: 10,
      pageSize: 100,
      maxTermsPerQuery: 100,
      maxEntitiesPerField: 100,
      ignoreEntities: [],
      entityFieldScores: { 'host.name': 1 },
      minEntityScore: 1,
      includeSeed: false,
    });

    expect(result.nodes.map((n) => n.id).sort()).toEqual(['B', 'C']);
    expect(result.edges).toEqual(
      expect.arrayContaining([
        { from: 'B', to: 'C', score: 1, label_scores: { host: 1 } },
      ])
    );
    expect(result.stats?.depth_reached).toBeGreaterThanOrEqual(1);
  });

  it('links alerts via min_entity_score when configured', async () => {
    const t0 = Date.UTC(2026, 0, 1, 0, 0, 0);
    const seedIndex = 'seed-index';
    const searchIndex = 'alerts-index';

    const docs: Doc[] = [
      {
        _id: 'A',
        _index: seedIndex,
        _source: {
          '@timestamp': iso(t0),
          host: { name: 'host-1' },
          user: { name: 'u1', id: 'uid-1' },
          process: { entity_id: 'p1' },
          source: { ip: '1.1.1.1' },
          destination: { ip: '2.2.2.2' },
        },
      },
      // host only => score 2 (below threshold 4)
      {
        _id: 'B',
        _index: searchIndex,
        _source: {
          '@timestamp': iso(t0 + 5 * 60 * 1000),
          host: { name: 'host-1' },
        },
      },
      // host + user => 2 + 2 = 4 (meets threshold)
      {
        _id: 'C',
        _index: searchIndex,
        _source: {
          '@timestamp': iso(t0 + 10 * 60 * 1000),
          host: { name: 'host-1' },
          user: { name: 'u1' },
        },
      },
      // process.entity_id only => 5 (meets threshold)
      {
        _id: 'D',
        _index: searchIndex,
        _source: {
          '@timestamp': iso(t0 + 15 * 60 * 1000),
          process: { entity_id: 'p1' },
        },
      },
      // source + destination => 1 + 1 = 2 (below threshold)
      {
        _id: 'E',
        _index: searchIndex,
        _source: {
          '@timestamp': iso(t0 + 20 * 60 * 1000),
          source: { ip: '1.1.1.1' },
          destination: { ip: '2.2.2.2' },
        },
      },
    ];

    const esClient = makeEsClient({ seedIndex, seedId: 'A', docs });

    const result = await buildRelatedAlertsGraph({
      esClient,
      seed: { alertId: 'A', alertIndex: seedIndex },
      searchIndex,
      entityFields: ['host.name', 'user.name', 'process.entity_id', 'source.ip', 'destination.ip'],
      seedWindowMs: 60 * 60 * 1000,
      expandWindowMs: 60 * 60 * 1000,
      maxDepth: 1,
      maxAlerts: 50,
      pageSize: 100,
      maxTermsPerQuery: 100,
      maxEntitiesPerField: 100,
      ignoreEntities: [],
      entityFieldScores: {
        'process.entity_id': 5,
        'host.name': 2,
        'user.name': 2,
        'source.ip': 1,
        'destination.ip': 1,
      },
      minEntityScore: 4,
      includeSeed: true,
    });

    expect(result.nodes.map((n) => n.id).sort()).toEqual(['A', 'C', 'D']);
    expect(result.edges).toEqual(
      expect.arrayContaining([
        { from: 'A', to: 'C', score: 4, label_scores: { host: 2, user: 2 } },
        { from: 'A', to: 'D', score: 5, label_scores: { process: 5 } },
      ])
    );
  });

  it('does not generate empty `terms` queries when numeric inputs are NaN', async () => {
    const t0 = Date.UTC(2026, 0, 1, 0, 0, 0);
    const seedIndex = 'seed-index';
    const searchIndex = 'alerts-index';

    const docs: Doc[] = [
      {
        _id: 'A',
        _index: seedIndex,
        _source: {
          '@timestamp': iso(t0),
          host: { name: 'host-1' },
        },
      },
      {
        _id: 'B',
        _index: searchIndex,
        _source: {
          '@timestamp': iso(t0 + 10 * 60 * 1000),
          host: { name: 'host-1' },
        },
      },
    ];

    const esClient = makeEsClient({ seedIndex, seedId: 'A', docs });

    const result = await buildRelatedAlertsGraph({
      esClient,
      seed: { alertId: 'A', alertIndex: seedIndex },
      searchIndex,
      entityFields: ['host.name'],
      seedWindowMs: 60 * 60 * 1000,
      expandWindowMs: 60 * 60 * 1000,
      maxDepth: 1,
      maxAlerts: 10,
      pageSize: 100,
      // simulate bad upstream values (this previously produced `terms: []`)
      maxTermsPerQuery: Number('nope') as any,
      maxEntitiesPerField: Number('nope') as any,
      ignoreEntities: [],
      entityFieldScores: { 'host.name': 1 },
      minEntityScore: 1,
      includeSeed: false,
    });

    // Verify we found the related alert (i.e. the query didn't become impossible to match).
    expect(result.nodes.map((n) => n.id)).toEqual(['B']);

    // Verify the query the ES client received had non-empty `terms` arrays.
    const calls = (esClient.search as jest.Mock).mock.calls;
    const searchCall = calls.find(([req]) => req.index === searchIndex);
    expect(searchCall).toBeTruthy();
    const req = searchCall![0];
    const should = req.query?.bool?.filter?.find((f: any) => f.bool?.should)?.bool?.should ?? [];
    expect(should.length).toBeGreaterThan(0);
    const firstTerms = should[0]?.terms?.['host.name'] as unknown;
    expect(firstTerms).toEqual(['host-1']);
  });

  it('does not exclude alerts just because they contain ignored entity values', async () => {
    const t0 = Date.UTC(2026, 0, 1, 0, 0, 0);
    const seedIndex = 'seed-index';
    const searchIndex = 'alerts-index';

    const docs: Doc[] = [
      {
        _id: 'A',
        _index: seedIndex,
        _source: {
          '@timestamp': iso(t0),
          process: { entity_id: 'p1' },
          user: { name: 'u1' },
        },
      },
      // This alert contains an ignored value (user.name=root) but also matches strongly via process.entity_id.
      // It should still be eligible to link.
      {
        _id: 'B',
        _index: searchIndex,
        _source: {
          '@timestamp': iso(t0 + 5 * 60 * 1000),
          process: { entity_id: 'p1' },
          user: { name: 'root' },
        },
      },
    ];

    const esClient = makeEsClient({ seedIndex, seedId: 'A', docs });

    const result = await buildRelatedAlertsGraph({
      esClient,
      seed: { alertId: 'A', alertIndex: seedIndex },
      searchIndex,
      entityFields: ['process.entity_id', 'user.name'],
      seedWindowMs: 60 * 60 * 1000,
      expandWindowMs: 60 * 60 * 1000,
      maxDepth: 1,
      maxAlerts: 10,
      pageSize: 100,
      maxTermsPerQuery: 100,
      maxEntitiesPerField: 100,
      ignoreEntities: [{ field: 'user.name', values: ['root'] }],
      entityFieldScores: { 'process.entity_id': 5, 'user.name': 2 },
      minEntityScore: 4,
      includeSeed: true,
    });

    expect(result.nodes.map((n) => n.id).sort()).toEqual(['A', 'B']);
    expect(result.edges).toEqual(
      expect.arrayContaining([{ from: 'A', to: 'B', score: 5, label_scores: { process: 5 } }])
    );
  });

  it('links alerts via aliased entity fields (e.g. source.ip -> destination.ip)', async () => {
    const t0 = Date.UTC(2026, 0, 1, 0, 0, 0);
    const seedIndex = 'seed-index';
    const searchIndex = 'alerts-index';

    const docs: Doc[] = [
      {
        _id: 'A',
        _index: seedIndex,
        _source: {
          '@timestamp': iso(t0),
          source: { ip: '10.0.0.10' },
        },
      },
      // Does NOT share source.ip, but does share the seed source.ip as destination.ip.
      {
        _id: 'B',
        _index: searchIndex,
        _source: {
          '@timestamp': iso(t0 + 5 * 60 * 1000),
          destination: { ip: '10.0.0.10' },
        },
      },
    ];

    const esClient = makeEsClient({ seedIndex, seedId: 'A', docs });

    const result = await buildRelatedAlertsGraph({
      esClient,
      seed: { alertId: 'A', alertIndex: seedIndex },
      searchIndex,
      entityFields: ['source.ip', 'destination.ip'],
      entityFieldAliases: {
        'source.ip': [{ field: 'destination.ip', score: 3 }],
      },
      seedWindowMs: 60 * 60 * 1000,
      expandWindowMs: 60 * 60 * 1000,
      maxDepth: 1,
      maxAlerts: 10,
      pageSize: 100,
      maxTermsPerQuery: 100,
      maxEntitiesPerField: 100,
      ignoreEntities: [],
      entityFieldScores: { 'source.ip': 1, 'destination.ip': 1 },
      minEntityScore: 3,
      includeSeed: true,
    });

    expect(result.nodes.map((n) => n.id).sort()).toEqual(['A', 'B']);
    expect(result.edges).toEqual(
      expect.arrayContaining([{ from: 'A', to: 'B', score: 3, label_scores: { destination: 3 } }])
    );
  });

  it('ignore_entities only ignores configured values (does not ignore the whole field)', async () => {
    const t0 = Date.UTC(2026, 0, 1, 0, 0, 0);
    const seedIndex = 'seed-index';
    const searchIndex = 'alerts-index';

    const docs: Doc[] = [
      {
        _id: 'A',
        _index: seedIndex,
        _source: {
          '@timestamp': iso(t0),
          user: { name: 'patyk' },
        },
      },
      {
        _id: 'B',
        _index: searchIndex,
        _source: {
          '@timestamp': iso(t0 + 5 * 60 * 1000),
          user: { name: 'patyk' },
        },
      },
      {
        _id: 'C',
        _index: searchIndex,
        _source: {
          '@timestamp': iso(t0 + 10 * 60 * 1000),
          user: { name: 'root' },
        },
      },
    ];

    const esClient = makeEsClient({ seedIndex, seedId: 'A', docs });

    const result = await buildRelatedAlertsGraph({
      esClient,
      seed: { alertId: 'A', alertIndex: seedIndex },
      searchIndex,
      entityFields: ['user.name'],
      seedWindowMs: 60 * 60 * 1000,
      expandWindowMs: 60 * 60 * 1000,
      maxDepth: 1,
      maxAlerts: 50,
      pageSize: 100,
      maxTermsPerQuery: 100,
      maxEntitiesPerField: 100,
      ignoreEntities: [{ field: 'user.name', values: ['root'] }],
      entityFieldScores: { 'user.name': 2 },
      minEntityScore: 2,
      includeSeed: true,
    });

    expect(result.nodes.map((n) => n.id).sort()).toEqual(['A', 'B']);
    expect(result.edges).toEqual(
      expect.arrayContaining([{ from: 'A', to: 'B', score: 2, label_scores: { user: 2 } }])
    );
  });
});

