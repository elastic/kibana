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
import type { AuthenticatedUser } from '@kbn/core-security-common';
import { knowledgeBaseDataClientMock } from '../../__mocks__/data_clients.mock';
import { spaceTestScenarios, withSpace } from '../../__mocks__/space_test_helpers';

describe('Get Knowledge Base Status Route', () => {
  let server: ReturnType<typeof serverMock.create>;

  let { context } = requestContextMock.createTools();

  const mockUser = {
    username: 'elastic',
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

  describe('Get Knowledge Base Status Route with Spaces', () => {
    describe('non-default space behavior', () => {
      it('should work correctly in non-default space', async () => {
        const { context: spaceContext } = requestContextMock.createTools();
        withSpace(spaceTestScenarios.nonDefaultSpace)(spaceContext);

        spaceContext.elasticAssistant.getCurrentUser.mockResolvedValue(mockUser);

        const spaceKbDataClient = knowledgeBaseDataClientMock.create();
        spaceContext.elasticAssistant.getAIAssistantKnowledgeBaseDataClient = jest
          .fn()
          .mockResolvedValue(spaceKbDataClient);

        spaceKbDataClient.isInferenceEndpointExists.mockResolvedValue(true);
        spaceKbDataClient.isModelInstalled.mockResolvedValue(true);
        spaceKbDataClient.isSetupAvailable.mockResolvedValue(true);
        spaceKbDataClient.getProductDocumentationStatus.mockResolvedValue('installed');
        spaceKbDataClient.isSecurityLabsDocsLoaded.mockResolvedValue(true);
        spaceKbDataClient.isUserDataExists.mockResolvedValue(true);
        spaceKbDataClient.isSetupInProgress = false;

        const spaceServer = serverMock.create();
        getKnowledgeBaseStatusRoute(spaceServer.router);

        const response = await spaceServer.inject(
          getGetKnowledgeBaseStatusRequest(),
          requestContextMock.convertContext(spaceContext)
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

        // Verify space ID was used
        expect(spaceContext.elasticAssistant.getSpaceId()).toBe(spaceTestScenarios.nonDefaultSpace);
      });

      it('should use space-scoped knowledge base data client', async () => {
        const { context: spaceContext } = requestContextMock.createTools();
        withSpace(spaceTestScenarios.alternativeSpace)(spaceContext);

        spaceContext.elasticAssistant.getCurrentUser.mockResolvedValue(mockUser);

        const spaceKbDataClient = knowledgeBaseDataClientMock.create();
        const kbDataClientGetter = jest.fn().mockResolvedValue(spaceKbDataClient);
        spaceContext.elasticAssistant.getAIAssistantKnowledgeBaseDataClient = kbDataClientGetter;

        spaceKbDataClient.isInferenceEndpointExists.mockResolvedValue(false);
        spaceKbDataClient.isModelInstalled.mockResolvedValue(false);
        spaceKbDataClient.isSetupAvailable.mockResolvedValue(false);
        spaceKbDataClient.getProductDocumentationStatus.mockResolvedValue('not_installed');
        spaceKbDataClient.isSecurityLabsDocsLoaded.mockResolvedValue(false);
        spaceKbDataClient.isUserDataExists.mockResolvedValue(false);
        spaceKbDataClient.isSetupInProgress = false;

        const spaceServer = serverMock.create();
        getKnowledgeBaseStatusRoute(spaceServer.router);

        const response = await spaceServer.inject(
          getGetKnowledgeBaseStatusRequest(),
          requestContextMock.convertContext(spaceContext)
        );

        expect(response.status).toEqual(200);
        expect(response.body).toEqual({
          elser_exists: false,
          is_setup_in_progress: false,
          is_setup_available: false,
          security_labs_exists: false,
          user_data_exists: false,
          product_documentation_status: 'not_installed',
        });

        // Verify the knowledge base data client was requested
        expect(kbDataClientGetter).toHaveBeenCalled();
      });
    });

    describe('space isolation', () => {
      it('should return different statuses for different spaces', async () => {
        // Setup space1 with knowledge base ready
        const { context: space1Context } = requestContextMock.createTools();
        withSpace('space1')(space1Context);
        const space1KbClient = knowledgeBaseDataClientMock.create();
        space1Context.elasticAssistant.getCurrentUser.mockResolvedValue(mockUser);
        space1Context.elasticAssistant.getAIAssistantKnowledgeBaseDataClient = jest
          .fn()
          .mockResolvedValue(space1KbClient);

        space1KbClient.isInferenceEndpointExists.mockResolvedValue(true);
        space1KbClient.isModelInstalled.mockResolvedValue(true);
        space1KbClient.isSetupAvailable.mockResolvedValue(true);
        space1KbClient.getProductDocumentationStatus.mockResolvedValue('installed');
        space1KbClient.isSecurityLabsDocsLoaded.mockResolvedValue(true);
        space1KbClient.isUserDataExists.mockResolvedValue(true);
        space1KbClient.isSetupInProgress = false;

        // Setup space2 with knowledge base not ready
        const { context: space2Context } = requestContextMock.createTools();
        withSpace('space2')(space2Context);
        const space2KbClient = knowledgeBaseDataClientMock.create();
        space2Context.elasticAssistant.getCurrentUser.mockResolvedValue(mockUser);
        space2Context.elasticAssistant.getAIAssistantKnowledgeBaseDataClient = jest
          .fn()
          .mockResolvedValue(space2KbClient);

        space2KbClient.isInferenceEndpointExists.mockResolvedValue(false);
        space2KbClient.isModelInstalled.mockResolvedValue(false);
        space2KbClient.isSetupAvailable.mockResolvedValue(false);
        space2KbClient.getProductDocumentationStatus.mockResolvedValue('not_installed');
        space2KbClient.isSecurityLabsDocsLoaded.mockResolvedValue(false);
        space2KbClient.isUserDataExists.mockResolvedValue(false);
        space2KbClient.isSetupInProgress = false;

        const space1Server = serverMock.create();
        const space2Server = serverMock.create();
        getKnowledgeBaseStatusRoute(space1Server.router);
        getKnowledgeBaseStatusRoute(space2Server.router);

        const space1Response = await space1Server.inject(
          getGetKnowledgeBaseStatusRequest(),
          requestContextMock.convertContext(space1Context)
        );

        const space2Response = await space2Server.inject(
          getGetKnowledgeBaseStatusRequest(),
          requestContextMock.convertContext(space2Context)
        );

        // Space1 should show everything ready
        expect(space1Response.status).toEqual(200);
        expect(space1Response.body.elser_exists).toBe(true);
        expect(space1Response.body.user_data_exists).toBe(true);

        // Space2 should show nothing ready
        expect(space2Response.status).toEqual(200);
        expect(space2Response.body.elser_exists).toBe(false);
        expect(space2Response.body.user_data_exists).toBe(false);

        // Verify space isolation
        expect(space1Context.elasticAssistant.getSpaceId()).toBe('space1');
        expect(space2Context.elasticAssistant.getSpaceId()).toBe('space2');
      });
    });
  });
});
