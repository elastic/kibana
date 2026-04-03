/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import type { IHttpFetchError } from '@kbn/core/public';
import { useKibana } from '../../../../common/lib/kibana/kibana_react';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { ENTITY_RESOLVED_TOAST, RESOLUTION_ERROR_TITLE } from '../translations';
import { RESOLUTION_GROUP_QUERY_KEY } from './use_resolution_group';

const RESOLUTION_LINK_ROUTE = '/internal/security/entity_store/resolution/link';

interface LinkEntitiesParams {
  target_id: string;
  entity_ids: string[];
}

interface LinkEntitiesResponse {
  linked: string[];
  skipped: string[];
  target_id: string;
}

export const useLinkEntities = () => {
  const { http } = useKibana().services;
  const queryClient = useQueryClient();
  const { addSuccess, addError } = useAppToasts();

  return useMutation<LinkEntitiesResponse, IHttpFetchError, LinkEntitiesParams>({
    mutationFn: (params) =>
      http.fetch<LinkEntitiesResponse>(RESOLUTION_LINK_ROUTE, {
        version: '2',
        method: 'POST',
        body: JSON.stringify(params),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [RESOLUTION_GROUP_QUERY_KEY] });
      addSuccess(ENTITY_RESOLVED_TOAST);
    },
    onError: (error) => {
      addError(error, { title: RESOLUTION_ERROR_TITLE });
    },
  });
};
