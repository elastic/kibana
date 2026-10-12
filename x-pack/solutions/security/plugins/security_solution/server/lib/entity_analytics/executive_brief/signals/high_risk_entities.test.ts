/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { FACT_KIND_CAPABILITY } from '../../../../../common/entity_analytics/executive_brief/evidence';
import { highRiskEntitiesSignal } from './high_risk_entities';
import { getEntitiesLatestIndex } from './shared/indices';
import type { SignalContext } from './types';

const hitsResponse = (sources: unknown[]): estypes.SearchResponse<unknown> => ({
  took: 1,
  timed_out: false,
  _shards: { total: 1, successful: 1, failed: 0, skipped: 0 },
  hits: { hits: sources.map((source, i) => ({ _index: 'i', _id: `${i}`, _source: source })) },
});

const ann = {
  entity: {
    id: 'user:ann@okta',
    name: 'ann',
    EngineMetadata: { Type: 'user' },
    relationships: {
      resolution: { risk: { calculated_score_norm: 74.7, calculated_level: 'High' } },
    },
    attributes: { watchlists: ['privileged-user-monitoring-watchlist-id-default'] },
  },
};
const annAlias = {
  entity: {
    id: 'user:ann@h1@local',
    relationships: { resolution: { resolved_to: 'user:ann@okta' } },
  },
  asset: { criticality: 'high_impact' },
};
const db = {
  entity: {
    id: 'host:db',
    name: 'db-01',
    EngineMetadata: { Type: 'host' },
    risk: { calculated_score_norm: 95, calculated_level: 'Critical' },
  },
  asset: { criticality: 'extreme_impact' },
};
// Own risk is High, but the resolution-group risk (which wins) is Moderate.
const moderate = {
  entity: {
    id: 'user:bob@okta',
    name: 'bob',
    risk: { calculated_score_norm: 72, calculated_level: 'High' },
    relationships: {
      resolution: { risk: { calculated_score_norm: 50, calculated_level: 'Moderate' } },
    },
  },
};

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

describe('highRiskEntitiesSignal', () => {
  it('returns golden entities at High or Critical risk with group attributes', async () => {
    const ctx = createCtx();
    ctx.esClient.search
      .mockResolvedValueOnce(hitsResponse([ann, moderate, db]))
      .mockResolvedValueOnce(hitsResponse([db, ann]))
      .mockResolvedValueOnce(hitsResponse([ann, annAlias, db]));

    const output = await highRiskEntitiesSignal.run(ctx, {}, new AbortController().signal);

    const [request] = ctx.esClient.search.mock.calls[0];
    expect(request).toMatchObject({
      index: getEntitiesLatestIndex('default'),
      query: {
        bool: {
          must_not: [{ exists: { field: 'entity.relationships.resolution.resolved_to' } }],
        },
      },
    });
    expect(output.candidates?.map(({ euid }) => euid)).toEqual(['host:db', 'user:ann@okta']);
    expect(output.facts).toEqual([
      {
        kind: 'high_risk_entity',
        title: 'db-01 is at Critical risk',
        severity: 'critical',
        entities: [{ euid: 'host:db', type: 'host', name: 'db-01' }],
        numbers: { riskScore: 95 },
        details: { riskLevel: 'Critical', criticality: 'extreme_impact' },
      },
      {
        kind: 'high_risk_entity',
        title: 'ann is at High risk',
        severity: 'high',
        entities: [{ euid: 'user:ann@okta', type: 'user', name: 'ann' }],
        numbers: { riskScore: 75 },
        details: {
          riskLevel: 'High',
          criticality: 'high_impact',
          watchlists: 'Privileged Users',
          privileged: 'yes',
        },
      },
    ]);
    expect(output.entityAttributes).toEqual([
      { euid: 'host:db', riskScore: 95, riskLevel: 'Critical', criticality: 'extreme_impact' },
      {
        euid: 'user:ann@okta',
        riskScore: 75,
        riskLevel: 'High',
        criticality: 'high_impact',
        watchlists: ['Privileged Users'],
        privileged: true,
      },
    ]);
    output.facts.forEach(({ kind }) => expect(FACT_KIND_CAPABILITY[kind]).toBeDefined());
  });

  it('falls back to the golden doc when the alias lookup fails', async () => {
    const ctx = createCtx();
    ctx.esClient.search
      .mockResolvedValueOnce(hitsResponse([ann]))
      .mockRejectedValueOnce(new Error('nope'));
    const output = await highRiskEntitiesSignal.run(ctx, {}, new AbortController().signal);
    expect(output.entityAttributes).toEqual([
      {
        euid: 'user:ann@okta',
        riskScore: 75,
        riskLevel: 'High',
        watchlists: ['Privileged Users'],
        privileged: true,
      },
    ]);
  });

  it('returns nothing when no entity is at High or Critical risk', async () => {
    const ctx = createCtx();
    ctx.esClient.search.mockResolvedValueOnce(hitsResponse([]));
    const output = await highRiskEntitiesSignal.run(ctx, {}, new AbortController().signal);
    expect(output).toEqual({ facts: [], candidates: [], entityAttributes: [] });
  });
});
