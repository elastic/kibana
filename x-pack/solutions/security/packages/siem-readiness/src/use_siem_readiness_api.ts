/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type { CategoriesResponse, FleetPackage } from './types';
import { GET_SIEM_READINESS_CATEGORIES_API_PATH } from './constants';

// Fix: Use 'as const' to make these readonly tuples for proper React Query typing
const GET_READINESS_CATEGORIES_QUERY_KEY = ['readiness-categories'] as const;
const GET_DETECTION_RULES_QUERY_KEY = ['detection-rules'] as const;

export const useSiemReadinessApi = () => {
  const { http } = useKibana<CoreStart>().services;

  const getReadinessCategories = useQuery({
    queryKey: GET_READINESS_CATEGORIES_QUERY_KEY,
    queryFn: () => {
      return http.get<CategoriesResponse>(GET_SIEM_READINESS_CATEGORIES_API_PATH);
    },
  });

  const getIntegrations = useQuery({
    queryKey: ['integrations'] as const,
    queryFn: () => {
      return http.get<{ items: FleetPackage[] }>('/api/fleet/epm/packages');
    },
    select: (data: { items: FleetPackage[] }) => {
      const installed = data.items?.filter((pkg: FleetPackage) => pkg.status === 'installed') || [];
      const notInstalled =
        data.items?.filter((pkg: FleetPackage) => pkg.status === 'not_installed') || [];
      return { installed, notInstalled };
    },
  });

  const getInstalledIntegrations = {
    ...getIntegrations,
    data: getIntegrations.data?.installed,
  };

  const getNotInstalledIntegrations = {
    ...getIntegrations,
    data: getIntegrations.data?.notInstalled,
  };

  const getDetectionRules = useQuery({
    queryKey: GET_DETECTION_RULES_QUERY_KEY,
    queryFn: () => {
      return http.get<{ data: FleetPackage[] }>('/api/detection_engine/rules/_find', {
        query: {
          filter: 'alert.attributes.enabled:true',
          per_page: 10000,
        },
      });
    },
  });

  return {
    getReadinessCategories,
    getInstalledIntegrations,
    getNotInstalledIntegrations,
    getDetectionRules,
  };
};
