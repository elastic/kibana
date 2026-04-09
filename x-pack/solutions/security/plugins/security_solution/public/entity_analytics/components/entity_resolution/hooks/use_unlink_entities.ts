/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import type { IHttpFetchError } from '@kbn/core/public';
import { ENTITY_STORE_ROUTES } from '@kbn/entity-store/public';
import { API_VERSIONS } from '../../../../../common/entity_analytics/constants';
import { useKibana } from '../../../../common/lib/kibana/kibana_react';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { ENTITY_REMOVED_TOAST, RESOLUTION_ERROR_TITLE } from '../translations';
import { RESOLUTION_GROUP_QUERY_KEY } from './use_resolution_group';

interface UnlinkEntitiesParams {
  entity_ids: string[];
}

interface UnlinkEntitiesResponse {
  unlinked: string[];
  skipped: string[];
}

export const useUnlinkEntities = () => {
  const { http } = useKibana().services;
  const queryClient = useQueryClient();
  const { addSuccess, addError } = useAppToasts();

  return useMutation<UnlinkEntitiesResponse, IHttpFetchError, UnlinkEntitiesParams>({
    mutationFn: (params) =>
      http.fetch<UnlinkEntitiesResponse>(ENTITY_STORE_ROUTES.public.RESOLUTION_UNLINK, {
        version: API_VERSIONS.public.v1,
        method: 'POST',
        body: JSON.stringify(params),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [RESOLUTION_GROUP_QUERY_KEY] });
      addSuccess(ENTITY_REMOVED_TOAST);
    },
    onError: (error) => {
      addError(error, { title: RESOLUTION_ERROR_TITLE });
    },
  });
};
