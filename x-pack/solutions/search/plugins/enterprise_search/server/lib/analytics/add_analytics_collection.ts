/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { IScopedClusterClient } from '@kbn/core/server';
import { DataView, DataViewsService } from '@kbn/data-views-plugin/common';

import { AnalyticsCollection } from '../../../common/types/analytics';
import { ErrorCode } from '../../../common/types/error_codes';

import { isResourceAlreadyExistsException } from '../../utils/identify_exceptions';

import { fetchAnalyticsCollections } from './fetch_analytics_collection';

interface CollectionsPutResponse {
  acknowledged: boolean;
  name: string;
}

const createAnalyticsCollection = async (
  client: IScopedClusterClient,
  name: string
): Promise<CollectionsPutResponse> =>
  (await client.asCurrentUser.searchApplication.putBehavioralAnalytics({
    name,
  })) as CollectionsPutResponse;

const createDataView = async (
  dataViewsService: DataViewsService,
  analyticsCollection: AnalyticsCollection
): Promise<DataView> => {
  return dataViewsService.createAndSave(
    {
      allowNoIndex: true,
      name: `behavioral_analytics.events-${analyticsCollection.name}`,
      timeFieldName: '@timestamp',
      title: analyticsCollection.events_datastream,
    },
    true
  );
};

export const addAnalyticsCollection = async (
  client: IScopedClusterClient,
  dataViewsService: DataViewsService,
  name: string
): Promise<AnalyticsCollection> => {
  try {
    await createAnalyticsCollection(client, name);
  } catch (error) {
    if (isResourceAlreadyExistsException(error)) {
      throw new Error(ErrorCode.ANALYTICS_COLLECTION_ALREADY_EXISTS);
    }
  }
  const analyticsCollections = await fetchAnalyticsCollections(client, name);

  const analyticsCollection = analyticsCollections[0];
  await createDataView(dataViewsService, analyticsCollection);
  return analyticsCollection;
};
