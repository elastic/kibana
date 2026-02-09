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
  ExchangeCodeRequest,
  type EarsOAuthProvider,
  type ExchangeCodeResponse,
  type RefreshTokenResponse
} from '../../../common';
import { useKibana } from './use_kibana';
import { RefreshTokenRequest } from '@kbn/workplace-ai-app/common/http_api/ears';

export type ServerError = IHttpFetchError<ResponseErrorBody>;

interface UseExchangeCodeInput {
  provider: EarsOAuthProvider;
  code: string;
}


export const useExchangeCode = (): UseMutationResult<
  ExchangeCodeResponse,
  ServerError,
  UseExchangeCodeInput
> => {
  const { http } = useKibana().services;

  return useMutation<ExchangeCodeResponse, ServerError, UseExchangeCodeInput>({
    mutationKey: ['workplace_ai', 'ears', 'exchange_code'],
    mutationFn: async ({ provider, code }: UseExchangeCodeInput) => {
      const body: ExchangeCodeRequest = { code };
      return http.post<ExchangeCodeResponse>(`${EARS_API_PATH}/${provider}/oauth/token`, {
        body: JSON.stringify(body),
      });
    },
  });
};

interface UseRefreshTokenInput {
  provider: EarsOAuthProvider;
  refresh_token: string;
}


export const useRefreshToken = (): UseMutationResult<
  RefreshTokenResponse,
  ServerError,
  UseRefreshTokenInput
> => {
  const { http } = useKibana().services;

  return useMutation<RefreshTokenResponse, ServerError, UseRefreshTokenInput>({
    mutationKey: ['workplace_ai', 'ears', 'refresh_token'],
    mutationFn: async ({ provider, refresh_token }: UseRefreshTokenInput) => {
      const body: RefreshTokenRequest = { refresh_token };
      return http.post<RefreshTokenResponse>(`${EARS_API_PATH}/${provider}/oauth/refresh`, {
        body: JSON.stringify(body),
      });
    },
  });
};
