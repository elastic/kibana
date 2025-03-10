/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockHttpValues } from '../../../__mocks__/kea_logic';

import { nextTick } from '@kbn/test-jest-helpers';

import { checkAnalyticsEventsExist } from './check_analytics_events_exist_api_logic';

describe('AnalyticsEventsExistApiLogic', () => {
  const { http } = mockHttpValues;
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('FetchAnalyticsCollectionsApiLogic', () => {
    it('calls the analytics collections exists api', async () => {
      const promise = Promise.resolve({ exists: true });
      const indexName = 'eventsIndex';
      http.get.mockReturnValue(promise);
      const result = checkAnalyticsEventsExist({ indexName });
      await nextTick();
      expect(http.get).toHaveBeenCalledWith(
        `/internal/elasticsearch/analytics/collection/${indexName}/events/exist`
      );
      await expect(result).resolves.toEqual({ exists: true });
    });
  });
});
