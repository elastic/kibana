/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockHttpValues } from '../../../__mocks__/kea_logic';

import { nextTick } from '@kbn/test-jest-helpers';

import { createSearchApplication } from './create_search_application_api_logic';

describe('CreateSearchApplicationApiLogic', () => {
  const { http } = mockHttpValues;
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('createSearchApplication', () => {
    it('calls correct api', async () => {
      const searchApplication = { indices: ['an-index'], name: 'my-search-application' };
      const response = { result: 'created' };
      const promise = Promise.resolve(response);
      http.put.mockReturnValue(promise);
      const result = createSearchApplication(searchApplication);
      await nextTick();
      expect(http.put).toHaveBeenCalledWith(
        '/internal/enterprise_search/search_applications/my-search-application',
        {
          body: '{"indices":["an-index"],"name":"my-search-application"}',
          query: { create: true },
        }
      );
      await expect(result).resolves.toEqual(response);
    });
  });
});
