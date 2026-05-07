/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { MitreAttackArtifact } from '@kbn/security-mitre-attack-common';
import { hydrateIndex, readStoredStamp } from './hydration';

const buildArtifact = (stamp = 'enterprise:ATT&CK-v18.1'): MitreAttackArtifact => ({
  stamp,
  generatedAt: '2026-05-06T16:00:00Z',
  entities: [
    {
      type: 'tactic',
      framework: 'enterprise',
      versions: ['ATT&CK-v18.1'],
      id: 'TA0006',
      name: 'Credential Access',
      reference: 'https://attack.mitre.org/tactics/TA0006/',
      description: 'desc',
    },
    {
      type: 'technique',
      framework: 'enterprise',
      versions: ['ATT&CK-v18.1'],
      id: 'T1078',
      name: 'Valid Accounts',
      reference: 'https://attack.mitre.org/techniques/T1078/',
      description: 'desc',
      tactics: ['credential-access'],
    },
  ],
});

describe('hydrateIndex', () => {
  const buildEs = () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    const logger = loggingSystemMock.createLogger();
    return { esClient, logger };
  };

  it('skips indexing when the cluster stamp matches the artifact stamp', async () => {
    const { esClient, logger } = buildEs();
    const artifact = buildArtifact();
    esClient.indices.getMapping.mockResolvedValue({
      'index-name': {
        mappings: { _meta: { mitre_attack_stamp: artifact.stamp } },
      },
    } as never);

    const result = await hydrateIndex({
      esClient,
      indexName: 'index-name',
      artifact,
      logger,
    });

    expect(result.hydrated).toBe(false);
    expect(esClient.bulk).not.toHaveBeenCalled();
    expect(esClient.indices.putMapping).not.toHaveBeenCalled();
  });

  it('bulk-indexes entities and writes the stamp when stamps differ', async () => {
    const { esClient, logger } = buildEs();
    const artifact = buildArtifact('new-stamp');
    esClient.indices.getMapping.mockResolvedValue({
      'index-name': { mappings: { _meta: { mitre_attack_stamp: 'old-stamp' } } },
    } as never);
    esClient.bulk.mockResolvedValue({ errors: false, items: [] } as never);
    esClient.indices.refresh.mockResolvedValue({} as never);
    esClient.indices.putMapping.mockResolvedValue({ acknowledged: true } as never);

    const result = await hydrateIndex({
      esClient,
      indexName: 'index-name',
      artifact,
      logger,
    });

    expect(result).toEqual({ hydrated: true, entityCount: 2 });

    const bulkCall = esClient.bulk.mock.calls[0][0];
    expect(bulkCall.operations).toEqual([
      { index: { _index: 'index-name', _id: 'enterprise:TA0006' } },
      artifact.entities[0],
      { index: { _index: 'index-name', _id: 'enterprise:T1078' } },
      artifact.entities[1],
    ]);

    expect(esClient.indices.refresh).toHaveBeenCalledWith({ index: 'index-name' });
    expect(esClient.indices.putMapping).toHaveBeenCalledWith({
      index: 'index-name',
      _meta: { mitre_attack_stamp: 'new-stamp' },
    });
  });

  it('throws when bulk reports errors so the cached promise is invalidated', async () => {
    const { esClient, logger } = buildEs();
    esClient.indices.getMapping.mockResolvedValue({
      'index-name': { mappings: { _meta: {} } },
    } as never);
    esClient.bulk.mockResolvedValue({
      errors: true,
      items: [
        { index: { error: { type: 'mapper_parsing', reason: 'bad doc' }, status: 400 } as never },
      ],
    } as never);

    await expect(
      hydrateIndex({
        esClient,
        indexName: 'index-name',
        artifact: buildArtifact(),
        logger,
      })
    ).rejects.toThrow(/bulk-index/);
  });
});

describe('readStoredStamp', () => {
  it('returns undefined when the index is missing', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    const logger = loggingSystemMock.createLogger();
    const error: Error & { meta?: { statusCode: number } } = new Error('not found');
    error.meta = { statusCode: 404 };
    esClient.indices.getMapping.mockRejectedValue(error as never);

    await expect(
      readStoredStamp({ esClient, indexName: 'missing', logger })
    ).resolves.toBeUndefined();
  });

  it('returns the stamp string when present', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    const logger = loggingSystemMock.createLogger();
    esClient.indices.getMapping.mockResolvedValue({
      foo: { mappings: { _meta: { mitre_attack_stamp: 's1' } } },
    } as never);

    await expect(readStoredStamp({ esClient, indexName: 'foo', logger })).resolves.toBe('s1');
  });
});
