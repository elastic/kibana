/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@kbn/react-query';
import type { UseMutationResult } from '@kbn/react-query';
import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import type { ExchangeCodeRequest } from '../../../common';
import {
  EARS_API_PATH,
  type EarsOAuthProvider,
  type ExchangeCodeResponse,
  type RefreshTokenResponse,
  type RevokeTokenResponse,
} from '../../../common';
import { useKibana } from './use_kibana';
import type { RefreshTokenRequest, RevokeTokenRequest } from '../../../common/http_api/ears';

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

interface UseRevokeTokenInput {
  provider: EarsOAuthProvider;
  token: string;
}

export const useRevokeToken = (): UseMutationResult<
  RevokeTokenResponse,
  ServerError,
  UseRevokeTokenInput
> => {
  const { http } = useKibana().services;

  return useMutation<RevokeTokenResponse, ServerError, UseRevokeTokenInput>({
    mutationKey: ['workplace_ai', 'ears', 'revoke_token'],
    mutationFn: async ({ provider, token }: UseRevokeTokenInput) => {
      const body: RevokeTokenRequest = { token };
      return http.post<RevokeTokenResponse>(`${EARS_API_PATH}/${provider}/oauth/revoke`, {
        body: JSON.stringify(body),
      });
    },
  });
};
