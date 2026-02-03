/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import { httpServiceMock, httpServerMock } from '@kbn/core-http-server-mocks';

import { findAttackDiscoveriesRoute } from './find_attack_discoveries';
import * as helpers from '../../../helpers';
import { hasReadAttackDiscoveryAlertsPrivileges } from '../../helpers/index_privileges';
import type { AttackDiscoveryDataClient } from '../../../../lib/attack_discovery/persistence';
import { getMockAttackDiscoveryFindResponse } from '../../../../__mocks__/attack_discovery_find_response';
import { mockAuthenticatedUser } from '../../../../__mocks__/mock_authenticated_user';
import { requestContextMock } from '../../../../__mocks__/request_context';

const mockAttackDiscoveryFindResponse = getMockAttackDiscoveryFindResponse();

jest.mock('../../helpers/index_privileges', () => {
  const original = jest.requireActual('../../helpers/index_privileges');

  return {
    ...original,
    hasReadAttackDiscoveryAlertsPrivileges: jest.fn(),
  };
});

const { context: mockContext } = requestContextMock.createTools();

describe('findAttackDiscoveriesRoute', () => {
  let router: ReturnType<typeof httpServiceMock.createRouter>;
  let mockRequest: Partial<KibanaRequest<unknown, unknown, unknown>>;
  let mockResponse: ReturnType<typeof httpServerMock.createResponseFactory>;
  let mockDataClient: { findAttackDiscoveryAlerts: jest.Mock };
  let addVersionMock: jest.Mock;
  let getHandler: (ctx: unknown, req: unknown, res: unknown) => Promise<unknown>;

  beforeEach(() => {
    jest.clearAllMocks();
    router = httpServiceMock.createRouter();
    mockDataClient = {
      findAttackDiscoveryAlerts: jest.fn().mockResolvedValue(mockAttackDiscoveryFindResponse),
    };
    mockContext.elasticAssistant.getAttackDiscoveryDataClient.mockResolvedValue(
      mockDataClient as unknown as AttackDiscoveryDataClient
    );
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
    (hasReadAttackDiscoveryAlertsPrivileges as jest.Mock).mockResolvedValue({
      isSuccess: true,
    });
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

  it('returns an error when hasReadAttackDiscoveryAlertsPrivileges fails', async () => {
    (hasReadAttackDiscoveryAlertsPrivileges as jest.Mock).mockImplementation(({ response }) => {
      return Promise.resolve({
        isSuccess: false,
        response: { status: 403, payload: { message: 'no privileges' } },
      });
    });

    const result = await getHandler(mockContext, mockRequest, mockResponse);

    expect(result).toEqual({ status: 403, payload: { message: 'no privileges' } });
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

  it('passes withReplacements: true to the data client when the request provides with_replacements: true', async () => {
    const req = {
      ...mockRequest,
      query: {
        ...(mockRequest.query as Record<string, unknown>),
        with_replacements: true,
      },
    };

    await getHandler(mockContext, req, mockResponse);

    const callArg = mockDataClient.findAttackDiscoveryAlerts.mock.calls[0][0];
    expect(callArg.findAttackDiscoveryAlertsParams.withReplacements).toBe(true);
  });

  it('passes withReplacements: false to the data client when the request provides with_replacements: false', async () => {
    const req = {
      ...mockRequest,
      query: {
        ...(mockRequest.query as Record<string, unknown>),
        with_replacements: false,
      },
    };

    await getHandler(mockContext, req, mockResponse);

    const callArg = mockDataClient.findAttackDiscoveryAlerts.mock.calls[0][0];
    expect(callArg.findAttackDiscoveryAlertsParams.withReplacements).toBe(false);
  });

  it('defaults with_replacements to true when the request does not include with_replacements', async () => {
    const req = {
      ...mockRequest,
      query: {
        ...(mockRequest.query as Record<string, unknown>),
      },
    };

    await getHandler(mockContext, req, mockResponse);

    const callArg = mockDataClient.findAttackDiscoveryAlerts.mock.calls[0][0];
    expect(callArg.findAttackDiscoveryAlertsParams.withReplacements).toBe(true);
  });

  it('passes enableFieldRendering: true to the data client when the request provides enable_field_rendering: true', async () => {
    const req = {
      ...mockRequest,
      query: {
        ...(mockRequest.query as Record<string, unknown>),
        enable_field_rendering: true,
      },
    };

    await getHandler(mockContext, req, mockResponse);

    const callArg = mockDataClient.findAttackDiscoveryAlerts.mock.calls[0][0];
    expect(callArg.findAttackDiscoveryAlertsParams.enableFieldRendering).toBe(true);
  });

  it('passes enableFieldRendering: false to the data client when the request provides enable_field_rendering: false', async () => {
    const req = {
      ...mockRequest,
      query: {
        ...(mockRequest.query as Record<string, unknown>),
        enable_field_rendering: false,
      },
    };

    await getHandler(mockContext, req, mockResponse);

    const callArg = mockDataClient.findAttackDiscoveryAlerts.mock.calls[0][0];
    expect(callArg.findAttackDiscoveryAlertsParams.enableFieldRendering).toBe(false);
  });

  it('defaults enable_field_rendering to false when the request does not include enable_field_rendering', async () => {
    const req = {
      ...mockRequest,
      query: {
        ...(mockRequest.query as Record<string, unknown>),
      },
    };

    await getHandler(mockContext, req, mockResponse);

    const callArg = mockDataClient.findAttackDiscoveryAlerts.mock.calls[0][0];
    expect(callArg.findAttackDiscoveryAlertsParams.enableFieldRendering).toBe(false);
  });
});
