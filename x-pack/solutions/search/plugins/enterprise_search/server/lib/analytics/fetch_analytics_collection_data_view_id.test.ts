/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';

import type { DataViewsService } from '@kbn/data-views-plugin/common';

import { ErrorCode } from '../../../common/types/error_codes';

import { fetchAnalyticsCollections } from './fetch_analytics_collection';
import { fetchAnalyticsCollectionDataViewId } from './fetch_analytics_collection_data_view_id';

jest.mock('./fetch_analytics_collection', () => ({
  fetchAnalyticsCollections: jest.fn(),
}));

describe('fetch analytics collection data view id', () => {
  const mockClient = {
    asCurrentUser: {
      transport: {
        request: jest.fn(),
      },
    },
    asInternalUser: {},
  };
  const dataViewService = { find: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return data view id of analytics collection by Id', async () => {
    const mockCollectionId = 'collectionId';
    const mockDataViewId = 'dataViewId';
    const mockCollection = [{ name: 'example', events_datastream: 'log-collection-data-stream' }];
    (fetchAnalyticsCollections as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve(mockCollection)
    );

    dataViewService.find.mockImplementationOnce(() => Promise.resolve([{ id: mockDataViewId }]));

    await expect(
      fetchAnalyticsCollectionDataViewId(
        mockClient as unknown as IScopedClusterClient,
        dataViewService as unknown as DataViewsService,
        mockCollectionId
      )
    ).resolves.toEqual({ data_view_id: mockDataViewId });
    expect(fetchAnalyticsCollections).toHaveBeenCalledWith(mockClient, mockCollectionId);
    expect(dataViewService.find).toHaveBeenCalledWith(mockCollection[0].events_datastream, 1);
  });

  it('should return null when data view not found', async () => {
    const mockCollectionId = 'collectionId';
    const mockCollection = [{ events_datastream: 'log-collection-data-stream' }];
    (fetchAnalyticsCollections as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve(mockCollection)
    );

    dataViewService.find.mockImplementationOnce(() => Promise.resolve([]));

    await expect(
      fetchAnalyticsCollectionDataViewId(
        mockClient as unknown as IScopedClusterClient,
        dataViewService as unknown as DataViewsService,
        mockCollectionId
      )
    ).resolves.toEqual({ data_view_id: null });
    expect(fetchAnalyticsCollections).toHaveBeenCalledWith(mockClient, mockCollectionId);
    expect(dataViewService.find).toHaveBeenCalledWith(mockCollection[0].events_datastream, 1);
  });

  it('should throw an error when analytics collection not found', async () => {
    const mockCollectionId = 'collectionId';

    (fetchAnalyticsCollections as jest.Mock).mockImplementation(() => {
      throw new Error(ErrorCode.ANALYTICS_COLLECTION_NOT_FOUND);
    });

    await expect(
      fetchAnalyticsCollectionDataViewId(
        mockClient as unknown as IScopedClusterClient,
        dataViewService as unknown as DataViewsService,
        mockCollectionId
      )
    ).rejects.toThrowError(ErrorCode.ANALYTICS_COLLECTION_NOT_FOUND);
    expect(fetchAnalyticsCollections).toHaveBeenCalledWith(mockClient, mockCollectionId);
    expect(dataViewService.find).not.toHaveBeenCalled();
  });
});
