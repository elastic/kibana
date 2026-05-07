/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRelatedAlertsGraph } from './graph_builder';
import type { DetectionAlert800 } from '../../../../common/api/detection_engine/model/alerts';
import type { EsSearchClient, EsSearchResponse } from './types';

/** Test doc: _source is a partial alert shape; we assert to DetectionAlert800 for type compatibility */
interface Doc {
  _id: string;
  _index: string;
  _source: DetectionAlert800;
}

/** Cast partial _source to DetectionAlert800 for test fixtures */
const src = (s: Record<string, unknown>): DetectionAlert800 => s as DetectionAlert800;

const iso = (ms: number) => new Date(ms).toISOString();

interface TermsClause {
  terms: Record<string, string[]>;
}
type FilterClause = Record<string, unknown>;

interface SearchRequest {
  index: string;
  size?: number;
  query?: { bool?: { filter?: FilterClause[]; must_not?: FilterClause[] } };
  search_after?: [string, string];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const makeEsClient = (params: { seedIndex: string; seedId: string; docs: Doc[] }) => {
  const { seedIndex, seedId, docs } = params;

  return {
    search: jest.fn(async <TSource>(req: Record<string, unknown>) => {
      const typedReq = req as unknown as SearchRequest;
      // Seed fetch
      if (typedReq.index === seedIndex) {
        const hit = docs.find((d) => d._index === seedIndex && d._id === seedId);
        return { hits: { hits: hit ? [hit] : [] } } as unknown as EsSearchResponse<TSource>;
      }

      // Search queries
      const filters = typedReq.query?.bool?.filter ?? [];

      let range: { gte: string; lte: string } | undefined;
      for (const f of filters) {
        if (isRecord(f)) {
          const rangeObj = f.range;
          if (isRecord(rangeObj)) {
            const timestampRange = rangeObj['@timestamp'];
            if (
              isRecord(timestampRange) &&
              typeof timestampRange.gte === 'string' &&
              typeof timestampRange.lte === 'string'
            ) {
              range = timestampRange as { gte: string; lte: string };
              break;
            }
          }
        }
      }
      if (!range) {
        throw new Error('Expected @timestamp range filter in query');
      }
      const gte = Date.parse(range.gte);
      const lte = Date.parse(range.lte);

      let should: TermsClause[] = [];
      for (const f of filters) {
        if (isRecord(f)) {
          const boolObj = f.bool;
          if (isRecord(boolObj)) {
            const shouldArray = boolObj.should;
            if (Array.isArray(shouldArray)) {
              should = shouldArray as TermsClause[];
              break;
            }
          }
        }
      }
      const mustNot = typedReq.query?.bool?.must_not ?? [];

      const after = typedReq.search_after as [string, string] | undefined;

      let hits = docs
        .filter((d) => d._index === typedReq.index)
        .filter((d) => {
          const ts = d._source['@timestamp'];
          const ms = typeof ts === 'string' ? Date.parse(ts) : NaN;
          return Number.isFinite(ms) && ms >= gte && ms <= lte;
        })
        .filter((d) => {
          // OR of terms clauses
          if (!should.length) return false;
          return should.some((clause) => {
            if (!isRecord(clause)) return false;
            const termsObj = clause.terms;
            if (!isRecord(termsObj)) return false;
            const field = Object.keys(termsObj)[0];
            if (!field) return false;
            const values = termsObj[field];
            if (!Array.isArray(values)) return false;
            const fieldParts = field.split('.');
            let v: unknown = d._source;
            for (const part of fieldParts) {
              if (!isRecord(v)) {
                v = undefined;
                break;
              }
              v = v[part];
            }
            if (typeof v === 'string') return values.includes(v);
            if (Array.isArray(v)) return v.some((x) => typeof x === 'string' && values.includes(x));
            return false;
          });
        })
        .filter((d) => {
          // must_not terms
          return !mustNot.some((clause) => {
            if (!isRecord(clause) || !isRecord(clause.terms)) return false;
            const terms = clause.terms as Record<string, string[]>;
            const field = Object.keys(terms)[0];
            if (!field) return false;
            const values = terms[field] ?? [];
            const fieldParts = field.split('.');
            let v: unknown = d._source;
            for (const part of fieldParts) {
              if (!isRecord(v)) {
                v = undefined;
                break;
              }
              v = v[part];
            }
            if (typeof v === 'string') return values.includes(v);
            if (Array.isArray(v)) return v.some((x) => typeof x === 'string' && values.includes(x));
            return false;
          });
        })
        .sort((a, b) => {
          const tsa = a._source['@timestamp'];
          const tsb = b._source['@timestamp'];
          const ta = typeof tsa === 'string' ? Date.parse(tsa) : 0;
          const tb = typeof tsb === 'string' ? Date.parse(tsb) : 0;
          return ta === tb ? a._id.localeCompare(b._id) : ta - tb;
        });

      if (after) {
        const [afterTs, afterId] = after;
        hits = hits.filter((d) => {
          const ts = d._source['@timestamp'];
          if (typeof ts !== 'string') return false;
          return ts > afterTs || (ts === afterTs && d._id > afterId);
        });
      }

      const size = typedReq.size ?? 10;
      const page = hits.slice(0, size).map((h) => ({
        ...h,
        sort: [h._source['@timestamp'], h._id],
      }));

      return { hits: { hits: page } } as unknown as EsSearchResponse<TSource>;
    }),
  } as unknown as EsSearchClient;
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
        _source: src({
          '@timestamp': iso(t0),
          host: { name: 'host-1' },
        }),
      },
      {
        _id: 'B',
        _index: searchIndex,
        _source: src({
          '@timestamp': iso(t0 + 50 * 60 * 1000), // within seed window
          host: { name: 'host-1' },
          kibana: { alert: { rule: { name: 'rule-b' } } },
        }),
      },
      {
        _id: 'C',
        _index: searchIndex,
        _source: src({
          '@timestamp': iso(t0 + 80 * 60 * 1000), // outside seed window, inside expanded window
          host: { name: 'host-1' },
          kibana: { alert: { rule: { name: 'rule-c' } } },
        }),
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
      expect.arrayContaining([{ from: 'B', to: 'C', score: 1, label_scores: { host: 1 } }])
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
        _source: src({
          '@timestamp': iso(t0),
          host: { name: 'host-1' },
          user: { name: 'u1', id: 'uid-1' },
          process: { entity_id: 'p1' },
          source: { ip: '1.1.1.1' },
          destination: { ip: '2.2.2.2' },
        }),
      },
      // host only => score 2 (below threshold 4)
      {
        _id: 'B',
        _index: searchIndex,
        _source: src({
          '@timestamp': iso(t0 + 5 * 60 * 1000),
          host: { name: 'host-1' },
        }),
      },
      // host + user => 2 + 2 = 4 (meets threshold)
      {
        _id: 'C',
        _index: searchIndex,
        _source: src({
          '@timestamp': iso(t0 + 10 * 60 * 1000),
          host: { name: 'host-1' },
          user: { name: 'u1' },
        }),
      },
      // process.entity_id only => 5 (meets threshold)
      {
        _id: 'D',
        _index: searchIndex,
        _source: src({
          '@timestamp': iso(t0 + 15 * 60 * 1000),
          process: { entity_id: 'p1' },
        }),
      },
      // source + destination => 1 + 1 = 2 (below threshold)
      {
        _id: 'E',
        _index: searchIndex,
        _source: src({
          '@timestamp': iso(t0 + 20 * 60 * 1000),
          source: { ip: '1.1.1.1' },
          destination: { ip: '2.2.2.2' },
        }),
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
        _source: src({
          '@timestamp': iso(t0),
          host: { name: 'host-1' },
        }),
      },
      {
        _id: 'B',
        _index: searchIndex,
        _source: src({
          '@timestamp': iso(t0 + 10 * 60 * 1000),
          host: { name: 'host-1' },
        }),
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
      maxTermsPerQuery: Number('nope'),
      maxEntitiesPerField: Number('nope'),
      ignoreEntities: [],
      entityFieldScores: { 'host.name': 1 },
      minEntityScore: 1,
      includeSeed: false,
    });

    // Verify we found the related alert (i.e. the query didn't become impossible to match).
    expect(result.nodes.map((n) => n.id)).toEqual(['B']);

    // Verify the query the ES client received had non-empty `terms` arrays.
    const calls = (esClient.search as jest.Mock).mock.calls;
    const searchCall = calls.find(([req]) => (req as SearchRequest).index === searchIndex);
    expect(searchCall).toBeTruthy();
    const typedReq = searchCall?.[0] as SearchRequest | undefined;

    let should: TermsClause[] = [];
    for (const f of typedReq?.query?.bool?.filter ?? []) {
      if (isRecord(f)) {
        const boolObj = f.bool;
        if (isRecord(boolObj)) {
          const shouldArray = boolObj.should;
          if (Array.isArray(shouldArray)) {
            should = shouldArray as TermsClause[];
            break;
          }
        }
      }
    }

    expect(should.length).toBeGreaterThan(0);
    const firstTerms = should[0]?.terms?.['host.name'];
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
        _source: src({
          '@timestamp': iso(t0),
          process: { entity_id: 'p1' },
          user: { name: 'u1' },
        }),
      },
      // This alert contains an ignored value (user.name=root) but also matches strongly via process.entity_id.
      // It should still be eligible to link.
      {
        _id: 'B',
        _index: searchIndex,
        _source: src({
          '@timestamp': iso(t0 + 5 * 60 * 1000),
          process: { entity_id: 'p1' },
          user: { name: 'root' },
        }),
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
        _source: src({
          '@timestamp': iso(t0),
          source: { ip: '10.0.0.10' },
        }),
      },
      // Does NOT share source.ip, but does share the seed source.ip as destination.ip.
      {
        _id: 'B',
        _index: searchIndex,
        _source: src({
          '@timestamp': iso(t0 + 5 * 60 * 1000),
          destination: { ip: '10.0.0.10' },
        }),
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
        _source: src({
          '@timestamp': iso(t0),
          user: { name: 'patyk' },
        }),
      },
      {
        _id: 'B',
        _index: searchIndex,
        _source: src({
          '@timestamp': iso(t0 + 5 * 60 * 1000),
          user: { name: 'patyk' },
        }),
      },
      {
        _id: 'C',
        _index: searchIndex,
        _source: src({
          '@timestamp': iso(t0 + 10 * 60 * 1000),
          user: { name: 'root' },
        }),
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
