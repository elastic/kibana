/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import {
  identityResolution,
  nameFromEuid,
  parseEntityDoc,
  resolveEntities,
  typeFromEuid,
} from './resolve_entities';
import { getEntitiesLatestIndex } from './shared/indices';

const GOLDEN = 'user:ann@acme@okta';
const ALIAS_1 = 'user:ann@h1@local';
const ALIAS_2 = 'user:ann@h2@local';
const HOST = 'host:h1';

const hitsResponse = (sources: unknown[]): estypes.SearchResponse<unknown> => ({
  took: 1,
  timed_out: false,
  _shards: { total: 1, successful: 1, failed: 0, skipped: 0 },
  hits: { hits: sources.map((source, i) => ({ _index: 'i', _id: `${i}`, _source: source })) },
});

const goldenDoc = {
  entity: {
    id: GOLDEN,
    name: 'ann',
    EngineMetadata: { Type: 'user' },
    risk: { calculated_score_norm: 40, calculated_level: 'Moderate' },
    relationships: {
      resolution: { risk: { calculated_score_norm: 81.4, calculated_level: 'High' } },
    },
    attributes: { watchlists: ['privileged-user-monitoring-watchlist-id-default'] },
  },
};
const alias1Doc = {
  entity: {
    id: ALIAS_1,
    name: 'ann@h1',
    EngineMetadata: { Type: 'user' },
    relationships: { resolution: { resolved_to: GOLDEN } },
  },
  asset: { criticality: 'medium_impact' },
};
const alias2Doc = {
  entity: {
    id: ALIAS_2,
    name: 'ann@h2',
    relationships: { resolution: { resolved_to: GOLDEN } },
    attributes: { watchlists: ['vip'] },
  },
  asset: { criticality: 'extreme_impact' },
};
const hostDoc = {
  entity: {
    id: HOST,
    name: 'h1',
    EngineMetadata: { Type: 'host' },
    risk: { calculated_score_norm: 12 },
  },
};

describe('resolve_entities', () => {
  describe('parseEntityDoc', () => {
    it('prefers the resolution-group risk and derives a level when none is stored', () => {
      expect(parseEntityDoc(goldenDoc)).toMatchObject({ riskScore: 81.4, riskLevel: 'High' });
      expect(parseEntityDoc(hostDoc)).toMatchObject({ riskScore: 12, riskLevel: 'Unknown' });
      expect(parseEntityDoc(alias1Doc)).toMatchObject({ resolvedTo: GOLDEN });
      expect(parseEntityDoc({ entity: {} })).toBeUndefined();
    });
  });

  it('derives type and name from euids', () => {
    expect(typeFromEuid('user:ann@h1@local')).toBe('user');
    expect(typeFromEuid('thing:x')).toBe('generic');
    expect(nameFromEuid('user:ann@h1@local')).toBe('ann');
    expect(nameFromEuid('host:h1')).toBe('h1');
  });

  it('collapses aliases onto the golden entity with group attributes (two batched reads)', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.search
      .mockResolvedValueOnce(hitsResponse([alias1Doc, hostDoc]))
      .mockResolvedValueOnce(hitsResponse([goldenDoc, alias1Doc, alias2Doc, hostDoc]));

    const resolution = await resolveEntities({
      esClient,
      spaceId: 'default',
      refs: [
        { euid: ALIAS_1, type: 'user', name: 'ann@h1' },
        { euid: HOST, type: 'host', name: 'h1' },
        { euid: 'host:unknown', type: 'host', name: 'mystery' },
      ],
    });

    expect(esClient.search).toHaveBeenCalledTimes(2);
    const [[firstRequest], [secondRequest]] = esClient.search.mock.calls;
    expect(firstRequest).toMatchObject({
      index: getEntitiesLatestIndex('default'),
      query: { terms: { 'entity.id': ['host:h1', 'host:unknown', ALIAS_1] } },
    });
    expect(JSON.stringify(secondRequest)).toContain(GOLDEN);

    expect(resolution.golden(ALIAS_1)).toBe(GOLDEN);
    expect(resolution.golden(ALIAS_2)).toBe(GOLDEN);
    expect(resolution.golden(HOST)).toBe(HOST);
    expect(resolution.golden('host:unknown')).toBe('host:unknown');
    expect(resolution.get(GOLDEN)).toEqual({
      euid: GOLDEN,
      type: 'user',
      name: 'ann',
      aliasCount: 2,
      attributes: {
        euid: GOLDEN,
        riskScore: 81,
        riskLevel: 'High',
        criticality: 'extreme_impact',
        watchlists: ['Privileged Users', 'vip'],
        privileged: true,
      },
    });
    expect(resolution.get('host:unknown')).toMatchObject({ name: 'mystery', aliasCount: 0 });
    expect(resolution.get(ALIAS_1)).toBeUndefined();
  });

  it('does not query for an empty set and propagates errors', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    await resolveEntities({ esClient, spaceId: 'default', refs: [] });
    expect(esClient.search).not.toHaveBeenCalled();

    esClient.search.mockRejectedValueOnce(new Error('boom'));
    await expect(
      resolveEntities({
        esClient,
        spaceId: 'default',
        refs: [{ euid: HOST, type: 'host', name: 'h1' }],
      })
    ).rejects.toThrow('boom');
  });

  it('identityResolution maps every euid to itself', () => {
    const resolution = identityResolution([{ euid: HOST, type: 'host', name: 'h1' }]);
    expect(resolution.golden(ALIAS_1)).toBe(ALIAS_1);
    expect(resolution.get(HOST)).toMatchObject({ euid: HOST, name: 'h1', aliasCount: 0 });
  });
});
