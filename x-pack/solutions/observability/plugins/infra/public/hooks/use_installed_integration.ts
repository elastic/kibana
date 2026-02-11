/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { epmRouteService, type GetInfoResponse, API_VERSIONS } from '@kbn/fleet-plugin/common';
import { useKibanaContextForPlugin } from './use_kibana';
import { useFetcher } from './use_fetcher';

export type IntegrationInstallStatus =
  | 'installed'
  | 'not_installed'
  | 'installing'
  | 'install_failed';

export interface IntegrationInfo {
  name: string;
  status: IntegrationInstallStatus;
  version?: string;
}

export const useInstalledIntegration = (packageName: string, enabled: boolean = true) => {
  const {
    services: { http },
  } = useKibanaContextForPlugin();

  const { data, status, error } = useFetcher(
    async () => {
      if (!enabled) {
        return undefined;
      }
      const response = await http.get<GetInfoResponse>(epmRouteService.getInfoPath(packageName), {
        version: API_VERSIONS.public.v1,
      });
      return {
        name: response.item.name,
        status: response.item.status as IntegrationInstallStatus,
        version: response.item.version,
      };
    },
    [packageName, http, enabled],
    { autoFetch: enabled }
  );

  return {
    data,
    isLoading: enabled && status === 'loading',
    isInstalled: data?.status === 'installed',
    error,
  };
};
