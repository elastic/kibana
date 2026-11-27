/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryOptions, UseQueryResult } from '@kbn/react-query';
import { useQuery } from '@kbn/react-query';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import type { ExportProvidersRequestQueryParams } from '../../../../common/api/endpoint/export_providers/get_export_providers_route';
import type {
  ExportProvidersApiResponse,
  ExportProviderSummary,
} from '../../../../common/endpoint/types';
import { EXPORT_PROVIDERS_ROUTE } from '../../../../common/endpoint/constants';
import { useHttp } from '../../../common/lib/kibana';

/**
 * Retrieves the export (storage) providers defined in the Elastic Defend policy of the given host.
 * @param agentId - The host's Fleet agent id
 * @param options - Additional options for the query
 */
export const useGetExportProviders = (
  agentId: string,
  options: Omit<
    UseQueryOptions<ExportProviderSummary[], IHttpFetchError>,
    'queryKey' | 'queryFn'
  > = {}
): UseQueryResult<ExportProviderSummary[], IHttpFetchError> => {
  const http = useHttp();

  return useQuery<ExportProviderSummary[], IHttpFetchError>({
    ...options,
    queryKey: ['get-export-providers', agentId],
    queryFn: () => {
      const query: ExportProvidersRequestQueryParams = { agentId };

      return http
        .get<ExportProvidersApiResponse>(EXPORT_PROVIDERS_ROUTE, { version: '1', query })
        .then((response) => response.data);
    },
  });
};
