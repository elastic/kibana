/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { UseQueryResult } from '@kbn/react-query';
import type { DataViewListItem } from '@kbn/data-views-plugin/common';

import { useKibana } from '../use_kibana';

export interface DataViewsStats {
  totalDataViews: number;
  managedDataViews: number;
  userDataViews: number;
}

export const useDataViewsStats = (): UseQueryResult<DataViewsStats> => {
  const { dataViews } = useKibana().services;

  const queryResult = useQuery<DataViewListItem[], Error, DataViewsStats>({
    queryKey: ['fetchDataViewsStats'],
    queryFn: async () => {
      if (!dataViews) {
        throw new Error('Data Views plugin is not available');
      }
      const dataViewsList = await dataViews.getIdsWithTitle();
      return dataViewsList;
    },
    select: (dataViewsList) => {
      const managedDataViews = dataViewsList.filter((dv) => dv.managed).length;
      const userDataViews = dataViewsList.filter((dv) => !dv.managed).length;
      const totalDataViews = dataViewsList.length;

      return {
        totalDataViews,
        managedDataViews,
        userDataViews,
      };
    },
    enabled: !!dataViews,
  });

  return {
    ...queryResult,
  };
};
