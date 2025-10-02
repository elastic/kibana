/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import { httpServiceMock, httpServerMock } from '@kbn/core-http-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';

import { getAttackDiscoveryGenerationRoute } from './get_attack_discovery_generation';
import * as helpers from '../../../helpers';
import { mockAuthenticatedUser } from '../../../../__mocks__/mock_authenticated_user';
import type { AttackDiscoveryGeneration } from '@kbn/elastic-assistant-common/impl/schemas/attack_discovery/generation.gen';
import { throwIfPublicApiDisabled } from '../../helpers/throw_if_public_api_disabled';

jest.mock('../../helpers/throw_if_public_api_disabled', () => ({
  throwIfPublicApiDisabled: jest.fn().mockResolvedValue(undefined),
}));

const mockGeneration: AttackDiscoveryGeneration = {
  alerts_context_count: 10,
  connector_id: 'test-connector',
  discoveries: 5,
  end: '2023-01-01T00:10:00Z',
  execution_uuid: 'test-uuid',
  loading_message: 'Test message',
  start: '2023-01-01T00:00:00Z',
  status: 'succeeded',
};

const mockAlertData = [
  {
    id: 'alert-1',
    connectorId: 'test-connector',
    alertIds: ['alert-id-1', 'alert-id-2'],
    detailsMarkdown: 'Test details',
    summaryMarkdown: 'Test summary',
    title: 'Test Alert',
    timestamp: '2023-01-01T00:05:00Z',
    connectorName: 'Test Connector',
    generationUuid: 'test-uuid',
  },
];

describe('getAttackDiscoveryGenerationRoute', () => {
  let router: ReturnType<typeof httpServiceMock.createRouter>;
  let mockContext: {
    resolve: jest.Mock;
    elasticAssistant: Promise<{
      logger: ReturnType<typeof loggingSystemMock.createLogger>;
      eventLogIndex: string;
      getSpaceId: () => string;
      getAttackDiscoveryDataClient: jest.Mock;
    }>;
    core: Promise<{
      elasticsearch: {
        client: {
          asCurrentUser: {};
        };
      };
      savedObjects: {
        client: {
          getCurrentNamespace: () => string;
        };
      };
    }>;
  };
  let mockRequest: Partial<KibanaRequest<unknown, unknown, unknown>>;
  let mockResponse: ReturnType<typeof httpServerMock.createResponseFactory>;
  let mockDataClient: {
    getAttackDiscoveryGenerationById: jest.Mock;
    findAttackDiscoveryAlerts: jest.Mock;
  };
  let mockLogger: ReturnType<typeof loggingSystemMock.createLogger>;

  let addVersionMock: jest.Mock;
  let getHandler: (ctx: unknown, req: unknown, res: unknown) => Promise<unknown>;

  beforeEach(() => {
    jest.clearAllMocks();
    router = httpServiceMock.createRouter();
    mockLogger = loggingSystemMock.createLogger();
    mockDataClient = {
      getAttackDiscoveryGenerationById: jest.fn().mockResolvedValue(mockGeneration),
      findAttackDiscoveryAlerts: jest.fn().mockResolvedValue({
        data: mockAlertData,
        total: 1,
        page: 1,
        per_page: 1000,
        unique_alert_ids_count: 2,
        connector_names: ['test-connector'],
      }),
    };
    mockContext = {
      resolve: jest.fn().mockResolvedValue({
        core: {
          elasticsearch: {
            client: {
              asCurrentUser: {},
            },
          },
          savedObjects: {
            client: {
              getCurrentNamespace: () => 'default',
            },
          },
        },
        elasticAssistant: {},
        licensing: {},
      }),
      elasticAssistant: Promise.resolve({
        logger: mockLogger,
        eventLogIndex: 'event-log-index',
        getSpaceId: () => 'default',
        getAttackDiscoveryDataClient: jest.fn().mockResolvedValue(mockDataClient),
      }),
      core: Promise.resolve({
        elasticsearch: {
          client: {
            asCurrentUser: {},
          },
        },
        savedObjects: {
          client: {
            getCurrentNamespace: () => 'default',
          },
        },
        featureFlags: {
          getBooleanValue: jest.fn().mockResolvedValue(true),
        },
      }),
    };
    mockRequest = {
      params: { execution_uuid: 'test-uuid' },
    };
    mockResponse = httpServerMock.createResponseFactory();
    mockResponse.custom = jest.fn().mockReturnThis();
    jest
      .spyOn(helpers, 'performChecks')
      .mockResolvedValue({ isSuccess: true, currentUser: mockAuthenticatedUser });

    addVersionMock = jest.fn();
    (router.versioned.get as jest.Mock).mockReturnValue({ addVersion: addVersionMock });
    getAttackDiscoveryGenerationRoute(router);
    getHandler = addVersionMock.mock.calls[0][1];
  });
  describe('successful flow', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('calls getAttackDiscoveryGenerationById with correct parameters', async () => {
      await getHandler(mockContext, mockRequest, mockResponse);

      expect(mockDataClient.getAttackDiscoveryGenerationById).toHaveBeenCalledWith({
        authenticatedUser: mockAuthenticatedUser,
        eventLogIndex: 'event-log-index',
        executionUuid: 'test-uuid',
        logger: mockLogger,
        spaceId: 'default',
      });
    });

    describe('with_replacements query handling', () => {
      beforeEach(() => {
        jest.clearAllMocks();
      });

      it('passes withReplacements: true to the data client when with_replacements is true in the query', async () => {
        const req: Partial<KibanaRequest<unknown, unknown, unknown>> = {
          params: (mockRequest as Partial<KibanaRequest<unknown, unknown, unknown>>).params,
          query: { with_replacements: true },
        };

        await getHandler(mockContext, req, mockResponse);

        const passed =
          mockDataClient.findAttackDiscoveryAlerts.mock.calls[0][0].findAttackDiscoveryAlertsParams
            .withReplacements;

        expect(passed).toBe(true);
      });

      it('passes withReplacements: false to the data client when with_replacements is false in the query', async () => {
        const req: Partial<KibanaRequest<unknown, unknown, unknown>> = {
          params: (mockRequest as Partial<KibanaRequest<unknown, unknown, unknown>>).params,
          query: { with_replacements: false },
        };

        await getHandler(mockContext, req, mockResponse);

        const passed =
          mockDataClient.findAttackDiscoveryAlerts.mock.calls[0][0].findAttackDiscoveryAlertsParams
            .withReplacements;

        expect(passed).toBe(false);
      });

      it('defaults to withReplacements: true when with_replacements is NOT provided in the query', async () => {
        const req: Partial<KibanaRequest<unknown, unknown, unknown>> = {
          params: (mockRequest as Partial<KibanaRequest<unknown, unknown, unknown>>).params,
        };

        await getHandler(mockContext, req, mockResponse);

        const passed =
          mockDataClient.findAttackDiscoveryAlerts.mock.calls[0][0].findAttackDiscoveryAlertsParams
            .withReplacements;

        expect(passed).toBe(true);
      });
    });

    describe('enable_field_rendering query handling', () => {
      beforeEach(() => {
        jest.clearAllMocks();
      });

      it('passes enableFieldRendering: true to the data client when enable_field_rendering is true in the query', async () => {
        const req: Partial<KibanaRequest<unknown, unknown, unknown>> = {
          params: (mockRequest as Partial<KibanaRequest<unknown, unknown, unknown>>).params,
          query: { enable_field_rendering: true },
        };

        await getHandler(mockContext, req, mockResponse);

        const passed =
          mockDataClient.findAttackDiscoveryAlerts.mock.calls[0][0].findAttackDiscoveryAlertsParams
            .enableFieldRendering;

        expect(passed).toBe(true);
      });

      it('passes enableFieldRendering: false to the data client when enable_field_rendering is false in the query', async () => {
        const req: Partial<KibanaRequest<unknown, unknown, unknown>> = {
          params: (mockRequest as Partial<KibanaRequest<unknown, unknown, unknown>>).params,
          query: { enable_field_rendering: false },
        };

        await getHandler(mockContext, req, mockResponse);

        const passed =
          mockDataClient.findAttackDiscoveryAlerts.mock.calls[0][0].findAttackDiscoveryAlertsParams
            .enableFieldRendering;

        expect(passed).toBe(false);
      });

      it('defaults to enableFieldRendering: false when enable_field_rendering is NOT provided in the query', async () => {
        const req: Partial<KibanaRequest<unknown, unknown, unknown>> = {
          params: (mockRequest as Partial<KibanaRequest<unknown, unknown, unknown>>).params,
        };

        await getHandler(mockContext, req, mockResponse);

        const passed =
          mockDataClient.findAttackDiscoveryAlerts.mock.calls[0][0].findAttackDiscoveryAlertsParams
            .enableFieldRendering;

        expect(passed).toBe(false);
      });
    });

    it('responds with ok containing generation and data', async () => {
      await getHandler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: {
          generation: mockGeneration,
          data: mockAlertData,
        },
      });
    });
  });

  describe('generation not found behavior', () => {
    beforeEach(() => {
      mockDataClient.getAttackDiscoveryGenerationById.mockRejectedValue(
        Object.assign(new Error(`Generation with execution_uuid test-uuid not found`), {
          statusCode: 404,
        })
      );
    });

    it('returns 404 when no data exists', async () => {
      mockDataClient.findAttackDiscoveryAlerts.mockResolvedValueOnce({
        data: [],
        total: 0,
        page: 1,
        per_page: 1000,
        unique_alert_ids_count: 0,
        connector_names: [],
      });

      await getHandler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.custom).toHaveBeenCalledWith({
        body: Buffer.from(
          JSON.stringify({
            message: 'Generation with execution_uuid test-uuid not found',
            status_code: 404,
          })
        ),
        headers: {
          'content-type': 'application/json',
        },
        statusCode: 404,
      });
    });

    it('returns ok with undefined generation when data exists', async () => {
      await getHandler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: {
          generation: undefined,
          data: mockAlertData,
        },
      });
    });

    it('logs debug message when generation metadata is not found', async () => {
      await getHandler(mockContext, mockRequest, mockResponse);

      expect(mockLogger.debug).toHaveBeenCalledWith(expect.any(Function));
      const debugCall = mockLogger.debug.mock.calls[0][0] as () => string;
      expect(debugCall()).toBe(
        'Generation metadata not found for execution_uuid test-uuid, but returning 1 discovery alerts'
      );
    });
  });

  describe('data client initialization errors', () => {
    it('returns 500 if the data client is not initialized', async () => {
      (await mockContext.elasticAssistant).getAttackDiscoveryDataClient.mockResolvedValueOnce(null);

      await getHandler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.custom).toHaveBeenCalledWith({
        body: Buffer.from(
          JSON.stringify({
            message: 'Attack discovery data client not initialized',
            status_code: 500,
          })
        ),
        headers: expect.any(Object),
        statusCode: 500,
      });
    });
  });

  describe('performChecks failures', () => {
    it('returns the error response when performChecks fails', async () => {
      const mockErrorResponse = httpServerMock.createResponseFactory();
      const mockError = mockErrorResponse.custom({
        statusCode: 401,
        body: { message: 'Unauthorized' },
      });
      (helpers.performChecks as jest.Mock).mockResolvedValueOnce({
        isSuccess: false,
        response: mockError,
      });

      const result = await getHandler(mockContext, mockRequest, mockResponse);

      expect(result).toBe(mockError);
    });
  });

  describe('error handling from data client', () => {
    it('handles getAttackDiscoveryGenerationById errors and returns custom response', async () => {
      mockDataClient.getAttackDiscoveryGenerationById.mockRejectedValueOnce(
        new Error('Database error')
      );

      await getHandler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.custom).toHaveBeenCalledWith({
        body: Buffer.from(
          JSON.stringify({
            message: 'Database error',
            status_code: 500,
          })
        ),
        headers: {
          'content-type': 'application/json',
        },
        statusCode: 500,
      });
    });

    it('logs error when getAttackDiscoveryGenerationById throws', async () => {
      mockDataClient.getAttackDiscoveryGenerationById.mockRejectedValueOnce(
        new Error('Database error')
      );

      await getHandler(mockContext, mockRequest, mockResponse);

      expect(mockLogger.error).toHaveBeenCalledWith(new Error('Database error'));
    });

    it('handles findAttackDiscoveryAlerts errors and returns custom response', async () => {
      mockDataClient.findAttackDiscoveryAlerts.mockRejectedValueOnce(
        new Error('Elasticsearch error')
      );

      await getHandler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.custom).toHaveBeenCalledWith({
        body: Buffer.from(
          JSON.stringify({
            message: 'Elasticsearch error',
            status_code: 500,
          })
        ),
        headers: {
          'content-type': 'application/json',
        },
        statusCode: 500,
      });
    });

    it('logs error when findAttackDiscoveryAlerts throws', async () => {
      mockDataClient.findAttackDiscoveryAlerts.mockRejectedValueOnce(
        new Error('Elasticsearch error')
      );

      await getHandler(mockContext, mockRequest, mockResponse);

      expect(mockLogger.error).toHaveBeenCalledWith(new Error('Elasticsearch error'));
    });

    it('propagates custom status codes from data client errors', async () => {
      const customError = Object.assign(new Error('Not authorized'), { statusCode: 403 });
      mockDataClient.getAttackDiscoveryGenerationById.mockRejectedValueOnce(customError);

      await getHandler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.custom).toHaveBeenCalledWith({
        body: Buffer.from(
          JSON.stringify({
            message: 'Not authorized',
            status_code: 403,
          })
        ),
        headers: {
          'content-type': 'application/json',
        },
        statusCode: 403,
      });
    });
  });

  describe('public API feature flag behavior', () => {
    describe('when the public API is disabled', () => {
      beforeEach(() => {
        (throwIfPublicApiDisabled as jest.Mock).mockRejectedValueOnce(
          Object.assign(new Error('Attack discovery public API is disabled'), {
            statusCode: 403,
          })
        );
      });

      it('returns a 403 custom response when the public API is disabled', async () => {
        await getHandler(mockContext, mockRequest, mockResponse);

        expect(mockResponse.custom).toHaveBeenCalledWith({
          body: Buffer.from(
            JSON.stringify({
              message: 'Attack discovery public API is disabled',
              status_code: 403,
            })
          ),
          headers: {
            'content-type': 'application/json',
          },
          statusCode: 403,
        });
      });
    });

    describe('when the public API is enabled', () => {
      beforeEach(() => {
        (throwIfPublicApiDisabled as jest.Mock).mockResolvedValueOnce(undefined);
      });

      it('proceeds with normal execution when the public API is enabled', async () => {
        await getHandler(mockContext, mockRequest, mockResponse);

        expect(mockResponse.ok).toHaveBeenCalledWith({
          body: {
            generation: mockGeneration,
            data: mockAlertData,
          },
        });
      });
    });
  });
});
