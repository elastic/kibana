/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockHttpValues } from '../../../__mocks__/kea_logic';

import { nextTick } from '@kbn/test-jest-helpers';

import { createApiIndex } from './create_api_index_api_logic';

describe('createApiIndexApiLogic', () => {
  const { http } = mockHttpValues;
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('createApiIndex', () => {
    it('calls correct api', async () => {
      const promise = Promise.resolve({ index: 'indexName' });
      http.post.mockReturnValue(promise);
      const result = createApiIndex({ indexName: 'indexName', language: 'en' });
      await nextTick();
      expect(http.post).toHaveBeenCalledWith('/internal/enterprise_search/indices', {
        body: JSON.stringify({ index_name: 'indexName', language: 'en' }),
      });
      await expect(result).resolves.toEqual({ indexName: 'indexName' });
    });
  });
});
