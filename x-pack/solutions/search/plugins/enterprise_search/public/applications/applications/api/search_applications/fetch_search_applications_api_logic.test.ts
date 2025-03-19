/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockHttpValues } from '../../../__mocks__/kea_logic';

import { nextTick } from '@kbn/test-jest-helpers';

import { fetchSearchApplications } from './fetch_search_applications_api_logic';

describe('FetchSearchApplicationsAPILogic', () => {
  const { http } = mockHttpValues;
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('fetchSearchApplications', () => {
    it('request list search applications api without search query', async () => {
      const promise = Promise.resolve({ result: 'result' });
      http.get.mockReturnValue(promise);
      const result = fetchSearchApplications({
        meta: { from: 0, size: 10, total: 0 },
      });
      await nextTick();
      expect(http.get).toHaveBeenCalledWith('/internal/enterprise_search/search_applications', {
        query: { from: 0, size: 10 },
      });

      await expect(result).resolves.toEqual({
        result: 'result',
        params: {
          from: 0,
          size: 10,
        },
      });
    });
    it('request list search applications api with search query', async () => {
      const promise = Promise.resolve({ result: 'result' });
      http.get.mockReturnValue(promise);
      const result = fetchSearchApplications({
        meta: { from: 0, size: 10, total: 0 },
        searchQuery: 'te',
      });
      await nextTick();

      expect(http.get).toHaveBeenCalledWith('/internal/enterprise_search/search_applications', {
        query: { from: 0, size: 10, q: 'te*' },
      });

      await expect(result).resolves.toEqual({
        result: 'result',
        params: {
          q: 'te*',
          from: 0,
          size: 10,
        },
      });
    });
  });
});
