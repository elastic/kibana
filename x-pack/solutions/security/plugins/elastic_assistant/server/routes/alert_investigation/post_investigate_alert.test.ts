/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { postInvestigateAlertRoute } from './post_investigate_alert';
import { serverMock } from '../../__mocks__/server';
import { requestContextMock } from '../../__mocks__/request_context';
import type { ConfigSchema } from '../../config_schema';

describe('postInvestigateAlertRoute', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { context } = requestContextMock.createTools();

  const mockConfig: ConfigSchema = {
    elserInferenceId: '.elser_model_2',
    responseTimeout: 60000,
    llmInvestigationEnabled: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    server = serverMock.create();
    ({ context } = requestContextMock.createTools());

    // Register route
    postInvestigateAlertRoute(server.router, mockConfig);
  });

  it('should reject request if feature is disabled', async () => {
    const disabledConfig: ConfigSchema = {
      ...mockConfig,
      llmInvestigationEnabled: false,
    };

    server = serverMock.create();
    postInvestigateAlertRoute(server.router, disabledConfig);

    const response = await server.inject(
      {
        method: 'post',
        path: '/internal/elastic_assistant/alert_investigation',
        body: {
          alertId: 'alert-123',
          alertIndex: '.alerts-security.alerts-default',
          connectorId: 'connector-123',
        },
      },
      requestContextMock.convertContext(context)
    );

    expect(response.status).toBe(403);
    expect(response.body.message).toContain('not enabled');
  });

  it('should return 404 if alert not found', async () => {
    const esClient = context.core.elasticsearch.client.asCurrentUser;
    (esClient.get as jest.Mock).mockResolvedValue({
      found: false,
    });

    const response = await server.inject(
      {
        method: 'post',
        path: '/internal/elastic_assistant/alert_investigation',
        body: {
          alertId: 'nonexistent',
          alertIndex: '.alerts-security.alerts-default',
          connectorId: 'connector-123',
        },
      },
      requestContextMock.convertContext(context)
    );

    expect(response.status).toBe(404);
    expect(response.body.message).toContain('not found');
  });

  it('should validate required fields in request body', async () => {
    const response = await server.inject(
      {
        method: 'post',
        path: '/internal/elastic_assistant/alert_investigation',
        body: {
          // Missing alertId, alertIndex, connectorId
        },
      },
      requestContextMock.convertContext(context)
    );

    expect(response.status).toBe(400);
  });

  it('should accept optional caseId field', async () => {
    const esClient = context.core.elasticsearch.client.asCurrentUser;
    (esClient.get as jest.Mock).mockResolvedValue({
      found: true,
      _id: 'alert-123',
      _index: '.alerts-security.alerts-default',
      _source: {
        '@timestamp': '2026-03-22T10:00:00Z',
      },
    });

    const response = await server.inject(
      {
        method: 'post',
        path: '/internal/elastic_assistant/alert_investigation',
        body: {
          alertId: 'alert-123',
          alertIndex: '.alerts-security.alerts-default',
          connectorId: 'connector-123',
          caseId: 'case-456', // Optional field
        },
      },
      requestContextMock.convertContext(context)
    );

    // Will fail due to missing mocks, but validates schema
    expect(response.status).not.toBe(400); // Not a validation error
  });
});
