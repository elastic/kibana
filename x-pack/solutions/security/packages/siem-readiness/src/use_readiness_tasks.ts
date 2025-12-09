/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type { CategoriesResponse } from './types';
import { GET_SIEM_READINESS_CATEGORIES_API_PATH } from './constants';

const GET_READINESS_CATEGORIES_QUERY_KEY = ['readiness-categories'];
const GET_INSTALLED_INTEGRATIONS_QUERY_KEY = ['installed-integrations'];

export const useSiemReadinessApi = () => {
  const { http } = useKibana<CoreStart>().services;

  const getReadinessCategories = useQuery({
    queryKey: GET_READINESS_CATEGORIES_QUERY_KEY,
    queryFn: () => {
      return http.get<CategoriesResponse>(GET_SIEM_READINESS_CATEGORIES_API_PATH);
    },
  });

  const getInstalledIntegrations = useQuery({
    queryKey: GET_INSTALLED_INTEGRATIONS_QUERY_KEY,
    queryFn: () => {
      return http.get<unknown>('/api/fleet/epm/packages');
    },
  });

  return {
    getReadinessCategories,
    getInstalledIntegrations,
  };
};
