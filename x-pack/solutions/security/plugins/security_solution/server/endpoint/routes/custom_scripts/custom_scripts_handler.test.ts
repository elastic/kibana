/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerCustomScriptsRoute, getCustomScriptsRouteHandler } from './custom_scripts_handler';
import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { createMockEndpointAppContext } from '../../mocks';
import { getCustomScriptsClient } from '../../services/custom_scripts/clients/get_custom_scripts_client';
import type {
  SecuritySolutionPluginRouter,
  SecuritySolutionRequestHandlerContext,
} from '../../../types';

jest.mock('../../services/custom_scripts/clients/get_custom_scripts_client');

describe('Custom Scripts Route Handler', () => {
  const mockGetCustomScriptsClient = getCustomScriptsClient as jest.MockedFunction<
    typeof getCustomScriptsClient
  >;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('registerCustomScriptsRoute', () => {
    test('registers route with correct configuration', () => {
      const router = {
        versioned: {
          get: jest.fn().mockReturnValue({
            addVersion: jest.fn(),
          }),
        },
      };
      const endpointContext = createMockEndpointAppContext();

      registerCustomScriptsRoute(
        router as unknown as SecuritySolutionPluginRouter,
        endpointContext
      );

      expect(router.versioned.get).toHaveBeenCalledWith({
        access: 'internal',
        path: expect.any(String),
        security: {
          authz: {
            requiredPrivileges: ['securitySolution'],
          },
        },
        options: { authRequired: true },
      });
    });

    test('adds correct version and validation', () => {
      const addVersionMock = jest.fn();
      const router = {
        versioned: {
          get: jest.fn().mockReturnValue({
            addVersion: addVersionMock,
          }),
        },
      };
      const endpointContext = createMockEndpointAppContext();

      registerCustomScriptsRoute(
        router as unknown as SecuritySolutionPluginRouter,
        endpointContext
      );

      expect(addVersionMock).toHaveBeenCalledWith(
        {
          version: '1',
          validate: {
            request: expect.any(Object),
          },
        },
        expect.any(Function)
      );
    });
  });

  describe('getCustomScriptsRouteHandler', () => {
    let endpointContext: ReturnType<typeof createMockEndpointAppContext>;
    let handler: ReturnType<typeof getCustomScriptsRouteHandler>;
    let response: ReturnType<typeof httpServerMock.createResponseFactory>;
    let logger: ReturnType<typeof loggingSystemMock.createLogger>;
    let mockCustomScriptsClient: { getCustomScripts: jest.Mock };

    beforeEach(() => {
      endpointContext = createMockEndpointAppContext();
      logger = loggingSystemMock.createLogger();
      endpointContext.logFactory.get = jest.fn().mockReturnValue(logger);
      response = httpServerMock.createResponseFactory();

      const mockScripts = [{ id: 'script1', name: 'Script 1', description: 'Test script 1' }];
      mockCustomScriptsClient = {
        getCustomScripts: jest.fn().mockResolvedValue(mockScripts),
      };

      mockGetCustomScriptsClient.mockReturnValue(mockCustomScriptsClient);
      handler = getCustomScriptsRouteHandler(endpointContext);
    });

    test('returns 400 when sentinel_one agent type feature is disabled', async () => {
      // Mock the experimental features
      Object.defineProperty(
        endpointContext.experimentalFeatures,
        'responseActionsSentinelOneV1Enabled',
        {
          value: false,
          configurable: true,
        }
      );

      const context = {
        securitySolution: { getSpaceId: jest.fn() },
        core: { elasticsearch: { client: { asInternalUser: {} } } },
        actions: { getActionsClient: jest.fn() },
      };

      const request = {
        query: { agentType: 'sentinel_one' },
      };

      await handler(
        context as unknown as SecuritySolutionRequestHandlerContext,
        // @ts-expect-error this is a mock request
        request,
        response
      );

      expect(response.customError).toHaveBeenCalledWith({
        statusCode: 400,
        body: expect.any(Object),
      });
    });

    test('returns 400 when crowdstrike agent type feature is disabled', async () => {
      // Mock the experimental features
      Object.defineProperty(endpointContext.experimentalFeatures, 'crowdstrikeRunScriptEnabled', {
        value: false,
        configurable: true,
      });

      const context = {
        securitySolution: { getSpaceId: jest.fn() },
        core: { elasticsearch: { client: { asInternalUser: {} } } },
        actions: { getActionsClient: jest.fn() },
      };

      const request = {
        query: { agentType: 'crowdstrike' },
      };

      await handler(
        context as unknown as SecuritySolutionRequestHandlerContext,
        // @ts-expect-error this is a mock request
        request,
        response
      );

      expect(response.customError).toHaveBeenCalledWith({
        statusCode: 400,
        body: expect.any(Object),
      });
    });

    test('returns custom scripts data for endpoint agent type', async () => {
      const context = {
        securitySolution: { getSpaceId: jest.fn().mockReturnValue('default') },
        core: { elasticsearch: { client: { asInternalUser: {} } } },
        actions: { getActionsClient: jest.fn() },
      };

      const request = {
        query: { agentType: 'endpoint' },
      };

      await handler(
        context as unknown as SecuritySolutionRequestHandlerContext,
        // @ts-expect-error this is a mock request
        request,
        response
      );

      expect(mockGetCustomScriptsClient).toHaveBeenCalledWith('endpoint', expect.any(Object));
      expect(mockCustomScriptsClient.getCustomScripts).toHaveBeenCalled();
      expect(response.ok).toHaveBeenCalledWith({
        body: [{ id: 'script1', name: 'Script 1', description: 'Test script 1' }],
      });
    });

    test('returns custom scripts data for crowdstrike agent type when feature enabled', async () => {
      // Mock the experimental features
      Object.defineProperty(endpointContext.experimentalFeatures, 'crowdstrikeRunScriptEnabled', {
        value: true,
        configurable: true,
      });

      const context = {
        securitySolution: { getSpaceId: jest.fn().mockReturnValue('default') },
        core: { elasticsearch: { client: { asInternalUser: {} } } },
        actions: { getActionsClient: jest.fn() },
      };

      const request = {
        query: { agentType: 'crowdstrike' },
      };

      await handler(
        context as unknown as SecuritySolutionRequestHandlerContext,
        // @ts-expect-error this is a mock request
        request,
        response
      );

      expect(mockGetCustomScriptsClient).toHaveBeenCalledWith('crowdstrike', expect.any(Object));
      expect(mockCustomScriptsClient.getCustomScripts).toHaveBeenCalled();
      expect(response.ok).toHaveBeenCalledWith({
        body: [{ id: 'script1', name: 'Script 1', description: 'Test script 1' }],
      });
    });

    test('handles errors properly', async () => {
      const error = new Error('Test error');
      mockCustomScriptsClient.getCustomScripts.mockRejectedValue(error);

      const context = {
        securitySolution: { getSpaceId: jest.fn() },
        core: { elasticsearch: { client: { asInternalUser: {} } } },
        actions: { getActionsClient: jest.fn() },
      };

      const request = {
        query: { agentType: 'endpoint' },
      };

      await handler(
        context as unknown as SecuritySolutionRequestHandlerContext,
        // @ts-expect-error this is a mock request
        request,
        response
      );

      expect(logger.error).toHaveBeenCalledWith(error);
      expect(response.customError).toHaveBeenCalled();
    });

    test('respects space awareness when enabled', async () => {
      // Mock the experimental features
      Object.defineProperty(
        endpointContext.service.experimentalFeatures,
        'endpointManagementSpaceAwarenessEnabled',
        {
          value: true,
          configurable: true,
        }
      );

      const context = {
        securitySolution: { getSpaceId: jest.fn().mockReturnValue('custom-space') },
        core: { elasticsearch: { client: { asInternalUser: {} } } },
        actions: { getActionsClient: jest.fn() },
      };

      const request = {
        query: { agentType: 'endpoint' },
      };

      await handler(
        context as unknown as SecuritySolutionRequestHandlerContext,
        // @ts-expect-error this is a mock request
        request,
        response
      );

      expect(
        endpointContext.service.savedObjects.createInternalScopedSoClient
      ).toHaveBeenCalledWith({
        spaceId: 'custom-space',
      });
    });

    test('uses default agent type when not specified', async () => {
      const context = {
        securitySolution: { getSpaceId: jest.fn() },
        core: { elasticsearch: { client: { asInternalUser: {} } } },
        actions: { getActionsClient: jest.fn() },
      };

      const request = {
        query: {},
      };

      await handler(
        context as unknown as SecuritySolutionRequestHandlerContext,
        // @ts-expect-error this is a mock request
        request,
        response
      );

      expect(mockGetCustomScriptsClient).toHaveBeenCalledWith('endpoint', expect.any(Object));
    });
  });
});
