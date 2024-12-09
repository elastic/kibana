/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockHttpValues } from '../../../__mocks__/kea_logic';

import { nextTick } from '@kbn/test-jest-helpers';

import { createAnalyticsCollection } from './add_analytics_collection_api_logic';

describe('AddAnalyticsCollectionsApiLogic', () => {
  const { http } = mockHttpValues;
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('AddAnalyticsCollectionsApiLogic', () => {
    it('Calls the analytics collections create api', async () => {
      const promise = Promise.resolve({ name: 'test' });
      http.post.mockReturnValue(promise);
      const result = createAnalyticsCollection({ name: 'test' });
      await nextTick();
      expect(http.post).toHaveBeenCalledWith('/internal/enterprise_search/analytics/collections', {
        body: JSON.stringify({ name: 'test' }),
      });
      await expect(result).resolves.toEqual({ name: 'test' });
    });
  });
});
