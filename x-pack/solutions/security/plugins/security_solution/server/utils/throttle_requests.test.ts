/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, KibanaRequest, KibanaResponseFactory } from '@kbn/core/server';
import type { MaybePromise } from '@kbn/utility-types';
import type {
  SecuritySolutionApiRequestHandlerContext,
  SecuritySolutionRequestHandlerContext,
} from '../types';
import { throttleRequests } from './throttle_requests';

describe('throttleRequests', () => {
  let mockContext: SecuritySolutionRequestHandlerContext;
  let mockRequest: KibanaRequest;
  let mockResponse: KibanaResponseFactory;
  let mockHandler: jest.Mock<MaybePromise<IKibanaResponse>>;

  beforeEach(() => {
    mockContext = {} as SecuritySolutionRequestHandlerContext;
    mockRequest = {} as KibanaRequest;
    mockResponse = {} as KibanaResponseFactory;
    mockHandler = jest.fn();
  });

  it('should call the route handler if no request is running', async () => {
    const throttledHandler = throttleRequests(mockHandler);
    mockHandler.mockResolvedValueOnce({} as IKibanaResponse);

    await throttledHandler(mockContext, mockRequest, mockResponse);

    expect(mockHandler).toHaveBeenCalledWith(mockContext, mockRequest, mockResponse);
  });

  it('should not call the route handler if a request is already running', async () => {
    const throttledHandler = throttleRequests(mockHandler);
    mockHandler.mockResolvedValueOnce(
      new Promise((resolve) => setTimeout(() => resolve({} as IKibanaResponse), 100))
    );

    // Call the handler concurrently
    void throttledHandler(mockContext, mockRequest, mockResponse);
    await throttledHandler(mockContext, mockRequest, mockResponse);

    expect(mockHandler).toHaveBeenCalledTimes(1);
  });

  it('should call the route handler multiple times on consecutive requests', async () => {
    const throttledHandler = throttleRequests(mockHandler);
    mockHandler.mockResolvedValueOnce({} as IKibanaResponse);

    // Call the handler sequentially
    await throttledHandler(mockContext, mockRequest, mockResponse);
    await throttledHandler(mockContext, mockRequest, mockResponse);

    expect(mockHandler).toHaveBeenCalledTimes(2);
  });

  it('should handle a failed route handler', async () => {
    const throttledHandler = throttleRequests(mockHandler);
    const error = new Error('Handler failed');
    mockHandler.mockRejectedValueOnce(error);

    await expect(throttledHandler(mockContext, mockRequest, mockResponse)).rejects.toThrow(
      'Handler failed'
    );

    // Ensure that the next call can proceed after a failure
    const resolvedValue = {} as IKibanaResponse;
    mockHandler.mockResolvedValueOnce(resolvedValue);
    const result = await throttledHandler(mockContext, mockRequest, mockResponse);

    expect(mockHandler).toHaveBeenCalledTimes(2);
    expect(result).toBe(resolvedValue);
  });

  it('should not throttle requests across different spaces when spaceAware is true', async () => {
    const mockSpaceId1 = 'space-1';
    const mockSpaceId2 = 'space-2';
    mockContext.securitySolution = {
      getSpaceId: jest.fn().mockResolvedValueOnce(mockSpaceId1).mockResolvedValueOnce(mockSpaceId2),
    } as unknown as Promise<SecuritySolutionApiRequestHandlerContext>;

    const throttledHandler = throttleRequests(mockHandler, { spaceAware: true });
    mockHandler.mockResolvedValue({} as IKibanaResponse);

    // Call the handler concurrently with different space IDs
    void throttledHandler(mockContext, mockRequest, mockResponse);
    await throttledHandler(mockContext, mockRequest, mockResponse);

    expect(mockHandler).toHaveBeenCalledTimes(2);
  });
});
