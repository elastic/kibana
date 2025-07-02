/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import { httpServiceMock, httpServerMock } from '@kbn/core-http-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';

import { findAttackDiscoveriesRoute } from './find_attack_discoveries';
import * as helpers from '../../helpers';
import { getMockAttackDiscoveryFindResponse } from '../../../__mocks__/attack_discovery_find_response';
import { mockAuthenticatedUser } from '../../../__mocks__/mock_authenticated_user';

const mockAttackDiscoveryFindResponse = getMockAttackDiscoveryFindResponse();

describe('findAttackDiscoveriesRoute', () => {
  let router: ReturnType<typeof httpServiceMock.createRouter>;
  let mockContext: {
    resolve: jest.Mock;
    elasticAssistant: Promise<{
      logger: ReturnType<typeof loggingSystemMock.createLogger>;
      eventLogIndex: string;
      getSpaceId: () => string;
      getAttackDiscoveryDataClient: jest.Mock;
    }>;
  };
  let mockRequest: Partial<KibanaRequest<unknown, unknown, unknown>>;
  let mockResponse: ReturnType<typeof httpServerMock.createResponseFactory>;
  let mockDataClient: { findAttackDiscoveryAlerts: jest.Mock };
  let mockLogger: ReturnType<typeof loggingSystemMock.createLogger>;
  let addVersionMock: jest.Mock;
  let getHandler: (ctx: unknown, req: unknown, res: unknown) => Promise<unknown>;

  beforeEach(() => {
    jest.clearAllMocks();
    router = httpServiceMock.createRouter();
    mockLogger = loggingSystemMock.createLogger();
    mockDataClient = {
      findAttackDiscoveryAlerts: jest.fn().mockResolvedValue(mockAttackDiscoveryFindResponse),
    };
    mockContext = {
      resolve: jest.fn().mockResolvedValue({ core: {}, elasticAssistant: {}, licensing: {} }),
      elasticAssistant: Promise.resolve({
        logger: mockLogger,
        eventLogIndex: 'event-log-index',
        getSpaceId: () => 'default',
        getAttackDiscoveryDataClient: jest.fn().mockResolvedValue(mockDataClient),
      }),
    };
    mockRequest = {
      query: { page: 1, per_page: 10 },
    };
    mockResponse = httpServerMock.createResponseFactory();
    jest
      .spyOn(helpers, 'performChecks')
      .mockResolvedValue({ isSuccess: true, currentUser: mockAuthenticatedUser });

    addVersionMock = jest.fn();
    (router.versioned.get as jest.Mock).mockReturnValue({ addVersion: addVersionMock });
    findAttackDiscoveriesRoute(router);
    getHandler = addVersionMock.mock.calls[0][1];
  });

  it('returns 200 and the expected discoveries on success', async () => {
    await getHandler(mockContext, mockRequest, mockResponse);

    expect(mockResponse.ok).toHaveBeenCalledWith({
      body: mockAttackDiscoveryFindResponse,
    });
  });

  it('returns 500 if the data client is not initialized', async () => {
    (await mockContext.elasticAssistant).getAttackDiscoveryDataClient.mockResolvedValueOnce(null);

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

  describe('when data client throws', () => {
    const thrownError = new Error('fail!');

    beforeEach(() => {
      mockDataClient.findAttackDiscoveryAlerts.mockRejectedValueOnce(thrownError);
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

  it('throws if response validation fails', async () => {
    mockDataClient.findAttackDiscoveryAlerts.mockResolvedValueOnce({ invalid: true });

    const throwValidationError = jest.fn(() => {
      throw new Error('Response validation failed');
    });
    mockResponse.ok = throwValidationError;

    await getHandler(mockContext, mockRequest, mockResponse);

    expect(throwValidationError).toHaveBeenCalled();
  });
});
