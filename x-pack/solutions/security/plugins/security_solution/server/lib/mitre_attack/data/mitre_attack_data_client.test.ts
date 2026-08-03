/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { MitreAttackDataClient } from './mitre_attack_data_client';

const buildHit = <T extends object>(source: T) => ({ _source: source });

const sampleTactic = {
  type: 'tactic' as const,
  framework: 'enterprise' as const,
  versions: ['ATT&CK-v19.1'],
  id: 'TA0006',
  name: 'Credential Access',
  reference: 'https://attack.mitre.org/tactics/TA0006/',
  description: 'desc',
};

describe('MitreAttackDataClient', () => {
  const buildClient = ({ semanticEnabled = false }: { semanticEnabled?: boolean } = {}) => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    const logger = loggingSystemMock.createLogger();
    const client = new MitreAttackDataClient({
      esClient,
      logger,
      resolveTarget: async () => ({
        indexName: '.kibana-mitre-attack-default',
        semanticEnabled,
      }),
    });
    return { esClient, logger, client };
  };

  it('list() filters by framework + types and sorts by name', async () => {
    const { esClient, client } = buildClient();
    esClient.search.mockResolvedValue({
      hits: { hits: [buildHit(sampleTactic)] },
    } as never);

    const result = await client.list({ framework: 'enterprise', types: ['tactic'] });

    expect(result).toEqual([sampleTactic]);
    const search = esClient.search.mock.calls[0]?.[0];
    expect(search?.index).toBe('.kibana-mitre-attack-default');
    expect(search?.sort).toEqual([{ name: 'asc' }]);
    expect(search?.query?.bool?.filter).toEqual([
      { term: { framework: 'enterprise' } },
      { terms: { type: ['tactic'] } },
    ]);
  });

  it('list() forwards the techniqueId filter onto subtechnique queries', async () => {
    const { esClient, client } = buildClient();
    esClient.search.mockResolvedValue({ hits: { hits: [] } } as never);

    await client.list({ types: ['subtechnique'], techniqueId: 'T1078' });

    const search = esClient.search.mock.calls[0]?.[0];
    expect(search?.query?.bool?.filter).toEqual([
      { terms: { type: ['subtechnique'] } },
      { term: { techniqueId: 'T1078' } },
    ]);
  });

  it('search() uses BM25 multi_match with the framework + type filters applied', async () => {
    const { esClient, client } = buildClient();
    esClient.search.mockResolvedValue({
      hits: { hits: [buildHit(sampleTactic)] },
    } as never);

    const result = await client.search({
      query: 'credential dumping',
      framework: 'enterprise',
      types: ['technique', 'subtechnique'],
      limit: 10,
    });

    expect(result).toEqual({ entities: [sampleTactic], mode: 'keyword' });
    const search = esClient.search.mock.calls[0]?.[0];
    expect(search?.size).toBe(10);
    expect(search?.retriever).toBeUndefined();
    expect(search?.query?.bool?.must).toEqual([
      {
        multi_match: {
          query: 'credential dumping',
          fields: ['name.text^3', 'description', 'id^2'],
          operator: 'or',
        },
      },
    ]);
    expect(search?.query?.bool?.filter).toEqual([
      { term: { framework: 'enterprise' } },
      { terms: { type: ['technique', 'subtechnique'] } },
    ]);
  });

  describe('search() retrieval modes', () => {
    it('defaults to hybrid RRF when the index carries embeddings', async () => {
      const { esClient, client } = buildClient({ semanticEnabled: true });
      esClient.search.mockResolvedValue({ hits: { hits: [] } } as never);

      const result = await client.search({
        query: 'credential dumping',
        framework: 'enterprise',
        limit: 10,
      });

      expect(result.mode).toBe('hybrid');
      const search = esClient.search.mock.calls[0]?.[0];
      expect(search?.query).toBeUndefined();
      const rrf = search?.retriever?.rrf;
      expect(rrf?.retrievers).toEqual([
        {
          standard: {
            query: {
              multi_match: {
                query: 'credential dumping',
                fields: ['name.text^3', 'description', 'id^2'],
                operator: 'or',
              },
            },
          },
        },
        {
          standard: {
            query: { semantic: { field: 'semantic', query: 'credential dumping' } },
          },
        },
      ]);
      expect(rrf?.filter).toEqual([{ term: { framework: 'enterprise' } }]);
      expect(rrf?.rank_constant).toBe(60);
    });

    it('ranks deeper than the requested page size before fusing', async () => {
      const { esClient, client } = buildClient({ semanticEnabled: true });
      esClient.search.mockResolvedValue({ hits: { hits: [] } } as never);

      await client.search({ query: 'x', limit: 100 });
      expect(esClient.search.mock.calls[0]?.[0]?.retriever?.rrf?.rank_window_size).toBe(400);

      // Small pages still rank deep enough for fusion to matter.
      await client.search({ query: 'x', limit: 5 });
      expect(esClient.search.mock.calls[1]?.[0]?.retriever?.rrf?.rank_window_size).toBe(50);
    });

    it('queries only the semantic field in semantic mode, keeping filters applied', async () => {
      const { esClient, client } = buildClient({ semanticEnabled: true });
      esClient.search.mockResolvedValue({ hits: { hits: [] } } as never);

      const result = await client.search({
        query: 'stealing passwords from memory',
        types: ['technique'],
        mode: 'semantic',
      });

      expect(result.mode).toBe('semantic');
      const standard = esClient.search.mock.calls[0]?.[0]?.retriever?.standard;
      expect(standard?.query?.bool?.must).toEqual([
        { semantic: { field: 'semantic', query: 'stealing passwords from memory' } },
      ]);
      expect(standard?.query?.bool?.filter).toEqual([{ terms: { type: ['technique'] } }]);
    });

    it('honours an explicit keyword request even when embeddings exist', async () => {
      const { esClient, client } = buildClient({ semanticEnabled: true });
      esClient.search.mockResolvedValue({ hits: { hits: [] } } as never);

      const result = await client.search({ query: 'T1078', mode: 'keyword' });

      expect(result.mode).toBe('keyword');
      expect(esClient.search.mock.calls[0]?.[0]?.retriever).toBeUndefined();
    });

    it('falls back to keyword when semantic is requested but the index has no embeddings', async () => {
      const { esClient, client, logger } = buildClient({ semanticEnabled: false });
      esClient.search.mockResolvedValue({ hits: { hits: [] } } as never);

      const result = await client.search({ query: 'credential dumping', mode: 'hybrid' });

      expect(result.mode).toBe('keyword');
      expect(esClient.search.mock.calls[0]?.[0]?.retriever).toBeUndefined();
      expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('falling back to keyword'));
    });
  });

  it('search() clamps limit to the maximum and minimum bounds', async () => {
    const { esClient, client } = buildClient();
    esClient.search.mockResolvedValue({ hits: { hits: [] } } as never);

    await client.search({ query: 'x', limit: 99999 });
    expect(esClient.search.mock.calls[0]?.[0]?.size).toBe(1500);

    await client.search({ query: 'x', limit: 0 });
    expect(esClient.search.mock.calls[1]?.[0]?.size).toBe(1);
  });

  it('getById() builds a deterministic doc id and returns the source', async () => {
    const { esClient, client } = buildClient();
    esClient.get.mockResolvedValue({
      _source: sampleTactic,
    } as never);

    const result = await client.getById('enterprise', 'TA0006');

    expect(esClient.get).toHaveBeenCalledWith({
      index: '.kibana-mitre-attack-default',
      id: 'enterprise:TA0006',
    });
    expect(result).toEqual(sampleTactic);
  });

  it('getById() returns undefined on 404', async () => {
    const { esClient, client } = buildClient();
    const error: Error & { meta?: { statusCode: number } } = new Error('not found');
    error.meta = { statusCode: 404 };
    esClient.get.mockRejectedValueOnce(error as never);

    await expect(client.getById('enterprise', 'TA9999')).resolves.toBeUndefined();
  });
});
