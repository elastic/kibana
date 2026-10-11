/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import type { CasesClient } from '@kbn/cases-plugin/server';
import type { BriefTimeRange } from '../../../../../common/entity_analytics/executive_brief/types';
import { EvidenceRegistry } from '../snapshot/evidence_registry';
import { ResolutionIndex, buildForwardRelationshipEdges } from './expand';
import { parseEntityDoc, typeFromEuid, nameFromEuid } from './entity_docs';
import { assessResponse, fetchCaseDetails, fetchRawResponses, registerResponse } from './response';
import type { CaseDetails } from './response';
import { FIXTURE_NOW, day } from './__fixtures__/cluster_scenarios';

const timeRange: BriefTimeRange = { from: day(-7), to: FIXTURE_NOW, range: '7d' };

describe('entity doc parsing', () => {
  it('parses risk, criticality, watchlists, resolution and relationships', () => {
    const doc = parseEntityDoc({
      entity: {
        id: 'user:a@acme.com@okta',
        name: 'a',
        EngineMetadata: { Type: 'user' },
        risk: { calculated_score_norm: 75 },
        attributes: {
          managed: true,
          watchlists: ['privileged-user-monitoring-watchlist-id-default'],
        },
        relationships: {
          resolution: {
            resolved_to: 'user:golden',
            risk: { calculated_score_norm: 91, calculated_level: 'Critical' },
          },
          owns: { ids: ['host:b', 'host:a'] },
        },
      },
      asset: { criticality: 'high_impact' },
    });
    expect(doc).toMatchObject({
      euid: 'user:a@acme.com@okta',
      type: 'user',
      riskScoreNorm: 75,
      riskLevel: 'High',
      resolutionRiskScoreNorm: 91,
      resolutionRiskLevel: 'Critical',
      resolvedTo: 'user:golden',
      criticality: 'high_impact',
      isPrivileged: true,
      managed: true,
      relationships: { owns: ['host:a', 'host:b'] },
    });
  });

  it('rejects documents without an entity id and tolerates sparse docs', () => {
    expect(parseEntityDoc(undefined)).toBeUndefined();
    expect(parseEntityDoc({ entity: {} })).toBeUndefined();
    expect(parseEntityDoc({ entity: { id: 'host:x' } })).toMatchObject({
      name: 'x',
      type: 'host',
      watchlistIds: [],
      isPrivileged: false,
      relationships: {},
    });
  });

  it('derives type and name from an euid', () => {
    expect(typeFromEuid('service:s')).toBe('service');
    expect(typeFromEuid('weird')).toBe('generic');
    expect(nameFromEuid('user:svc-build@box@local')).toBe('svc-build');
    expect(nameFromEuid('host:box')).toBe('box');
  });
});

describe('ResolutionIndex', () => {
  const hit = (source: object) => ({ _source: source });
  const alias = (id: string, extra: object = {}) =>
    hit({
      entity: {
        id,
        name: 'a.rodriguez',
        relationships: { resolution: { resolved_to: 'user:golden' }, ...extra },
      },
    });
  const goldenDoc = hit({ entity: { id: 'user:golden', name: 'a.rodriguez' } });

  const esWith = () => {
    const es = elasticsearchServiceMock.createElasticsearchClient();
    es.search.mockImplementation(((request: { query: unknown }) => {
      const query = JSON.stringify(request.query);
      if (query.includes('resolved_to')) {
        return Promise.resolve({
          hits: {
            hits: [
              goldenDoc,
              alias('user:a@h1@local', { accesses_infrequently: { ids: ['host:jump'] } }),
              alias('user:a@h2@local', { accesses_infrequently: { ids: ['host:prod'] } }),
            ],
          },
        });
      }
      return Promise.resolve({
        hits: {
          hits: [alias('user:a@h1@local', { accesses_infrequently: { ids: ['host:jump'] } })],
        },
      });
    }) as never);
    return es;
  };

  it('collapses an alias to its golden entity and returns all aliases', async () => {
    const index = new ResolutionIndex(esWith(), 'default');
    await index.ensure(['user:a@h1@local']);
    expect(index.golden('user:a@h1@local')).toBe('user:golden');
    expect(index.aliasesOf('user:golden')).toEqual(['user:a@h1@local', 'user:a@h2@local']);
    expect(index.groupOf('user:golden')[0]).toBe('user:golden');
  });

  it('unions the aliases relationship sets onto the golden node', async () => {
    const index = new ResolutionIndex(esWith(), 'default');
    await index.ensure(['user:a@h1@local']);
    await index.ensure(['host:jump', 'host:prod']);
    expect(index.relationshipTargets('user:golden')).toEqual(
      new Map([['accesses_infrequently', ['host:jump', 'host:prod']]])
    );
    expect(buildForwardRelationshipEdges(index, ['user:golden'])).toEqual([
      { type: 'accesses_infrequently', from: 'user:golden', to: 'host:jump', refKeys: [] },
      { type: 'accesses_infrequently', from: 'user:golden', to: 'host:prod', refKeys: [] },
    ]);
  });

  it('resolves an unknown entity to itself and does not re-query known ids', async () => {
    const es = elasticsearchServiceMock.createElasticsearchClient();
    es.search.mockResolvedValue({ hits: { hits: [] } } as never);
    const index = new ResolutionIndex(es, 'default');
    await index.ensure(['host:ghost']);
    const calls = es.search.mock.calls.length;
    expect(index.golden('host:ghost')).toBe('host:ghost');
    expect(index.name('host:ghost')).toBe('ghost');
    await index.ensure(['host:ghost']);
    expect(es.search.mock.calls.length).toBe(calls);
  });

  it('serialises concurrent ensure calls and lets a failed call be retried', async () => {
    const es = elasticsearchServiceMock.createElasticsearchClient();
    es.search
      .mockRejectedValueOnce(new Error('down'))
      .mockResolvedValue({ hits: { hits: [] } } as never);
    const index = new ResolutionIndex(es, 'default');
    const [first, second] = await Promise.allSettled([
      index.ensure(['host:a']),
      index.ensure(['host:a']),
    ]);
    expect(first.status).toBe('rejected');
    expect(second.status).toBe('fulfilled');
    expect(es.search.mock.calls.length).toBeGreaterThan(1);
  });
});

describe('response', () => {
  it('reads statuses and case ids per storyline from one filters aggregation', async () => {
    const es = elasticsearchServiceMock.createElasticsearchClient();
    es.search.mockResolvedValue({
      aggregations: {
        groups: {
          buckets: {
            g0: {
              doc_count: 9,
              statuses: {
                buckets: [
                  { key: 'open', doc_count: 5 },
                  { key: 'acknowledged', doc_count: 1 },
                  { key: 'in-progress', doc_count: 1 },
                  { key: 'closed', doc_count: 2 },
                ],
              },
              cases: { buckets: [{ key: 'case-b' }, { key: 'case-a' }] },
              closed: { closed_at: { value_as_string: day(0) } },
            },
            g1: { doc_count: 0, statuses: { buckets: [] }, cases: { buckets: [] }, closed: {} },
          },
        },
      },
    } as never);
    const result = await fetchRawResponses({
      esClient: es,
      spaceId: 'default',
      timeRange,
      groups: [
        { key: 'k0', euids: ['user:a'] },
        { key: 'k1', euids: ['host:b'] },
      ],
      nameOf: (e) => e,
    });
    expect(result.k0).toEqual({
      alerts: { open: 5, acknowledged: 2, closed: 2 },
      caseIds: ['case-a', 'case-b'],
      closedAt: day(0),
    });
    expect(result.k1).toEqual({
      alerts: { open: 0, acknowledged: 0, closed: 0 },
      caseIds: [],
      closedAt: undefined,
    });
    expect(es.search.mock.calls[0][0]).toMatchObject({
      size: 0,
      allow_partial_search_results: false,
    });
  });

  it('does not query without groups', async () => {
    const es = elasticsearchServiceMock.createElasticsearchClient();
    await expect(
      fetchRawResponses({
        esClient: es,
        spaceId: 'default',
        timeRange,
        groups: [],
        nameOf: (e) => e,
      })
    ).resolves.toEqual({});
    expect(es.search).not.toHaveBeenCalled();
  });

  const details = new Map<string, CaseDetails>([
    [
      'case-a',
      {
        caseId: 'case-a',
        title: 'MFA bombing',
        status: 'in-progress',
        createdAt: day(-1),
        updatedAt: day(0),
      },
    ],
    ['case-c', { caseId: 'case-c', title: 'Old', status: 'closed', createdAt: day(-5) }],
  ]);

  it('derives the state without registering cases, and registers them for kept storylines', () => {
    const raw = { alerts: { open: 3, acknowledged: 0, closed: 0 }, caseIds: ['case-a'] };
    const assessed = assessResponse(raw, details);
    expect(assessed.state).toBe('in_progress');
    expect(assessed.cases).toEqual([]);

    const registry = new EvidenceRegistry();
    const registered = registerResponse(raw, details, registry);
    expect(registered.state).toBe('in_progress');
    expect(registered.cases).toEqual([
      { evidenceId: 'CASE-1', caseId: 'case-a', title: 'MFA bombing', status: 'in-progress' },
    ]);
    expect(registry.toCatalog()['CASE-1']).toMatchObject({ kind: 'case', caseId: 'case-a' });
  });

  it('rests on alert statuses when case details are unavailable (no invented cases)', () => {
    const raw = { alerts: { open: 3, acknowledged: 0, closed: 0 }, caseIds: ['case-missing'] };
    const registry = new EvidenceRegistry();
    const result = registerResponse(raw, new Map(), registry);
    expect(result).toEqual({ state: 'unaddressed', cases: [], alerts: raw.alerts });
    expect(registry.toCatalog()).toEqual({});
  });

  it('contains a storyline whose alerts and cases are all closed', () => {
    expect(
      assessResponse(
        { alerts: { open: 0, acknowledged: 0, closed: 4 }, caseIds: ['case-c'] },
        details
      ).state
    ).toBe('contained');
  });

  it('treats a missing raw response as unaddressed with zero counts', () => {
    expect(assessResponse(undefined, details)).toEqual({
      state: 'unaddressed',
      cases: [],
      alerts: { open: 0, acknowledged: 0, closed: 0 },
    });
  });

  it('bulk-gets cases once and normalises their status', async () => {
    const bulkGet = jest.fn().mockResolvedValue({
      cases: [
        {
          id: 'case-a',
          title: 'A',
          status: 'in-progress',
          created_at: day(-1),
          updated_at: day(0),
          closed_at: null,
        },
        {
          id: 'case-b',
          title: 'B',
          status: 'closed',
          created_at: day(-2),
          updated_at: day(-1),
          closed_at: day(-1, 5),
        },
        {
          id: 'case-c',
          title: 'C',
          status: 'weird',
          created_at: day(-2),
          updated_at: null,
          closed_at: null,
        },
      ],
      errors: [],
    });
    const casesClient = { cases: { bulkGet } } as unknown as CasesClient;
    const result = await fetchCaseDetails({
      casesClient,
      caseIds: ['case-b', 'case-a', 'case-c', 'case-a'],
    });
    expect(bulkGet).toHaveBeenCalledTimes(1);
    expect(bulkGet).toHaveBeenCalledWith({ ids: ['case-a', 'case-b', 'case-c'] });
    expect(result.get('case-b')).toMatchObject({ status: 'closed', updatedAt: day(-1, 5) });
    expect(result.get('case-c')).toMatchObject({ status: 'open', updatedAt: undefined });
    expect((await fetchCaseDetails({ casesClient, caseIds: [] })).size).toBe(0);
    expect(bulkGet).toHaveBeenCalledTimes(1);
  });
});
