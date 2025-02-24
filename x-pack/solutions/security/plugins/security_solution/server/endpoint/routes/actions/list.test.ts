/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecuritySolutionRequestHandlerContextMock } from '../../../lib/detection_engine/routes/__mocks__/request_context';
import type { AwaitedProperties } from '@kbn/utility-types';
import type { EndpointActionListRequestQuery } from '../../../../common/api/endpoint';
import type { EndpointAuthz } from '../../../../common/endpoint/types/authz';
import type { License } from '@kbn/licensing-plugin/common/license';
import {
  createMockEndpointAppContext,
  createMockEndpointAppContextServiceSetupContract,
  createMockEndpointAppContextServiceStartContract,
  createRouteHandlerContext,
  getRegisteredVersionedRouteMock,
} from '../../mocks';
import {
  elasticsearchServiceMock,
  httpServerMock,
  httpServiceMock,
  savedObjectsClientMock,
} from '@kbn/core/server/mocks';
import type { KibanaResponseFactory } from '@kbn/core/server';
import { BASE_ENDPOINT_ACTION_ROUTE } from '../../../../common/endpoint/constants';
import { EndpointAppContextService } from '../../endpoint_app_context_services';
import { LicenseService } from '../../../../common/license';
import { Subject } from 'rxjs';
import type { ILicense } from '@kbn/licensing-plugin/common/types';
import { licenseMock } from '@kbn/licensing-plugin/common/licensing.mock';
import { registerActionListRoutes } from './list';
import { getEndpointAuthzInitialStateMock } from '../../../../common/endpoint/service/authz/mocks';

interface CallApiRouteInterface {
  query?: EndpointActionListRequestQuery;
  license?: License;
  authz?: Partial<EndpointAuthz>;
}

const Enterprise = licenseMock.createLicense({
  license: { type: 'enterprise', mode: 'enterprise' },
});

const Platinum = licenseMock.createLicense({
  license: { type: 'platinum', mode: 'platinum' },
});
const Gold = licenseMock.createLicense({ license: { type: 'gold', mode: 'gold' } });

describe('Action List Route', () => {
  const superUser = {
    username: 'superuser',
    roles: ['superuser'],
  };

  let endpointAppContextService: EndpointAppContextService;
  let mockResponse: jest.Mocked<KibanaResponseFactory>;
  let licenseService: LicenseService;
  let licenseEmitter: Subject<ILicense>;

  let callApiRoute: (
    opts: CallApiRouteInterface
  ) => Promise<AwaitedProperties<SecuritySolutionRequestHandlerContextMock>>;

  beforeEach(() => {
    const mockScopedClient = elasticsearchServiceMock.createScopedClusterClient();
    const mockSavedObjectClient = savedObjectsClientMock.create();
    const startContract = createMockEndpointAppContextServiceStartContract();
    const routerMock = httpServiceMock.createRouter();
    mockResponse = httpServerMock.createResponseFactory();
    endpointAppContextService = new EndpointAppContextService();

    licenseEmitter = new Subject();
    licenseService = new LicenseService();
    licenseService.start(licenseEmitter);

    endpointAppContextService.setup(createMockEndpointAppContextServiceSetupContract());
    endpointAppContextService.start({
      ...startContract,
      licenseService,
    });

    registerActionListRoutes(routerMock, createMockEndpointAppContext());

    callApiRoute = async ({
      query,
      license,
      authz = {},
    }: CallApiRouteInterface): Promise<
      AwaitedProperties<SecuritySolutionRequestHandlerContextMock>
    > => {
      (startContract.security.authc.getCurrentUser as jest.Mock).mockImplementationOnce(
        () => superUser
      );

      const ctx = createRouteHandlerContext(mockScopedClient, mockSavedObjectClient);

      const withLicense = license ? license : Enterprise;
      licenseEmitter.next(withLicense);

      ctx.securitySolution.getEndpointAuthz.mockResolvedValue({
        ...getEndpointAuthzInitialStateMock({
          // mimicking the behavior of the EndpointAuthz class
          // just so we can test the license check here
          // since getEndpointAuthzInitialStateMock sets all keys to true
          canReadActionsLogManagement: licenseService.isEnterprise(),
          canAccessEndpointActionsLogManagement: licenseService.isPlatinumPlus(),
        }),
        ...authz,
      });

      const mockRequest = httpServerMock.createKibanaRequest({ query });

      const { routeHandler } = getRegisteredVersionedRouteMock(
        routerMock,
        'get',
        BASE_ENDPOINT_ACTION_ROUTE,
        '2023-10-31'
      );

      await routeHandler(ctx, mockRequest, mockResponse);

      return ctx;
    };
  });

  afterEach(() => {
    endpointAppContextService.stop();
    licenseService.stop();
    licenseEmitter.complete();
  });

  describe('User auth level', () => {
    it('allows user with `canReadActionsLogManagement` access for API requests', async () => {
      await callApiRoute({
        authz: { canReadActionsLogManagement: true },
      });
      expect(mockResponse.ok).toBeCalled();
    });

    it('allows user with `canAccessEndpointActionsLogManagement` access for API requests', async () => {
      await callApiRoute({
        authz: { canAccessEndpointActionsLogManagement: true },
      });
      expect(mockResponse.ok).toBeCalled();
    });

    it('does not allow user without `canReadActionsLogManagement` or `canAccessEndpointActionsLogManagement` access for API requests', async () => {
      await callApiRoute({
        authz: { canReadActionsLogManagement: false, canAccessEndpointActionsLogManagement: false },
      });
      expect(mockResponse.forbidden).toBeCalled();
    });

    it('does allow user access to API requests if license is at least platinum', async () => {
      await callApiRoute({
        license: Platinum,
      });
      expect(mockResponse.ok).toBeCalled();
    });

    it('does not allow user access to API requests if license is below platinum', async () => {
      await callApiRoute({
        license: Gold,
      });
      expect(mockResponse.forbidden).toBeCalled();
    });
  });
});
