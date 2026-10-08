/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { MAX_TILE_SAMPLE } from '../../../../../common/entity_analytics/executive_brief/constants';
import { EvidenceRegistry } from './evidence_registry';
import type { SnapshotContext } from './context';
import { buildGlance } from './glance';

jest.mock('@kbn/entity-store/server', () => ({
  resolveLatestEntitiesIndexName: jest
    .fn()
    .mockResolvedValue('.entities.v2.latest.security_default'),
}));

const NOW = '2026-10-08T12:00:00.000Z';

interface EsqlResult {
  columns: Array<{ name: string; type: string }>;
  values: unknown[][];
}

const countResult = (column: string, value: number): EsqlResult => ({
  columns: [{ name: column, type: 'long' }],
  values: [[value]],
});
const sampleResult = (ids: string[]): EsqlResult => ({
  columns: [{ name: 'effective_id', type: 'keyword' }],
  values: ids.map((id) => [id]),
});
const emptyResult: EsqlResult = { columns: [], values: [] };

interface Scenario {
  alerts: { current: number; previous: number; sample: string[] };
  riskMovers: { current: number; previous: number; sample: string[] };
  newlyHighCritical: { current: number; previous: number; sample: string[] };
}

const defaultScenario: Scenario = {
  alerts: { current: 12, previous: 7, sample: ['host:a', 'user:b'] },
  riskMovers: { current: 4, previous: 4, sample: ['host:a', 'host:m1', 'host:m2'] },
  newlyHighCritical: { current: 3, previous: 0, sample: ['user:b'] },
};

// For the 7d range the previous windows reach back 14d (alerts) or 338h (risk).
const isPrevious = (query: string) => /\) - (14d|338h)\b/.test(query);

const makeEsql = (scenario: Scenario, failOn?: (query: string) => Error | undefined) =>
  jest.fn(async ({ query }: { query: string }): Promise<EsqlResult> => {
    const failure = failOn?.(query);
    if (failure) throw failure;
    const isAlerts = query.includes('.alerts-security.alerts-');
    const isRisk = query.includes('risk-score.risk-score-');
    const isNewlyHC = isRisk && query.includes('level_num');
    const isSeries = /\balerts_0\b|risk_movers_0|newly_high_critical_0/.test(query);
    const key: keyof Scenario = isAlerts
      ? 'alerts'
      : isNewlyHC
      ? 'newlyHighCritical'
      : 'riskMovers';
    if (isSeries) return emptyResult;
    if (query.includes('SORT risk_score')) return sampleResult(scenario[key].sample);
    const value = isPrevious(query) ? scenario[key].previous : scenario[key].current;
    return countResult(isAlerts ? 'alerts_count' : 'value', value);
  });

const makeSearch = () =>
  jest.fn(async (params: { aggs?: unknown }) =>
    params.aggs
      ? {
          hits: { hits: [] },
          aggregations: {
            avgScore: { value: 48.6 },
            byType: {
              buckets: [
                {
                  key: 'host',
                  doc_count: 5,
                  byLevel: {
                    buckets: [
                      { key: 'Critical', doc_count: 1 },
                      { key: 'Low', doc_count: 4 },
                    ],
                  },
                },
                {
                  key: 'user',
                  doc_count: 3,
                  byLevel: {
                    buckets: [
                      { key: 'High', doc_count: 2 },
                      { key: 'Moderate', doc_count: 1 },
                    ],
                  },
                },
              ],
            },
          },
        }
      : {
          hits: {
            hits: [
              { _source: { entity: { id: 'user:b' } } },
              { _source: { entity: { id: 'host:z' } } },
            ],
          },
        }
  );

const makeContext = (esql: jest.Mock, search: jest.Mock): SnapshotContext => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  (esClient.esql.query as unknown as jest.Mock) = esql;
  (esClient.search as unknown as jest.Mock) = search;
  return {
    spaceId: 'default',
    timeRange: { from: '2026-10-01T12:00:00.000Z', to: NOW, range: '7d' },
    esClient,
    request: httpServerMock.createKibanaRequest(),
    logger: loggingSystemMock.createLogger(),
    abortSignal: new AbortController().signal,
    registry: new EvidenceRegistry(),
    services: {},
  };
};

describe('buildGlance', () => {
  it('builds tiles, stats, concentration and leaders from query results', async () => {
    const esql = makeEsql(defaultScenario);
    const ctx = makeContext(esql, makeSearch());

    const { value, sources } = await buildGlance(ctx);
    const { glance, riskMoverEuids } = value;

    const alerts = glance.needsAttention.find(({ id }) => id === 'entitiesWithAlerts');
    expect(alerts).toMatchObject({
      status: 'ok',
      count: 12,
      previousCount: 7,
      delta: 5,
      deltaPct: 71,
      sample: ['host:a', 'user:b'],
      sampleTruncated: true,
    });
    const movers = glance.needsAttention.find(({ id }) => id === 'riskMovers');
    expect(movers).toMatchObject({ count: 4, previousCount: 4, delta: 0 });
    expect(movers?.deltaPct).toBeUndefined();
    const newly = glance.needsAttention.find(({ id }) => id === 'newlyHighCritical');
    expect(newly).toMatchObject({ count: 3, previousCount: 0, delta: 3 });
    expect(newly?.deltaPct).toBeUndefined();

    expect(glance.stats).toEqual([
      { id: 'postureScore', value: 49, upIsBad: true },
      { id: 'materialRiskEntities', value: 3, upIsBad: true },
      { id: 'activeSignals', value: 19, previous: 11, delta: 8, upIsBad: true },
    ]);
    expect(glance.exposureLeaders).toEqual(['user:b', 'host:z']);
    expect(riskMoverEuids).toEqual(['host:a', 'host:m1', 'host:m2']);

    expect(sources.needsAttention.status).toBe('ok');
    expect(sources.posture.status).toBe('ok');
    expect(sources.exposureLeaders.status).toBe('ok');
  });

  it('orders concentration by type then level', async () => {
    const { value } = await buildGlance(makeContext(makeEsql(defaultScenario), makeSearch()));
    expect(value.glance.concentration).toEqual([
      { type: 'user', level: 'High', count: 2 },
      { type: 'user', level: 'Moderate', count: 1 },
      { type: 'host', level: 'Critical', count: 1 },
      { type: 'host', level: 'Low', count: 4 },
    ]);
  });

  it('pins every window to the fixed now and never pulls id lists for counts', async () => {
    const esql = makeEsql(defaultScenario);
    await buildGlance(makeContext(esql, makeSearch()));

    const queries = esql.mock.calls.map(([{ query }]) => query);
    expect(queries.length).toBeGreaterThanOrEqual(12);
    for (const query of queries) {
      expect(query).not.toContain('NOW()');
      expect(query).toContain(`TO_DATETIME("${NOW}")`);
      expect(query).not.toContain('VALUES(');
    }
    const samples = queries.filter((query) => query.includes('SORT risk_score'));
    expect(samples).toHaveLength(3);
    samples.forEach((query) => expect(query).toMatch(/\| LIMIT \d+/));
  });

  it('caps the tile sample but keeps the wider risk mover list, and flags truncation', async () => {
    const many = Array.from({ length: 25 }, (_, i) => `host:m${String(i).padStart(2, '0')}`);
    const esql = makeEsql({
      ...defaultScenario,
      riskMovers: { current: 40, previous: 10, sample: many },
    });
    const { value } = await buildGlance(makeContext(esql, makeSearch()));

    const movers = value.glance.needsAttention.find(({ id }) => id === 'riskMovers');
    expect(movers?.sample).toHaveLength(MAX_TILE_SAMPLE);
    expect(movers?.sampleTruncated).toBe(true);
    expect(value.riskMoverEuids).toEqual(many);
  });

  it('registers exposure leaders first, then tile samples, deduplicated', async () => {
    const ctx = makeContext(makeEsql(defaultScenario), makeSearch());
    await buildGlance(ctx);
    expect(ctx.registry.entityEuids()).toEqual([
      'user:b',
      'host:z',
      'host:a',
      'host:m1',
      'host:m2',
    ]);
  });

  it('turns a failing tile into a source status without failing the others', async () => {
    const esql = makeEsql(defaultScenario, (query) =>
      query.includes('risk-score.risk-score-') && query.includes('level_num')
        ? new Error('index_not_found_exception: no such index [risk-score.risk-score-default]')
        : undefined
    );
    const { value, sources } = await buildGlance(makeContext(esql, makeSearch()));

    const newly = value.glance.needsAttention.find(({ id }) => id === 'newlyHighCritical');
    expect(newly).toMatchObject({ status: 'missing_index', count: 0, sample: [] });
    expect(sources['needsAttention.newlyHighCritical'].status).toBe('missing_index');
    expect(sources['needsAttention.entitiesWithAlerts'].status).toBe('ok');
    expect(sources.needsAttention.status).toBe('missing_index');
    const signals = value.glance.stats.find(({ id }) => id === 'activeSignals');
    expect(signals?.value).toBe(16);
  });

  it('keeps counts when only the previous period, sample and series fail', async () => {
    const esql = makeEsql(defaultScenario, (query) =>
      isPrevious(query) || query.includes('SORT risk_score') ? new Error('boom') : undefined
    );
    const { value } = await buildGlance(makeContext(esql, makeSearch()));
    const alerts = value.glance.needsAttention.find(({ id }) => id === 'entitiesWithAlerts');
    expect(alerts).toMatchObject({ status: 'ok', count: 12, sample: [] });
    expect(alerts?.previousCount).toBeUndefined();
    expect(alerts?.delta).toBeUndefined();
    const signals = value.glance.stats.find(({ id }) => id === 'activeSignals');
    expect(signals?.previous).toBeUndefined();
  });

  it('omits posture stats and reports the source when the posture aggregation fails', async () => {
    const search = jest.fn(async (params: { aggs?: unknown }) => {
      if (params.aggs) throw new Error('search_phase_execution_exception');
      return { hits: { hits: [] } };
    });
    const { value, sources } = await buildGlance(makeContext(makeEsql(defaultScenario), search));
    expect(sources.posture.status).toBe('error');
    expect(sources.posture.message).toContain('search_phase_execution_exception');
    expect(value.glance.stats.map(({ id }) => id)).toEqual(['activeSignals']);
    expect(value.glance.concentration).toEqual([]);
  });
});
