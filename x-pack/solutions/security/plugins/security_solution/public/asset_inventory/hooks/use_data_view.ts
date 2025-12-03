/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useQuery } from '@kbn/react-query';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';

/**
 * Temporary hook to get the data view for a given index pattern
 * TODO: use @kbn/cloud-security-posture/src/hooks/use_data_view once
 * Asset Inventory is ready to create data views per space
 */
export const useDataView = (indexPattern?: string) => {
  const {
    data: { dataViews },
  } = useKibana<{ data: DataPublicPluginStart }>().services;

  return useQuery(
    ['useDataView', indexPattern],
    async () => {
      if (!indexPattern) {
        throw new Error('Index pattern is required');
      }

      // Try to get by ID first (faster if it's a data view ID)
      // If it fails, fallback to searching by title/name
      try {
        return await dataViews.get(indexPattern, false);
      } catch (getError) {
        // If get fails, try find as fallback (searches by title/name)
        const foundDataViews = await dataViews.find(indexPattern);
        const dataView = foundDataViews[0];

        if (dataView) {
          return dataView;
        }

        // Neither method succeeded, throw the original get error
        throw getError;
      }
    },
    {
      retry: false,
      enabled: !!indexPattern,
    }
  );
};
