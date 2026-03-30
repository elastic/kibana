/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery, useMutation, useQueryClient } from '@kbn/react-query';
import type { HttpSetup } from '@kbn/core/public';
import type { EntityType } from '../../common';
import { API_VERSIONS, ENTITY_STORE_ROUTES } from '../../common';
import type {
  EntityStoreStatusResponse,
  InstallEntityStoreParams,
  LogExtractionUpdateParams,
} from '../types';
import { useAppServices } from '../services_context';

const QUERY_KEY = 'entityStoreV2';

const apiVersionQuery = { apiVersion: API_VERSIONS.internal.v2 } as const;

const useEntityStoreMutation = <TParams = void>(
  fetchFn: (http: HttpSetup, params: TParams) => Promise<unknown>
) => {
  const { http } = useAppServices();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: TParams) => fetchFn(http, params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
};

export const useEntityStoreStatus = (includeComponents: boolean = false) => {
  const { http } = useAppServices();

  return useQuery<EntityStoreStatusResponse>({
    queryKey: [QUERY_KEY, 'status', includeComponents],
    queryFn: () =>
      http.fetch<EntityStoreStatusResponse>(ENTITY_STORE_ROUTES.STATUS, {
        method: 'GET',
        query: { ...apiVersionQuery, include_components: includeComponents },
      }),
    refetchInterval: (data) => {
      if (data?.status === 'installing') {
        return 5000;
      }
      return false;
    },
  });
};

export const useInstallEntityStore = () =>
  useEntityStoreMutation<InstallEntityStoreParams>((http, params) =>
    http.fetch(ENTITY_STORE_ROUTES.INSTALL, {
      method: 'POST',
      query: apiVersionQuery,
      body: JSON.stringify(params),
    })
  );

export const useStartEntityStore = () =>
  useEntityStoreMutation<EntityType[] | undefined>((http, entityTypes) =>
    http.fetch(ENTITY_STORE_ROUTES.START, {
      method: 'PUT',
      query: apiVersionQuery,
      body: JSON.stringify({ entityTypes }),
    })
  );

export const useStopEntityStore = () =>
  useEntityStoreMutation<EntityType[] | undefined>((http, entityTypes) =>
    http.fetch(ENTITY_STORE_ROUTES.STOP, {
      method: 'PUT',
      query: apiVersionQuery,
      body: JSON.stringify({ entityTypes }),
    })
  );

export const useUninstallEntityStore = () =>
  useEntityStoreMutation<EntityType[] | undefined>((http, entityTypes) =>
    http.fetch(ENTITY_STORE_ROUTES.UNINSTALL, {
      method: 'POST',
      query: apiVersionQuery,
      body: JSON.stringify({ entityTypes }),
    })
  );

export const useUpdateEntityStoreConfig = () =>
  useEntityStoreMutation<LogExtractionUpdateParams>((http, logExtraction) =>
    http.fetch(ENTITY_STORE_ROUTES.UPDATE, {
      method: 'PUT',
      query: apiVersionQuery,
      body: JSON.stringify({ logExtraction }),
    })
  );

export const useForceLogExtraction = () =>
  useEntityStoreMutation<EntityType>((http, entityType) =>
    http.fetch(ENTITY_STORE_ROUTES.FORCE_LOG_EXTRACTION.replace('{entityType}', entityType), {
      method: 'POST',
      query: apiVersionQuery,
    })
  );

export const useForceHistorySnapshot = () =>
  useEntityStoreMutation((http) =>
    http.fetch(ENTITY_STORE_ROUTES.FORCE_HISTORY_SNAPSHOT, {
      method: 'POST',
      query: apiVersionQuery,
    })
  );

export const useCheckPrivileges = () => {
  const { http } = useAppServices();

  return useQuery({
    queryKey: [QUERY_KEY, 'privileges'],
    queryFn: () =>
      http.fetch<{ has_all_required: boolean }>(ENTITY_STORE_ROUTES.CHECK_PRIVILEGES, {
        method: 'GET',
        query: apiVersionQuery,
      }),
  });
};
