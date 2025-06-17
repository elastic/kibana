/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import type { ScopedClusterClientMock } from '@kbn/core/server/mocks';
import {
  elasticsearchServiceMock,
  savedObjectsClientMock,
  httpServerMock,
  httpServiceMock,
} from '@kbn/core/server/mocks';
import type {
  KibanaResponseFactory,
  RequestHandlerContext,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import type { ConfigSchema } from '@kbn/unified-search-plugin/server/config';
import type { Observable } from 'rxjs';
import { dataPluginMock } from '@kbn/unified-search-plugin/server/mocks';
import { termsEnumSuggestions } from '@kbn/unified-search-plugin/server/autocomplete/terms_enum';
import {
  createMockEndpointAppContext,
  createMockEndpointAppContextServiceStartContract,
  createRouteHandlerContext,
  getRegisteredVersionedRouteMock,
} from '../../mocks';
import type { EndpointAuthz } from '../../../../common/endpoint/types/authz';
import { applyActionsEsSearchMock } from '../../services/actions/mocks';
import { requestContextMock } from '../../../lib/detection_engine/routes/__mocks__';
import type { EndpointSuggestionsSchema } from '../../../../common/api/endpoint';
import { getEndpointSuggestionsRequestHandler, registerEndpointSuggestionsRoutes } from '.';
import { EndpointActionGenerator } from '../../../../common/endpoint/data_generators/endpoint_action_generator';
import { getEndpointAuthzInitialStateMock } from '../../../../common/endpoint/service/authz/mocks';
import {
  eventsIndexPattern,
  SUGGESTIONS_INTERNAL_ROUTE,
} from '../../../../common/endpoint/constants';
import { EndpointAppContextService } from '../../endpoint_app_context_services';
import { combineIndexWithNamespaces } from '../../../utils/index_name_parser';

jest.mock('@kbn/unified-search-plugin/server/autocomplete/terms_enum', () => {
  return {
    termsEnumSuggestions: jest.fn(),
  };
});

jest.mock('../../../utils/index_name_parser', () => ({
  combineIndexWithNamespaces: jest.fn(),
}));

const termsEnumSuggestionsMock = termsEnumSuggestions as jest.Mock;
const combineIndexWithNamespacesMock = combineIndexWithNamespaces as jest.Mock;

interface CallRouteInterface {
  params: TypeOf<typeof EndpointSuggestionsSchema.params>;
  authz?: Partial<EndpointAuthz>;
}

describe('when calling the Suggestions route handler', () => {
  let mockScopedEsClient: ScopedClusterClientMock;
  let mockSavedObjectClient: jest.Mocked<SavedObjectsClientContract>;
  let mockResponse: jest.Mocked<KibanaResponseFactory>;
  let suggestionsRouteHandler: ReturnType<typeof getEndpointSuggestionsRequestHandler>;
  let callRoute: (
    routePrefix: string,
    opts: CallRouteInterface,
    indexExists?: { endpointDsExists: boolean }
  ) => Promise<void>;
  let mockEndpointContext: ReturnType<typeof createMockEndpointAppContext>;
  let config$: Observable<ConfigSchema>;

  beforeEach(() => {
    mockEndpointContext = createMockEndpointAppContext();
    (mockEndpointContext.service.getEndpointMetadataService as jest.Mock) = jest
      .fn()
      .mockReturnValue({
        findHostMetadataForFleetAgents: jest.fn().mockResolvedValue([]),
      });
    mockScopedEsClient = elasticsearchServiceMock.createScopedClusterClient();
    mockSavedObjectClient = savedObjectsClientMock.create();
    mockResponse = httpServerMock.createResponseFactory();

    config$ = dataPluginMock
      .createSetupContract()
      .autocomplete.getInitializerContextConfig()
      .create();

    // Reset mocks
    termsEnumSuggestionsMock.mockClear().mockResolvedValue({});
    combineIndexWithNamespacesMock.mockClear();
  });

  describe('having right privileges', () => {
    describe('when space awareness feature is disabled', () => {
      beforeEach(() => {
        mockEndpointContext.experimentalFeatures = {
          ...mockEndpointContext.experimentalFeatures,
          endpointManagementSpaceAwarenessEnabled: false,
        };
        suggestionsRouteHandler = getEndpointSuggestionsRequestHandler(
          config$,
          mockEndpointContext
        );
      });

      it('should use default events index pattern', async () => {
        applyActionsEsSearchMock(mockScopedEsClient.asInternalUser);

        const mockContext = requestContextMock.convertContext(
          createRouteHandlerContext(mockScopedEsClient, mockSavedObjectClient)
        );

        const fieldName = 'process.id';
        const mockRequest = httpServerMock.createKibanaRequest<
          TypeOf<typeof EndpointSuggestionsSchema.params>,
          never,
          never
        >({
          params: { suggestion_type: 'eventFilters' },
          body: {
            field: 'process.id',
            query: 'test-query',
            filters: 'test-filters',
            fieldMeta: 'test-field-meta',
          },
        });

        await suggestionsRouteHandler(mockContext, mockRequest, mockResponse);

        expect(termsEnumSuggestionsMock).toHaveBeenNthCalledWith(
          1,
          expect.any(Object),
          expect.any(Object),
          expect.any(Object),
          eventsIndexPattern,
          fieldName,
          'test-query',
          'test-filters',
          'test-field-meta',
          expect.any(Object)
        );

        expect(mockResponse.ok).toHaveBeenCalled();
        expect(combineIndexWithNamespacesMock).not.toHaveBeenCalled();
      });
    });

    describe('when space awareness feature is enabled', () => {
      beforeEach(() => {
        mockEndpointContext.experimentalFeatures = {
          ...mockEndpointContext.experimentalFeatures,
          endpointManagementSpaceAwarenessEnabled: true,
        };
        suggestionsRouteHandler = getEndpointSuggestionsRequestHandler(
          config$,
          mockEndpointContext
        );
      });

      it('should use space-aware index pattern successfully', async () => {
        const spaceId = 'custom-space';
        const mockIntegrationNamespaces = ['custom-namespace'];
        const mockIndexPattern = 'logs-endpoint.events-custom-namespace';

        applyActionsEsSearchMock(mockScopedEsClient.asInternalUser);

        const mockContext = requestContextMock.convertContext(
          createRouteHandlerContext(mockScopedEsClient, mockSavedObjectClient)
        );

        // Mock the space ID retrieval using the correct pattern
        ((await mockContext.securitySolution).getSpaceId as jest.Mock).mockReturnValue(spaceId);

        // Mock the fleet services
        const mockFleetServices = {
          getIntegrationNamespaces: jest.fn().mockResolvedValue(mockIntegrationNamespaces),
        };
        mockEndpointContext.service.getInternalFleetServices = jest
          .fn()
          .mockReturnValue(mockFleetServices);

        // Mock the combineIndexWithNamespaces function
        combineIndexWithNamespacesMock.mockReturnValue(mockIndexPattern);

        const fieldName = 'process.id';
        const mockRequest = httpServerMock.createKibanaRequest<
          TypeOf<typeof EndpointSuggestionsSchema.params>,
          never,
          never
        >({
          params: { suggestion_type: 'eventFilters' },
          body: {
            field: 'process.id',
            query: 'test-query',
            filters: 'test-filters',
            fieldMeta: 'test-field-meta',
          },
        });

        await suggestionsRouteHandler(mockContext, mockRequest, mockResponse);

        expect((await mockContext.securitySolution).getSpaceId as jest.Mock).toHaveBeenCalled();
        expect(mockEndpointContext.service.getInternalFleetServices).toHaveBeenCalledWith(spaceId);
        expect(mockFleetServices.getIntegrationNamespaces).toHaveBeenCalledWith(['endpoint']);
        expect(combineIndexWithNamespacesMock).toHaveBeenCalledWith(
          eventsIndexPattern,
          mockIntegrationNamespaces,
          'endpoint'
        );
        expect(termsEnumSuggestionsMock).toHaveBeenNthCalledWith(
          1,
          expect.any(Object),
          expect.any(Object),
          expect.any(Object),
          mockIndexPattern,
          fieldName,
          'test-query',
          'test-filters',
          'test-field-meta',
          expect.any(Object)
        );

        expect(mockResponse.ok).toHaveBeenCalled();
      });

      it('should return bad request when space-aware index pattern retrieval fails', async () => {
        const spaceId = 'custom-space';
        const mockIntegrationNamespaces = ['custom-namespace'];

        applyActionsEsSearchMock(mockScopedEsClient.asInternalUser);

        const mockContext = requestContextMock.convertContext(
          createRouteHandlerContext(mockScopedEsClient, mockSavedObjectClient)
        );

        // Mock the space ID retrieval using the correct pattern
        ((await mockContext.securitySolution).getSpaceId as jest.Mock).mockReturnValue(spaceId);

        // Mock the fleet services
        const mockFleetServices = {
          getIntegrationNamespaces: jest.fn().mockResolvedValue(mockIntegrationNamespaces),
        };
        mockEndpointContext.service.getInternalFleetServices = jest
          .fn()
          .mockReturnValue(mockFleetServices);

        // Mock the combineIndexWithNamespaces function to return null (indicating failure)
        combineIndexWithNamespacesMock.mockReturnValue(null);

        const mockRequest = httpServerMock.createKibanaRequest<
          TypeOf<typeof EndpointSuggestionsSchema.params>,
          never,
          never
        >({
          params: { suggestion_type: 'eventFilters' },
          body: {
            field: 'process.id',
            query: 'test-query',
            filters: 'test-filters',
            fieldMeta: 'test-field-meta',
          },
        });

        await suggestionsRouteHandler(mockContext, mockRequest, mockResponse);

        expect((await mockContext.securitySolution).getSpaceId as jest.Mock).toHaveBeenCalled();
        expect(mockEndpointContext.service.getInternalFleetServices).toHaveBeenCalledWith(spaceId);
        expect(mockFleetServices.getIntegrationNamespaces).toHaveBeenCalledWith(['endpoint']);
        expect(combineIndexWithNamespacesMock).toHaveBeenCalledWith(
          eventsIndexPattern,
          mockIntegrationNamespaces,
          'endpoint'
        );

        expect(mockResponse.badRequest).toHaveBeenCalledWith({
          body: 'Failed to retrieve current space index patterns',
        });
        expect(termsEnumSuggestionsMock).not.toHaveBeenCalled();
      });

      it('should handle errors during space-aware processing gracefully', async () => {
        const spaceId = 'custom-space';
        const mockIntegrationNamespaces = ['custom-namespace'];
        const mockIndexPattern = 'logs-endpoint.events-custom-namespace';

        applyActionsEsSearchMock(mockScopedEsClient.asInternalUser);

        const mockContext = requestContextMock.convertContext(
          createRouteHandlerContext(mockScopedEsClient, mockSavedObjectClient)
        );

        // Mock the space ID retrieval using the correct pattern
        ((await mockContext.securitySolution).getSpaceId as jest.Mock).mockReturnValue(spaceId);

        // Mock the fleet services successfully
        const mockFleetServices = {
          getIntegrationNamespaces: jest.fn().mockResolvedValue(mockIntegrationNamespaces),
        };
        mockEndpointContext.service.getInternalFleetServices = jest
          .fn()
          .mockReturnValue(mockFleetServices);

        // Mock the combineIndexWithNamespaces function successfully
        combineIndexWithNamespacesMock.mockReturnValue(mockIndexPattern);

        // Mock termsEnumSuggestions to throw an error (this is inside the try-catch block)
        termsEnumSuggestionsMock.mockRejectedValue(new Error('Search service error'));

        const mockRequest = httpServerMock.createKibanaRequest<
          TypeOf<typeof EndpointSuggestionsSchema.params>,
          never,
          never
        >({
          params: { suggestion_type: 'eventFilters' },
          body: {
            field: 'process.id',
            query: 'test-query',
            filters: 'test-filters',
            fieldMeta: 'test-field-meta',
          },
        });

        await suggestionsRouteHandler(mockContext, mockRequest, mockResponse);

        expect((await mockContext.securitySolution).getSpaceId as jest.Mock).toHaveBeenCalled();

        expect(mockEndpointContext.service.getInternalFleetServices).toHaveBeenCalledWith(spaceId);
        expect(mockFleetServices.getIntegrationNamespaces).toHaveBeenCalledWith(['endpoint']);
        expect(combineIndexWithNamespacesMock).toHaveBeenCalledWith(
          eventsIndexPattern,
          mockIntegrationNamespaces,
          'endpoint'
        );
        expect(termsEnumSuggestionsMock).toHaveBeenCalledWith(
          expect.any(Object),
          expect.any(Object),
          expect.any(Object),
          mockIndexPattern,
          'process.id',
          'test-query',
          'test-filters',
          'test-field-meta',
          expect.any(Object)
        );

        // Should call errorHandler which will handle the error appropriately
        expect(mockResponse.ok).not.toHaveBeenCalled();
        // Note: We don't check the exact error response as errorHandler handles that
      });
    });

    it('should call service using event filters type from request', async () => {
      // Set up context without space awareness for this legacy test
      mockEndpointContext.experimentalFeatures = {
        ...mockEndpointContext.experimentalFeatures,
        endpointManagementSpaceAwarenessEnabled: false,
      };
      suggestionsRouteHandler = getEndpointSuggestionsRequestHandler(config$, mockEndpointContext);

      applyActionsEsSearchMock(mockScopedEsClient.asInternalUser);

      const mockContext = requestContextMock.convertContext(
        createRouteHandlerContext(mockScopedEsClient, mockSavedObjectClient)
      );

      const fieldName = 'process.id';
      const mockRequest = httpServerMock.createKibanaRequest<
        TypeOf<typeof EndpointSuggestionsSchema.params>,
        never,
        never
      >({
        params: { suggestion_type: 'eventFilters' },
        body: {
          field: 'process.id',
          query: 'test-query',
          filters: 'test-filters',
          fieldMeta: 'test-field-meta',
        },
      });

      await suggestionsRouteHandler(mockContext, mockRequest, mockResponse);

      expect(termsEnumSuggestionsMock).toHaveBeenNthCalledWith(
        1,
        expect.any(Object),
        expect.any(Object),
        expect.any(Object),
        eventsIndexPattern,
        fieldName,
        'test-query',
        'test-filters',
        'test-field-meta',
        expect.any(Object)
      );

      expect(mockResponse.ok).toHaveBeenCalled();
    });

    it('should respond with bad request if wrong suggestion type', async () => {
      // Set up context without space awareness for this test
      mockEndpointContext.experimentalFeatures = {
        ...mockEndpointContext.experimentalFeatures,
        endpointManagementSpaceAwarenessEnabled: false,
      };
      suggestionsRouteHandler = getEndpointSuggestionsRequestHandler(config$, mockEndpointContext);

      applyActionsEsSearchMock(
        mockScopedEsClient.asInternalUser,
        new EndpointActionGenerator().toEsSearchResponse([])
      );

      const mockContext = requestContextMock.convertContext(
        createRouteHandlerContext(mockScopedEsClient, mockSavedObjectClient)
      );
      const mockRequest = httpServerMock.createKibanaRequest<
        TypeOf<typeof EndpointSuggestionsSchema.params>,
        never,
        never
      >({
        params: { suggestion_type: 'any' },
      });

      await suggestionsRouteHandler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.badRequest).toHaveBeenCalledWith({
        body: 'Invalid suggestion_type: any',
      });
    });

    describe('without having right privileges', () => {
      beforeEach(() => {
        const startContract = createMockEndpointAppContextServiceStartContract();
        const routerMock = httpServiceMock.createRouter();
        const endpointAppContextService = new EndpointAppContextService();
        // add the suggestions route handlers to routerMock
        registerEndpointSuggestionsRoutes(routerMock, config$, {
          ...createMockEndpointAppContext(),
          service: endpointAppContextService,
        });

        // define a convenience function to execute an API call for a given route
        callRoute = async (
          routePrefix: string,
          { params, authz = {} }: CallRouteInterface
        ): Promise<void> => {
          const superUser = {
            username: 'superuser',
            roles: ['superuser'],
          };
          (startContract.security.authc.getCurrentUser as jest.Mock).mockImplementationOnce(
            () => superUser
          );

          const ctx = createRouteHandlerContext(mockScopedEsClient, mockSavedObjectClient);

          ctx.securitySolution.getEndpointAuthz.mockResolvedValue(
            getEndpointAuthzInitialStateMock(authz)
          );

          const mockRequest = httpServerMock.createKibanaRequest({ params });
          const { routeHandler } = getRegisteredVersionedRouteMock(
            routerMock,
            'post',
            routePrefix,
            '1'
          );

          await routeHandler(ctx as unknown as RequestHandlerContext, mockRequest, mockResponse);
        };
      });

      it('should respond with forbidden', async () => {
        await callRoute(SUGGESTIONS_INTERNAL_ROUTE, {
          params: { suggestion_type: 'eventFilters' },
          authz: { canReadEventFilters: true, canWriteEventFilters: false },
        });

        expect(mockResponse.forbidden).toBeCalled();
      });
    });
  });
});
