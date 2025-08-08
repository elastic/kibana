/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { AuthenticatedUser } from '@kbn/core-security-common';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';

import type { DefendInsightsDataClient } from '../../lib/defend_insights/persistence';
import { transformESSearchToDefendInsights } from '../../lib/defend_insights/persistence/helpers';
import { getDefendInsightsSearchEsMock } from '../../__mocks__/defend_insights_schema.mock';
import { getDefendInsightRequest } from '../../__mocks__/request';
import {
  ElasticAssistantRequestHandlerContextMock,
  requestContextMock,
} from '../../__mocks__/request_context';
import { serverMock } from '../../__mocks__/server';
import { isDefendInsightsEnabled, updateDefendInsightLastViewedAt } from './helpers';
import { getDefendInsightRoute } from './get_defend_insight';
import { licensingMock } from '@kbn/licensing-plugin/public/mocks';

jest.mock('./helpers');

describe('getDefendInsightRoute', () => {
  let server: ReturnType<typeof serverMock.create>;
  let context: ElasticAssistantRequestHandlerContextMock;
  let mockUser: AuthenticatedUser;
  let mockDataClient: DefendInsightsDataClient;
  let mockCurrentInsight: any;

  function getDefaultUser(): AuthenticatedUser {
    return {
      username: 'my_username',
      authentication_realm: {
        type: 'my_realm_type',
        name: 'my_realm_name',
      },
    } as AuthenticatedUser;
  }

  function getDefaultDataClient(): DefendInsightsDataClient {
    return {
      findDefendInsightByConnectorId: jest.fn(),
      findDefendInsightsByParams: jest.fn().mockResolvedValue([mockCurrentInsight]),
      updateDefendInsight: jest.fn(),
      createDefendInsight: jest.fn(),
      getDefendInsight: jest.fn(),
      updateDefendInsights: jest.fn(),
    } as unknown as DefendInsightsDataClient;
  }
  beforeEach(() => {
    const tools = requestContextMock.createTools();
    context = tools.context;
    server = serverMock.create();
    tools.clients.core.elasticsearch.client = elasticsearchServiceMock.createScopedClusterClient();

    mockUser = getDefaultUser();
    mockDataClient = getDefaultDataClient();
    mockCurrentInsight = transformESSearchToDefendInsights(getDefendInsightsSearchEsMock())[0];

    context.elasticAssistant.getCurrentUser.mockResolvedValue(mockUser);
    context.elasticAssistant.getDefendInsightsDataClient.mockResolvedValue(mockDataClient);
    getDefendInsightRoute(server.router);
    (updateDefendInsightLastViewedAt as jest.Mock).mockImplementation(
      async ({ defendInsights }) => defendInsights?.[0]
    );
    (isDefendInsightsEnabled as jest.Mock).mockReturnValue(true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('Insufficient license', async () => {
    const insufficientLicense = licensingMock.createLicense({ license: { type: 'basic' } });
    const tools = requestContextMock.createTools();
    tools.context.licensing.license = insufficientLicense;
    jest.spyOn(insufficientLicense, 'hasAtLeast').mockReturnValue(false);

    const response = await server.inject(
      getDefendInsightRequest('insight-id1'),
      requestContextMock.convertContext(tools.context)
    );
    expect(response.status).toEqual(403);
    expect(response.body).toEqual({
      message: 'Your license does not support Defend Workflows. Please upgrade your license.',
    });
  });

  it('should handle successful request', async () => {
    const response = await server.inject(
      getDefendInsightRequest('insight-id1'),
      requestContextMock.convertContext(context)
    );
    expect(response.status).toEqual(200);
    expect(response.body).toEqual({
      data: mockCurrentInsight,
    });
  });

  it('should 404 if feature flag disabled', async () => {
    (isDefendInsightsEnabled as jest.Mock).mockReturnValueOnce(false);
    const response = await server.inject(
      getDefendInsightRequest('insight-id1'),
      requestContextMock.convertContext(context)
    );
    expect(response.status).toEqual(404);
  });

  it('should handle missing authenticated user', async () => {
    context.elasticAssistant.getCurrentUser.mockResolvedValueOnce(null);
    const response = await server.inject(
      getDefendInsightRequest('insight-id1'),
      requestContextMock.convertContext(context)
    );

    expect(response.status).toEqual(401);
    expect(response.body).toEqual({
      message: 'Authenticated user not found',
      status_code: 401,
    });
  });

  it('should handle missing data client', async () => {
    context.elasticAssistant.getDefendInsightsDataClient.mockResolvedValueOnce(null);
    const response = await server.inject(
      getDefendInsightRequest('insight-id1'),
      requestContextMock.convertContext(context)
    );

    expect(response.status).toEqual(500);
    expect(response.body).toEqual({
      message: 'Defend insights data client not initialized',
      status_code: 500,
    });
  });

  it('should handle updateDefendInsightLastViewedAt empty array', async () => {
    (updateDefendInsightLastViewedAt as jest.Mock).mockResolvedValueOnce([]);
    const response = await server.inject(
      getDefendInsightRequest('insight-id1'),
      requestContextMock.convertContext(context)
    );
    expect(response.status).toEqual(200);
    expect(response.body).toEqual({ data: [] });
  });

  it('should handle updateDefendInsightLastViewedAt error', async () => {
    (updateDefendInsightLastViewedAt as jest.Mock).mockRejectedValueOnce(new Error('Oh no!'));
    const response = await server.inject(
      getDefendInsightRequest('insight-id1'),
      requestContextMock.convertContext(context)
    );
    expect(response.status).toEqual(500);
    expect(response.body).toEqual({
      message: {
        error: 'Oh no!',
        success: false,
      },
      status_code: 500,
    });
  });

  it('should call findDefendInsightsByParams with correct id and user', async () => {
    const request = getDefendInsightRequest('insight-id1');

    await server.inject(request, requestContextMock.convertContext(context));

    expect(mockDataClient.findDefendInsightsByParams).toHaveBeenCalledWith({
      params: { ids: ['insight-id1'] },
      authenticatedUser: mockUser,
    });
  });

  it('should call updateDefendInsightLastViewedAt with defendInsights and user', async () => {
    await server.inject(
      getDefendInsightRequest('insight-id1'),
      requestContextMock.convertContext(context)
    );

    expect(updateDefendInsightLastViewedAt).toHaveBeenCalledWith({
      dataClient: mockDataClient,
      defendInsights: [mockCurrentInsight],
      authenticatedUser: mockUser,
    });
  });

  describe('runExternalCallbacks', () => {
    it('should call runExternalCallbacks if defendInsight is returned', async () => {
      const runExternalCallbacks = jest.requireMock('./helpers').runExternalCallbacks as jest.Mock;
      runExternalCallbacks.mockResolvedValue(undefined);

      const response = await server.inject(
        getDefendInsightRequest('insight-id1'),
        requestContextMock.convertContext(context)
      );

      expect(response.status).toEqual(200);
      expect(runExternalCallbacks).toHaveBeenCalledWith(
        expect.any(String), // CallbackIds.DefendInsightsPostFetch
        expect.anything(), // request
        mockCurrentInsight.endpointIds
      );
    });

    it('should handle error thrown by runExternalCallbacks', async () => {
      const runExternalCallbacks = jest.requireMock('./helpers').runExternalCallbacks as jest.Mock;
      runExternalCallbacks.mockRejectedValueOnce(new Error('External callback failed'));

      const response = await server.inject(
        getDefendInsightRequest('insight-id1'),
        requestContextMock.convertContext(context)
      );

      expect(response.status).toEqual(500);
      expect(response.body).toEqual({
        message: {
          error: 'External callback failed',
          success: false,
        },
        status_code: 500,
      });
    });

    it('should still call runExternalCallbacks even if updateDefendInsightLastViewedAt returns null', async () => {
      const runExternalCallbacks = jest.requireMock('./helpers').runExternalCallbacks as jest.Mock;

      (updateDefendInsightLastViewedAt as jest.Mock).mockResolvedValueOnce(null);

      const response = await server.inject(
        getDefendInsightRequest('insight-id1'),
        requestContextMock.convertContext(context)
      );

      expect(response.status).toEqual(200);
      expect(response.body).toEqual({ data: null });
      expect(runExternalCallbacks).toHaveBeenCalled();
    });
  });
});
