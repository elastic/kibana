/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENDPOINT_EXCEPTIONS_PER_POLICY_OPT_IN_ROUTE } from '../../../common/endpoint/constants';
import type { GetEndpointExceptionsPerPolicyOptInResponse } from '../../../common/api/endpoint/endpoint_exceptions_per_policy_opt_in/endpoint_exceptions_per_policy_opt_in.gen';
import {
  composeHttpHandlerMocks,
  httpHandlerMockFactory,
  type ResponseProvidersInterface,
} from '../../common/mock/endpoint';

type SendEndpointExceptionsPerPolicyOptInMockInterface = ResponseProvidersInterface<{
  optInSend: () => void;
}>;

const endpointExceptionsPerPolicyOptInSendHttpMocks =
  httpHandlerMockFactory<SendEndpointExceptionsPerPolicyOptInMockInterface>([
    {
      id: 'optInSend',
      path: ENDPOINT_EXCEPTIONS_PER_POLICY_OPT_IN_ROUTE,
      method: 'post',
      handler: (): void => {},
    },
  ]);

type GetEndpointExceptionsPerPolicyOptInMockInterface = ResponseProvidersInterface<{
  optInGet: () => GetEndpointExceptionsPerPolicyOptInResponse;
}>;

const endpointExceptionsPerPolicyOptInGetHttpMocks =
  httpHandlerMockFactory<GetEndpointExceptionsPerPolicyOptInMockInterface>([
    {
      id: 'optInGet',
      path: ENDPOINT_EXCEPTIONS_PER_POLICY_OPT_IN_ROUTE,
      method: 'get',
      handler: (): GetEndpointExceptionsPerPolicyOptInResponse => {
        return { status: false };
      },
    },
  ]);

type EndpointExceptionsPerPolicyOptInAllHttpMocksInterface =
  GetEndpointExceptionsPerPolicyOptInMockInterface &
    SendEndpointExceptionsPerPolicyOptInMockInterface;

export const endpointExceptionsPerPolicyOptInAllHttpMocks =
  composeHttpHandlerMocks<EndpointExceptionsPerPolicyOptInAllHttpMocksInterface>([
    endpointExceptionsPerPolicyOptInGetHttpMocks,
    endpointExceptionsPerPolicyOptInSendHttpMocks,
  ]);
