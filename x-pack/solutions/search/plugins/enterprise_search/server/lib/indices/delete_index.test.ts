/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';

import { deleteIndex } from './delete_index';

describe('deleteIndex lib function', () => {
  const mockClient = {
    asCurrentUser: {
      indices: {
        delete: jest.fn(),
      },
    },
    asInternalUser: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should delete index', async () => {
    mockClient.asCurrentUser.indices.delete.mockImplementation(() => true);
    await expect(
      deleteIndex(mockClient as unknown as IScopedClusterClient, 'indexName')
    ).resolves.toEqual(true);
    expect(mockClient.asCurrentUser.indices.delete).toHaveBeenCalledWith({
      index: 'indexName',
    });
  });
});
