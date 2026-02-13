/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { DATA_SOURCES_ENABLED_SETTING_ID } from '@kbn/management-settings-ids';
import { useKibana } from '../use_kibana';

export const useDataSourcesCount = () => {
  const {
    services: { dataSources, uiSettings },
  } = useKibana();

  const isDataSourcesEnabled = uiSettings.get<boolean>(DATA_SOURCES_ENABLED_SETTING_ID, false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['fetchDataSourcesCount'],
    queryFn: async () => {
      const sources = await dataSources?.activeSources.list();
      return {
        count: sources?.length ?? 0,
      };
    },
    enabled: isDataSourcesEnabled && !!dataSources,
  });

  return {
    count: data?.count ?? 0,
    isLoading,
    isError,
  };
};
