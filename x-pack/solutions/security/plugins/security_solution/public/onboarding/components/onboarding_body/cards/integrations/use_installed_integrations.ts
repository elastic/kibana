/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useQuery } from '@tanstack/react-query';
import { EPM_API_ROUTES } from '@kbn/fleet-plugin/common';

interface Response {}

export const useFetchInstalledIntegrations = () => {
  // const { security } = useKibana().services;
  // const { addError } = useAppToasts();

  return useQuery({
    queryKey: ['get'],
    queryFn: async (): Promise<Response[]> => {
      const response = await fetch(`${EPM_API_ROUTES.INSTALLED_LIST_PATTERN}`);
      const parsedResponse = await response.json();
      return parsedResponse;
    },
  });
};
