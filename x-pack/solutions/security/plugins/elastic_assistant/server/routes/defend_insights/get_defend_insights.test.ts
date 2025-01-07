/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { AuthenticatedUser } from '@kbn/core-security-common';

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';

import type { DefendInsightsDataClient } from '../../ai_assistant_data_clients/defend_insights';

import { transformESSearchToDefendInsights } from '../../ai_assistant_data_clients/defend_insights/helpers';
import { getDefendInsightsSearchEsMock } from '../../__mocks__/defend_insights_schema.mock';
import { getDefendInsightsRequest } from '../../__mocks__/request';
import {
  ElasticAssistantRequestHandlerContextMock,
  requestContextMock,
} from '../../__mocks__/request_context';
import { serverMock } from '../../__mocks__/server';
import { isDefendInsightsEnabled, updateDefendInsightsLastViewedAt } from './helpers';
import { getDefendInsightsRoute } from './get_defend_insights';

jest.mock('./helpers');

describe('getDefendInsightsRoute', () => {
  let server: ReturnType<typeof serverMock.create>;
  let context: ElasticAssistantRequestHandlerContextMock;
  let mockUser: AuthenticatedUser;
  let mockDataClient: DefendInsightsDataClient;
  let mockCurrentInsights: any;

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
      updateDefendInsight: jest.fn(),
      createDefendInsight: jest.fn(),
      getDefendInsight: jest.fn(),
    } as unknown as DefendInsightsDataClient;
  }

  beforeEach(() => {
    const tools = requestContextMock.createTools();
    context = tools.context;
    server = serverMock.create();
    tools.clients.core.elasticsearch.client = elasticsearchServiceMock.createScopedClusterClient();

    mockUser = getDefaultUser();
    mockDataClient = getDefaultDataClient();
    mockCurrentInsights = transformESSearchToDefendInsights(getDefendInsightsSearchEsMock());

    context.elasticAssistant.getCurrentUser.mockReturnValue(mockUser);
    context.elasticAssistant.getDefendInsightsDataClient.mockResolvedValue(mockDataClient);
    getDefendInsightsRoute(server.router);
    (updateDefendInsightsLastViewedAt as jest.Mock).mockResolvedValue(mockCurrentInsights);
    (isDefendInsightsEnabled as jest.Mock).mockReturnValue(true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should handle successful request', async () => {
    const response = await server.inject(
      getDefendInsightsRequest({ connector_id: 'connector-id1' }),
      requestContextMock.convertContext(context)
    );
    expect(response.status).toEqual(200);
    expect(response.body).toEqual({
      data: mockCurrentInsights,
    });
  });

  it('should 404 if feature flag disabled', async () => {
    (isDefendInsightsEnabled as jest.Mock).mockReturnValueOnce(false);
    const response = await server.inject(
      getDefendInsightsRequest({ connector_id: 'connector-id1' }),
      requestContextMock.convertContext(context)
    );
    expect(response.status).toEqual(404);
  });

  it('should handle missing authenticated user', async () => {
    context.elasticAssistant.getCurrentUser.mockReturnValueOnce(null);
    const response = await server.inject(
      getDefendInsightsRequest({ connector_id: 'connector-id1' }),
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
      getDefendInsightsRequest({ connector_id: 'connector-id1' }),
      requestContextMock.convertContext(context)
    );

    expect(response.status).toEqual(500);
    expect(response.body).toEqual({
      message: 'Defend insights data client not initialized',
      status_code: 500,
    });
  });

  it('should handle updateDefendInsightsLastViewedAt empty array', async () => {
    (updateDefendInsightsLastViewedAt as jest.Mock).mockResolvedValueOnce([]);
    const response = await server.inject(
      getDefendInsightsRequest({ connector_id: 'connector-id1' }),
      requestContextMock.convertContext(context)
    );
    expect(response.status).toEqual(200);
    expect(response.body).toEqual({ data: [] });
  });

  it('should handle updateDefendInsightsLastViewedAt error', async () => {
    (updateDefendInsightsLastViewedAt as jest.Mock).mockRejectedValueOnce(new Error('Oh no!'));
    const response = await server.inject(
      getDefendInsightsRequest({ connector_id: 'connector-id1' }),
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
});
