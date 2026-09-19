/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, KibanaRequest, StartServicesAccessor } from '@kbn/core/server';
import type { EndpointAppContextService } from '../../../../endpoint/endpoint_app_context_services';
import type { EndpointInternalFleetServicesInterface } from '../../../../endpoint/services/fleet/endpoint_fleet_services_factory';
import type { EndpointAuthz } from '../../../../../common/endpoint/types/authz';
import {
  ENDPOINT_POLICY_WRITE_REQUIRED_AUTHZ,
  satisfiesEndpointAuthzRequirement,
  type EndpointAuthzRequirement,
} from '../../../../../common/endpoint/service/authz';
import { EndpointAuthorizationError } from '../../../../endpoint/errors';
import { createRequestScopedSoClient } from './create_request_scoped_so_client';

export type PolicyAccessContext = Readonly<{
  spaceId: string;
  fleet: Omit<EndpointInternalFleetServicesInterface, 'getSoClient'> & {
    getSoClient: EndpointInternalFleetServicesInterface['getSoClient'];
  };
}>;

export type PolicyWriteAccessContext = PolicyAccessContext &
  Readonly<{
    getInternalEsClient: () => ElasticsearchClient;
  }>;

export type PolicyAccessMode = 'read' | 'write';

type PolicyAccessContextResult = PolicyAccessContext | PolicyWriteAccessContext;

export function createPolicyAccessContext(
  endpointAppContextService: EndpointAppContextService,
  input: Readonly<{ request: KibanaRequest; spaceId: string }>,
  requiredAuthz: EndpointAuthzRequirement,
  getStartServices: StartServicesAccessor,
  mode?: 'read'
): Promise<PolicyAccessContext>;
export function createPolicyAccessContext(
  endpointAppContextService: EndpointAppContextService,
  input: Readonly<{ request: KibanaRequest; spaceId: string }>,
  requiredAuthz: EndpointAuthzRequirement,
  getStartServices: StartServicesAccessor,
  mode: 'write'
): Promise<PolicyWriteAccessContext>;
export async function createPolicyAccessContext(
  endpointAppContextService: EndpointAppContextService,
  input: Readonly<{ request: KibanaRequest; spaceId: string }>,
  requiredAuthz: EndpointAuthzRequirement,
  getStartServices: StartServicesAccessor,
  mode: PolicyAccessMode = 'read'
): Promise<PolicyAccessContextResult> {
  const authz: EndpointAuthz = await endpointAppContextService.getEndpointAuthz(input.request);
  const effectiveRequiredAuthz =
    mode === 'write' ? ENDPOINT_POLICY_WRITE_REQUIRED_AUTHZ : requiredAuthz;

  if (!satisfiesEndpointAuthzRequirement(authz, effectiveRequiredAuthz)) {
    throw new EndpointAuthorizationError();
  }

  const fleet = endpointAppContextService.getInternalFleetServices(input.spaceId);
  const requestScopedSoClient = await createRequestScopedSoClient({
    getStartServices,
    request: input.request,
    readonly: mode === 'read',
  });

  if (mode === 'write') {
    return {
      spaceId: input.spaceId,
      fleet: {
        ...fleet,
        getSoClient: () => requestScopedSoClient,
      },
      getInternalEsClient: () => endpointAppContextService.getInternalEsClient(),
    };
  }

  return {
    spaceId: input.spaceId,
    fleet: {
      ...fleet,
      getSoClient: () => requestScopedSoClient,
    },
  };
}
