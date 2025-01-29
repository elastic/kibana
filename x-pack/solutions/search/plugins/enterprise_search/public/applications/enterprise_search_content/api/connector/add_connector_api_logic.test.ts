/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockHttpValues } from '../../../__mocks__/kea_logic';

import { nextTick } from '@kbn/test-jest-helpers';

import { addConnector } from './add_connector_api_logic';

describe('addConnectorApiLogic', () => {
  const { http } = mockHttpValues;
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('addConnector', () => {
    it('calls correct api', async () => {
      const promise = Promise.resolve({ id: 'unique id', index_name: 'indexName' });
      http.post.mockReturnValue(promise);
      const result = addConnector({
        indexName: 'indexName',
        isNative: false,
        language: 'en',
        name: 'indexName',
      });
      await nextTick();
      expect(http.post).toHaveBeenCalledWith('/internal/enterprise_search/connectors', {
        body: JSON.stringify({
          index_name: 'indexName',
          is_native: false,
          language: 'en',
          name: 'indexName',
        }),
      });
      await expect(result).resolves.toEqual({
        id: 'unique id',
        indexName: 'indexName',
      });
    });
    it('adds delete param if specific', async () => {
      const promise = Promise.resolve({ id: 'unique id', index_name: 'indexName' });
      http.post.mockReturnValue(promise);
      const result = addConnector({
        deleteExistingConnector: true,
        indexName: 'indexName',
        isNative: false,
        language: null,
        name: 'indexName',
      });
      await nextTick();
      expect(http.post).toHaveBeenCalledWith('/internal/enterprise_search/connectors', {
        body: JSON.stringify({
          delete_existing_connector: true,
          index_name: 'indexName',
          is_native: false,
          language: null,
          name: 'indexName',
        }),
      });
      await expect(result).resolves.toEqual({
        id: 'unique id',
        indexName: 'indexName',
      });
    });
  });
});
