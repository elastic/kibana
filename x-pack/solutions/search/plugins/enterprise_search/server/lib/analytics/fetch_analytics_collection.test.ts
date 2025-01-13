/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core-elasticsearch-server';

import { fetchAnalyticsCollections } from './fetch_analytics_collection';

describe('fetch analytics collection lib function', () => {
  const mockClient = {
    asCurrentUser: {
      searchApplication: {
        getBehavioralAnalytics: jest.fn(),
      },
    },
    asInternalUser: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetch collections', () => {
    it('should return a list of analytics collections', async () => {
      mockClient.asCurrentUser.searchApplication.getBehavioralAnalytics.mockImplementation(() =>
        Promise.resolve({
          example: {
            event_data_stream: {
              name: 'datastream-example',
            },
          },
          exampleTwo: {
            event_data_stream: {
              name: 'datastream-exampleTwo',
            },
          },
        })
      );
      await expect(
        fetchAnalyticsCollections(mockClient as unknown as IScopedClusterClient)
      ).resolves.toEqual([
        { name: 'example', events_datastream: 'datastream-example' },
        { name: 'exampleTwo', events_datastream: 'datastream-exampleTwo' },
      ]);
    });
  });

  describe('fetch collection by Id', () => {
    it('should fetch analytics collection by Id', async () => {
      mockClient.asCurrentUser.searchApplication.getBehavioralAnalytics.mockImplementation(() =>
        Promise.resolve({
          example: {
            event_data_stream: {
              name: 'datastream-example',
            },
          },
        })
      );
      await expect(
        fetchAnalyticsCollections(mockClient as unknown as IScopedClusterClient, 'example')
      ).resolves.toEqual([{ name: 'example', events_datastream: 'datastream-example' }]);
    });
  });
});
