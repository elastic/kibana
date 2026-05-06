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

  it('registers component + index templates on construction', () => {
    const loggerFactory = loggingSystemMock.create();
    new MitreAttackDataService(loggerFactory, '9.5.0');

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

    const esScopedClient = elasticsearchServiceMock.createScopedClusterClient();
    esScopedClient.asInternalUser.search.mockResolvedValue({ hits: { hits: [] } } as never);

    const client = service.createClient({ spaceId: 'team-a', esScopedClient });
    await client.list({ types: ['tactic'] });

    expect(mockCreateIndex).toHaveBeenCalledTimes(1);
    expect(esScopedClient.asInternalUser.search).toHaveBeenCalledWith(
      expect.objectContaining({ index: '.kibana-mitre-attack-team-a' })
    );
  });
});
