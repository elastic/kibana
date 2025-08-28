/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, KibanaRequest } from '@kbn/core/server';
import {
  httpServerMock,
  elasticsearchServiceMock,
  savedObjectsClientMock,
} from '@kbn/core/server/mocks';
import { EndpointAppContextService } from '../../../endpoint_app_context_services';
import { createMockEndpointAppContext, createRouteHandlerContext } from '../../../mocks';
import { getEndpointAuthzInitialStateMock } from '../../../../../common/endpoint/service/authz/mocks';
import { validateCommandSpecificCancelPermissions } from './cancel_authz';
import { fetchActionRequestById } from '../../../services/actions/utils/fetch_action_request_by_id';
import type { CancelActionRequestBody } from '../../../../../common/api/endpoint';
import type { LogsEndpointAction } from '../../../../../common/endpoint/types';
import { EndpointAuthorizationError } from '../../../errors';
import { CustomHttpRequestError } from '../../../../utils/custom_http_request_error';
import type { SecuritySolutionRequestHandlerContextMock } from '../../../../lib/detection_engine/routes/__mocks__/request_context';
import type { SecuritySolutionRequestHandlerContext } from '../../../../types';
import type { EndpointAppContext } from '../../../types';

jest.mock('../../../services/actions/utils/fetch_action_request_by_id');

const mockedFetchActionRequestById = fetchActionRequestById as jest.MockedFunction<
  typeof fetchActionRequestById
>;

describe('validateCommandSpecificCancelPermissions', () => {
  let endpointAppContextService: EndpointAppContextService;
  let endpointContext: EndpointAppContext;
  let mockLogger: jest.Mocked<Logger>;
  let mockContext: SecuritySolutionRequestHandlerContextMock;
  let mockRequest: KibanaRequest<unknown, unknown, CancelActionRequestBody>;

  beforeEach(() => {
    endpointAppContextService = new EndpointAppContextService();

    endpointContext = {
      ...createMockEndpointAppContext(),
      service: endpointAppContextService,
    };

    mockLogger = {
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as jest.Mocked<Logger>;

    const mockScopedClient = elasticsearchServiceMock.createScopedClusterClient();
    const mockSavedObjectsClient = savedObjectsClientMock.create();
    mockContext = createRouteHandlerContext(mockScopedClient, mockSavedObjectsClient);
    mockContext.securitySolution.getSpaceId.mockResolvedValue('default' as never);

    mockRequest = httpServerMock.createKibanaRequest({
      body: {
        parameters: { id: 'test-action-id' },
      } as CancelActionRequestBody,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('command-specific authorization validation', () => {
    it.each([
      ['isolate', 'canIsolateHost'],
      ['unisolate', 'canUnIsolateHost'],
      ['kill-process', 'canKillProcess'],
      ['suspend-process', 'canSuspendProcess'],
      ['running-processes', 'canGetRunningProcesses'],
      ['get-file', 'canWriteFileOperations'],
      ['execute', 'canWriteExecuteOperations'],
      ['upload', 'canWriteFileOperations'],
      ['scan', 'canWriteScanOperations'],
      ['runscript', 'canWriteExecuteOperations'],
      ['cancel', 'canReadActionsLogManagement'],
    ])(
      'should pass command-specific authorization for %s command when user has permission',
      async (command, commandPermission) => {
        mockedFetchActionRequestById.mockResolvedValue({
          EndpointActions: {
            data: { command },
          },
        } as unknown as LogsEndpointAction);

        const authz = getEndpointAuthzInitialStateMock({
          [commandPermission]: true,
        });
        mockContext.securitySolution.getEndpointAuthz.mockResolvedValue(authz);

        await expect(
          validateCommandSpecificCancelPermissions(
            mockContext as unknown as SecuritySolutionRequestHandlerContext,
            mockRequest,
            endpointContext,
            mockLogger
          )
        ).resolves.not.toThrow();
      }
    );

    it.each([
      ['isolate', 'canIsolateHost'],
      ['unisolate', 'canUnIsolateHost'],
      ['kill-process', 'canKillProcess'],
      ['suspend-process', 'canSuspendProcess'],
      ['running-processes', 'canGetRunningProcesses'],
      ['get-file', 'canWriteFileOperations'],
      ['execute', 'canWriteExecuteOperations'],
      ['upload', 'canWriteFileOperations'],
      ['scan', 'canWriteScanOperations'],
      ['runscript', 'canWriteExecuteOperations'],
      ['cancel', 'canReadActionsLogManagement'],
    ])(
      'should fail command-specific authorization for %s command when user lacks permission',
      async (command, commandPermission) => {
        mockedFetchActionRequestById.mockResolvedValue({
          EndpointActions: {
            data: { command },
          },
        } as unknown as LogsEndpointAction);

        const authz = getEndpointAuthzInitialStateMock({
          [commandPermission]: false, // User lacks command-specific permission
        });
        mockContext.securitySolution.getEndpointAuthz.mockResolvedValue(authz);

        await expect(
          validateCommandSpecificCancelPermissions(
            mockContext as unknown as SecuritySolutionRequestHandlerContext,
            mockRequest,
            endpointContext,
            mockLogger
          )
        ).rejects.toThrow(EndpointAuthorizationError);
      }
    );
  });

  describe('error handling', () => {
    it('should throw CustomHttpRequestError when action is not found', async () => {
      mockedFetchActionRequestById.mockResolvedValue(null as unknown as LogsEndpointAction);

      await expect(
        validateCommandSpecificCancelPermissions(
          mockContext as unknown as SecuritySolutionRequestHandlerContext,
          mockRequest,
          endpointContext,
          mockLogger
        )
      ).rejects.toThrow(
        new CustomHttpRequestError(`Action with id 'test-action-id' not found.`, 404)
      );
    });

    it('should throw CustomHttpRequestError when action has no command information', async () => {
      mockedFetchActionRequestById.mockResolvedValue({
        EndpointActions: {
          data: {}, // Missing command
        },
      } as unknown as LogsEndpointAction);

      await expect(
        validateCommandSpecificCancelPermissions(
          mockContext as unknown as SecuritySolutionRequestHandlerContext,
          mockRequest,
          endpointContext,
          mockLogger
        )
      ).rejects.toThrow(
        new CustomHttpRequestError(
          `Unable to determine command type for action 'test-action-id'`,
          400
        )
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Action test-action-id missing command information'
      );
    });

    it('should throw EndpointAuthorizationError for unknown command types', async () => {
      mockedFetchActionRequestById.mockResolvedValue({
        EndpointActions: {
          data: { command: 'unknown-command' },
        },
      } as unknown as LogsEndpointAction);

      await expect(
        validateCommandSpecificCancelPermissions(
          mockContext as unknown as SecuritySolutionRequestHandlerContext,
          mockRequest,
          endpointContext,
          mockLogger
        )
      ).rejects.toThrow(
        new EndpointAuthorizationError({
          message: 'Cancel operation not supported for command type: unknown-command',
        })
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Unknown command type for cancel authorization: unknown-command'
      );
    });
  });

  describe('cross-space authorization scenarios', () => {
    it('should handle action not found across different spaces', async () => {
      // Mock action not found in current space
      mockedFetchActionRequestById.mockResolvedValue(null as unknown as LogsEndpointAction);

      await expect(
        validateCommandSpecificCancelPermissions(
          mockContext as unknown as SecuritySolutionRequestHandlerContext,
          mockRequest,
          endpointContext,
          mockLogger
        )
      ).rejects.toThrow(
        new CustomHttpRequestError(`Action with id 'test-action-id' not found.`, 404)
      );
    });

    it('should properly validate permissions for actions from same space', async () => {
      // Mock finding action in same space
      mockedFetchActionRequestById.mockResolvedValue({
        EndpointActions: {
          data: { command: 'isolate' },
        },
      } as unknown as LogsEndpointAction);

      const authz = getEndpointAuthzInitialStateMock({
        canIsolateHost: true,
      });
      mockContext.securitySolution.getEndpointAuthz.mockResolvedValue(authz);

      await expect(
        validateCommandSpecificCancelPermissions(
          mockContext as unknown as SecuritySolutionRequestHandlerContext,
          mockRequest,
          endpointContext,
          mockLogger
        )
      ).resolves.not.toThrow();
    });
  });

  describe('network failure scenarios', () => {
    it('should handle network failures when fetching action details', async () => {
      // Mock network error
      mockedFetchActionRequestById.mockRejectedValue(new Error('Network error: timeout'));

      await expect(
        validateCommandSpecificCancelPermissions(
          mockContext as unknown as SecuritySolutionRequestHandlerContext,
          mockRequest,
          endpointContext,
          mockLogger
        )
      ).rejects.toThrow('Network error: timeout');
    });
  });
});
