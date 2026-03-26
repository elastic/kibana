/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';

import { analyticsEventsExist } from './analytics_events_exist';

describe('analytics collection events exists function', () => {
  const mockClient = {
    asCurrentUser: {
      count: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checking if analytics events index exists', () => {
    it('should call exists endpoint', async () => {
      mockClient.asCurrentUser.count.mockImplementationOnce(() => ({
        count: 1,
      }));
      await expect(
        analyticsEventsExist(mockClient as unknown as IScopedClusterClient, 'example')
      ).resolves.toEqual(true);
      expect(mockClient.asCurrentUser.count).toHaveBeenCalledWith({
        index: 'example',
      });
    });
  });
});
