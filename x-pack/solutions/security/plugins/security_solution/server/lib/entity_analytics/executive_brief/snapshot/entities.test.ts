/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { BriefTimeRange } from '../../../../../common/entity_analytics/executive_brief/types';
import { parseEntityDoc } from '../storylines/entity_docs';
import type { SnapshotContext, SnapshotSources } from './context';
import {
  assembleBriefEntity,
  fetchBriefEntities,
  fetchHostVulnerabilities,
  fetchRiskSeries,
} from './entities';
import { EvidenceRegistry } from './evidence_registry';

const timeRange: BriefTimeRange = {
  from: '2026-10-01T00:00:00.000Z',
  to: '2026-10-08T12:00:00.000Z',
  range: '7d',
};

const GOLDEN = 'user:a.rodriguez@acme.com@okta';
const ALIAS = 'user:a.rodriguez@LAPTOP-FIN03@local';

const goldenSource = {
  entity: {
    id: GOLDEN,
    name: 'a.rodriguez',
    risk: { calculated_score_norm: 60, calculated_level: 'Moderate' },
    relationships: {
      resolution: { risk: { calculated_score_norm: 75, calculated_level: 'High' } },
    },
    attributes: { watchlists: ['privileged-user-monitoring-watchlist-id-default'] },
  },
};
const aliasSource = {
  entity: {
    id: ALIAS,
    name: 'a.rodriguez',
    relationships: { resolution: { resolved_to: GOLDEN } },
  },
  asset: { criticality: 'high_impact' },
};

describe('assembleBriefEntity', () => {
  it('prefers the resolution risk, merges watchlists and criticality across the group', () => {
    const entity = assembleBriefEntity({
      evidenceId: 'ENT-1',
      golden: GOLDEN,
      goldenDoc: parseEntityDoc(goldenSource),
      aliasDocs: [parseEntityDoc(aliasSource)].flatMap((doc) => (doc ? [doc] : [])),
      aliases: [ALIAS],
      name: 'a.rodriguez',
      type: 'user',
      riskTrend: [{ t: 'x', v: 1 }],
      isHub: false,
    });
    expect(entity).toEqual({
      evidenceId: 'ENT-1',
      euid: GOLDEN,
      type: 'user',
      name: 'a.rodriguez',
      riskScoreNorm: 75,
      riskLevel: 'High',
      criticality: 'high_impact',
      watchlists: ['Privileged Users'],
      isPrivileged: true,
      aliases: [ALIAS],
      riskTrend: [{ t: 'x', v: 1 }],
    });
  });

  it('omits unknown fields for an entity that is not in the store', () => {
    expect(
      assembleBriefEntity({
        evidenceId: 'ENT-2',
        golden: 'host:ghost',
        aliasDocs: [],
        aliases: [],
        name: 'ghost',
        type: 'host',
        riskTrend: [],
      })
    ).toEqual({
      evidenceId: 'ENT-2',
      euid: 'host:ghost',
      type: 'host',
      name: 'ghost',
      watchlists: [],
      isPrivileged: false,
      aliases: [],
    });
  });
});

describe('fetchRiskSeries', () => {
  it('returns daily max series per entity, oldest first, merged across entity types', async () => {
    const es = elasticsearchServiceMock.createElasticsearchClient();
    es.search.mockResolvedValue({
      aggregations: {
        host: {
          buckets: [
            {
              key: 'host:a',
              days: {
                buckets: [
                  { key: 2, key_as_string: '2026-10-03T00:00:00.000Z', score: { value: 49.123 } },
                  { key: 1, key_as_string: '2026-10-02T00:00:00.000Z', score: { value: 12 } },
                  { key: 3, key_as_string: '2026-10-04T00:00:00.000Z', score: { value: null } },
                ],
              },
            },
          ],
        },
        user: { buckets: [] },
        service: { buckets: [] },
      },
    } as never);
    const series = await fetchRiskSeries({
      esClient: es,
      spaceId: 'default',
      timeRange,
      euids: ['host:a'],
    });
    expect(series.get('host:a')).toEqual([
      { t: '2026-10-02T00:00:00.000Z', v: 12 },
      { t: '2026-10-03T00:00:00.000Z', v: 49.12 },
    ]);
    expect(es.search.mock.calls[0][0]).toMatchObject({
      index: 'risk-score.risk-score-default',
      size: 0,
    });
  });

  it('does not query for no entities', async () => {
    const es = elasticsearchServiceMock.createElasticsearchClient();
    expect(
      (await fetchRiskSeries({ esClient: es, spaceId: 'default', timeRange, euids: [] })).size
    ).toBe(0);
    expect(es.search).not.toHaveBeenCalled();
  });
});

describe('fetchHostVulnerabilities', () => {
  it('counts critical and high findings per host, case-insensitively', async () => {
    const es = elasticsearchServiceMock.createElasticsearchClient();
    es.search.mockResolvedValue({
      aggregations: {
        hosts: {
          buckets: [
            {
              key: 'host:prod',
              severity: {
                buckets: [
                  { key: 'CRITICAL', doc_count: 2 },
                  { key: 'high', doc_count: 5 },
                  { key: 'LOW', doc_count: 9 },
                ],
              },
            },
          ],
        },
      },
    } as never);
    const result = await fetchHostVulnerabilities({ esClient: es, hostEuids: ['host:prod'] });
    expect(result.get('host:prod')).toEqual({ critical: 2, high: 5 });
    expect(es.search.mock.calls[0][0]).toMatchObject({ ignore_unavailable: true, size: 0 });
  });
});

describe('fetchBriefEntities', () => {
  const buildCtx = () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.search.mockImplementation(((request: Record<string, unknown>) => {
      const index = String(request.index);
      const body = JSON.stringify(request.query);
      if (index === 'entities-latest-default') {
        if (body.includes('resolved_to')) {
          return Promise.resolve({
            hits: { hits: [{ _source: goldenSource }, { _source: aliasSource }] },
          });
        }
        return Promise.resolve({ hits: { hits: [{ _source: aliasSource }] } });
      }
      if (index.startsWith('risk-score')) {
        return Promise.resolve({
          aggregations: {
            host: { buckets: [] },
            service: { buckets: [] },
            user: {
              buckets: [
                {
                  key: GOLDEN,
                  days: {
                    buckets: [
                      { key: 1, key_as_string: '2026-10-07T00:00:00.000Z', score: { value: 75 } },
                    ],
                  },
                },
              ],
            },
          },
        });
      }
      return Promise.resolve({ aggregations: { hosts: { buckets: [] } } });
    }) as never);
    const ctx: SnapshotContext = {
      spaceId: 'default',
      timeRange,
      esClient,
      request: httpServerMock.createKibanaRequest(),
      logger: loggingSystemMock.createLogger(),
      abortSignal: new AbortController().signal,
      registry: new EvidenceRegistry(),
      services: {},
    };
    return { ctx, esClient };
  };

  it('collapses aliases to the golden entity, registers ENT ids, and sets the hub flag', async () => {
    const { ctx } = buildCtx();
    const result = await fetchBriefEntities(ctx, [ALIAS, 'host:ghost', GOLDEN], {
      hubEuids: ['host:ghost'],
    });
    expect(Object.keys(result)).toEqual([GOLDEN, 'host:ghost']);
    expect(result[GOLDEN]).toMatchObject({
      evidenceId: 'ENT-1',
      aliases: [ALIAS],
      riskScoreNorm: 75,
      riskLevel: 'High',
      isPrivileged: true,
      watchlists: ['Privileged Users'],
      criticality: 'high_impact',
      riskTrend: [{ t: '2026-10-07T00:00:00.000Z', v: 75 }],
    });
    expect(result['host:ghost']).toMatchObject({ evidenceId: 'ENT-2', isHub: true, type: 'host' });
    expect(ctx.registry.entityEuids()).toEqual([GOLDEN, 'host:ghost']);
  });

  it('records enrichment failures as source statuses and leaves the fields unset', async () => {
    const { ctx, esClient } = buildCtx();
    const original = esClient.search.getMockImplementation();
    esClient.search.mockImplementation(((request: Record<string, unknown>) =>
      String(request.index).startsWith('risk-score')
        ? Promise.reject(new Error('risk down'))
        : original?.(request as never)) as never);
    const sources: SnapshotSources = {};
    const result = await fetchBriefEntities(ctx, [GOLDEN], { sources });
    expect(result[GOLDEN].riskTrend).toBeUndefined();
    expect(sources['entities.riskTrend']).toMatchObject({ status: 'error', message: 'risk down' });
    expect(sources['entities.vulnerabilities']).toMatchObject({ status: 'ok' });
  });

  it('propagates entity document failures to the caller', async () => {
    const { ctx, esClient } = buildCtx();
    esClient.search.mockRejectedValue(new Error('entity store down'));
    await expect(fetchBriefEntities(ctx, [GOLDEN])).rejects.toThrow('entity store down');
  });

  it('returns an empty record for no euids', async () => {
    const { ctx } = buildCtx();
    await expect(fetchBriefEntities(ctx, [])).resolves.toEqual({});
  });
});
