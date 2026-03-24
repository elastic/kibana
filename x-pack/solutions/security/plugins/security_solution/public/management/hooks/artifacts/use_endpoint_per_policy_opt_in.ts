/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useMutation, useQuery } from '@kbn/react-query';
import type { GetEndpointExceptionsPerPolicyOptInResponse } from '../../../../common/api/endpoint/endpoint_exceptions_per_policy_opt_in/endpoint_exceptions_per_policy_opt_in.gen';
import { ENDPOINT_EXCEPTIONS_PER_POLICY_OPT_IN_ROUTE } from '../../../../common/endpoint/constants';
import { useHttp } from '../../../common/lib/kibana';

export const useSendEndpointPerPolicyOptIn = () => {
  const http = useHttp();

  return useMutation<void, Error>({
    mutationFn: () => {
      return http.post(ENDPOINT_EXCEPTIONS_PER_POLICY_OPT_IN_ROUTE, { version: '1' });
    },
  });
};

export const useGetEndpointPerPolicyOptIn = () => {
  const http = useHttp();

  return useQuery<boolean, Error>({
    queryKey: ['endpointExceptionsPerPolicyOptIn'],
    queryFn: async () => {
      try {
        return (
          await http.get<GetEndpointExceptionsPerPolicyOptInResponse>(
            ENDPOINT_EXCEPTIONS_PER_POLICY_OPT_IN_ROUTE,
            { version: '1' }
          )
        ).status;
      } catch (error) {
        return error;
      }
    },
  });
};
