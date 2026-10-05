/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import {
  ENDPOINT_METADATA_LIST_REQUIRED_AUTHZ,
  ENDPOINT_POLICY_READ_REQUIRED_AUTHZ,
  ENDPOINT_POLICY_WRITE_REQUIRED_AUTHZ,
} from '../../../../../common/endpoint/service/authz';
import { getEndpointAuthzInitialStateMock } from '../../../../../common/endpoint/service/authz/mocks';
import { EndpointAuthorizationError } from '../../../../endpoint/errors';
import { createMockEndpointAppContextService } from '../../../../endpoint/mocks';
import { createPolicyAccessContext } from './access_context';

const NON_DEFAULT_SPACE_ID = 'space-marketing';

type PrivilegeGrants = Readonly<{
  canWritePolicyManagement?: boolean;
  canReadSecuritySolution: boolean;
  canReadPolicyManagement: boolean;
}>;

const createAccessDeps = (grants: PrivilegeGrants) => {
  const endpointAppContextService = createMockEndpointAppContextService();
  const request = httpServerMock.createKibanaRequest();
  const scopedFleet = endpointAppContextService.getInternalFleetServices();
  const requestScopedSoClient = { sentinel: 'request-scoped-so-client' };
  const createRequestScopedSoClient = jest.spyOn(
    endpointAppContextService.savedObjects,
    'createRequestScopedSoClient'
  );

  createRequestScopedSoClient.mockReturnValue(requestScopedSoClient as never);
  endpointAppContextService.getInternalFleetServices.mockReset();
  endpointAppContextService.getInternalFleetServices.mockReturnValue(scopedFleet);
  endpointAppContextService.getEndpointAuthz.mockResolvedValue(
    getEndpointAuthzInitialStateMock(grants)
  );

  return {
    endpointAppContextService,
    request,
    scopedFleet,
    requestScopedSoClient,
    createRequestScopedSoClient,
  };
};

describe('createPolicyAccessContext', () => {
  it.each([
    {
      requirement: ENDPOINT_POLICY_READ_REQUIRED_AUTHZ,
      grants: { canReadSecuritySolution: false, canReadPolicyManagement: true },
      allowed: true,
    },
    {
      requirement: ENDPOINT_POLICY_READ_REQUIRED_AUTHZ,
      grants: { canReadSecuritySolution: true, canReadPolicyManagement: false },
      allowed: false,
    },
    {
      requirement: ENDPOINT_METADATA_LIST_REQUIRED_AUTHZ,
      grants: { canReadSecuritySolution: true, canReadPolicyManagement: false },
      allowed: true,
    },
    {
      requirement: ENDPOINT_METADATA_LIST_REQUIRED_AUTHZ,
      grants: { canReadSecuritySolution: false, canReadPolicyManagement: true },
      allowed: false,
    },
  ])(
    'evaluates $requirement.all with security=$grants.canReadSecuritySolution policy=$grants.canReadPolicyManagement as $allowed',
    async ({ requirement, grants, allowed }) => {
      const { endpointAppContextService, request, createRequestScopedSoClient } =
        createAccessDeps(grants);
      const input = { request, spaceId: NON_DEFAULT_SPACE_ID };

      if (allowed) {
        const access = await createPolicyAccessContext(
          endpointAppContextService,
          input,
          requirement
        );

        expect(access.spaceId).toBe(NON_DEFAULT_SPACE_ID);
        expect(endpointAppContextService.getEndpointAuthz).toHaveBeenCalledTimes(1);
        expect(endpointAppContextService.getEndpointAuthz).toHaveBeenCalledWith(request);
        expect(endpointAppContextService.getInternalFleetServices).toHaveBeenCalledTimes(1);
        expect(endpointAppContextService.getInternalFleetServices).toHaveBeenCalledWith(
          NON_DEFAULT_SPACE_ID
        );
        expect(createRequestScopedSoClient).toHaveBeenCalledTimes(1);
        expect(createRequestScopedSoClient).toHaveBeenCalledWith({
          request,
          readonly: true,
        });
        return;
      }

      await expect(
        createPolicyAccessContext(endpointAppContextService, input, requirement)
      ).rejects.toBeInstanceOf(EndpointAuthorizationError);
      expect(endpointAppContextService.getEndpointAuthz).toHaveBeenCalledTimes(1);
      expect(endpointAppContextService.getEndpointAuthz).toHaveBeenCalledWith(request);
      expect(endpointAppContextService.getInternalFleetServices).not.toHaveBeenCalled();
      expect(createRequestScopedSoClient).not.toHaveBeenCalled();
    }
  );

  it('rebinds getSoClient to the request-scoped helper client after grants', async () => {
    const {
      endpointAppContextService,
      request,
      scopedFleet,
      requestScopedSoClient,
      createRequestScopedSoClient,
    } = createAccessDeps({
      canReadSecuritySolution: false,
      canReadPolicyManagement: true,
    });
    const input = { request, spaceId: NON_DEFAULT_SPACE_ID };

    const access = await createPolicyAccessContext(
      endpointAppContextService,
      input,
      ENDPOINT_POLICY_READ_REQUIRED_AUTHZ
    );

    expect(createRequestScopedSoClient).toHaveBeenCalledTimes(1);
    expect(createRequestScopedSoClient).toHaveBeenCalledWith({
      request,
      readonly: true,
    });
    expect(access.fleet.getSoClient()).toBe(requestScopedSoClient);
    expect(access.fleet.getSoClient()).not.toBe(scopedFleet.getSoClient());
    expect('getInternalEsClient' in access).toBe(false);
  });

  it('enforces the combined write requirement before acquiring clients', async () => {
    const { endpointAppContextService, request, createRequestScopedSoClient } = createAccessDeps({
      canWritePolicyManagement: false,
      canReadSecuritySolution: true,
      canReadPolicyManagement: true,
    });

    await expect(
      createPolicyAccessContext(
        endpointAppContextService,
        { request, spaceId: NON_DEFAULT_SPACE_ID },
        ENDPOINT_POLICY_READ_REQUIRED_AUTHZ,
        'write'
      )
    ).rejects.toBeInstanceOf(EndpointAuthorizationError);
    expect(endpointAppContextService.getInternalFleetServices).not.toHaveBeenCalled();
    expect(createRequestScopedSoClient).not.toHaveBeenCalled();
    expect(endpointAppContextService.getInternalEsClient).not.toHaveBeenCalled();
  });

  it('exposes the internal ES client only for authorized write access', async () => {
    const {
      endpointAppContextService,
      request,
      requestScopedSoClient,
      createRequestScopedSoClient,
    } = createAccessDeps({
      canWritePolicyManagement: true,
      canReadSecuritySolution: true,
      canReadPolicyManagement: true,
    });

    const access = await createPolicyAccessContext(
      endpointAppContextService,
      { request, spaceId: NON_DEFAULT_SPACE_ID },
      ENDPOINT_POLICY_WRITE_REQUIRED_AUTHZ,
      'write'
    );
    const internalEsClient = endpointAppContextService.getInternalEsClient();

    expect(access.getInternalEsClient()).toBe(internalEsClient);
    expect(endpointAppContextService.getInternalEsClient).toHaveBeenCalledTimes(2);
    expect(createRequestScopedSoClient).toHaveBeenCalledWith({
      request,
      readonly: false,
    });
    expect(access.fleet.getSoClient()).toBe(requestScopedSoClient);
  });
});
