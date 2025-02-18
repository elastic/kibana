/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IsolationRouteRequestBody } from '../../../../../common/api/endpoint';
import type { HostIsolationResponse } from '../../../../../common/endpoint/types';
import type { ResponseProvidersInterface } from '../../../mock/endpoint/http_handler_mock_factory';
import { httpHandlerMockFactory } from '../../../mock/endpoint/http_handler_mock_factory';
import {
  ISOLATE_HOST_ROUTE_V2,
  UNISOLATE_HOST_ROUTE_V2,
} from '../../../../../common/endpoint/constants';

export const hostIsolationRequestBodyMock = (): IsolationRouteRequestBody => {
  return {
    endpoint_ids: ['88c04a90-b19c-11eb-b838-222'],
    alert_ids: ['88c04a90-b19c-11eb-b838-333'],
    case_ids: ['88c04a90-b19c-11eb-b838-444'],
    comment: 'Lock it',
  };
};

export const hostIsolationResponseMock = (): HostIsolationResponse => {
  return {
    action: '111-222-333-444',
  };
};

export type HostIsolationHttpMockProviders = ResponseProvidersInterface<{
  isolateHost: () => HostIsolationResponse;
  unIsolateHost: () => HostIsolationResponse;
}>;

export const hostIsolationHttpMocks = httpHandlerMockFactory<HostIsolationHttpMockProviders>([
  {
    id: 'isolateHost',
    method: 'post',
    path: ISOLATE_HOST_ROUTE_V2,
    handler: () => hostIsolationResponseMock(),
  },
  {
    id: 'unIsolateHost',
    method: 'post',
    path: UNISOLATE_HOST_ROUTE_V2,
    handler: () => hostIsolationResponseMock(),
  },
]);
