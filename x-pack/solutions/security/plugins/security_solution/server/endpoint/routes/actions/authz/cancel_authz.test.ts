/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import { EndpointAppContextService } from '../../../endpoint_app_context_services';
import { createMockEndpointAppContext, createRouteHandlerContext } from '../../../mocks';
import { getEndpointAuthzInitialStateMock } from '../../../../../common/endpoint/service/authz/mocks';
import { validateCommandSpecificCancelPermissions } from './cancel_authz';
import { fetchActionRequestById } from '../../../services/actions/utils/fetch_action_request_by_id';
import type { CancelActionRequestBody } from '../../../../../common/api/endpoint';
import { EndpointAuthorizationError } from '../../../errors';
import { CustomHttpRequestError } from '../../../../utils/custom_http_request_error';

jest.mock('../../../services/actions/utils/fetch_action_request_by_id');

const mockedFetchActionRequestById = fetchActionRequestById as jest.MockedFunction<
  typeof fetchActionRequestById
>;

describe('validateCommandSpecificCancelPermissions', () => {
  let endpointAppContextService: EndpointAppContextService;
  let endpointContext: any;
  let mockLogger: any;
  let mockContext: any;
  let mockRequest: any;

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
    };

    mockContext = createRouteHandlerContext(null, null);
    mockContext.securitySolution.getSpaceId.mockResolvedValue('default');

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
    ])(
      'should pass command-specific authorization for %s command when user has permission',
      async (command, commandPermission) => {
        mockedFetchActionRequestById.mockResolvedValue({
          EndpointActions: {
            data: { command },
          },
        } as any);

        const authz = getEndpointAuthzInitialStateMock({
          [commandPermission]: true,
        });
        mockContext.securitySolution.getEndpointAuthz.mockResolvedValue(authz);

        await expect(
          validateCommandSpecificCancelPermissions(
            mockContext,
            mockRequest,
            endpointContext,
            mockLogger
          )
        ).resolves.not.toThrow();

        expect(mockLogger.debug).toHaveBeenCalledWith(
          'Validating command-specific authorization for cancel action: test-action-id'
        );
        expect(mockLogger.debug).toHaveBeenCalledWith(
          `Cancel authorization check for command: ${command}`
        );
        expect(mockLogger.debug).toHaveBeenCalledWith(
          'Command-specific cancel authorization successful for action test-action-id'
        );
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
    ])(
      'should fail command-specific authorization for %s command when user lacks permission',
      async (command, commandPermission) => {
        mockedFetchActionRequestById.mockResolvedValue({
          EndpointActions: {
            data: { command },
          },
        } as any);

        const authz = getEndpointAuthzInitialStateMock({
          [commandPermission]: false, // User lacks command-specific permission
        });
        mockContext.securitySolution.getEndpointAuthz.mockResolvedValue(authz);

        await expect(
          validateCommandSpecificCancelPermissions(
            mockContext,
            mockRequest,
            endpointContext,
            mockLogger
          )
        ).rejects.toThrow(EndpointAuthorizationError);

        expect(mockLogger.debug).toHaveBeenCalledWith(
          `User lacks command-specific permission '${commandPermission}' for cancel action`
        );
      }
    );
  });

  describe('error handling', () => {
    it('should throw CustomHttpRequestError when action is not found', async () => {
      mockedFetchActionRequestById.mockResolvedValue(null);

      await expect(
        validateCommandSpecificCancelPermissions(
          mockContext,
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
      } as any);

      await expect(
        validateCommandSpecificCancelPermissions(
          mockContext,
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
      } as any);

      await expect(
        validateCommandSpecificCancelPermissions(
          mockContext,
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
});
