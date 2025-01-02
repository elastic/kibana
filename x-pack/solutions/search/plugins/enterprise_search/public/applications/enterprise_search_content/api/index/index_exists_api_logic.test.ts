/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockHttpValues } from '../../../__mocks__/kea_logic';

import { nextTick } from '@kbn/test-jest-helpers';

import { fetchIndexExists } from './index_exists_api_logic';

describe('IndexExistsApiLogic', () => {
  const { http } = mockHttpValues;
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('indexExists', () => {
    it('calls correct api', async () => {
      const promise = Promise.resolve({ exists: true });
      http.get.mockReturnValue(promise);
      const result = fetchIndexExists({ indexName: 'indexName' });
      await nextTick();
      expect(http.get).toHaveBeenCalledWith('/internal/enterprise_search/indices/indexName/exists');
      await expect(result).resolves.toEqual({ exists: true, indexName: 'indexName' });
    });
  });
});
