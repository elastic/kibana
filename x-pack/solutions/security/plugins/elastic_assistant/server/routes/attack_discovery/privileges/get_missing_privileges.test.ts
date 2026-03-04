/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import { httpServiceMock, httpServerMock } from '@kbn/core-http-server-mocks';
import type { SecurityHasPrivilegesResponse } from '@elastic/elasticsearch/lib/api/types';

import { getMissingIndexPrivilegesInternalRoute } from './get_missing_privileges';
import * as helpers from '../../helpers';
import type { AttackDiscoveryDataClient } from '../../../lib/attack_discovery/persistence';
import { mockAuthenticatedUser } from '../../../__mocks__/mock_authenticated_user';
import { requestContextMock } from '../../../__mocks__/request_context';

const { context: mockContext } = requestContextMock.createTools();

describe('getMissingIndexPrivilegesInternalRoute', () => {
  let router: ReturnType<typeof httpServiceMock.createRouter>;
  let mockRequest: Partial<KibanaRequest<unknown, unknown, unknown>>;
  let mockResponse: ReturnType<typeof httpServerMock.createResponseFactory>;
  let mockDataClient: {
    spaceId: string;
    getAdHocAlertsIndexPattern: jest.Mock;
  };
  let addVersionMock: jest.Mock;
  let getHandler: (ctx: unknown, req: unknown, res: unknown) => Promise<unknown>;
  let mockEsClient: {
    security: {
      hasPrivileges: jest.Mock;
    };
  };

  const scheduledIndexPattern = '.alerts-security.attack.discovery.alerts-default';
  const adhocIndexPattern = '.internal.alerts-security.alerts-attack-discovery-adhoc-default';

  beforeEach(() => {
    jest.clearAllMocks();
    router = httpServiceMock.createRouter();
    mockDataClient = {
      spaceId: 'default',
      getAdHocAlertsIndexPattern: jest.fn().mockReturnValue(adhocIndexPattern),
    };
    mockContext.elasticAssistant.getAttackDiscoveryDataClient.mockResolvedValue(
      mockDataClient as unknown as AttackDiscoveryDataClient
    );
    mockRequest = {};
    mockResponse = httpServerMock.createResponseFactory();
    jest
      .spyOn(helpers, 'performChecks')
      .mockResolvedValue({ isSuccess: true, currentUser: mockAuthenticatedUser });

    mockEsClient = {
      security: {
        hasPrivileges: jest.fn(),
      },
    };
    (mockContext.core.elasticsearch.client.asCurrentUser as unknown) = mockEsClient;

    addVersionMock = jest.fn();
    (router.versioned.get as jest.Mock).mockReturnValue({ addVersion: addVersionMock });
    getMissingIndexPrivilegesInternalRoute(router as never);
    getHandler = addVersionMock.mock.calls[0][1];
  });

  it('returns 200 and an empty array when all privileges are present', async () => {
    const mockPrivilegesResponse: SecurityHasPrivilegesResponse = {
      username: 'elastic',
      has_all_requested: true,
      cluster: {},
      index: {
        [scheduledIndexPattern]: {
          read: true,
          write: true,
          view_index_metadata: true,
          maintenance: true,
        },
        [adhocIndexPattern]: {
          read: true,
          write: true,
          view_index_metadata: true,
          maintenance: true,
        },
      },
      application: {},
    };
    mockEsClient.security.hasPrivileges.mockResolvedValue({ body: mockPrivilegesResponse });

    await getHandler(mockContext, mockRequest, mockResponse);

    expect(mockResponse.ok).toHaveBeenCalledWith({
      body: [],
    });
  });

  it('returns 200 and missing privileges for the scheduled index', async () => {
    const mockPrivilegesResponse: SecurityHasPrivilegesResponse = {
      username: 'elastic',
      has_all_requested: false,
      cluster: {},
      index: {
        [scheduledIndexPattern]: {
          read: true,
          write: false,
          view_index_metadata: true,
          maintenance: false,
        },
        [adhocIndexPattern]: {
          read: true,
          write: true,
          view_index_metadata: true,
          maintenance: true,
        },
      },
      application: {},
    };
    mockEsClient.security.hasPrivileges.mockResolvedValue({ body: mockPrivilegesResponse });

    await getHandler(mockContext, mockRequest, mockResponse);

    expect(mockResponse.ok).toHaveBeenCalledWith({
      body: [
        {
          index_name: scheduledIndexPattern,
          privileges: ['write', 'maintenance'],
        },
      ],
    });
  });

  it('returns 200 and missing privileges for both indices', async () => {
    const mockPrivilegesResponse: SecurityHasPrivilegesResponse = {
      username: 'elastic',
      has_all_requested: false,
      cluster: {},
      index: {
        [scheduledIndexPattern]: {
          read: false,
          write: false,
          view_index_metadata: true,
          maintenance: true,
        },
        [adhocIndexPattern]: {
          read: true,
          write: true,
          view_index_metadata: false,
          maintenance: false,
        },
      },
      application: {},
    };
    mockEsClient.security.hasPrivileges.mockResolvedValue({ body: mockPrivilegesResponse });

    await getHandler(mockContext, mockRequest, mockResponse);

    expect(mockResponse.ok).toHaveBeenCalledWith({
      body: [
        {
          index_name: scheduledIndexPattern,
          privileges: ['read', 'write'],
        },
        {
          index_name: adhocIndexPattern,
          privileges: ['view_index_metadata', 'maintenance'],
        },
      ],
    });
  });

  it('returns 500 if the data client is not initialized', async () => {
    mockContext.elasticAssistant.getAttackDiscoveryDataClient.mockResolvedValueOnce(null);

    await getHandler(mockContext, mockRequest, mockResponse);

    expect(mockResponse.custom).toHaveBeenCalledWith({
      body: Buffer.from(
        JSON.stringify({
          message: 'Attack discovery data client not initialized',
          status_code: 500,
        })
      ),
      headers: expect.any(Object),
      statusCode: 500,
    });
  });

  it('returns an error when performChecks fails', async () => {
    (helpers.performChecks as jest.Mock).mockResolvedValueOnce({
      isSuccess: false,
      response: { status: 403, payload: { message: 'Forbidden' } },
    });

    const result = await getHandler(mockContext, mockRequest, mockResponse);

    expect(result).toEqual({ status: 403, payload: { message: 'Forbidden' } });
  });

  describe('when hasPrivileges throws', () => {
    const thrownError = new Error('fail!');

    beforeEach(() => {
      mockEsClient.security.hasPrivileges.mockRejectedValueOnce(thrownError);
    });

    it('includes the error message in the response body', async () => {
      await getHandler(mockContext, mockRequest, mockResponse);
      const customCall = mockResponse.custom?.mock.calls[0]?.[0];
      const bodyString = customCall && customCall.body ? customCall.body.toString() : '';

      expect(bodyString).toContain(thrownError.message);
    });

    it('returns status code 500', async () => {
      await getHandler(mockContext, mockRequest, mockResponse);
      const customCall = mockResponse.custom?.mock.calls[0]?.[0];

      expect(customCall.statusCode).toBe(500);
    });
  });
});
