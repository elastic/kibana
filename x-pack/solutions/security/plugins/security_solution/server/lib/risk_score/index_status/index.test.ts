/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRiskScoreIndexStatusRoute } from '.';
import {
  requestMock,
  serverMock,
  requestContextMock,
} from '../../detection_engine/routes/__mocks__';

import { RISK_SCORE_INDEX_STATUS_API_URL } from '../../../../common/constants';

const fieldCaps = {
  indices: ['not_important'],
  fields: {
    'host.risk.calculated_level': {
      text: {
        type: 'text',
        metadata_field: false,
        searchable: true,
        aggregatable: false,
      },
    },
  },
};
describe('risk score index status route', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();
  const getRequest = (entity: string) =>
    requestMock.create({
      method: 'get',
      path: RISK_SCORE_INDEX_STATUS_API_URL,
      query: { indexName: 'hi', entity },
    });

  beforeEach(() => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());
  });

  test('If new fields are not available, isDeprecated = true', async () => {
    clients.clusterClient.asCurrentUser.fieldCaps.mockResolvedValue(fieldCaps);
    getRiskScoreIndexStatusRoute(server.router);
    const response = await server.inject(
      getRequest('user'),
      requestContextMock.convertContext(context)
    );
    expect(response.body).toEqual({ isDeprecated: true, isEnabled: true });
  });
  test('If new fields are available, isDeprecated = false', async () => {
    clients.clusterClient.asCurrentUser.fieldCaps.mockResolvedValue(fieldCaps);
    getRiskScoreIndexStatusRoute(server.router);
    const response = await server.inject(
      getRequest('host'),
      requestContextMock.convertContext(context)
    );
    expect(response.body).toEqual({ isDeprecated: false, isEnabled: true });
  });

  test('404 error does not throw, returns isEnabled = false', async () => {
    const notFoundError: Error & { statusCode?: number } = new Error('not found');
    notFoundError.statusCode = 404;
    clients.clusterClient.asCurrentUser.fieldCaps.mockRejectedValue(notFoundError);
    getRiskScoreIndexStatusRoute(server.router);
    const response = await server.inject(
      getRequest('host'),
      requestContextMock.convertContext(context)
    );
    expect(response.body).toEqual({ isDeprecated: false, isEnabled: false });
  });

  test('any other error throws', async () => {
    clients.clusterClient.asCurrentUser.fieldCaps.mockRejectedValue(new Error('any other error'));
    getRiskScoreIndexStatusRoute(server.router);
    const response = await server.inject(
      getRequest('host'),
      requestContextMock.convertContext(context)
    );
    expect(response.body).toEqual({ message: 'any other error', status_code: 500 });
  });
});
