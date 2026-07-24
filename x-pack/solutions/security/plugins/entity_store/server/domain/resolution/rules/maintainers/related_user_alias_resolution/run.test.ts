/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { ResolutionClient } from '../../..';
import type { MaintainerTelemetryClient } from '../../../../../tasks/entity_maintainers/maintainer_telemetry_client';
import type { PerRuleState } from '../automated_resolution/types';
import { collectSeeds, runRelatedUserAliasResolution } from './run';

const NAMESPACE = 'default';
const INITIAL_STATE: PerRuleState = { lastProcessedTimestamp: null, lastRun: null };

const createSearchResponse = (sources: Array<Record<string, unknown>>) => ({
  hits: {
    hits: sources.map((source, index) => ({ _id: `doc-${index}`, _source: source })),
    total: { value: sources.length, relation: 'eq' as const },
  },
});

const createSortedSearchResponse = (sources: Array<Record<string, unknown>>) => ({
  hits: {
    hits: sources.map((source, index) => ({
      _id: `doc-${index}`,
      _source: source,
      sort: [source['entity.lifecycle.first_seen'] ?? '2026-06-26T00:00:00Z', source['entity.id']],
    })),
    total: { value: sources.length, relation: 'eq' as const },
  },
});

const createSeed = () => ({
  'entity.id': 'user:seed@example.com@entra_id',
  'entity.namespace': 'entra_id',
  'entity.EngineMetadata.Type': 'user',
  'user.email': ['seed@example.com'],
  'user.id': ['seed-guid'],
  'user.name': 'seed@example.com',
});

const createSourceDoc = (relatedUsers: string[], overrides: Record<string, unknown> = {}) => ({
  '@timestamp': '2026-06-26T00:00:00Z',
  'event.kind': 'asset',
  'event.module': 'entityanalytics_entra_id',
  'user.email': 'seed@example.com',
  'related.user': relatedUsers,
  'user.profile.manager': 'manager@example.com',
  ...overrides,
});

const createCandidate = (id: string, namespace = 'active_directory', userName = 'T03KX1Z') => ({
  'entity.id': id,
  'entity.namespace': namespace,
  'entity.EngineMetadata.Type': 'user',
  'user.name': userName,
});

const createDeps = ({
  esClient,
  resolutionClient,
  telemetry = { report: jest.fn() },
}: {
  esClient: ElasticsearchClient;
  resolutionClient: ResolutionClient;
  telemetry?: MaintainerTelemetryClient;
}) => ({
  state: INITIAL_STATE,
  namespace: NAMESPACE,
  esClient,
  logger: loggerMock.create(),
  resolutionClient,
  signal: new AbortController().signal,
  telemetry,
});

describe('runRelatedUserAliasResolution', () => {
  let esClient: jest.Mocked<ElasticsearchClient>;
  let cascadeLinkEntities: jest.Mock;
  let resolutionClient: ResolutionClient;

  beforeEach(() => {
    esClient = {
      search: jest.fn(),
    } as unknown as jest.Mocked<ElasticsearchClient>;
    cascadeLinkEntities = jest.fn().mockResolvedValue({
      linked: ['user:seed@example.com@entra_id'],
      retargeted: [],
      skipped: [],
      cascadesBlocked: 0,
      target_id: 'user:ad',
    });
    resolutionClient = { cascadeLinkEntities } as unknown as ResolutionClient;
  });

  it('reads the seed source doc by EUID, cleans manager values, and cascade-links the match', async () => {
    esClient.search
      .mockResolvedValueOnce(createSearchResponse([createSeed()]) as never)
      .mockResolvedValueOnce(
        createSearchResponse([createSourceDoc(['t03kx1z', 'manager@example.com'])]) as never
      )
      .mockResolvedValueOnce(createSearchResponse([createCandidate('user:ad')]) as never);

    const result = await runRelatedUserAliasResolution(createDeps({ esClient, resolutionClient }));

    expect(esClient.search).toHaveBeenCalledTimes(3);
    expect(esClient.search.mock.calls[2][0]).toEqual(
      expect.objectContaining({
        query: expect.objectContaining({
          bool: expect.objectContaining({
            filter: expect.arrayContaining([
              { bool: { must_not: { term: { 'entity.namespace': 'local' } } } },
              expect.objectContaining({
                bool: expect.objectContaining({
                  should: expect.arrayContaining([
                    { term: { 'user.name': { value: 't03kx1z', case_insensitive: true } } },
                  ]),
                }),
              }),
            ]),
          }),
        }),
      })
    );
    expect(cascadeLinkEntities).toHaveBeenCalledWith('user:ad', ['user:seed@example.com@entra_id']);
    expect(result.lastRun).toMatchObject({ seedsScanned: 1, linksCreated: 1 });
  });

  it('drops okta manager values before candidate lookup', async () => {
    esClient.search
      .mockResolvedValueOnce(createSearchResponse([createSeed()]) as never)
      .mockResolvedValueOnce(
        createSearchResponse([createSourceDoc(['manager@example.com'])]) as never
      );

    const result = await runRelatedUserAliasResolution(createDeps({ esClient, resolutionClient }));

    expect(esClient.search).toHaveBeenCalledTimes(2);
    expect(cascadeLinkEntities).not.toHaveBeenCalled();
    expect(result.lastRun).toMatchObject({ linksCreated: 0 });
  });

  it('drops well-known SID and generic service account values before candidate lookup', async () => {
    esClient.search
      .mockResolvedValueOnce(createSearchResponse([createSeed()]) as never)
      .mockResolvedValueOnce(
        createSearchResponse([
          createSourceDoc(['S-1-5-18', 'S-1-5-32-544', 'system', 'service account']),
        ]) as never
      );

    await runRelatedUserAliasResolution(createDeps({ esClient, resolutionClient }));

    expect(esClient.search).toHaveBeenCalledTimes(2);
    expect(cascadeLinkEntities).not.toHaveBeenCalled();
  });

  it('excludes source records that do not recompute to the seed EUID', async () => {
    esClient.search
      .mockResolvedValueOnce(createSearchResponse([createSeed()]) as never)
      .mockResolvedValueOnce(
        createSearchResponse([
          createSourceDoc(['T03KX1Z'], {
            'user.email': 'device-owner@example.com',
          }),
        ]) as never
      );

    await runRelatedUserAliasResolution(createDeps({ esClient, resolutionClient }));

    expect(esClient.search).toHaveBeenCalledTimes(2);
    expect(cascadeLinkEntities).not.toHaveBeenCalled();
  });

  it('skips ambiguous values without linking', async () => {
    esClient.search
      .mockResolvedValueOnce(createSearchResponse([createSeed()]) as never)
      .mockResolvedValueOnce(createSearchResponse([createSourceDoc(['T03KX1Z'])]) as never)
      .mockResolvedValueOnce(
        createSearchResponse([createCandidate('user:ad-1'), createCandidate('user:ad-2')]) as never
      );

    const result = await runRelatedUserAliasResolution(createDeps({ esClient, resolutionClient }));

    expect(cascadeLinkEntities).not.toHaveBeenCalled();
    expect(result.lastRun).toMatchObject({ skippedAmbiguous: 1 });
  });

  it('accumulates all unambiguous candidates for one seed into a single cascade', async () => {
    cascadeLinkEntities.mockResolvedValueOnce({
      linked: ['user:seed@example.com@entra_id', 'user:okta'],
      retargeted: [],
      skipped: [],
      cascadesBlocked: 0,
      target_id: 'user:ad',
    });
    esClient.search
      .mockResolvedValueOnce(createSearchResponse([createSeed()]) as never)
      .mockResolvedValueOnce(
        createSearchResponse([createSourceDoc(['T03KX1Z', 'okta-login'])]) as never
      )
      .mockResolvedValueOnce(createSearchResponse([createCandidate('user:ad')]) as never)
      .mockResolvedValueOnce(
        createSearchResponse([createCandidate('user:okta', 'okta', 'okta-login')]) as never
      );

    const result = await runRelatedUserAliasResolution(createDeps({ esClient, resolutionClient }));

    expect(cascadeLinkEntities).toHaveBeenCalledTimes(1);
    expect(cascadeLinkEntities).toHaveBeenCalledWith('user:ad', [
      'user:seed@example.com@entra_id',
      'user:okta',
    ]);
    expect(result.lastRun).toMatchObject({ linksCreated: 2 });
  });

  it('skips an ambiguous value but still links other clean values for the seed', async () => {
    esClient.search
      .mockResolvedValueOnce(createSearchResponse([createSeed()]) as never)
      .mockResolvedValueOnce(
        createSearchResponse([createSourceDoc(['ambiguous', 'T03KX1Z'])]) as never
      )
      .mockResolvedValueOnce(
        createSearchResponse([
          createCandidate('user:ambiguous-1', 'active_directory', 'ambiguous'),
          createCandidate('user:ambiguous-2', 'okta', 'ambiguous'),
        ]) as never
      )
      .mockResolvedValueOnce(createSearchResponse([createCandidate('user:ad')]) as never);

    const result = await runRelatedUserAliasResolution(createDeps({ esClient, resolutionClient }));

    expect(cascadeLinkEntities).toHaveBeenCalledTimes(1);
    expect(cascadeLinkEntities).toHaveBeenCalledWith('user:ad', ['user:seed@example.com@entra_id']);
    expect(result.lastRun).toMatchObject({ skippedAmbiguous: 1, linksCreated: 1 });
  });

  it('dedupes a candidate matched by multiple values before cascading', async () => {
    esClient.search
      .mockResolvedValueOnce(createSearchResponse([createSeed()]) as never)
      .mockResolvedValueOnce(
        createSearchResponse([createSourceDoc(['T03KX1Z', 'same-user-email@example.com'])]) as never
      )
      .mockResolvedValueOnce(createSearchResponse([createCandidate('user:ad')]) as never)
      .mockResolvedValueOnce(
        createSearchResponse([
          {
            ...createCandidate('user:ad'),
            'user.email': 'same-user-email@example.com',
          },
        ]) as never
      );

    const result = await runRelatedUserAliasResolution(createDeps({ esClient, resolutionClient }));

    expect(cascadeLinkEntities).toHaveBeenCalledTimes(1);
    expect(cascadeLinkEntities).toHaveBeenCalledWith('user:ad', ['user:seed@example.com@entra_id']);
    expect(result.lastRun).toMatchObject({ linksCreated: 1 });
  });

  it('paginates seed collection with search_after', async () => {
    const firstPage = Array.from({ length: 10_000 }, (_, index) => ({
      ...createSeed(),
      'entity.id': `user:seed-${index}@entra_id`,
      'entity.lifecycle.first_seen': `2026-06-26T00:00:${String(index % 60).padStart(2, '0')}Z`,
    }));
    const secondPageSeed = {
      ...createSeed(),
      'entity.id': 'user:seed-10000@entra_id',
      'entity.lifecycle.first_seen': '2026-06-26T00:10:00Z',
    };
    esClient.search
      .mockResolvedValueOnce(createSortedSearchResponse(firstPage) as never)
      .mockResolvedValueOnce(createSortedSearchResponse([secondPageSeed]) as never);

    const seeds = await collectSeeds({
      esClient,
      index: '.entities.v2.latest.security_default',
      abortSignal: new AbortController().signal,
    });

    expect(seeds).toHaveLength(10_001);
    expect(esClient.search).toHaveBeenCalledTimes(2);
    expect(esClient.search.mock.calls[1][0]).toEqual(
      expect.objectContaining({
        search_after: ['2026-06-26T00:00:39Z', 'user:seed-9999@entra_id'],
      })
    );
  });
});
