/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { postEvaluateRoute } from './post_evaluate';
import { serverMock } from '../../__mocks__/server';
import { requestContextMock } from '../../__mocks__/request_context';
import { getPostEvaluateRequest } from '../../__mocks__/request';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import {
  defaultAssistantFeatures,
  PostEvaluateRequestBodyInput,
} from '@kbn/elastic-assistant-common';
import type { AuthenticatedUser } from '@kbn/core-security-common';

const defaultBody: PostEvaluateRequestBodyInput = {
  datasetName: 'datasetName',
  graphs: ['graphs'],
  connectorIds: ['id1', 'id2'],
  runName: undefined,
  langSmithApiKey: undefined,
};

describe('Post Evaluate Route', () => {
  const { clients, context } = requestContextMock.createTools();
  const server: ReturnType<typeof serverMock.create> = serverMock.create();
  clients.core.elasticsearch.client = elasticsearchServiceMock.createScopedClusterClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (server as any).responseMock.notFound = jest.fn().mockReturnValue({
    status: 404,
    payload: 'Not Found',
  });

  const mockUser = {
    username: 'my_username',
    authentication_realm: {
      type: 'my_realm_type',
      name: 'my_realm_name',
    },
  } as AuthenticatedUser;

  const mockGetElser = jest.fn().mockResolvedValue('.elser_model_2');

  beforeEach(() => {
    jest.clearAllMocks();
    context.elasticAssistant.getCurrentUser.mockReturnValue(mockUser);

    postEvaluateRoute(server.router, mockGetElser);
  });

  describe('Capabilities', () => {
    it('returns a 404 if evaluate feature is not registered', async () => {
      context.elasticAssistant.getRegisteredFeatures.mockReturnValueOnce({
        ...defaultAssistantFeatures,
        assistantModelEvaluation: false,
      });

      const response = await server.inject(
        getPostEvaluateRequest({ body: defaultBody }),
        requestContextMock.convertContext(context)
      );
      expect(response.status).toEqual(404);
    });
  });
});
