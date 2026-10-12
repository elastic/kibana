/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import {
  EXECUTIVE_BRIEF_API_PATH,
  EXECUTIVE_BRIEF_API_VERSION,
} from '../../../../../common/entity_analytics/executive_brief/constants';
import { useKibana } from '../../../../common/lib/kibana';
import { BRIEF_QUERY_KEY } from './use_brief';

export interface UseDeleteBriefResult {
  deleteBrief: () => void;
  isDeleting: boolean;
  error: Error | undefined;
}

/** Deletes the current user's brief in this space and clears the cached document. */
export const useDeleteBrief = (): UseDeleteBriefResult => {
  const { http } = useKibana().services;
  const queryClient = useQueryClient();

  const { mutate, isLoading, error } = useMutation<unknown, Error, void>({
    mutationFn: () =>
      http.fetch(EXECUTIVE_BRIEF_API_PATH, {
        method: 'DELETE',
        version: EXECUTIVE_BRIEF_API_VERSION,
      }),
    onSuccess: () => {
      queryClient.setQueryData(BRIEF_QUERY_KEY, null);
    },
  });

  return { deleteBrief: () => mutate(), isDeleting: isLoading, error: error ?? undefined };
};
