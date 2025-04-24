/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useQuery } from '@tanstack/react-query';
import { EPM_API_ROUTES } from '@kbn/fleet-plugin/common';
import { useKibana } from '../../kibana';

export const useFetchInstalledIntegrations = () => {
  const { http } = useKibana().services;

  return useQuery({
    queryKey: ['get'],
    queryFn: async () => {
      const response = await http.fetch(`${EPM_API_ROUTES.INSTALLED_LIST_PATTERN}`, {
        method: 'GET',
        version: '2023-10-31',
        query: {
          showOnlyActiveDataStreams: true,
        },
      });
      return response;
    },
  });
};
