/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { ElasticsearchClient } from '@kbn/core/server';
import { ensureLatestEntitiesReadAlias } from './install_assets';

describe('ensureLatestEntitiesReadAlias', () => {
  const namespace = 'default';
  const logger = loggingSystemMock.create().get();

  const concreteIndex = '.entities.v2.latest.security_default-00001';
  const aliasName = 'entities-latest-default';

  it('throws when the public name is bound to a concrete index instead of an alias', async () => {
    const esClient = {
      indices: {
        get: jest.fn().mockResolvedValue({
          [aliasName]: { mappings: {}, settings: {} },
        }),
        exists: jest.fn(),
        getAlias: jest.fn(),
        updateAliases: jest.fn(),
      },
    } as unknown as ElasticsearchClient;

    await expect(ensureLatestEntitiesReadAlias(esClient, namespace, logger)).rejects.toThrow(
      'exists as a concrete Elasticsearch index'
    );

    expect(esClient.indices.exists).not.toHaveBeenCalled();
    expect(esClient.indices.updateAliases).not.toHaveBeenCalled();
  });

  it('skips updateAliases when the concrete latest index does not exist', async () => {
    const esClient = {
      indices: {
        get: jest.fn().mockResolvedValue(undefined),
        exists: jest.fn().mockResolvedValue(false),
        getAlias: jest.fn(),
        updateAliases: jest.fn(),
      },
    } as unknown as ElasticsearchClient;

    await ensureLatestEntitiesReadAlias(esClient, namespace, logger);

    expect(esClient.indices.exists).toHaveBeenCalledWith({ index: concreteIndex });
    expect(esClient.indices.updateAliases).not.toHaveBeenCalled();
  });

  it('does not call updateAliases when the alias already points at the concrete index', async () => {
    const esClient = {
      indices: {
        get: jest.fn().mockResolvedValue({
          [concreteIndex]: { aliases: { [aliasName]: {} } },
        }),
        exists: jest.fn().mockResolvedValue(true),
        getAlias: jest.fn().mockResolvedValue({
          [concreteIndex]: { aliases: { [aliasName]: {} } },
        }),
        updateAliases: jest.fn(),
      },
    } as unknown as ElasticsearchClient;

    await ensureLatestEntitiesReadAlias(esClient, namespace, logger);

    expect(esClient.indices.updateAliases).not.toHaveBeenCalled();
  });

  it('calls updateAliases when the concrete index exists but the alias is missing', async () => {
    const esClient = {
      indices: {
        get: jest.fn().mockResolvedValue(undefined),
        exists: jest.fn().mockResolvedValue(true),
        getAlias: jest.fn().mockResolvedValue(undefined),
        updateAliases: jest.fn().mockResolvedValue({ acknowledged: true }),
      },
    } as unknown as ElasticsearchClient;

    await ensureLatestEntitiesReadAlias(esClient, namespace, logger);

    expect(esClient.indices.updateAliases).toHaveBeenCalledWith({
      actions: [{ add: { index: concreteIndex, alias: aliasName, is_write_index: true } }],
    });
  });

  it('throws when the alias exists on a different index', async () => {
    const otherIndex = '.entities.v2.latest.security_default-00002';
    const esClient = {
      indices: {
        get: jest.fn().mockResolvedValue(undefined),
        exists: jest.fn().mockResolvedValue(true),
        getAlias: jest.fn().mockResolvedValue({
          [otherIndex]: { aliases: { [aliasName]: {} } },
        }),
        updateAliases: jest.fn(),
      },
    } as unknown as ElasticsearchClient;

    await expect(ensureLatestEntitiesReadAlias(esClient, namespace, logger)).rejects.toThrow(
      'unexpected index(s)'
    );

    expect(esClient.indices.updateAliases).not.toHaveBeenCalled();
  });
});
