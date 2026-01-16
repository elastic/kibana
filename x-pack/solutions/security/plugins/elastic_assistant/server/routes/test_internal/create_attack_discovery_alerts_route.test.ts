/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { serverMock } from '../../__mocks__/server';
import { requestContextMock } from '../../__mocks__/request_context';
import { requestMock } from '../../__mocks__/request';
import { mockCreateAttackDiscoveryAlertsParams } from '../../__mocks__/mock_create_attack_discovery_alerts_params';
import { createAttackDiscoveryAlertsRoute } from './create_attack_discovery_alerts_route';

describe('createAttackDiscoveryAlertsRoute', () => {
  const path = '/internal/elastic_assistant/data_generator/attack_discoveries/_create';

  it('returns forbidden when the internal-origin header is missing', async () => {
    const server = serverMock.create();
    createAttackDiscoveryAlertsRoute(server.router);

    const { context } = requestContextMock.createTools();
    (context.elasticAssistant.getCurrentUser as jest.Mock).mockReturnValue({
      username: 'elastic',
      roles: ['superuser'],
    });
    (context.elasticAssistant.getAttackDiscoveryDataClient as jest.Mock).mockResolvedValue({
      createAttackDiscoveryAlertsForDataGenerator: jest.fn().mockResolvedValue([]),
    });

    const res = await server.inject(
      requestMock.create({
        method: 'post',
        path,
        headers: { 'kbn-xsrf': 'true', 'elastic-api-version': '1' },
        body: mockCreateAttackDiscoveryAlertsParams,
      }),
      requestContextMock.convertContext(context as any)
    );

    expect(res.status).toEqual(403);
  });

  it('returns forbidden when the current user is not privileged', async () => {
    const server = serverMock.create();
    createAttackDiscoveryAlertsRoute(server.router);

    const { context } = requestContextMock.createTools();
    (context.elasticAssistant.getCurrentUser as jest.Mock).mockReturnValue({
      username: 'elastic',
      roles: [],
      authentication_type: 'realm',
    });
    (context.elasticAssistant.getAttackDiscoveryDataClient as jest.Mock).mockResolvedValue({
      createAttackDiscoveryAlertsForDataGenerator: jest.fn().mockResolvedValue([]),
    });

    const res = await server.inject(
      requestMock.create({
        method: 'post',
        path,
        headers: {
          'kbn-xsrf': 'true',
          'elastic-api-version': '1',
          'x-elastic-internal-origin': 'Kibana',
        },
        body: mockCreateAttackDiscoveryAlertsParams,
      }),
      requestContextMock.convertContext(context as any)
    );

    expect(res.status).toEqual(403);
  });

  it('returns ok when request is privileged and succeeds', async () => {
    const server = serverMock.create();
    createAttackDiscoveryAlertsRoute(server.router);

    const { context } = requestContextMock.createTools();
    (context.elasticAssistant.getCurrentUser as jest.Mock).mockReturnValue({
      username: 'elastic',
      roles: ['superuser'],
    });
    (context.elasticAssistant.getAttackDiscoveryDataClient as jest.Mock).mockResolvedValue({
      createAttackDiscoveryAlertsForDataGenerator: jest.fn().mockResolvedValue([]),
    });

    const res = await server.inject(
      requestMock.create({
        method: 'post',
        path,
        headers: {
          'kbn-xsrf': 'true',
          'elastic-api-version': '1',
          'x-elastic-internal-origin': 'Kibana',
        },
        body: mockCreateAttackDiscoveryAlertsParams,
      }),
      requestContextMock.convertContext(context as any)
    );

    expect(res.status).toEqual(200);
  });
});

