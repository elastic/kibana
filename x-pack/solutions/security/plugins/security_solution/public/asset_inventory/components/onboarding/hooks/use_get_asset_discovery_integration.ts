/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import {
  epmRouteService,
  type GetInfoResponse,
  type DefaultPackagesInstallationError,
  API_VERSIONS,
} from '@kbn/fleet-plugin/common';
import { pagePathGetters, pkgKeyFromPackageInfo } from '@kbn/fleet-plugin/public';
import { useKibana } from '../../../hooks/use_kibana';
import { CLOUD_ASSET_DISCOVERY_INTEGRATION_PACKAGE_NAME } from '../../../constants';

/**
 * Hook to get the path for the Asset Discovery integration.
 * It fetches the integration info and constructs the path pointing to the last version of the integration.
 */
export const useAssetDiscoveryIntegration = () => {
  const { http } = useKibana().services;

  const query = useQuery<GetInfoResponse, DefaultPackagesInstallationError>(
    ['integrations', CLOUD_ASSET_DISCOVERY_INTEGRATION_PACKAGE_NAME],
    () =>
      http.get<GetInfoResponse>(
        epmRouteService.getInfoPath(CLOUD_ASSET_DISCOVERY_INTEGRATION_PACKAGE_NAME),
        {
          version: API_VERSIONS.public.v1,
        }
      ),
    {
      retry: false,
      refetchOnWindowFocus: false,
    }
  );

  const path =
    query.isSuccess &&
    http.basePath.prepend(
      pagePathGetters
        .add_integration_to_policy({
          pkgkey: pkgKeyFromPackageInfo({
            name: query.data.item.name,
            version: query.data.item.version,
          }),
        })
        .join('')
    );

  return {
    path,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
};
