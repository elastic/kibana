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
import { ALERT_INSTANCE_ID } from '@kbn/rule-data-utils';

describe('createAttackDiscoveryAlertsRoute', () => {
  const path = '/internal/elastic_assistant/data_generator/attack_discoveries/_create';

  it('returns forbidden when the internal-origin header is missing', async () => {
    const server = serverMock.create();
    createAttackDiscoveryAlertsRoute(server.router);

    const { context } = requestContextMock.createTools();
    (context.elasticAssistant.getCurrentUser as unknown as jest.Mock).mockReturnValue({
      username: 'elastic',
      roles: ['superuser'],
    });

    const res = await server.inject(
      requestMock.create({
        method: 'post',
        path,
        headers: { 'kbn-xsrf': 'true', 'elastic-api-version': '1' },
        body: mockCreateAttackDiscoveryAlertsParams,
      }),
      requestContextMock.convertContext(context)
    );

    expect(res.status).toEqual(403);
  });

  it('returns forbidden when the current user is not privileged', async () => {
    const server = serverMock.create();
    createAttackDiscoveryAlertsRoute(server.router);

    const { context } = requestContextMock.createTools();
    (context.elasticAssistant.getCurrentUser as unknown as jest.Mock).mockReturnValue({
      username: 'elastic',
      roles: [],
      authentication_type: 'realm',
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
      requestContextMock.convertContext(context)
    );

    expect(res.status).toEqual(403);
  });

  it('returns ok when request is privileged and succeeds', async () => {
    const server = serverMock.create();
    createAttackDiscoveryAlertsRoute(server.router);

    const { context } = requestContextMock.createTools();
    (context.elasticAssistant.getCurrentUser as unknown as jest.Mock).mockReturnValue({
      username: 'elastic',
      roles: ['superuser'],
    });
    (context.elasticAssistant.rulesClient.create as unknown as jest.Mock).mockResolvedValue({
      id: 'rule-1',
    });
    (context.elasticAssistant.rulesClient.runSoon as unknown as jest.Mock).mockResolvedValue('ok');
    (context.elasticAssistant.rulesClient.delete as unknown as jest.Mock).mockResolvedValue({});
    (
      context.elasticAssistant.frameworkAlerts
        .getContextInitializationPromise as unknown as jest.Mock
    ).mockResolvedValue({ result: true });

    (
      context.core.elasticsearch.client.asCurrentUser.search as unknown as jest.Mock
    ).mockResolvedValue({
      hits: {
        hits: [
          {
            _id: 'doc-1',
            _index: '.internal.alerts-security.attack.discovery.alerts-default-000001',
            fields: { [ALERT_INSTANCE_ID]: ['instance-1'] },
          },
          {
            _id: 'doc-2',
            _index: '.internal.alerts-security.attack.discovery.alerts-default-000001',
            fields: { [ALERT_INSTANCE_ID]: ['instance-2'] },
          },
        ],
      },
    });
    (
      context.core.elasticsearch.client.asCurrentUser.bulk as unknown as jest.Mock
    ).mockResolvedValue({});
    (
      context.elasticAssistant.getAttackDiscoveryDataClient as unknown as jest.Mock
    ).mockResolvedValue({
      findAttackDiscoveryAlerts: jest.fn().mockResolvedValue({ data: [] }),
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
      requestContextMock.convertContext(context)
    );

    expect(res.status).toEqual(200);
  });
});
