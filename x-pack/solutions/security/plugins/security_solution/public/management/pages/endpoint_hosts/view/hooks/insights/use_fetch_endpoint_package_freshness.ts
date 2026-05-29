/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryResult } from '@kbn/react-query';
import { useQuery } from '@kbn/react-query';
import { useKibana } from '../../../../../../common/lib/kibana';
import { sendGetEndpointSecurityPackage } from '../../../../../services/policies/ingest';
import { isEndpointPackageStale } from '../../../../../../../common/endpoint/utils/is_endpoint_package_stale';

export interface EndpointPackageFreshness {
  installedVersion: string | null;
  latestVersion: string | null;
  stale: boolean;
}

export const useFetchEndpointPackageFreshness = (): UseQueryResult<
  EndpointPackageFreshness,
  Error
> => {
  const { http } = useKibana().services;

  return useQuery<EndpointPackageFreshness, Error>(
    ['workflowInsights', 'endpointPackageFreshness'],
    async () => {
      const info = await sendGetEndpointSecurityPackage(http);
      const installedVersion = info.installationInfo?.version ?? null;
      const latestVersion = info.latestVersion ?? info.version ?? null;
      return {
        installedVersion,
        latestVersion,
        stale: isEndpointPackageStale(installedVersion, latestVersion),
      };
    },
    { refetchOnWindowFocus: false, staleTime: 5 * 60 * 1000 }
  );
};
