/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { MitreAttackDataService } from './mitre_attack_data_service';

const mockInstall = jest.fn();
const mockCreateIndex = jest.fn();
const mockGetIndexName = jest.fn((suffix: string) => `.kibana-mitre-attack-${suffix}`);
const mockSetComponentTemplate = jest.fn();
const mockSetIndexTemplate = jest.fn();

jest.mock('@kbn/index-adapter', () => {
  const actual = jest.requireActual('@kbn/index-adapter');
  return {
    ...actual,
    IndexPatternAdapter: jest.fn().mockImplementation(() => ({
      install: mockInstall,
      createIndex: mockCreateIndex,
      getIndexName: mockGetIndexName,
      setComponentTemplate: mockSetComponentTemplate,
      setIndexTemplate: mockSetIndexTemplate,
    })),
  };
});

jest.mock('./hydration', () => ({
  hydrateIndex: jest.fn().mockResolvedValue({ hydrated: true, entityCount: 705 }),
  readStoredStamp: jest.fn().mockResolvedValue(undefined),
}));

const { hydrateIndex } = jest.requireMock('./hydration');

describe('MitreAttackDataService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInstall.mockResolvedValue(undefined);
    mockCreateIndex.mockResolvedValue(undefined);
  });

  it('registers component + index templates during setup', async () => {
    const loggerFactory = loggingSystemMock.create();
    const service = new MitreAttackDataService(loggerFactory, '9.5.0');
    const esClient = elasticsearchServiceMock.createElasticsearchClient();

    await service.setup({ esClient });

    expect(mockSetComponentTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'mitre-attack-mappings' })
    );
    expect(mockSetIndexTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'mitre-attack-template',
        componentTemplateRefs: ['mitre-attack-mappings'],
      })
    );
  });

  describe('semantic search wiring', () => {
    const getInstalledFieldMap = () => mockSetComponentTemplate.mock.calls[0][0].fieldMap;

    const setupService = async (
      semantic: { enabled: boolean; inferenceId?: string } | undefined,
      esClient = elasticsearchServiceMock.createElasticsearchClient()
    ) => {
      const service = new MitreAttackDataService(loggingSystemMock.create(), '9.5.0');
      await service.setup({ esClient, semantic });
      return { service, esClient };
    };

    it('installs a keyword-only mapping when semantic search is disabled', async () => {
      const { service, esClient } = await setupService({ enabled: false });

      expect(getInstalledFieldMap().semantic).toBeUndefined();
      expect(esClient.inference.get).not.toHaveBeenCalled();
      expect(service.isSemanticEnabled()).toBe(false);
      expect(hydrateIndex).not.toHaveBeenCalled();
    });

    it('installs a semantic_text field bound to the resolved inference endpoint', async () => {
      const { service } = await setupService({ enabled: true });

      expect(getInstalledFieldMap().semantic).toEqual({
        type: 'semantic_text',
        required: false,
        inference_id: '.elser-2-elasticsearch',
      });
      expect(service.isSemanticEnabled()).toBe(true);
    });

    it('honours a custom inference endpoint', async () => {
      const { service } = await setupService({ enabled: true, inferenceId: '.custom-elser' });

      expect(getInstalledFieldMap().semantic.inference_id).toBe('.custom-elser');
      expect(service.isSemanticEnabled()).toBe(true);
    });

    it('warms the endpoint before the mapping that depends on it is installed', async () => {
      const esClient = elasticsearchServiceMock.createElasticsearchClient();
      const callOrder: string[] = [];
      esClient.inference.inference.mockImplementation((() => {
        callOrder.push('warmup');
        return Promise.resolve({} as never);
      }) as never);
      mockSetComponentTemplate.mockImplementation(() => {
        callOrder.push('setComponentTemplate');
      });
      mockInstall.mockImplementation(() => {
        callOrder.push('install');
        return Promise.resolve(undefined);
      });

      await setupService({ enabled: true }, esClient);

      expect(callOrder).toEqual(['warmup', 'setComponentTemplate', 'install']);
    });

    it('falls back to a keyword-only mapping when the endpoint is missing', async () => {
      const esClient = elasticsearchServiceMock.createElasticsearchClient();
      esClient.inference.get.mockRejectedValue(new Error('no such inference endpoint') as never);

      const { service } = await setupService({ enabled: true }, esClient);

      expect(getInstalledFieldMap().semantic).toBeUndefined();
      expect(service.isSemanticEnabled()).toBe(false);
    });

    it('falls back to a keyword-only mapping when the endpoint fails to deploy', async () => {
      const esClient = elasticsearchServiceMock.createElasticsearchClient();
      esClient.inference.inference.mockRejectedValue(new Error('deployment timed out') as never);

      const { service } = await setupService({ enabled: true }, esClient);

      expect(getInstalledFieldMap().semantic).toBeUndefined();
      expect(service.isSemanticEnabled()).toBe(false);
    });

    it('passes the inference endpoint through to hydration', async () => {
      const { service } = await setupService({ enabled: true });
      await service.hydrate('default');

      expect(hydrateIndex).toHaveBeenCalledWith(
        expect.objectContaining({ semanticInferenceId: '.elser-2-elasticsearch' })
      );
    });

    it('reports semantic availability to the clients it creates', async () => {
      const esClient = elasticsearchServiceMock.createElasticsearchClient();
      esClient.inference.get.mockRejectedValue(new Error('missing') as never);
      const { service } = await setupService({ enabled: true }, esClient);

      const scopedEsClient = elasticsearchServiceMock.createElasticsearchClient();
      scopedEsClient.search.mockResolvedValue({ hits: { hits: [] } } as never);
      const client = service.createClient({ spaceId: 'default', esClient: scopedEsClient });

      // The client degrades to keyword because the index carries no embeddings.
      await expect(client.search({ query: 'x', mode: 'hybrid' })).resolves.toEqual(
        expect.objectContaining({ mode: 'keyword' })
      );
    });
  });

  it('setup() installs the adapter and is idempotent for parallel callers', async () => {
    const loggerFactory = loggingSystemMock.create();
    const service = new MitreAttackDataService(loggerFactory, '9.5.0');
    const esClient = elasticsearchServiceMock.createElasticsearchClient();

    await Promise.all([service.setup({ esClient }), service.setup({ esClient })]);

    expect(mockInstall).toHaveBeenCalledTimes(1);
  });

  it('hydrate() coalesces concurrent calls per space', async () => {
    const loggerFactory = loggingSystemMock.create();
    const service = new MitreAttackDataService(loggerFactory, '9.5.0');
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    await service.setup({ esClient });

    await Promise.all([service.hydrate('default'), service.hydrate('default')]);

    expect(mockCreateIndex).toHaveBeenCalledTimes(1);
    expect(hydrateIndex).toHaveBeenCalledTimes(1);
    expect(hydrateIndex).toHaveBeenCalledWith(
      expect.objectContaining({ indexName: '.kibana-mitre-attack-default' })
    );
  });

  it('hydrate() runs once per space', async () => {
    const loggerFactory = loggingSystemMock.create();
    const service = new MitreAttackDataService(loggerFactory, '9.5.0');
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    await service.setup({ esClient });

    await service.hydrate('default');
    await service.hydrate('team-a');
    await service.hydrate('default');

    expect(mockCreateIndex).toHaveBeenCalledTimes(2);
    expect(hydrateIndex).toHaveBeenCalledTimes(2);
  });

  it('hydrate() drops the cached promise on failure so retries can re-attempt', async () => {
    const loggerFactory = loggingSystemMock.create();
    const service = new MitreAttackDataService(loggerFactory, '9.5.0');
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    await service.setup({ esClient });

    hydrateIndex.mockRejectedValueOnce(new Error('boom'));
    await expect(service.hydrate('default')).rejects.toThrow('boom');

    await service.hydrate('default');
    expect(hydrateIndex).toHaveBeenCalledTimes(2);
  });

  it('createClient() returns a client whose resolveIndexName triggers hydration', async () => {
    const loggerFactory = loggingSystemMock.create();
    const service = new MitreAttackDataService(loggerFactory, '9.5.0');
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    await service.setup({ esClient });

    const scopedEsClient = elasticsearchServiceMock.createElasticsearchClient();
    scopedEsClient.search.mockResolvedValue({ hits: { hits: [] } } as never);

    const client = service.createClient({ spaceId: 'team-a', esClient: scopedEsClient });
    await client.list({ types: ['tactic'] });

    expect(mockCreateIndex).toHaveBeenCalledTimes(1);
    expect(scopedEsClient.search).toHaveBeenCalledWith(
      expect.objectContaining({ index: '.kibana-mitre-attack-team-a' })
    );
  });
});
