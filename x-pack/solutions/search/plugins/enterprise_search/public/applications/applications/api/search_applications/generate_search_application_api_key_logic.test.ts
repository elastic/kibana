/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockHttpValues } from '../../../__mocks__/kea_logic';

import { nextTick } from '@kbn/test-jest-helpers';

import { generateSearchApplicationApiKey } from './generate_search_application_api_key_logic';

describe('GenerateSearchApplicationApiKeyLogic', () => {
  const { http } = mockHttpValues;
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateSearchApplicationApiKey', () => {
    it('calls correct api', async () => {
      const promise = Promise.resolve({
        apiKey: {
          api_key: 'api_key',
          encoded: 'encoded',
          id: 'id',
          name: 'name',
        },
      });
      http.post.mockReturnValue(promise);
      const result = generateSearchApplicationApiKey({
        searchApplicationName: 'puggles',
        keyName: 'puggles read only key',
      });
      await nextTick();
      expect(http.post).toHaveBeenCalledWith(
        '/internal/enterprise_search/search_applications/puggles/api_key',
        {
          body: JSON.stringify({
            keyName: 'puggles read only key',
          }),
        }
      );
      await expect(result).resolves.toEqual({
        apiKey: {
          api_key: 'api_key',
          encoded: 'encoded',
          id: 'id',
          name: 'name',
        },
      });
    });
  });
});
