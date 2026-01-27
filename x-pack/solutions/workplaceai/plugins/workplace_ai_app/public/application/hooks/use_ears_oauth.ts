/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQuery } from '@kbn/react-query';
import type { UseQueryResult, UseMutationResult } from '@kbn/react-query';
import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import {
  EARS_API_PATH,
  type EarsOAuthProvider,
  type StartOAuthRequest,
  type StartOAuthResponse,
  type FetchSecretsResponse,
} from '../../../common';
import { useKibana } from './use_kibana';

export type ServerError = IHttpFetchError<ResponseErrorBody>;

interface UseStartOAuthInput {
  provider: EarsOAuthProvider;
  scope: string[];
}

export const useStartOAuth = (): UseMutationResult<
  StartOAuthResponse,
  ServerError,
  UseStartOAuthInput
> => {
  const { http } = useKibana().services;

  return useMutation<StartOAuthResponse, ServerError, UseStartOAuthInput>({
    mutationKey: ['workplace_ai', 'ears', 'start_oauth'],
    mutationFn: async ({ provider, scope }: UseStartOAuthInput) => {
      const body: StartOAuthRequest = { scope };
      return http.post<StartOAuthResponse>(`${EARS_API_PATH}/oauth/start/${provider}`, {
        body: JSON.stringify(body),
      });
    },
  });
};

export const useFetchSecrets = (
  requestId: string | null,
  enabled: boolean = true
): UseQueryResult<FetchSecretsResponse> => {
  const { http } = useKibana().services;

  return useQuery({
    queryKey: ['workplace_ai', 'ears', 'fetch_secrets', requestId],
    queryFn: async () => {
      if (!requestId) {
        throw new Error('Request ID is required');
      }
      return http.get<FetchSecretsResponse>(`${EARS_API_PATH}/oauth/fetch_secrets`, {
        query: { request_id: requestId },
      });
    },
    enabled: enabled && !!requestId,
  });
};
