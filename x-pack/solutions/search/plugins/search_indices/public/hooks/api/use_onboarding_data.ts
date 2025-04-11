/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import { GET_ONBOARDING_TOKEN_ROUTE } from '../../../common/routes';
import type { OnboardingTokenResponse } from '../../../common/types';
import { QueryKeys } from '../../constants';

import { useKibana } from '../use_kibana';

export const useOnboardingTokenQuery = (): UseQueryResult<OnboardingTokenResponse> => {
  const { http } = useKibana().services;

  return useQuery({
    refetchInterval: false,
    retry: true,
    queryKey: [QueryKeys.FetchOnboardingToken],
    queryFn: () => http.get<OnboardingTokenResponse>(GET_ONBOARDING_TOKEN_ROUTE),
  });
};
