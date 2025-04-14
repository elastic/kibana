/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getKnowledgeBaseStatusRoute } from './get_knowledge_base_status';
import { serverMock } from '../../__mocks__/server';
import { requestContextMock } from '../../__mocks__/request_context';
import { getGetKnowledgeBaseStatusRequest } from '../../__mocks__/request';
import { AuthenticatedUser } from '@kbn/core-security-common';
import { knowledgeBaseDataClientMock } from '../../__mocks__/data_clients.mock';

describe('Get Knowledge Base Status Route', () => {
  let server: ReturnType<typeof serverMock.create>;

  let { context } = requestContextMock.createTools();

  const mockUser = {
    username: 'my_username',
    authentication_realm: {
      type: 'my_realm_type',
      name: 'my_realm_name',
    },
  } as AuthenticatedUser;

  beforeEach(() => {
    server = serverMock.create();
    ({ context } = requestContextMock.createTools());
    context.elasticAssistant.getCurrentUser.mockResolvedValue(mockUser);
    const kbDataClient = knowledgeBaseDataClientMock.create();
    context.elasticAssistant.getAIAssistantKnowledgeBaseDataClient = jest
      .fn()
      .mockResolvedValue(kbDataClient);

    kbDataClient.isInferenceEndpointExists.mockResolvedValue(true);
    kbDataClient.isModelInstalled.mockResolvedValue(true);
    kbDataClient.isSetupAvailable.mockResolvedValue(true);
    kbDataClient.getProductDocumentationStatus.mockResolvedValue('installed');
    kbDataClient.isSecurityLabsDocsLoaded.mockResolvedValue(true);
    kbDataClient.isUserDataExists.mockResolvedValue(true);
    kbDataClient.isSetupInProgress = false;

    getKnowledgeBaseStatusRoute(server.router);
  });

  describe('Status codes', () => {
    test('returns 200 if all statuses are false', async () => {
      const response = await server.inject(
        getGetKnowledgeBaseStatusRequest(),
        requestContextMock.convertContext(context)
      );

      expect(response.status).toEqual(200);
      expect(response.body).toEqual({
        elser_exists: true,
        is_setup_in_progress: false,
        is_setup_available: true,
        security_labs_exists: true,
        user_data_exists: true,
        product_documentation_status: 'installed',
      });
    });
  });
});
