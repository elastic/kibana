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
import type { GenerateBriefResponse } from '../../../../../common/entity_analytics/executive_brief/document';
import type { GenerateBriefRequestBody } from '../../../../../common/entity_analytics/executive_brief/api';
import { useKibana } from '../../../../common/lib/kibana';
import { BRIEF_QUERY_KEY } from './use_brief';

export interface UseGenerateBriefResult {
  generate: (body: GenerateBriefRequestBody) => void;
  isStarting: boolean;
  error: Error | undefined;
}

/** Starts a brief job, then refetches the brief so `useBrief` picks the job up and polls it. */
export const useGenerateBrief = (): UseGenerateBriefResult => {
  const { http } = useKibana().services;
  const queryClient = useQueryClient();

  const { mutate, isLoading, error } = useMutation<
    GenerateBriefResponse,
    Error,
    GenerateBriefRequestBody
  >({
    mutationFn: (body) =>
      http.fetch<GenerateBriefResponse>(EXECUTIVE_BRIEF_API_PATH, {
        method: 'POST',
        version: EXECUTIVE_BRIEF_API_VERSION,
        body: JSON.stringify(body),
      }),
    onSuccess: () => queryClient.invalidateQueries(BRIEF_QUERY_KEY),
  });

  return { generate: (body) => mutate(body), isStarting: isLoading, error: error ?? undefined };
};
