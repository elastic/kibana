/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { postKnowledgeBaseRoute } from './post_knowledge_base';
import { serverMock } from '../../__mocks__/server';
import { requestContextMock } from '../../__mocks__/request_context';
import { getPostKnowledgeBaseRequest } from '../../__mocks__/request';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import type { AuthenticatedUser } from '@kbn/core-security-common';
import { spaceTestScenarios, withSpace } from '../../__mocks__/space_test_helpers';

describe('Post Knowledge Base Route', () => {
  let server: ReturnType<typeof serverMock.create>;
  // eslint-disable-next-line prefer-const
  let { clients, context } = requestContextMock.createTools();

  clients.core.elasticsearch.client = elasticsearchServiceMock.createScopedClusterClient();

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
    context.elasticAssistant.getAIAssistantKnowledgeBaseDataClient = jest.fn().mockResolvedValue({
      setupKnowledgeBase: jest.fn(),
      indexTemplateAndPattern: {
        alias: 'knowledge-base-alias',
      },
      isModelInstalled: jest.fn().mockResolvedValue(true),
    });

    postKnowledgeBaseRoute(server.router);
  });

  describe('Status codes', () => {
    test('returns 200 if base resources are created', async () => {
      const response = await server.inject(
        getPostKnowledgeBaseRequest(),
        requestContextMock.convertContext(context)
      );

      expect(response.status).toEqual(200);
    });
  });

  describe('Post Knowledge Base Route with Spaces', () => {
    describe('non-default space behavior', () => {
      it('should work correctly in non-default space', async () => {
        const { context: spaceContext } = requestContextMock.createTools();
        withSpace(spaceTestScenarios.nonDefaultSpace)(spaceContext);

        spaceContext.elasticAssistant.getCurrentUser.mockResolvedValue(mockUser);
        spaceContext.elasticAssistant.getAIAssistantKnowledgeBaseDataClient = jest
          .fn()
          .mockResolvedValue({
            setupKnowledgeBase: jest.fn().mockResolvedValue({ success: true }),
            indexTemplateAndPattern: {
              alias: 'knowledge-base-alias-space1',
            },
            isModelInstalled: jest.fn().mockResolvedValue(true),
          });

        const spaceServer = serverMock.create();
        postKnowledgeBaseRoute(spaceServer.router);

        const response = await spaceServer.inject(
          getPostKnowledgeBaseRequest(),
          requestContextMock.convertContext(spaceContext)
        );

        expect(response.status).toEqual(200);
        expect(spaceContext.elasticAssistant.getSpaceId()).toBe(spaceTestScenarios.nonDefaultSpace);
      });

      it('should handle setup failures in non-default space', async () => {
        const { context: spaceContext } = requestContextMock.createTools();
        withSpace(spaceTestScenarios.alternativeSpace)(spaceContext);

        spaceContext.elasticAssistant.getCurrentUser.mockResolvedValue(mockUser);
        spaceContext.elasticAssistant.getAIAssistantKnowledgeBaseDataClient = jest
          .fn()
          .mockResolvedValue({
            setupKnowledgeBase: jest
              .fn()
              .mockRejectedValue(new Error('Space-specific setup error')),
            indexTemplateAndPattern: {
              alias: 'knowledge-base-alias-space2',
            },
            isModelInstalled: jest.fn().mockResolvedValue(true),
          });

        const spaceServer = serverMock.create();
        postKnowledgeBaseRoute(spaceServer.router);

        const response = await spaceServer.inject(
          getPostKnowledgeBaseRequest(),
          requestContextMock.convertContext(spaceContext)
        );

        expect(response.status).toEqual(500);
        expect(spaceContext.elasticAssistant.getSpaceId()).toBe(
          spaceTestScenarios.alternativeSpace
        );
      });
    });

    describe('space isolation', () => {
      it('should create separate knowledge bases for different spaces', async () => {
        // Setup space1 context
        const { context: space1Context } = requestContextMock.createTools();
        withSpace('space1')(space1Context);
        const space1KbClient = {
          setupKnowledgeBase: jest.fn().mockResolvedValue({ success: true }),
          indexTemplateAndPattern: {
            alias: 'kb-space1-alias',
          },
          isModelInstalled: jest.fn().mockResolvedValue(true),
        };
        space1Context.elasticAssistant.getCurrentUser.mockResolvedValue(mockUser);
        space1Context.elasticAssistant.getAIAssistantKnowledgeBaseDataClient = jest
          .fn()
          .mockResolvedValue(space1KbClient);

        // Setup space2 context
        const { context: space2Context } = requestContextMock.createTools();
        withSpace('space2')(space2Context);
        const space2KbClient = {
          setupKnowledgeBase: jest.fn().mockResolvedValue({ success: true }),
          indexTemplateAndPattern: {
            alias: 'kb-space2-alias',
          },
          isModelInstalled: jest.fn().mockResolvedValue(true),
        };
        space2Context.elasticAssistant.getCurrentUser.mockResolvedValue(mockUser);
        space2Context.elasticAssistant.getAIAssistantKnowledgeBaseDataClient = jest
          .fn()
          .mockResolvedValue(space2KbClient);

        const space1Server = serverMock.create();
        const space2Server = serverMock.create();
        postKnowledgeBaseRoute(space1Server.router);
        postKnowledgeBaseRoute(space2Server.router);

        // Setup knowledge base in space1
        const space1Response = await space1Server.inject(
          getPostKnowledgeBaseRequest(),
          requestContextMock.convertContext(space1Context)
        );

        // Setup knowledge base in space2
        const space2Response = await space2Server.inject(
          getPostKnowledgeBaseRequest(),
          requestContextMock.convertContext(space2Context)
        );

        expect(space1Response.status).toEqual(200);
        expect(space2Response.status).toEqual(200);

        // Verify each space setup was called
        expect(space1KbClient.setupKnowledgeBase).toHaveBeenCalled();
        expect(space2KbClient.setupKnowledgeBase).toHaveBeenCalled();

        expect(space1Context.elasticAssistant.getSpaceId()).toBe('space1');
        expect(space2Context.elasticAssistant.getSpaceId()).toBe('space2');
      });
    });
  });
});
