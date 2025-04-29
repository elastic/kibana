/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { deleteSynonymsSet } from './delete_synonyms_set';

describe('delete synonyms sets lib function', () => {
  const mockClient = {
    synonyms: {
      deleteSynonym: jest.fn(),
    },
  };

  const client = () => mockClient as unknown as ElasticsearchClient;
  it('should delete synonym set when it is not attached to anything', async () => {
    mockClient.synonyms.deleteSynonym.mockResolvedValue({ acknowledged: true });
    const response = await deleteSynonymsSet(client(), 'my-synonyms-set');
    expect(mockClient.synonyms.deleteSynonym).toHaveBeenCalledWith({ id: 'my-synonyms-set' });
    expect(response).toEqual({ acknowledged: true });
  });

  it('should throw if synonym set is attached to an index', async () => {
    mockClient.synonyms.deleteSynonym.mockRejectedValue(
      new Error(
        'synonyms set [my-synonyms-set] cannot be deleted as it is used in the following indices: index-1, index-2'
      )
    );
    expect(mockClient.synonyms.deleteSynonym).toHaveBeenCalledWith({ id: 'my-synonyms-set' });
    await expect(deleteSynonymsSet(client(), 'my-synonyms-set')).rejects.toThrowError(
      'synonyms set [my-synonyms-set] cannot be deleted as it is used in the following indices: index-1, index-2'
    );
  });
});
