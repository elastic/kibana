/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('@kbn/search-connectors', () => ({
  fetchConnectorByIndexName: jest.fn(),
}));

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { fetchConnectorByIndexName } from '@kbn/search-connectors';

import { fetchIndex } from './fetch_index';

describe('fetch index lib function', () => {
  const mockClient = {
    indices: {
      get: jest.fn(),
    },
    count: jest.fn(),
  };
  const client = () => mockClient as unknown as ElasticsearchClient;

  const indexName = 'search-regular-index';
  const regularIndexResponse = {
    'search-regular-index': {
      aliases: {},
    },
  };

  const indexCountResponse = {
    count: 100,
  };
  const indexConnector = {
    foo: 'foo',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return index if all client calls succeed', async () => {
    mockClient.indices.get.mockResolvedValue({ ...regularIndexResponse });
    mockClient.count.mockResolvedValue(indexCountResponse);
    (fetchConnectorByIndexName as unknown as jest.Mock).mockResolvedValue(indexConnector);

    await expect(fetchIndex(client(), indexName)).resolves.toMatchObject({
      index: {
        aliases: {},
        count: 100,
        connector: indexConnector,
      },
    });
  });
  it('should throw an error if get index rejects', async () => {
    const expectedError = new Error('Boom!');

    mockClient.indices.get.mockRejectedValue(expectedError);
    mockClient.count.mockResolvedValue(indexCountResponse);
    (fetchConnectorByIndexName as unknown as jest.Mock).mockResolvedValue(indexConnector);

    await expect(fetchIndex(client(), indexName)).rejects.toEqual(expectedError);
  });

  it('should return partial data if index count rejects', async () => {
    const expectedError = new Error('Boom!');

    mockClient.indices.get.mockResolvedValue({ ...regularIndexResponse });
    mockClient.count.mockRejectedValue(expectedError);
    (fetchConnectorByIndexName as unknown as jest.Mock).mockResolvedValue(indexConnector);

    await expect(fetchIndex(client(), indexName)).resolves.toMatchObject({
      index: {
        aliases: {},
        count: 0,
        connector: indexConnector,
      },
    });
  });

  it('should return partial data if fetch connector rejects', async () => {
    const expectedError = new Error('Boom!');

    mockClient.indices.get.mockResolvedValue({ ...regularIndexResponse });
    mockClient.count.mockResolvedValue(indexCountResponse);
    (fetchConnectorByIndexName as unknown as jest.Mock).mockRejectedValue(expectedError);

    await expect(fetchIndex(client(), indexName)).resolves.toMatchObject({
      index: {
        aliases: {},
        count: 100,
      },
    });
  });
});
