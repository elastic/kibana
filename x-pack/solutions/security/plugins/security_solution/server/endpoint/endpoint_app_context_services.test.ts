/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import { securityMock } from '@kbn/security-plugin/server/mocks';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import type { ElasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';

import { EndpointAppContextService } from './endpoint_app_context_services';
import {
  createMockEndpointAppContextServiceSetupContract,
  createMockEndpointAppContextServiceStartContract,
} from './mocks';
import { calculateEndpointAuthz } from '../../common/endpoint/service/authz';

jest.mock('../../common/endpoint/service/authz', () => {
  const actual = jest.requireActual('../../common/endpoint/service/authz');
  return {
    ...actual,
    calculateEndpointAuthz: jest.fn(() => ({})),
  };
});

describe('test endpoint app context services', () => {
  it('should return undefined on getManifestManager if dependencies are not enabled', async () => {
    const endpointAppContextService = new EndpointAppContextService();
    expect(endpointAppContextService.getManifestManager()).toEqual(undefined);
  });

  describe('getEndpointAuthz', () => {
    let service: EndpointAppContextService;
    let startContract: ReturnType<typeof createMockEndpointAppContextServiceStartContract>;
    let calculateEndpointAuthzMock: jest.MockedFunction<typeof calculateEndpointAuthz>;

    beforeEach(() => {
      calculateEndpointAuthzMock = calculateEndpointAuthz as jest.MockedFunction<
        typeof calculateEndpointAuthz
      >;
      calculateEndpointAuthzMock.mockClear();

      service = new EndpointAppContextService();
      service.setup(createMockEndpointAppContextServiceSetupContract());
      startContract = createMockEndpointAppContextServiceStartContract();
      service.start(startContract);
    });

    afterEach(() => {
      service.stop();
    });

    const getCalculatedRoles = (): readonly string[] => {
      expect(calculateEndpointAuthzMock).toHaveBeenCalledTimes(1);
      // calculateEndpointAuthz signature: (license, fleetAuthz, userRoles, ...)
      const userRolesArg = calculateEndpointAuthzMock.mock.calls[0][2] as readonly string[];
      return userRolesArg;
    };

    it('forwards roles from getCurrentUser on real HTTP requests (no fakeRequest fallback)', async () => {
      startContract.security.authc.getCurrentUser.mockReturnValue(
        securityMock.createMockAuthenticatedUser({ roles: ['endpoint_operations_analyst'] })
      );
      const request = httpServerMock.createKibanaRequest();
      const scopedEsClient = elasticsearchClientMock.createElasticsearchClient();

      await service.getEndpointAuthz(request, scopedEsClient);

      expect(getCalculatedRoles()).toEqual(['endpoint_operations_analyst']);
      expect(scopedEsClient.security.authenticate).not.toHaveBeenCalled();
    });

    it('falls back to ES _security/_authenticate when fakeRequest has no auth state', async () => {
      // Simulate a Task-Manager-dispatched fakeRequest where the HTTP auth
      // pipeline never ran, so getCurrentUser collapses to null.
      startContract.security.authc.getCurrentUser.mockReturnValue(null);

      const fakeRequest = {
        ...httpServerMock.createKibanaRequest(),
        isFakeRequest: true,
      } as ReturnType<typeof httpServerMock.createKibanaRequest>;

      const scopedEsClient =
        elasticsearchClientMock.createElasticsearchClient() as ElasticsearchClientMock;
      (scopedEsClient.security.authenticate as jest.Mock).mockResolvedValue({
        username: 'elastic',
        roles: ['superuser'],
        full_name: null,
        email: null,
        metadata: {},
        enabled: true,
        authentication_realm: { name: 'native', type: 'native' },
        lookup_realm: { name: 'native', type: 'native' },
        authentication_type: 'realm',
      });

      await service.getEndpointAuthz(fakeRequest, scopedEsClient);

      expect(scopedEsClient.security.authenticate).toHaveBeenCalledTimes(1);
      expect(getCalculatedRoles()).toEqual(['superuser']);
    });

    it('returns empty roles when fakeRequest is sent without a scoped ES client', async () => {
      startContract.security.authc.getCurrentUser.mockReturnValue(null);
      const fakeRequest = {
        ...httpServerMock.createKibanaRequest(),
        isFakeRequest: true,
      } as ReturnType<typeof httpServerMock.createKibanaRequest>;

      await service.getEndpointAuthz(fakeRequest);

      expect(getCalculatedRoles()).toEqual([]);
    });

    it('swallows ES authenticate errors and falls through with empty roles', async () => {
      startContract.security.authc.getCurrentUser.mockReturnValue(null);
      const fakeRequest = {
        ...httpServerMock.createKibanaRequest(),
        isFakeRequest: true,
      } as ReturnType<typeof httpServerMock.createKibanaRequest>;

      const scopedEsClient =
        elasticsearchClientMock.createElasticsearchClient() as ElasticsearchClientMock;
      (scopedEsClient.security.authenticate as jest.Mock).mockRejectedValue(
        new Error('boom: cluster unreachable')
      );

      await expect(service.getEndpointAuthz(fakeRequest, scopedEsClient)).resolves.toBeDefined();
      expect(getCalculatedRoles()).toEqual([]);
    });

    it('does not invoke the ES fallback when getCurrentUser already returns roles on a fakeRequest', async () => {
      // Sanity check: if getCurrentUser ever does work for a fakeRequest (e.g.
      // future platform fix), we should not double-call ES.
      startContract.security.authc.getCurrentUser.mockReturnValue(
        securityMock.createMockAuthenticatedUser({ roles: ['t1_analyst'] })
      );
      const fakeRequest = {
        ...httpServerMock.createKibanaRequest(),
        isFakeRequest: true,
      } as ReturnType<typeof httpServerMock.createKibanaRequest>;

      const scopedEsClient =
        elasticsearchClientMock.createElasticsearchClient() as ElasticsearchClientMock;

      await service.getEndpointAuthz(fakeRequest, scopedEsClient);

      expect(scopedEsClient.security.authenticate).not.toHaveBeenCalled();
      expect(getCalculatedRoles()).toEqual(['t1_analyst']);
    });
  });
});
