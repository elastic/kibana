/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';

import { fetchMapping } from './fetch_mapping';

describe('fetchMapping lib function', () => {
  const mockClient = {
    asCurrentUser: {
      indices: {
        getMapping: jest.fn(),
      },
    },
  };

  const indexName = 'search-regular-index';

  const regularMappingResponse = {
    'search-regular-index': {
      mappings: {
        dynamic: true,
        dynamic_templates: [],
        properties: {},
      },
    },
  };

  const emptyMappingResponse = {
    'search-regular-index': {
      mappings: {},
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return regular mapping information', async () => {
    mockClient.asCurrentUser.indices.getMapping.mockImplementation(() => regularMappingResponse);

    await expect(
      fetchMapping(mockClient as unknown as IScopedClusterClient, indexName)
    ).resolves.toEqual({
      mappings: {
        dynamic: true,
        dynamic_templates: [],
        properties: {},
      },
    });

    expect(mockClient.asCurrentUser.indices.getMapping).toHaveBeenCalledWith({
      index: indexName,
      expand_wildcards: ['open'],
    });
  });

  it('should return empty object when no mapping is found', async () => {
    mockClient.asCurrentUser.indices.getMapping.mockImplementationOnce(() => emptyMappingResponse);

    await expect(
      fetchMapping(mockClient as unknown as IScopedClusterClient, indexName)
    ).resolves.toEqual({ mappings: {} });

    expect(mockClient.asCurrentUser.indices.getMapping).toHaveBeenCalledWith({
      index: indexName,
      expand_wildcards: ['open'],
    });
  });
});
