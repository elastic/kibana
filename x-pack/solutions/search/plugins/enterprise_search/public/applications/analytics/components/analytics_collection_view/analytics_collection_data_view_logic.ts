/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { DataView } from '@kbn/data-views-plugin/common';

import { findOrCreateDataView } from '../../utils/find_or_create_data_view';

import {
  FetchAnalyticsCollectionActions,
  FetchAnalyticsCollectionLogic,
} from './fetch_analytics_collection_logic';

export interface AnalyticsCollectionDataViewLogicValues {
  dataView: DataView | null;
}

export interface AnalyticsCollectionDataViewLogicActions {
  fetchedAnalyticsCollection: FetchAnalyticsCollectionActions['apiSuccess'];
  setDataView(dataView: DataView): { dataView: DataView };
}

export const AnalyticsCollectionDataViewLogic = kea<
  MakeLogicType<AnalyticsCollectionDataViewLogicValues, AnalyticsCollectionDataViewLogicActions>
>({
  actions: {
    setDataView: (dataView) => ({ dataView }),
  },
  connect: {
    actions: [FetchAnalyticsCollectionLogic, ['apiSuccess as fetchedAnalyticsCollection']],
  },
  listeners: ({ actions }) => ({
    fetchedAnalyticsCollection: async (collection) => {
      const dataView = await findOrCreateDataView(collection);
      if (dataView) {
        actions.setDataView(dataView);
      }
    },
  }),
  path: ['enterprise_search', 'analytics', 'collection', 'dataView'],
  reducers: () => ({
    // @ts-expect-error upgrade typescript v5.1.6
    dataView: [null, { setDataView: (_, { dataView }) => dataView }],
  }),
});
