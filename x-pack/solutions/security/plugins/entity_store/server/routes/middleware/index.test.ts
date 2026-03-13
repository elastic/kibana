/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { wrapMiddlewares } from '.';
import type { EntityStoreRequestHandlerContext } from '../../types';

describe('wrapMiddlewares', () => {
  it('should stop execution if middleware returns IKibanaResponse', async () => {
    const handler = jest.fn();
    const middleware = jest.fn();

    middleware.mockReturnValue({
      status: 501,
      payload: {
        message: 'stop now',
      },
    });

    const actualHandler = wrapMiddlewares(handler, [middleware]);

    const mockContext = {} as unknown as EntityStoreRequestHandlerContext;
    const mockReq = {} as unknown as any;
    const mockRes = {} as unknown as any;

    const result = await actualHandler(mockContext, mockReq, mockRes);

    expect(result).toBeDefined();
    expect(result.status).toBe(501);
    expect(result.payload.message).toBe('stop now');

    expect(middleware).toHaveBeenCalledWith(mockContext, mockReq, mockRes);
    expect(handler).not.toHaveBeenCalled();
  });

  it('should execute handler', async () => {
    const handler = jest.fn();
    const middleware = jest.fn();

    handler.mockReturnValue({
      status: 200,
    });

    const actualHandler = wrapMiddlewares(handler, [middleware]);

    const mockContext = {} as unknown as EntityStoreRequestHandlerContext;
    const mockReq = {} as unknown as any;
    const mockRes = {} as unknown as any;

    const result = await actualHandler(mockContext, mockReq, mockRes);

    expect(result).toBeDefined();
    expect(result.status).toBe(200);

    expect(handler).toHaveBeenCalledTimes(1);
  });
});
